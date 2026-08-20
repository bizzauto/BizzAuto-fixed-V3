import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireBusinessOwner } from '../middleware/auth.js';
import razorpayService from '../services/razorpay.service.js';

const router = Router();

// Get current subscription
router.get('/current', authenticate, async (req: any, res: any) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        businessId: req.user.businessId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' },
    });

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { plan: true, aiCreditsUsed: true, aiCreditsLimit: true },
    });

    res.json({
      success: true,
      data: {
        subscription,
        business,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription', details: error.message });
  }
});

// Get available plans
router.get('/plans', authenticate, async (req: any, res: any) => {
  const plans = [
    {
      id: 'FREE',
      name: 'Free',
      price: { month: 0, year: 0 },
      features: [
        '100 Contacts',
        '100 WhatsApp messages/month',
        '10 AI credits',
        '1 User',
        'Basic CRM',
      ],
    },
    {
      id: 'STARTER',
      name: 'Starter',
      price: { month: 999, year: 9990 },
      features: [
        '1,000 Contacts',
        '5,000 WhatsApp messages/month',
        '100 AI credits',
        '3 Users',
        'Full CRM & Pipeline',
        'Email Support',
      ],
      popular: false,
    },
    {
      id: 'GROWTH',
      name: 'Growth',
      price: { month: 2499, year: 24990 },
      features: [
        '10,000 Contacts',
        '25,000 WhatsApp messages/month',
        '500 AI credits',
        '10 Users',
        'Advanced Analytics',
        'Priority Support',
        'Automation Workflows',
      ],
      popular: true,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: { month: 4999, year: 49990 },
      features: [
        '50,000 Contacts',
        '100,000 WhatsApp messages/month',
        '2,000 AI credits',
        '25 Users',
        'White Label',
        'Dedicated Support',
        'Custom Integrations',
        'API Access',
      ],
    },
    {
      id: 'AGENCY',
      name: 'Agency',
      price: { month: 9999, year: 99990 },
      features: [
        'Unlimited Contacts',
        'Unlimited WhatsApp messages',
        '10,000 AI credits',
        'Unlimited Users',
        'Multi-tenant Support',
        'Custom Branding',
        'Premium Support',
        'SLA Guarantee',
      ],
    },
  ];

  res.json({ success: true, data: plans });
});

// Create Razorpay order
router.post('/checkout', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { plan, period } = req.body;

    if (!plan || !period) {
      return res.status(400).json({
        success: false,
        error: 'Plan and period are required'
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { email: true, name: true },
    });

    const result = await razorpayService.createRazorpayOrder(
      req.user.businessId,
      plan,
      period,
      business?.email || 'user@example.com'
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create checkout', details: error.message });
  }
});

// Verify and activate subscription
router.post('/verify', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      period
    } = req.body;

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (period === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        businessId: req.user.businessId,
        plan,
        amount: razorpayService.PLAN_PRICES[plan as keyof typeof razorpayService.PLAN_PRICES]?.[period as 'month' | 'year'] || 0,
        currency: 'INR',
        interval: period,
        startDate,
        endDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        status: 'active',
        razorpaySubId: razorpay_payment_id,
      },
    });

    // Update business plan
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        plan,
        planStartedAt: startDate,
        planExpiresAt: endDate,
        razorpaySubId: razorpay_payment_id,
      },
    });

    res.json({
      success: true,
      data: { subscription }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to verify payment', details: error.message });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { reason } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        businessId: req.user.businessId,
        status: 'active'
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Cancel in Razorpay (if applicable)
    if (subscription.razorpaySubId) {
      await razorpayService.cancelSubscription(subscription.razorpaySubId);
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: req.user.id,
      },
    });

    // Downgrade to FREE plan
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        plan: 'FREE',
      },
    });

    res.json({
      success: true,
      data: { message: 'Subscription cancelled successfully' }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to cancel subscription', details: error.message });
  }
});

// Webhook handler for Razorpay events
router.post('/webhook', async (req: any, res: any) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify webhook signature
    const crypto = await import('crypto');
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Find subscription by order ID
    const subscription = await prisma.subscription.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          razorpayPaymentId: razorpay_payment_id,
        },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoices
router.get('/invoices', authenticate, async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId: req.user.businessId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where: { businessId: req.user.businessId } }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upgrade subscription
router.post('/upgrade', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan is required' });
    }

    // Get current subscription
    const current = await prisma.subscription.findFirst({
      where: { businessId: req.user.businessId, status: 'active' },
    });

    if (current) {
      // Cancel current subscription
      await prisma.subscription.update({
        where: { id: current.id },
        data: { status: 'cancelled' },
      });
    }

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        businessId: req.user.businessId,
        plan,
        status: 'pending',
        amount: getPlanAmount(plan),
      },
    });

    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change payment method
router.put('/payment-method', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { paymentMethodId } = req.body;

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { paymentMethodId },
    });

    res.json({ success: true, message: 'Payment method updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getPlanAmount(plan: string): number {
  const amounts: Record<string, number> = {
    starter: 499,
    professional: 1499,
    enterprise: 4999,
  };
  return amounts[plan] || 499;
}

export default router;
try {
  const event = req.body.event;
  const payload = req.body.payload;

  const result = await razorpayService.handleWebhook(event, payload);

  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: result.data });
} catch (error: any) {
  res.status(500).json({ success: false, error: 'Webhook handling failed', details: error.message });
}
});

export default router;
