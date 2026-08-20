import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

// ==================== PLAN LIMITS MIDDLEWARE ====================
// Enforces plan limits for contacts, messages, users
// SKIPS enforcement for OWNER and SUPER_ADMIN roles

interface PlanLimits {
  contacts: number;
  messages: number;
  users: number;
  posts: number;
  posters: number;
  aiCredits: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    contacts: 500,
    messages: 100,
    users: 1,
    posts: 10,
    posters: 20,
    aiCredits: 10,
  },
  STARTER: {
    contacts: 2000,
    messages: 5000,
    users: 3,
    posts: 50,
    posters: 100,
    aiCredits: 100,
  },
  GROWTH: {
    contacts: 10000,
    messages: 25000,
    users: 10,
    posts: 200,
    posters: 500,
    aiCredits: 500,
  },
  PRO: {
    contacts: 50000,
    messages: 100000,
    users: 999999,
    posts: 1000,
    posters: 2000,
    aiCredits: 1000,
  },
  AGENCY: {
    contacts: 100000,
    messages: 100000,
    users: 999999,
    posts: 10000,
    posters: 10000,
    aiCredits: 10000,
  },
  ENTERPRISE: {
    contacts: 999999999,
    messages: 999999999,
    users: 999999,
    posts: 999999,
    posters: 999999,
    aiCredits: 999999,
  },
};

// Roles that are EXEMPT from plan limits
const EXEMPT_ROLES = ['OWNER', 'SUPER_ADMIN'];

/**
 * Check if user is exempt from plan limits
 */
function isExempt(role: string): boolean {
  return EXEMPT_ROLES.includes(role);
}

/**
 * Get plan limits for a business
 */
function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

/**
 * Middleware: Check contact limit before creating
 */
export const checkContactLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Skip for exempt roles
    if (isExempt(user.role)) return next();

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { plan: true, contactsLimit: true },
    });

    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });

    // Get plan limits
    const limits = getPlanLimits(business.plan);
    const maxContacts = business.contactsLimit || limits.contacts;

    // Count current contacts
    const currentCount = await prisma.contact.count({
      where: { businessId: user.businessId },
    });

    if (currentCount >= maxContacts) {
      return res.status(429).json({
        success: false,
        error: `Contact limit reached. Your ${business.plan} plan allows ${maxContacts} contacts. Upgrade to add more.`,
        current: currentCount,
        limit: maxContacts,
        upgrade: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Check message limit before sending
 */
export const checkMessageLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Skip for exempt roles
    if (isExempt(user.role)) return next();

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { plan: true, messagesLimit: true },
    });

    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });

    // Get plan limits
    const limits = getPlanLimits(business.plan);
    const maxMessages = business.messagesLimit || limits.messages;

    // Count messages sent this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const currentCount = await prisma.message.count({
      where: {
        businessId: user.businessId,
        direction: 'outbound',
        createdAt: { gte: monthStart },
      },
    });

    if (currentCount >= maxMessages) {
      return res.status(429).json({
        success: false,
        error: `Message limit reached. Your ${business.plan} plan allows ${maxMessages} messages/month. Upgrade to send more.`,
        current: currentCount,
        limit: maxMessages,
        upgrade: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Check user limit before adding team member
 */
export const checkUserLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Skip for exempt roles
    if (isExempt(user.role)) return next();

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { plan: true, usersLimit: true },
    });

    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });

    // Get plan limits
    const limits = getPlanLimits(business.plan);
    const maxUsers = business.usersLimit || limits.users;

    // Count current users
    const currentCount = await prisma.user.count({
      where: { businessId: user.businessId, isActive: true },
    });

    if (currentCount >= maxUsers) {
      return res.status(429).json({
        success: false,
        error: `User limit reached. Your ${business.plan} plan allows ${maxUsers} users. Upgrade to add more team members.`,
        current: currentCount,
        limit: maxUsers,
        upgrade: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Check AI credits before generating
 */
export const checkAICredits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Skip for exempt roles
    if (isExempt(user.role)) return next();

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { plan: true, aiCreditsUsed: true, aiCreditsLimit: true, aiCreditsPurchased: true },
    });

    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });

    // Get plan limits
    const limits = getPlanLimits(business.plan);
    const maxCredits = business.aiCreditsLimit || limits.aiCredits;
    const totalUsed = business.aiCreditsUsed || 0;
    const totalAvailable = maxCredits + (business.aiCreditsPurchased || 0);

    if (totalUsed >= totalAvailable) {
      return res.status(429).json({
        success: false,
        error: `AI credits exhausted. Your ${business.plan} plan includes ${maxCredits} credits. Purchase more or upgrade.`,
        used: totalUsed,
        limit: totalAvailable,
        upgrade: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Get usage stats for a business (for billing page)
 */
export const getUsageStats = async (businessId: string) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { plan: true, contactsLimit: true, messagesLimit: true, usersLimit: true },
  });

  if (!business) return null;

  const limits = getPlanLimits(business.plan);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [contactsCount, messagesCount, usersCount] = await Promise.all([
    prisma.contact.count({ where: { businessId } }),
    prisma.message.count({
      where: { businessId, direction: 'outbound', createdAt: { gte: monthStart } },
    }),
    prisma.user.count({ where: { businessId, isActive: true } }),
  ]);

  return {
    plan: business.plan,
    contacts: {
      used: contactsCount,
      limit: business.contactsLimit || limits.contacts,
    },
    messages: {
      used: messagesCount,
      limit: business.messagesLimit || limits.messages,
    },
    users: {
      used: usersCount,
      limit: business.usersLimit || limits.users,
    },
  };
};

export { PLAN_LIMITS, getPlanLimits, isExempt };
