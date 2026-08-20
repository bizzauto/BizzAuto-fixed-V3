import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Admin Platform Analytics API
 * Provides platform-wide metrics for super admins.
 * All endpoints require SUPER_ADMIN role.
 */

// GET /api/admin/analytics — Platform-wide analytics overview
router.get('/analytics', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const seventyDaysAgo = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);

    const [
      totalBusinesses,
      activeBusinesses,
      newBusinesses30d,
      previousBusinesses30d,
      totalUsers,
      newUsers30d,
      totalContacts,
      totalMessages,
      messages30d,
      previousMessages30d,
      planDistribution,
      activeSubscriptions,
      totalRevenue,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { users: { some: { isActive: true } } } }),
      prisma.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.business.count({ where: { createdAt: { gte: seventyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.contact.count(),
      prisma.message.count(),
      prisma.message.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.message.count({ where: { createdAt: { gte: seventyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.business.groupBy({ by: ['plan'], _count: true }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.aggregate({ where: { status: 'active' }, _sum: { amount: true } }),
    ]);

    const businessesGrowth = previousBusinesses30d > 0
      ? ((newBusinesses30d - previousBusinesses30d) / previousBusinesses30d) * 100
      : 0;
    const messagesGrowth = previousMessages30d > 0
      ? ((messages30d - previousMessages30d) / previousMessages30d) * 100
      : 0;

    const plans: Record<string, number> = {};
    for (const p of planDistribution) {
      plans[p.plan] = p._count;
    }

    res.json({
      success: true,
      data: {
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          new30d: newBusinesses30d,
          growth: Math.round(businessesGrowth * 100) / 100,
        },
        users: {
          total: totalUsers,
          new30d: newUsers30d,
        },
        contacts: { total: totalContacts },
        messages: {
          total: totalMessages,
          last30d: messages30d,
          growth: Math.round(messagesGrowth * 100) / 100,
        },
        plans,
        subscriptions: {
          active: activeSubscriptions,
          mrr: (totalRevenue._sum.amount || 0) / 100,
          arr: ((totalRevenue._sum.amount || 0) / 100) * 12,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FEATURE FLAGS (DB-backed) ====================

// GET /api/admin/feature-flags — Feature flags (env + DB overrides)
router.get('/feature-flags', authenticate, requireRole('SUPER_ADMIN'), async (_req: AuthRequest, res: any) => {
  try {
    const defaults: Record<string, boolean> = {
      aiCreativeStudio: true,
      voiceCalls: true,
      workflowBuilder: true,
      funnelBuilder: true,
      courseBuilder: true,
      liveChat: true,
      cartRecovery: true,
      referrals: true,
      loyaltyProgram: true,
      betaFeatures: false,
    };

    // Fetch all persisted overrides from DB
    const dbFlags = (await (prisma as any).featureFlag.findMany()) as Array<{ key: string; enabled: boolean }>;
    const dbOverrideMap = new Map(dbFlags.map(f => [f.key, f.enabled] as const));

    const flags: Record<string, { enabled: boolean; source: string }> = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const envKey = `FF_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;

      if (dbOverrideMap.has(key)) {
        // DB override takes highest priority
        flags[key] = { enabled: dbOverrideMap.get(key)!, source: 'override' };
      } else if (process.env[envKey] !== undefined) {
        flags[key] = { enabled: process.env[envKey] !== 'false', source: 'env' };
      } else {
        flags[key] = { enabled: defaultValue, source: 'default' };
      }
    }

    res.json({ success: true, data: flags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/feature-flags — Toggle feature flags (persisted to DB)
router.put('/feature-flags', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const updates: Record<string, boolean> = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Request body must be an object of flag key-value pairs' });
    }

    const updatedKeys: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'boolean') {
        // Upsert into DB: create if not exists, update if exists
        await (prisma as any).featureFlag.upsert({
          where: { key },
          create: { key, enabled: value },
          update: { enabled: value },
        });
        updatedKeys[key] = value;
      }
    }

    res.json({ success: true, message: 'Feature flags updated', data: updatedKeys });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/audit-log — Admin audit log with filtering
router.get('/audit-log', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const { page = '1', limit = '50', action, entity, businessId, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (businessId) where.businessId = businessId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/businesses — List all businesses for admin
router.get('/businesses', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const { page = '1', limit = '50', plan, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, contacts: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        businesses,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
