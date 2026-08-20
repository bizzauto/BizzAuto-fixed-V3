import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================================
// Middleware: authenticateClientPortal
// Extracts token from Authorization header, validates it,
// and attaches portal + contact info to req.user.
// ============================================================
async function authenticateClientPortal(req: AuthRequest, res: Response, next: Function) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Portal token required',
      });
    }

    const portal = await prisma.clientPortal.findUnique({
      where: { token },
    });

    if (!portal) {
      return res.status(401).json({
        success: false,
        error: 'Invalid portal token',
      });
    }

    if (!portal.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Portal access has been revoked',
      });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: portal.contactId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        businessId: true,
      },
    });

    req.user = {
      id: portal.contactId,
      businessId: portal.businessId,
      contactId: portal.contactId,
      portal,
      permissions: portal.permissions,
      contact,
      role: 'CLIENT',
    };

    next();
  } catch (error: any) {
    console.error('Client portal auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      details: error.message,
    });
  }
}

// ============================================================
// Helpers
// ============================================================
function hasPermission(permissions: any, required: string): boolean {
  if (!Array.isArray(permissions)) return false;
  return permissions.includes(required);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function asString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return '';
}

// ============================================================
//  ADMIN ROUTES (authenticated, /api/client-portal/)
// ============================================================

/**
 * GET /api/client-portal/
 * List all portal access entries for the authenticated business.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    const portals = await prisma.clientPortal.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with contact details
    const contactIds = [...new Set(portals.map((p) => p.contactId))];
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
      },
    });
    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    let filteredPortals = portals.map((p) => ({
      ...p,
      contact: contactMap.get(p.contactId) || null,
    }));

    // Apply search filter on enriched data
    if (search) {
      const q = (search as string).toLowerCase();
      filteredPortals = filteredPortals.filter((p) => {
        const c = p.contact;
        if (!c) return false;
        return (
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
        );
      });
    }

    const total = await prisma.clientPortal.count({ where });

    res.json({
      success: true,
      data: {
        portals: filteredPortals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('List client portals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portal entries',
      details: error.message,
    });
  }
});

/**
 * POST /api/client-portal/
 * Create portal access for a contact. Generates a unique token.
 * Body: { contactId, permissions? }
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, permissions } = req.body;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'contactId is required',
      });
    }

    // Verify the contact belongs to this business
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        businessId: req.user.businessId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Check if portal access already exists
    const existing = await prisma.clientPortal.findUnique({
      where: {
        businessId_contactId: {
          businessId: req.user.businessId,
          contactId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Portal access already exists for this contact',
        data: { portalId: existing.id },
      });
    }

    const defaultPermissions = [
      'view_invoices',
      'view_deals',
      'view_appointments',
      'make_payments',
    ];

    const portal = await prisma.clientPortal.create({
      data: {
        businessId: req.user.businessId,
        contactId,
        token: generateToken(),
        permissions: permissions ?? defaultPermissions,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...portal,
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          company: contact.company,
        },
      },
    });
  } catch (error: any) {
    console.error('Create client portal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portal access',
      details: error.message,
    });
  }
});

/**
 * PUT /api/client-portal/:id
 * Update permissions or active status for a portal entry.
 * Body: { permissions?, isActive? }
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);
    const { permissions, isActive } = req.body;

    const existing = await prisma.clientPortal.findFirst({
      where: {
        id,
        businessId: req.user.businessId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Portal entry not found',
      });
    }

    const updateData: any = {};
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const portal = await prisma.clientPortal.update({
      where: { id },
      data: updateData,
    });

    const contact = await prisma.contact.findUnique({
      where: { id: portal.contactId },
      select: { id: true, name: true, phone: true, email: true, company: true },
    });

    res.json({
      success: true,
      data: { ...portal, contact },
    });
  } catch (error: any) {
    console.error('Update client portal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update portal entry',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/client-portal/:id
 * Revoke (delete) portal access.
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);

    const existing = await prisma.clientPortal.findFirst({
      where: {
        id,
        businessId: req.user.businessId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Portal entry not found',
      });
    }

    await prisma.clientPortal.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Portal access revoked',
    });
  } catch (error: any) {
    console.error('Delete client portal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke portal access',
      details: error.message,
    });
  }
});

/**
 * GET /api/client-portal/:id/activity
 * Get portal activity log — last login, recent invoices, appointments for the portal's contact.
 */
router.get('/:id/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);

    const portal = await prisma.clientPortal.findFirst({
      where: {
        id,
        businessId: req.user.businessId,
      },
    });

    if (!portal) {
      return res.status(404).json({
        success: false,
        error: 'Portal entry not found',
      });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: portal.contactId },
      select: { id: true, name: true, email: true },
    });

    // Fetch recent activity for this contact
    const [recentInvoices, recentAppointments, recentActivities] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId: req.user.businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.appointment.findMany({
        where: {
          businessId: req.user.businessId,
          contactId: portal.contactId,
        },
        orderBy: { startTime: 'desc' },
        take: 10,
      }),
      prisma.activity.findMany({
        where: {
          businessId: req.user.businessId,
          contactId: portal.contactId,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    res.json({
      success: true,
      data: {
        portal: {
          id: portal.id,
          contact,
          isActive: portal.isActive,
          lastLoginAt: portal.lastLoginAt,
          createdAt: portal.createdAt,
        },
        recentInvoices,
        recentAppointments,
        recentActivities,
      },
    });
  } catch (error: any) {
    console.error('Get portal activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portal activity',
      details: error.message,
    });
  }
});

/**
 * POST /api/client-portal/:id/regenerate-token
 * Regenerate the token for a portal entry (invalidates old token).
 */
router.post('/:id/regenerate-token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);

    const existing = await prisma.clientPortal.findFirst({
      where: {
        id,
        businessId: req.user.businessId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Portal entry not found',
      });
    }

    const portal = await prisma.clientPortal.update({
      where: { id },
      data: { token: generateToken() },
      select: {
        id: true,
        token: true,
        contactId: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: portal,
    });
  } catch (error: any) {
    console.error('Regenerate token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate token',
      details: error.message,
    });
  }
});

// ============================================================
//  CLIENT ROUTES (token-based, /api/client-portal/p/)
// ============================================================

/**
 * POST /api/client-portal/p/login
 * Client login with token. Returns portal data and basic contact info.
 * Body: { token }
 */
router.post('/p/login', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const portal = await prisma.clientPortal.findUnique({
      where: { token },
    });

    if (!portal) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (!portal.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Portal access has been revoked. Please contact the business.',
      });
    }

    // Update last login timestamp
    await prisma.clientPortal.update({
      where: { id: portal.id },
      data: { lastLoginAt: new Date() },
    });

    const contact = await prisma.contact.findUnique({
      where: { id: portal.contactId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
      },
    });

    res.json({
      success: true,
      data: {
        portal: {
          id: portal.id,
          permissions: portal.permissions,
          createdAt: portal.createdAt,
        },
        contact,
      },
    });
  } catch (error: any) {
    console.error('Client portal login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message,
    });
  }
});

/**
 * GET /api/client-portal/p/dashboard
 * Client dashboard — summary of invoices, appointments, and deals.
 */
router.get('/p/dashboard', authenticateClientPortal, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contactId, permissions } = req.user;

    const permissionList = permissions as string[];

    const dashboard: any = {
      contact: req.user.contact,
      stats: {},
    };

    if (hasPermission(permissionList, 'view_invoices')) {
      // Scope invoices to this portal user's contact
      const portalContactDash = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { name: true, email: true, phone: true },
      });
      const dashInvoiceWhere: any = { businessId };
      if (portalContactDash?.email) dashInvoiceWhere.clientEmail = portalContactDash.email;
      else if (portalContactDash?.phone) dashInvoiceWhere.clientPhone = portalContactDash.phone;
      else dashInvoiceWhere.clientName = portalContactDash?.name || '__no_match__';
      const invoices = await prisma.invoice.findMany({
        where: dashInvoiceWhere,
        orderBy: { createdAt: 'desc' },
      });

      const totalInvoices = invoices.length;
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
      const pendingAmount = invoices
        .filter((inv) => inv.status === 'pending')
        .reduce((sum, inv) => sum + inv.amount, 0);

      dashboard.stats.invoices = {
        total: totalInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
      };
      dashboard.recentInvoices = invoices.slice(0, 5);
    }

    if (hasPermission(permissionList, 'view_appointments')) {
      const now = new Date();
      const appointments = await prisma.appointment.findMany({
        where: {
          businessId,
          contactId,
        },
        orderBy: { startTime: 'asc' },
      });

      const upcoming = appointments.filter(
        (apt) => apt.startTime >= now && apt.status !== 'cancelled'
      );
      const completed = appointments.filter((apt) => apt.status === 'completed');

      dashboard.stats.appointments = {
        total: appointments.length,
        upcoming: upcoming.length,
        completed: completed.length,
      };
      dashboard.upcomingAppointments = upcoming.slice(0, 5);
    }

    if (hasPermission(permissionList, 'view_deals')) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: {
          id: true,
          dealValue: true,
          dealStage: true,
          pipelineId: true,
          stageName: true,
          pipeline: {
            select: { id: true, name: true },
          },
        },
      });

      dashboard.stats.deals = contact
        ? {
            dealValue: contact.dealValue,
            dealStage: contact.dealStage,
            pipeline: contact.pipeline,
          }
        : null;
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error('Client dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
      details: error.message,
    });
  }
});

/**
 * GET /api/client-portal/p/invoices
 * Client's invoices.
 * Query: ?status=pending&page=1&limit=20
 */
router.get('/p/invoices', authenticateClientPortal, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, permissions } = req.user;

    if (!hasPermission(permissions, 'view_invoices')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view invoices',
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId,
    };

    if (status) {
      where.status = asString(status);
    }

    // Scope invoices to this portal user's contact — client should only see their own invoices
    const portalContactId = req.user.contactId;
    where.subscriptionId = portalContactId; // Invoice.subscriptionId is not the right field
    // Since Invoice model doesn't have a direct contactId, we scope by finding the contact's
    // documents (invoices) via the Contact relation. Invoice is a platform-level model.
    // For now, filter by the business and match clientEmail/clientPhone from the contact.
    const portalContact = await prisma.contact.findUnique({
      where: { id: portalContactId },
      select: { name: true, email: true, phone: true },
    });
    const invoiceWhere: any = { businessId, status: where.status };
    if (portalContact?.email) invoiceWhere.clientEmail = portalContact.email;
    else if (portalContact?.phone) invoiceWhere.clientPhone = portalContact.phone;
    else invoiceWhere.clientName = portalContact?.name || '__no_match__';

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.invoice.count({ where: invoiceWhere }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Client invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      details: error.message,
    });
  }
});

/**
 * GET /api/client-portal/p/appointments
 * Client's appointments.
 * Query: ?status=pending&page=1&limit=20
 */
router.get('/p/appointments', authenticateClientPortal, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contactId, permissions } = req.user;

    if (!hasPermission(permissions, 'view_appointments')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view appointments',
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId,
      contactId,
    };

    if (status) {
      where.status = asString(status);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Client appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      details: error.message,
    });
  }
});

/**
 * GET /api/client-portal/p/deals
 * Client's deals/pipeline info. Returns the contact's pipeline position and deal value.
 */
router.get('/p/deals', authenticateClientPortal, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contactId, permissions } = req.user;

    if (!hasPermission(permissions, 'view_deals')) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view deals',
      });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        name: true,
        dealValue: true,
        dealStage: true,
        stageName: true,
        pipelineId: true,
        stageId: true,
        pipeline: {
          select: {
            id: true,
            name: true,
            stages: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                order: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Get deal-related activities
    const dealActivities = await prisma.activity.findMany({
      where: {
        businessId,
        contactId,
        type: 'deal_stage_change',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        dealValue: true,
        stageFrom: true,
        stageTo: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        deal: {
          contactId: contact.id,
          contactName: contact.name,
          dealValue: contact.dealValue,
          dealStage: contact.dealStage,
          stageName: contact.stageName,
          pipeline: contact.pipeline,
        },
        activities: dealActivities,
      },
    });
  } catch (error: any) {
    console.error('Client deals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deals',
      details: error.message,
    });
  }
});

/**
 * GET /api/client-portal/p/profile
 * Client's own profile info.
 */
router.get('/p/profile', authenticateClientPortal, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, permissions } = req.user;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        city: true,
        state: true,
        createdAt: true,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    res.json({
      success: true,
      data: {
        profile: contact,
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Client profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      details: error.message,
    });
  }
});

export default router;
