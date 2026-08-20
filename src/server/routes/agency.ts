import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== AGENCY CRUD ====================

// GET / - Get agency for current user (owner)
router.get('/', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
      include: {
        subAccounts: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                plan: true,
                email: true,
                phone: true,
                logoUrl: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    res.json({ success: true, data: agency });
  } catch (error: any) {
    console.error('Get agency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agency',
      details: error.message,
    });
  }
});

// POST / - Create agency
router.post('/', async (req: any, res: any) => {
  try {
    const { name, logo, website, customDomain, plan, maxSubAccounts, branding, billingConfig } =
      req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Agency name is required',
      });
    }

    const existing = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You already own an agency. Each user can own only one agency.',
      });
    }

    const agency = await prisma.agency.create({
      data: {
        ownerId: req.user.id,
        name,
        logo: logo || null,
        website: website || null,
        customDomain: customDomain || null,
        plan: plan || 'starter',
        maxSubAccounts: maxSubAccounts || 5,
        branding: branding || undefined,
        billingConfig: billingConfig || undefined,
      },
    });

    res.status(201).json({ success: true, data: agency });
  } catch (error: any) {
    console.error('Create agency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agency',
      details: error.message,
    });
  }
});

// PUT / - Update agency settings
router.put('/', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const { name, logo, website, customDomain, plan, maxSubAccounts, billingConfig } = req.body;

    const updated = await prisma.agency.update({
      where: { id: agency.id },
      data: {
        ...(name !== undefined && { name }),
        ...(logo !== undefined && { logo }),
        ...(website !== undefined && { website }),
        ...(customDomain !== undefined && { customDomain }),
        ...(plan !== undefined && { plan }),
        ...(maxSubAccounts !== undefined && { maxSubAccounts }),
        ...(billingConfig !== undefined && { billingConfig }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update agency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agency',
      details: error.message,
    });
  }
});

// ==================== SUB-ACCOUNTS ====================

// GET /sub-accounts - List sub-accounts
router.get('/sub-accounts', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const { page = '1', limit = '20', status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { agencyId: agency.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [subAccounts, total] = await Promise.all([
      prisma.subAccount.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              plan: true,
              email: true,
              phone: true,
              logoUrl: true,
              city: true,
              country: true,
              createdAt: true,
              _count: {
                select: {
                  contacts: true,
                  users: true,
                  campaigns: true,
                },
              },
            },
          },
        },
      }),
      prisma.subAccount.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        subAccounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('List sub-accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list sub-accounts',
      details: error.message,
    });
  }
});

// POST /sub-accounts - Create sub-account
router.post('/sub-accounts', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    if (!agency.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Agency is suspended',
      });
    }

    if (agency.subAccountCount >= agency.maxSubAccounts) {
      return res.status(403).json({
        success: false,
        error: `Sub-account limit reached. Current plan (${agency.plan}) allows ${agency.maxSubAccounts} sub-accounts. Upgrade to add more.`,
      });
    }

    const { businessId, name, plan, customDomain, branding } = req.body;

    if (!businessId || !name) {
      return res.status(400).json({
        success: false,
        error: 'businessId and name are required',
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    const existingLink = await prisma.subAccount.findUnique({
      where: {
        agencyId_businessId: {
          agencyId: agency.id,
          businessId,
        },
      },
    });

    if (existingLink) {
      return res.status(409).json({
        success: false,
        error: 'This business is already a sub-account of your agency',
      });
    }

    const [subAccount] = await prisma.$transaction([
      prisma.subAccount.create({
        data: {
          agencyId: agency.id,
          businessId,
          name,
          plan: plan || 'starter',
          customDomain: customDomain || null,
          branding: branding || undefined,
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              plan: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.agency.update({
        where: { id: agency.id },
        data: { subAccountCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ success: true, data: subAccount });
  } catch (error: any) {
    console.error('Create sub-account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sub-account',
      details: error.message,
    });
  }
});

// PUT /sub-accounts/:id - Update sub-account
router.put('/sub-accounts/:id', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const subAccount = await prisma.subAccount.findFirst({
      where: {
        id: req.params.id,
        agencyId: agency.id,
      },
    });

    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found',
      });
    }

    const { name, plan, customDomain, branding } = req.body;

    const updated = await prisma.subAccount.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(plan !== undefined && { plan }),
        ...(customDomain !== undefined && { customDomain }),
        ...(branding !== undefined && { branding }),
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            plan: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update sub-account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sub-account',
      details: error.message,
    });
  }
});

// PATCH /sub-accounts/:id/status - Suspend/activate sub-account
router.patch('/sub-accounts/:id/status', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const subAccount = await prisma.subAccount.findFirst({
      where: {
        id: req.params.id,
        agencyId: agency.id,
      },
    });

    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found',
      });
    }

    const { status } = req.body;

    if (!status || !['active', 'suspended', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be one of: active, suspended, cancelled',
      });
    }

    const updated = await prisma.subAccount.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({
      success: true,
      message: `Sub-account ${status === 'suspended' ? 'suspended' : status === 'cancelled' ? 'cancelled' : 'activated'} successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update sub-account status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sub-account status',
      details: error.message,
    });
  }
});

// DELETE /sub-accounts/:id - Remove sub-account
router.delete('/sub-accounts/:id', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const subAccount = await prisma.subAccount.findFirst({
      where: {
        id: req.params.id,
        agencyId: agency.id,
      },
    });

    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found',
      });
    }

    await prisma.$transaction([
      prisma.subAccount.delete({
        where: { id: req.params.id },
      }),
      prisma.agency.update({
        where: { id: agency.id },
        data: { subAccountCount: { decrement: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: 'Sub-account removed successfully',
    });
  } catch (error: any) {
    console.error('Delete sub-account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sub-account',
      details: error.message,
    });
  }
});

// ==================== STATS & BRANDING ====================

// GET /stats - Agency stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const [totalSubAccounts, activeSubAccounts, suspendedSubAccounts, cancelledSubAccounts, subAccountsByPlan] =
      await Promise.all([
        prisma.subAccount.count({ where: { agencyId: agency.id } }),
        prisma.subAccount.count({ where: { agencyId: agency.id, status: 'active' } }),
        prisma.subAccount.count({ where: { agencyId: agency.id, status: 'suspended' } }),
        prisma.subAccount.count({ where: { agencyId: agency.id, status: 'cancelled' } }),
        prisma.subAccount.groupBy({
          by: ['plan'],
          where: { agencyId: agency.id },
          _count: { id: true },
        }),
      ]);

    const planBreakdown = subAccountsByPlan.reduce((acc: any, item: any) => {
      acc[item.plan] = item._count.id;
      return acc;
    }, {});

    // Aggregate contacts across all sub-account businesses
    const subAccountBusinessIds = (
      await prisma.subAccount.findMany({
        where: { agencyId: agency.id },
        select: { businessId: true },
      })
    ).map((sa) => sa.businessId);

    const totalContacts = await prisma.contact.count({
      where: { businessId: { in: subAccountBusinessIds } },
    });

    const totalUsers = await prisma.user.count({
      where: { businessId: { in: subAccountBusinessIds } },
    });

    res.json({
      success: true,
      data: {
        agency: {
          id: agency.id,
          name: agency.name,
          plan: agency.plan,
          isActive: agency.isActive,
          maxSubAccounts: agency.maxSubAccounts,
        },
        subAccounts: {
          total: totalSubAccounts,
          active: activeSubAccounts,
          suspended: suspendedSubAccounts,
          cancelled: cancelledSubAccounts,
          availableSlots: agency.maxSubAccounts - agency.subAccountCount,
          planBreakdown,
        },
        aggregate: {
          totalContacts,
          totalUsers,
        },
      },
    });
  } catch (error: any) {
    console.error('Agency stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agency stats',
      details: error.message,
    });
  }
});

// PUT /branding - Update agency branding
router.put('/branding', async (req: any, res: any) => {
  try {
    const agency = await prisma.agency.findFirst({
      where: { ownerId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'No agency found for this user',
      });
    }

    const { primaryColor, secondaryColor, logo, favicon, customCss, companyName } = req.body;

    const currentBranding = (agency.branding as Record<string, any>) || {};

    const updatedBranding = {
      ...currentBranding,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor }),
      ...(logo !== undefined && { logo }),
      ...(favicon !== undefined && { favicon }),
      ...(customCss !== undefined && { customCss }),
      ...(companyName !== undefined && { companyName }),
    };

    const updated = await prisma.agency.update({
      where: { id: agency.id },
      data: { branding: updatedBranding },
    });

    res.json({ success: true, data: { branding: updated.branding } });
  } catch (error: any) {
    console.error('Update agency branding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agency branding',
      details: error.message,
    });
  }
});

export default router;
