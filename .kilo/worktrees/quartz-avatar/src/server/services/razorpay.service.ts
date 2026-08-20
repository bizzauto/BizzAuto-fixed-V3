import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret_key',
});

// Plan pricing
export const PLAN_PRICES = {
  FREE: { month: 0, year: 0 },
  STARTER: { month: 999, year: 9990 }, // ₹999/month or ₹9,990/year
  GROWTH: { month: 2499, year: 24990 }, // ₹2,499/month or ₹24,990/year
  PRO: { month: 4999, year: 49990 }, // ₹4,999/month or ₹49,990/year
  AGENCY: { month: 9999, year: 99990 }, // ₹9,999/month or ₹99,990/year
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
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret_key')
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Payment verification failed:', error);
    return false;
  }
};

// Handle webhook events
export const handleWebhook = async (event: string, payload: any) => {
  try {
    switch (event) {
      case 'payment.captured':
        // Payment successful
        console.log('Payment captured:', payload.payment.id);
        break;

      case 'payment.failed':
        // Payment failed
        console.log('Payment failed:', payload.payment.id, payload.payment.error_description);
        break;

      case 'subscription.charged':
        // Subscription renewal charged
        console.log('Subscription charged:', payload.subscription.id);
        break;

      case 'subscription.cancelled':
        // Subscription cancelled
        console.log('Subscription cancelled:', payload.subscription.id);
        break;

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
    const subscription = await razorpay.subscriptions.create({
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
