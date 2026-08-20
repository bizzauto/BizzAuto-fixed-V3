import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All vCard routes require authentication
router.use(authenticate);
// Bridge: copy businessId from req.user to req for route handlers
router.use((req: AuthRequest, _res, next) => {
  (req as any).businessId = req.user?.businessId;
  next();
});

// GET /api/vcard - List all vCards for business
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const cards = await (prisma as any).vCards.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { cards } });
  } catch (err) {
    console.error('Get vCards error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch vCards' });
  }
});

// POST /api/vcard - Create new vCard
router.post('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const { name, title, company, phone, email, website, address, template, color, socialLinks } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    const card = await (prisma as any).vCards.create({
      data: {
        businessId,
        name,
        title: title || '',
        company: company || '',
        phone: phone || '',
        email: email || '',
        website: website || '',
        address: address || '',
        template: template || 'professional',
        color: color || '#2563eb',
        socialLinks: socialLinks || [],
      },
    });
    res.status(201).json({ success: true, data: { card } });
  } catch (err) {
    console.error('Create vCard error:', err);
    res.status(500).json({ success: false, error: 'Failed to create vCard' });
  }
});

// PUT /api/vcard/:id - Update vCard
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const { name, title, company, phone, email, website, address, template, color, socialLinks, status } = req.body;

    const existing = await (prisma as any).vCards.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'vCard not found' });

    const card = await (prisma as any).vCards.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(address !== undefined && { address }),
        ...(template !== undefined && { template }),
        ...(color !== undefined && { color }),
        ...(socialLinks !== undefined && { socialLinks }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ success: true, data: { card } });
  } catch (err) {
    console.error('Update vCard error:', err);
    res.status(500).json({ success: false, error: 'Failed to update vCard' });
  }
});

// DELETE /api/vcard/:id - Delete vCard
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const existing = await (prisma as any).vCards.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'vCard not found' });

    await (prisma as any).vCards.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'vCard deleted' });
  } catch (err) {
    console.error('Delete vCard error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete vCard' });
  }
});

// POST /api/vcard/:id/view - Track view
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    await (prisma as any).vCards.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// POST /api/vcard/:id/share - Track share
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    await (prisma as any).vCards.update({
      where: { id: req.params.id },
      data: { shares: { increment: 1 } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to track share' });
  }
});

// GET /api/vcard/public/:id - Public vCard view (no auth)
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const card = await (prisma as any).vCards.findUnique({ where: { id: req.params.id } });
    if (!card) return res.status(404).json({ success: false, error: 'vCard not found' });

    await (prisma as any).vCards.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
    });

    res.json({ success: true, data: { card } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch vCard' });
  }
});

// GET /api/vcard/stats - vCard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const cards = await (prisma as any).vCards.findMany({ where: { businessId } });
    const totalViews = cards.reduce((a: number, b: any) => a + b.views, 0);
    const totalShares = cards.reduce((a: number, b: any) => a + b.shares, 0);
    res.json({
      success: true,
      data: {
        total: cards.length,
        active: cards.filter((c: any) => c.status === 'active').length,
        totalViews,
        totalShares,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
