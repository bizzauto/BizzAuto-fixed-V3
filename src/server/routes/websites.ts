import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All website routes require authentication
router.use(authenticate);
// Bridge: copy businessId from req.user to req for route handlers
router.use((req: AuthRequest, _res, next) => {
  (req as any).businessId = req.user?.businessId;
  next();
});

// GET /api/websites - List all websites for business
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const websites = await (prisma as any).websites.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { websites } });
  } catch (err) {
    console.error('Get websites error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch websites' });
  }
});

// POST /api/websites - Create new website
router.post('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const { name, slug, template, blocks } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existing = await (prisma as any).websites.findFirst({ where: { businessId, slug: finalSlug } });
    if (existing) return res.status(409).json({ success: false, error: 'A website with this slug already exists' });

    const website = await (prisma as any).websites.create({
      data: {
        businessId,
        name,
        slug: finalSlug,
        template: template || 'business',
        blocks: blocks || [],
      },
    });
    res.status(201).json({ success: true, data: { website } });
  } catch (err) {
    console.error('Create website error:', err);
    res.status(500).json({ success: false, error: 'Failed to create website' });
  }
});

// PUT /api/websites/:id - Update website
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const { name, slug, template, blocks, status, customDomain } = req.body;

    const existing = await (prisma as any).websites.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Website not found' });

    const website = await (prisma as any).websites.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(template !== undefined && { template }),
        ...(blocks !== undefined && { blocks }),
        ...(status !== undefined && { status }),
        ...(customDomain !== undefined && { customDomain }),
        ...(status === 'published' && { publishedAt: new Date() }),
      },
    });
    res.json({ success: true, data: { website } });
  } catch (err) {
    console.error('Update website error:', err);
    res.status(500).json({ success: false, error: 'Failed to update website' });
  }
});

// DELETE /api/websites/:id - Delete website
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const existing = await (prisma as any).websites.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Website not found' });

    await (prisma as any).websites.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Website deleted' });
  } catch (err) {
    console.error('Delete website error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete website' });
  }
});

// POST /api/websites/:id/publish - Publish website
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const existing = await (prisma as any).websites.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Website not found' });

    const website = await (prisma as any).websites.update({
      where: { id: req.params.id },
      data: { status: 'published', publishedAt: new Date() },
    });
    res.json({ success: true, data: { website } });
  } catch (err) {
    console.error('Publish website error:', err);
    res.status(500).json({ success: false, error: 'Failed to publish website' });
  }
});

// GET /api/websites/public/:businessId/:slug - Public website view
router.get('/public/:businessId/:slug', async (req: Request, res: Response) => {
  try {
    const website = await (prisma as any).websites.findFirst({
      where: { businessId: req.params.businessId, slug: req.params.slug, status: 'published' },
    });
    if (!website) return res.status(404).json({ success: false, error: 'Website not found' });

    await (prisma as any).websites.update({
      where: { id: website.id },
      data: { views: { increment: 1 } },
    });

    res.json({ success: true, data: { website } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch website' });
  }
});

// POST /api/websites/:id/lead - Capture lead from website
router.post('/:id/lead', async (req: Request, res: Response) => {
  try {
    const website = await (prisma as any).websites.findUnique({ where: { id: req.params.id } });
    if (!website) return res.status(404).json({ success: false, error: 'Website not found' });

    await (prisma as any).websites.update({
      where: { id: req.params.id },
      data: { leads: { increment: 1 } },
    });
    res.json({ success: true, message: 'Lead captured' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to capture lead' });
  }
});

// GET /api/websites/stats - Website statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).businessId;
    const websites = await (prisma as any).websites.findMany({ where: { businessId } });
    res.json({
      success: true,
      data: {
        total: websites.length,
        published: websites.filter((w: any) => w.status === 'published').length,
        totalViews: websites.reduce((a: number, b: any) => a + b.views, 0),
        totalLeads: websites.reduce((a: number, b: any) => a + b.leads, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
