import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require SUPER_ADMIN role
router.use(authenticate, requireRole('SUPER_ADMIN'));

// ==================== DASHBOARD STATS ====================

router.get('/stats', async (req: any, res: any) => {
  try {
    const [
      totalBusinesses,
      totalUsers,
      totalContacts,
      totalMessages,
      totalRevenue,
      activeSubscriptions,
      businessesByPlan,
      recentBusinesses,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.contact.count(),
      prisma.message.count(),
      prisma.subscription.aggregate({
        _sum: { amount: true },
        where: { status: 'active' },
      }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.business.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
      prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: {
            select: {
              users: true,
              contacts: true,
              messages: true,
              campaigns: true,
            },
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const planBreakdown = businessesByPlan.reduce((acc: any, item: any) => {
      acc[item.plan] = item._count.id;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalBusinesses,
        totalUsers,
        totalContacts,
        totalMessages,
        totalRevenue: totalRevenue._sum.amount || 0,
        activeSubscriptions,
        planBreakdown,
        recentBusinesses,
      },
    });
  } catch (error: any) {
    console.error('Super admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      details: error.message,
    });
  }
});

// ==================== ANALYTICS ====================

router.get('/analytics', async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const [
      newBusinesses,
      newUsers,
      newContacts,
      messagesSent,
      subscriptionsCreated,
    ] = await Promise.all([
      prisma.business.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.contact.count({ where: { createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { createdAt: { gte: startDate } } }),
      prisma.subscription.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    // Monthly revenue
    const monthlyRevenue = await prisma.subscription.aggregate({
      _sum: { amount: true },
      where: {
        status: 'active',
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    });

    // Growth trend (last 12 months)
    const growthTrend = await prisma.business.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        newBusinesses,
        newUsers,
        newContacts,
        messagesSent,
        subscriptionsCreated,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        growthTrend,
      },
    });
  } catch (error: any) {
    console.error('Super admin analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message,
    });
  }
});

// ==================== BUSINESSES ====================

// List all businesses
router.get('/businesses', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20', search, plan, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (plan) where.plan = plan;
    if (type) where.type = type;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              contacts: true,
              messages: true,
              campaigns: true,
            },
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        businesses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('List businesses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list businesses',
      details: error.message,
    });
  }
});

// Get single business
router.get('/businesses/:id', async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        contacts: { take: 20, orderBy: { createdAt: 'desc' } },
        campaigns: { take: 10, orderBy: { createdAt: 'desc' } },
        subscriptions: { orderBy: { createdAt: 'desc' } },
        _count: {
          select: {
            users: true,
            contacts: true,
            messages: true,
            campaigns: true,
            posts: true,
            reviews: true,
          },
        },
      },
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    res.json({ success: true, data: business });
  } catch (error: any) {
    console.error('Get business error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get business',
      details: error.message,
    });
  }
});

// Update business plan
router.put('/businesses/:id/plan', async (req: any, res: any) => {
  try {
    const { plan, expiresAt } = req.body;
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Plan is required',
      });
    }

    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: {
        plan,
        ...(expiresAt && { planExpiresAt: new Date(expiresAt) }),
      },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan',
      details: error.message,
    });
  }
});

// Suspend/activate business
router.put('/businesses/:id/status', async (req: any, res: any) => {
  try {
    const { isActive, reason } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        error: 'isActive is required',
      });
    }

    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: {
        // We'll use a metadata field or update all users' isActive
      },
    });

    // Update all users in this business
    await prisma.user.updateMany({
      where: { businessId: req.params.id },
      data: { isActive },
    });

    res.json({
      success: true,
      message: `Business ${isActive ? 'activated' : 'suspended'} successfully`,
      data: business,
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      details: error.message,
    });
  }
});

// ==================== USERS ====================

// List all users
router.get('/users', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20', search, role, businessId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (businessId) where.businessId = businessId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              type: true,
              plan: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list users',
      details: error.message,
    });
  }
});

// Change user role
router.put('/users/:id/role', async (req: any, res: any) => {
  try {
    const { role } = req.body;
    if (!role || !['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: SUPER_ADMIN, OWNER, ADMIN, MEMBER, VIEWER',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role',
      details: error.message,
    });
  }
});

// Suspend/activate user
router.put('/users/:id/status', async (req: any, res: any) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        error: 'isActive is required',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      data: user,
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      details: error.message,
    });
  }
});

// Delete user
router.delete('/users/:id', async (req: any, res: any) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error.message,
    });
  }
});

// ==================== SUBSCRIPTIONS ====================

router.get('/subscriptions', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              type: true,
              plan: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('List subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list subscriptions',
      details: error.message,
    });
  }
});

// ==================== PLATFORM SETTINGS ====================

// Get platform-wide settings
router.get('/settings', async (req: any, res: any) => {
  try {
    const [
      totalBusinesses,
      totalUsers,
      planDistribution,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.business.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalBusinesses,
        totalUsers,
        planDistribution: planDistribution.reduce((acc: any, item: any) => {
          acc[item.plan] = item._count.id;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      details: error.message,
    });
  }
});

export default router;
