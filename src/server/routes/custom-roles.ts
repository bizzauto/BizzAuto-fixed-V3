import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Default system roles
const SYSTEM_ROLES = [
  { id: 'admin', name: 'Admin', color: 'bg-red-100 text-red-700', permissions: ['*'], isSystem: true },
  { id: 'manager', name: 'Manager', color: 'bg-blue-100 text-blue-700', permissions: ['contacts.view', 'contacts.create', 'campaigns.view', 'campaigns.create', 'campaigns.send', 'invoices.view', 'reports.view'], isSystem: true },
  { id: 'member', name: 'Member', color: 'bg-green-100 text-green-700', permissions: ['contacts.view', 'contacts.create', 'campaigns.view', 'invoices.view', 'invoices.create'], isSystem: true },
];

// List custom roles for business
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customRoles = await (prisma as any).customRole.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'asc' },
    });

    // Merge system roles with custom roles
    const allRoles = [
      ...SYSTEM_ROLES.map(r => ({ ...r, businessId: req.user.businessId })),
      ...customRoles.map(r => ({ ...r, permissions: r.permissions || [] })),
    ];

    res.json({ success: true, data: allRoles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch roles', details: error.message });
  }
});

// Create custom role
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    const existing = await (prisma as any).customRole.findFirst({ where: { businessId: req.user.businessId, name } });
    if (existing) return res.status(400).json({ success: false, error: 'Role already exists' });

    const role = await (prisma as any).customRole.create({
      data: { businessId: req.user.businessId, name, color: color || 'bg-purple-100 text-purple-700', permissions: permissions || [], isSystem: false },
    });
    res.status(201).json({ success: true, data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create role', details: error.message });
  }
});

// Update custom role
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await (prisma as any).customRole.findFirst({ where: { id: req.params.id, businessId: req.user.businessId, isSystem: false } });
    if (!existing) return res.status(404).json({ success: false, error: 'Custom role not found' });

    const { name, color, permissions } = req.body;
    if (name) {
      const conflict = await (prisma as any).customRole.findFirst({ where: { businessId: req.user.businessId, name, NOT: { id: req.params.id } } });
      if (conflict) return res.status(400).json({ success: false, error: 'Role name already exists' });
    }

    const role = await (prisma as any).customRole.update({
      where: { id: req.params.id },
      data: { name, color, permissions },
    });
    res.json({ success: true, data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update role', details: error.message });
  }
});

// Delete custom role
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await (prisma as any).customRole.findFirst({ where: { id: req.params.id, businessId: req.user.businessId, isSystem: false } });
    if (!existing) return res.status(404).json({ success: false, error: 'Custom role not found or cannot be deleted' });

    await (prisma as any).customRole.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Role deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete role', details: error.message });
  }
});

export default router;