import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../db.js';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan pricing
export const PLAN_PRICES: Record<string, { month: number; year: number }> = {
  FREE: { month: 0, year: 0 },
  STARTER: { month: 999, year: 9990 }, // ₹999/month or ₹9,990/year
  GROWTH: { month: 2499, year: 24990 }, // ₹2,499/month or ₹24,990/year
  PRO: { month: 4999, year: 49990 }, // ₹4,999/month or ₹49,990/year
  AGENCY: { month: 9999, year: 99990 }, // ₹9,999/month or ₹99,990/year
  ENTERPRISE: { month: 19999, year: 199990 },
};

// Plan display names for subscriptions
export const PLAN_NAMES: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  GROWTH: 'Growth',
  PRO: 'Pro',
  AGENCY: 'Agency',
  ENTERPRISE: 'Enterprise',
};

// Create Razorpay order
export const createRazorpayOrder = async (
  businessId: string,
  plan: string,
  duration: string,
  email: string
) => {
  try {
    const amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES]?.[duration as 'month' | 'year'] || 0;
    const amountInPaise = amount * 100; // Convert to paise

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${businessId}_${Date.now()}`,
      notes: {
        businessId,
        plan,
        duration,
        email,
      },
    };

    const order = await razorpay.orders.create(options);

    return {
      success: true,
      data: {
        orderId: order.id,
        amount: amountInPaise,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    };
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment order',
    };
  }
};

// Verify payment signature
export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  try {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const receivedBuf = Buffer.from(razorpaySignature, 'hex');
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch (error) {
    console.error('Payment verification failed:', error);
    return false;
  }
};

/**
 * Plan duration in months
 */
function getPlanDuration(duration: string): number {
  return duration === 'year' ? 12 : 1;
}

/**
 * Verify Razorpay webhook HMAC signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Handle webhook events — updates DB in real-time
 */
export const handleWebhook = async (event: string, payload: any) => {
  try {
    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment;
        const order = payload.order || {};
        const notes = order.notes || payment.notes || {};
        const businessId = notes.businessId;
        const plan = (notes.plan || 'STARTER').toUpperCase();
        const duration = (notes.duration || 'month').toLowerCase();

        console.log('Payment captured:', payment.id, 'Business:', businessId, 'Plan:', plan);

        if (!businessId) {
          console.warn('[Razorpay] payment.captured missing businessId in notes');
          break;
        }

        // Update business plan in DB
        const planDurationMonths = getPlanDuration(duration);
        const planExpiresAt = new Date();
        planExpiresAt.setMonth(planExpiresAt.getMonth() + planDurationMonths);

        await prisma.$transaction(async (tx) => {
          // Update business plan
          await tx.business.update({
            where: { id: businessId },
            data: {
              plan,
              planExpiresAt,
            },
          });

          // Create subscription record
          const existingPlan = PLAN_NAMES[plan] || plan;
          const amountInRupees = Math.round((payment.amount || 0) / 100); // Convert paise to rupees, Int
          await tx.subscription.create({
            data: {
              businessId,
              plan,
              status: 'active',
              amount: amountInRupees,
              currency: payment.currency || 'INR',
              interval: duration === 'month' ? 'monthly' : 'yearly',
              razorpayPaymentId: payment.id,
              razorpayOrderId: order.id || '',
              razorpaySubscriptionId: payload.subscription?.id || null,
              startDate: new Date(),
              endDate: planExpiresAt,
              metadata: {
                event,
                planName: existingPlan,
                duration,
                paymentMethod: payment.method,
                bank: payment.bank,
                email: notes.email || '',
              },
            },
          });

          // Log activity
          await tx.activity.create({
            data: {
              businessId,
              type: 'payment_received',
              title: `Payment received — ${existingPlan} plan`,
              content: `Payment of ₹${amountInRupees} received for ${existingPlan} plan (${duration})`,
              createdBy: 'system',
            },
          });
        });

        console.log('[Razorpay] Business plan updated:', businessId, '→', plan);
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment;
        const notes = payment.notes || {};
        const businessId = notes.businessId;
        const errorDesc = payment.error_description || 'Unknown error';

        console.log('Payment failed:', payment.id, errorDesc);

        if (businessId) {
          await prisma.activity.create({
            data: {
              businessId,
              type: 'payment_failed',
              title: 'Payment failed',
              content: `Payment failed: ${errorDesc}`,
              createdBy: 'system',
            },
          }).catch(() => {});
        }
        break;
      }

      case 'subscription.charged': {
        const subscription = payload.subscription;
        console.log('Subscription charged:', subscription.id);

        // Update subscription end date (+1 cycle)
        const existingSub = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscription.id },
        });
        if (existingSub) {
          const newEndDate = new Date();
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: { endDate: newEndDate, status: 'active' },
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = payload.subscription;
        console.log('Subscription cancelled:', subscription.id);

        // Downgrade to FREE
        const existingSub = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscription.id },
        });
        if (existingSub) {
          await prisma.$transaction(async (tx) => {
            await tx.subscription.update({
              where: { id: existingSub.id },
              data: { status: 'cancelled', endDate: new Date() },
            });
            await tx.business.update({
              where: { id: existingSub.businessId },
              data: {
                plan: 'FREE',
                planExpiresAt: null,
              },
            });
            await tx.activity.create({
              data: {
                businessId: existingSub.businessId,
                type: 'subscription_cancelled',
                title: 'Subscription cancelled',
                content: 'Your subscription has been cancelled. Plan downgraded to Free.',
                createdBy: 'system',
              },
            });
          });
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Webhook handling failed:', error);
    return { success: false, error: error.message };
  }
};

// Create subscription plan in Razorpay (for recurring payments)
export const createSubscriptionPlan = async (
  planName: string,
  amount: number,
  interval: string
) => {
  try {
    const plan = await razorpay.plans.create({
      period: interval === 'month' ? 'monthly' : 'yearly',
      interval: 1, // Every 1 period
      item: {
        name: `${planName} Plan`,
        amount: amount * 100, // In paise
        currency: 'INR',
        description: `${planName} subscription plan`,
      },
    });

    return {
      success: true,
      data: {
        planId: plan.id,
        ...plan,
      },
    };
  } catch (error: any) {
    console.error('Failed to create subscription plan:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription plan',
    };
  }
};

// Create subscription
export const createSubscription = async (
  planId: string,
  customerId: string,
  total_count: number
) => {
  try {
    const subscription = await (razorpay.subscriptions.create as any)({
      plan_id: planId,
      customer_id: customerId,
      total_count,
      addons: [],
    });

    return {
      success: true,
      data: subscription,
    };
  } catch (error: any) {
    console.error('Failed to create subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription',
    };
  }
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await razorpay.subscriptions.cancel(subscriptionId);
    return {
      success: true,
      data: subscription,
    };
  } catch (error: any) {
    console.error('Failed to cancel subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription',
    };
  }
};

// Fetch subscription
export const fetchSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return {
      success: true,
      data: subscription,
    };
  } catch (error: any) {
    console.error('Failed to fetch subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch subscription',
    };
  }
};

export { razorpay };

export default {
  createRazorpayOrder,
  verifyPaymentSignature,
  handleWebhook,
  createSubscriptionPlan,
  createSubscription,
  cancelSubscription,
  fetchSubscription,
  PLAN_PRICES,
};
