import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireBusinessOwner } from '../middleware/auth.js';
import { getUsageStats, PLAN_LIMITS } from '../middleware/planLimits.js';
import razorpayService from '../services/razorpay.service.js';
import { AutoOnboardingService } from '../services/auto-onboarding.service.js';

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

// Get usage stats for current business
router.get('/usage', authenticate, async (req: any, res: any) => {
  try {
    const stats = await getUsageStats(req.user.businessId);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch usage', details: error.message });
  }
});

// Get plan limits reference
router.get('/limits', authenticate, async (req: any, res: any) => {
  try {
    res.json({ success: true, data: PLAN_LIMITS });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch limits' });
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
      {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: { month: 19999, year: 199990 },
        features: [
          'Unlimited Contacts',
          'Unlimited WhatsApp messages',
          'Unlimited AI credits',
          'Unlimited Users',
          'White-label',
          'Custom Integrations',
          'Dedicated Support',
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
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing required payment fields' });
    }

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

    // Fetch order from Razorpay to get authoritative plan and period (never trust client)
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (!order || order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Payment not completed' });
    }

    // Get plan and period from order notes (set during checkout creation)
    const plan = (order.notes as any)?.plan || (order.notes as any)?.subscription_plan;
    const period = (order.notes as any)?.period || (order.notes as any)?.duration || 'month';

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan not found in order details' });
    }

    const validPlans = ['FREE', 'STARTER', 'GROWTH', 'PRO', 'AGENCY', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    const existingOrderSub = await prisma.subscription.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });
    if (existingOrderSub && existingOrderSub.status === 'active') {
      return res.json({ success: true, data: { subscription: existingOrderSub } });
    }

    const expectedAmount = razorpayService.PLAN_PRICES[plan as keyof typeof razorpayService.PLAN_PRICES]?.[period as 'month' | 'year'] || 0;
    const orderAmountPaise = Number(order.amount);
    if (expectedAmount > 0 && orderAmountPaise !== expectedAmount * 100) {
      return res.status(400).json({ success: false, error: 'Amount mismatch' });
    }

    // Cancel any existing active subscription
    const existingSub = await prisma.subscription.findFirst({
      where: { businessId: req.user.businessId, status: 'active' },
    });
    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: { status: 'cancelled', cancelledAt: new Date() },
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
        razorpayOrderId: razorpay_order_id,
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
    res.status(500).json({ success: false, error: 'Payment verification failed' });
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

// Manual onboarding trigger
router.post('/onboard', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { contactId, amount, planName, paymentId } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    if (amount != null && planName) {
      const validPlan = Object.keys(razorpayService.PLAN_PRICES).includes(planName);
      if (!validPlan) {
        return res.status(400).json({ success: false, error: 'Invalid plan' });
      }
      const expectedAmount = razorpayService.PLAN_PRICES[planName as keyof typeof razorpayService.PLAN_PRICES]?.month || 0;
      if (expectedAmount > 0 && amount !== expectedAmount) {
        return res.status(400).json({ success: false, error: 'Amount does not match plan price' });
      }
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const result = await AutoOnboardingService.processPayment({
      razorpayPaymentId: paymentId || `manual_${Date.now()}`,
      razorpayOrderId: `order_${Date.now()}`,
      amount: (amount || 0) * 100,
      currency: 'INR',
      contactEmail: contact.email || undefined,
      contactPhone: contact.phone || undefined,
      contactName: contact.name,
      planName: planName || 'Custom Plan',
      metadata: { businessId: req.user.businessId },
    });

    res.json(result);
  } catch (error: any) {
    console.error('Onboard error:', error);
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

// Upgrade subscription — redirects to Razorpay checkout (no free upgrades)
router.post('/upgrade', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { plan, period = 'month' } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan is required' });
    }

    const validPlans = ['STARTER', 'GROWTH', 'PRO', 'AGENCY', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    const validPeriods = ['month', 'year'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ success: false, error: 'Period must be month or year' });
    }

    // Get business info
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { email: true, name: true },
    });

    // Create Razorpay order (forces payment — no free upgrades)
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
    res.status(500).json({ success: false, error: 'Upgrade failed' });
  }
});

// Change payment method
router.put('/payment-method', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { paymentMethodId } = req.body;

    // Update the active subscription's payment method
    const subscription = await prisma.subscription.findFirst({
      where: { businessId: req.user.businessId, status: 'active' },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { paymentMethodId },
      });
    }

    res.json({ success: true, message: 'Payment method updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MRR/ARR Analytics (Super Admin only)
router.get('/analytics/revenue', authenticate, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      currentMonthSubs,
      prevMonthSubs,
      totalActive,
      allSubs,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: 'active', currentPeriodStart: { gte: startOfMonth } },
        select: { amount: true, plan: true, interval: true },
      }),
      prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodStart: { gte: startOfPrevMonth, lt: startOfMonth },
        },
        select: { amount: true, plan: true, interval: true },
      }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.findMany({
        where: { status: { in: ['active', 'cancelled'] } },
        select: { amount: true, plan: true, interval: true, status: true, createdAt: true },
      }),
    ]);

    // Calculate MRR from all active subscriptions (normalize yearly to monthly)
    const calculateMRR = (subs: any[]) =>
      subs.reduce((sum, s) => {
        if (s.interval === 'year') return sum + (s.amount || 0) / 12;
        return sum + (s.amount || 0);
      }, 0);

    const currentMRR = calculateMRR(currentMonthSubs);
    const prevMRR = calculateMRR(prevMonthSubs);
    const ARR = currentMRR * 12;
    const mrrGrowth = prevMRR > 0 ? ((currentMRR - prevMRR) / prevMRR) * 100 : 0;

    // Churn rate
    const cancelledThisMonth = allSubs.filter(
      (s) => s.status === 'cancelled' && (s as any).cancelledAt >= startOfMonth
    ).length;
    const churnRate = totalActive > 0 ? (cancelledThisMonth / totalActive) * 100 : 0;

    // Revenue by plan
    const revenueByPlan: Record<string, number> = {};
    for (const sub of allSubs.filter((s) => s.status === 'active')) {
      revenueByPlan[sub.plan] = (revenueByPlan[sub.plan] || 0) + (sub.amount || 0);
    }

    res.json({
      success: true,
      data: {
        mrr: Math.round(currentMRR * 100) / 100,
        arr: Math.round(ARR * 100) / 100,
        mrrGrowth: Math.round(mrrGrowth * 100) / 100,
        activeSubscriptions: totalActive,
        churnRate: Math.round(churnRate * 100) / 100,
        revenueByPlan,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getPlanAmount(plan: string): number {
  const amounts: Record<string, number> = {
    STARTER: 999,
    GROWTH: 2499,
    PRO: 4999,
    AGENCY: 9999,
  };
  return amounts[plan] || 0;
}

export default router;
