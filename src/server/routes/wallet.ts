import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import Razorpay from 'razorpay';

const router = Router();

// Initialize Razorpay
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[Wallet] Razorpay keys not configured — wallet recharge will be unavailable');
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const PLATFORM_MARGIN_PERCENT = 0.10;

// GET /api/wallet - Get wallet info
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { businessId: req.user.businessId },
    });

    // Auto-create wallet if not exists
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { businessId: req.user.businessId },
      });
    }

    res.json({ success: true, data: wallet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/transactions - Transaction history
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const where: any = { businessId: req.user.businessId };
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/recharge - Create Razorpay order for top-up
router.post('/recharge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 10) {
      return res.status(400).json({ success: false, error: 'Minimum recharge is ₹10' });
    }

    // Ensure wallet exists
    let wallet = await prisma.wallet.findUnique({
      where: { businessId: req.user.businessId },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { businessId: req.user.businessId },
      });
    }

    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `wallet_${req.user.businessId}_${Date.now()}`,
      notes: {
        businessId: req.user.businessId,
        type: 'wallet_recharge',
      },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountInPaise,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    console.error('Error creating recharge order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/recharge/verify - Verify payment and add balance
router.post('/recharge/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing required payment fields' });
    }

    // Verify signature
    const crypto = await import('crypto');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[Wallet] RAZORPAY_KEY_SECRET not configured');
      return res.status(500).json({ success: false, error: 'Payment service misconfigured' });
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const sigBuf = Buffer.from(expectedSignature, 'hex');
    const userSigBuf = Buffer.from(razorpay_signature, 'hex');
    if (sigBuf.length !== userSigBuf.length || !crypto.timingSafeEqual(sigBuf, userSigBuf)) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Fetch order from Razorpay to get authoritative amount (never trust client)
    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (!order || order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Payment not completed' });
    }

    const rechargeAmount = Number(order.amount) / 100; // Razorpay amount is in paise

    const existingTx = await prisma.walletTransaction.findFirst({
      where: { razorpayPaymentId: razorpay_payment_id },
    });
    if (existingTx) {
      return res.json({ success: true, message: 'Already processed' });
    }

    // Ensure wallet exists
    let wallet = await prisma.wallet.findUnique({
      where: { businessId: req.user.businessId },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { businessId: req.user.businessId },
      });
    }

    // Use atomic increment to prevent race conditions
    const updatedWallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: rechargeAmount },
        totalRecharged: { increment: rechargeAmount },
      },
    });

    // Create transaction
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        businessId: req.user.businessId,
        type: 'recharge',
        amount: rechargeAmount,
        balance: updatedWallet.balance,
        description: `Wallet recharge ₹${rechargeAmount}`,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        metadata: { razorpay_signature },
      },
    });

    res.json({
      success: true,
      data: {
        balance: updatedWallet.balance,
        transactionId: transaction.id,
        message: `₹${rechargeAmount} added to wallet`,
      },
    });
  } catch (error: any) {
    console.error('Error verifying recharge:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// GET /api/wallet/balance-check - Check if enough balance
router.get('/balance-check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { estimatedMinutes = 1 } = req.query;

    // Get business provider for rate calculation
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { telephonyProvider: true },
    });
    const provider = business?.telephonyProvider || 'twilio';
    const PROVIDER_RATES: Record<string, number> = { twilio: 1.25, plivo: 0.75, browser_only: 0 };
    const ratePerMinute = PROVIDER_RATES[provider] || 1.25;

    const estimatedCost = Number(estimatedMinutes) * ratePerMinute * 1.10; // +10% margin

    const wallet = await prisma.wallet.findUnique({
      where: { businessId: req.user.businessId },
    });

    const balance = wallet?.balance || 0;
    const hasEnough = balance >= estimatedCost;

    res.json({
      success: true,
      data: {
        balance,
        estimatedCost,
        hasEnough,
        message: hasEnough
          ? 'Sufficient balance'
          : `Insufficient balance. Need ₹${estimatedCost.toFixed(2)}, have ₹${balance.toFixed(2)}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/wallet/threshold - Update low balance threshold
router.put('/threshold', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { threshold } = req.body;

    await prisma.wallet.upsert({
      where: { businessId: req.user.businessId },
      create: {
        businessId: req.user.businessId,
        lowBalanceThreshold: Number(threshold) || 50,
      },
      update: {
        lowBalanceThreshold: Number(threshold) || 50,
      },
    });

    res.json({ success: true, message: 'Threshold updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/earnings - Platform earnings (owner only)
router.get('/earnings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, from, to } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const [earnings, total, aggregate] = await Promise.all([
      prisma.platformEarning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.platformEarning.count({ where }),
      prisma.platformEarning.aggregate({
        where,
        _sum: { twilioCost: true, platformMargin: true, totalCharged: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        earnings,
        total,
        summary: {
          totalTwilioCost: aggregate._sum.twilioCost || 0,
          totalPlatformMargin: aggregate._sum.platformMargin || 0,
          totalCharged: aggregate._sum.totalCharged || 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/earnings/by-business - Earnings grouped by business
router.get('/earnings/by-business', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const earnings = await prisma.platformEarning.groupBy({
      by: ['businessId'],
      _sum: { platformMargin: true, totalCharged: true },
      _count: true,
      orderBy: { _sum: { platformMargin: 'desc' } },
    });

    res.json({ success: true, data: earnings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/earnings/settle - Mark earnings as settled
router.post('/earnings/settle', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { earningIds } = req.body;

    await prisma.platformEarning.updateMany({
      where: { id: { in: earningIds } },
      data: { status: 'settled', settledAt: new Date() },
    });

    res.json({ success: true, message: `${earningIds.length} earnings settled` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
