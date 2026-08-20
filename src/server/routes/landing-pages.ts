import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// List landing pages
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId: req.user.businessId };
    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (status) where.status = status;

    const [pages, total] = await Promise.all([
      prisma.landingPage.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' } }),
      prisma.landingPage.count({ where }),
    ]);

    res.json({
      success: true,
      data: { pages, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) } },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch landing pages', details: error.message });
  }
});

// Get single landing page
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = await prisma.landingPage.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!page) return res.status(404).json({ success: false, error: 'Landing page not found' });
    res.json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch landing page', details: error.message });
  }
});

// Create landing page
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, blocks, content, html, status } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, error: 'Name and slug are required' });

    const existing = await prisma.landingPage.findFirst({ where: { businessId: req.user.businessId, slug } });
    if (existing) return res.status(400).json({ success: false, error: 'Slug already exists' });

    const page = await prisma.landingPage.create({
      data: { businessId: req.user.businessId, name, slug, blocks: blocks || [], content, html, status: status || 'DRAFT' },
    });
    res.status(201).json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create landing page', details: error.message });
  }
});

// Update landing page
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.landingPage.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Landing page not found' });

    const { name, slug, blocks, content, html, status } = req.body;
    if (slug && slug !== existing.slug) {
      const conflict = await prisma.landingPage.findFirst({ where: { businessId: req.user.businessId, slug, NOT: { id: req.params.id } } });
      if (conflict) return res.status(400).json({ success: false, error: 'Slug already exists' });
    }

    const page = await prisma.landingPage.update({
      where: { id: req.params.id },
      data: { name, slug, blocks, content, html, status },
    });
    res.json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update landing page', details: error.message });
  }
});

// Delete landing page
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.landingPage.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Landing page not found' });

    await prisma.landingPage.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Landing page deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete landing page', details: error.message });
  }
});

// Publish landing page (increment views on access via slug)
router.get('/published/:slug', async (req: Request, res: Response) => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
    });
    if (!page) return res.status(404).json({ success: false, error: 'Page not found' });

    // Increment view count
    await prisma.landingPage.update({ where: { id: page.id }, data: { views: { increment: 1 } } });
    res.json({ success: true, data: page });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch page', details: error.message });
  }
});

export default router;