import { Request, Response } from 'express';
import { qs } from '../utils/query.js';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: {
    contacts: number;
    users: number;
    messagesPerMonth: number;
    aiCredits: number;
    storage: number;
  };
  active: boolean;
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  razorpaySubscriptionId?: string;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Free',
    description: 'For individuals just getting started',
    price: 0,
    billingPeriod: 'monthly',
    features: ['500 Contacts', '1 User', '100 Messages/month', '10 AI Credits', 'Basic CRM'],
    limits: { contacts: 500, users: 1, messagesPerMonth: 100, aiCredits: 10, storage: 1 },
    active: true,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'For small businesses',
    price: 999,
    billingPeriod: 'monthly',
    features: ['2,000 Contacts', '3 Users', '5,000 Messages/month', '100 AI Credits', 'Full CRM', 'Email Support'],
    limits: { contacts: 2000, users: 3, messagesPerMonth: 5000, aiCredits: 100, storage: 5 },
    active: true,
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    description: 'For growing teams',
    price: 2499,
    billingPeriod: 'monthly',
    features: ['10,000 Contacts', '10 Users', '25,000 Messages/month', '500 AI Credits', 'Automation', 'Priority Support'],
    limits: { contacts: 10000, users: 10, messagesPerMonth: 25000, aiCredits: 500, storage: 25 },
    active: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'For businesses that need it all',
    price: 4999,
    billingPeriod: 'monthly',
    features: ['50,000 Contacts', 'Unlimited Users', '100,000 Messages/month', '1,000 AI Credits', 'All Features', 'Dedicated Support'],
    limits: { contacts: 50000, users: 999999, messagesPerMonth: 100000, aiCredits: 1000, storage: 100 },
    active: true,
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    description: 'For agencies managing multiple clients',
    price: 9999,
    billingPeriod: 'monthly',
    features: ['100,000 Contacts', 'Unlimited Users', '100,000 Messages/month', '10,000 AI Credits', 'Multi-tenant Support', 'Premium Support'],
    limits: { contacts: 100000, users: 999999, messagesPerMonth: 100000, aiCredits: 10000, storage: 500 },
    active: true,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom solution for large organizations',
    price: 0,
    billingPeriod: 'monthly',
    features: ['Unlimited Contacts', 'Unlimited Users', 'Unlimited Messages', '10,000 AI Credits', 'White-label', 'Custom Integrations'],
    limits: { contacts: 999999999, users: 999999, messagesPerMonth: 999999999, aiCredits: 999999, storage: 999999 },
    active: true,
  },
];

class SubscriptionService {
  private subscriptions: Subscription[] = [];

  // Get all plans
  getPlans(): SubscriptionPlan[] {
    return plans;
  }

  // Get plan by ID
  getPlan(planId: string): SubscriptionPlan | undefined {
    return plans.find(p => p.id === planId);
  }

  // Get current user's subscription
  getUserSubscription(userId: string): Subscription | undefined {
    return this.subscriptions.find(s => s.userId === userId && s.status === 'active');
  }

  // Subscribe to a plan
  async subscribe(userId: string, planId: string, billingPeriod: 'monthly' | 'yearly' = 'monthly'): Promise<Subscription> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

    const subscription: Subscription = {
      id: `sub-${Date.now()}`,
      userId,
      planId,
      plan,
      status: 'active',
      startDate,
      endDate,
      autoRenew: true,
    };

    this.subscriptions.push(subscription);
    return subscription;
  }

  // Cancel subscription
  cancel(subscriptionId: string): boolean {
    const sub = this.subscriptions.find(s => s.id === subscriptionId);
    if (sub) {
      sub.status = 'cancelled';
      sub.autoRenew = false;
      return true;
    }
    return false;
  }

  // Check plan limits
  checkLimits(userId: string, resource: keyof SubscriptionPlan['limits']): { allowed: boolean; current: number; limit: number } {
    const sub = this.getUserSubscription(userId);
    if (!sub) return { allowed: false, current: 0, limit: 0 };

    const limit = sub.plan.limits[resource];
    return { allowed: true, current: 0, limit };
  }

  // Get available upgrades
  getUpgrades(currentPlanId: string): SubscriptionPlan[] {
    const currentIndex = plans.findIndex(p => p.id === currentPlanId);
    return plans.filter(p => plans.indexOf(p) > currentIndex && p.active);
  }

  // Usage statistics
  getUsage(userId: string) {
    const sub = this.getUserSubscription(userId);
    if (!sub) return null;

    return {
      contacts: { used: 450, limit: sub.plan.limits.contacts },
      users: { used: 3, limit: sub.plan.limits.users },
      messages: { used: 2340, limit: sub.plan.limits.messagesPerMonth },
      aiCredits: { used: 45, limit: sub.plan.limits.aiCredits },
    };
  }
}

export const subscriptionService = new SubscriptionService();

// Routes
export const getPlans = (_req: Request, res: Response) => {
  res.json({ success: true, data: subscriptionService.getPlans() });
};

export const getSubscription = (req: Request, res: Response) => {
  const userId = qs(req.params.userId);
  const sub = subscriptionService.getUserSubscription(userId);
  res.json({ success: true, data: sub });
};

export const createSubscription = async (req: Request, res: Response) => {
  const { userId, planId, billingPeriod } = req.body;
  try {
    const sub = await subscriptionService.subscribe(userId, planId, billingPeriod);
    res.json({ success: true, data: sub });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const cancelSubscription = (req: Request, res: Response) => {
  const subscriptionId = qs(req.params.subscriptionId);
  const result = subscriptionService.cancel(subscriptionId);
  res.json({ success: result });
};

export const getUsage = (req: Request, res: Response) => {
  const userId = qs(req.params.userId);
  const usage = subscriptionService.getUsage(userId);
  res.json({ success: true, data: usage });
};

export const getUpgrades = (req: Request, res: Response) => {
  const planId = qs(req.params.planId);
  const upgrades = subscriptionService.getUpgrades(planId);
  res.json({ success: true, data: upgrades });
};