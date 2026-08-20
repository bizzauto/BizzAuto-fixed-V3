import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all templates
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { category, subcategory, format, isSystem } = req.query;
    const where: any = {
      OR: [{ businessId: req.user.businessId }, ...(isSystem === 'true' ? [{ isSystem: true }] : [{ isSystem: false }])],
    };
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (format) where.format = format;

    const templates = await prisma.posterTemplate.findMany({ where, orderBy: { usageCount: 'desc' } });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch templates', details: error.message });
  }
});

// Get single template
router.get('/:id', authenticate, async (req: any, res: any) => {
  try {
    const template = await prisma.posterTemplate.findFirst({
      where: { id: req.params.id, OR: [{ businessId: req.user.businessId }, { isSystem: true }] },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch template', details: error.message });
  }
});

// Create custom template
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const { name, category, templateData, thumbnailUrl } = req.body;
    const template = await prisma.posterTemplate.create({
      data: { businessId: req.user.businessId, name, category, templateData, thumbnailUrl, isSystem: false },
    });
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create template', details: error.message });
  }
});

// Update template usage count
router.post('/:id/usage', authenticate, async (req: any, res: any) => {
  try {
    await prisma.posterTemplate.update({ where: { id: req.params.id }, data: { usageCount: { increment: 1 } } });
    res.json({ success: true, message: 'Usage counted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update usage', details: error.message });
  }
});

// Generate poster from template
router.post('/generate', authenticate, async (req: any, res: any) => {
  try {
    const { templateId, userData } = req.body;
    const template = await prisma.posterTemplate.findFirst({
      where: { id: templateId, OR: [{ businessId: req.user.businessId }, { isSystem: true }] },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    // In production, this would generate an actual image using a service like Canvas, Puppeteer, or an external API
    // For now, return a placeholder response
    const generatedUrl = `https://via.placeholder.com/800x1200?text=${encodeURIComponent(template.name)}`;

    // Update usage count
    await prisma.posterTemplate.update({ where: { id: templateId }, data: { usageCount: { increment: 1 } } });

    res.json({
      success: true,
      data: {
        url: generatedUrl,
        templateId,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate poster', details: error.message });
  }
});

// Download generated poster
router.get('/:id/download', authenticate, async (req: any, res: any) => {
  try {
    const template = await prisma.posterTemplate.findFirst({
      where: { id: req.params.id, OR: [{ businessId: req.user.businessId }, { isSystem: true }] },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    // In production, this would return actual generated image file
    // For now, redirect to a placeholder
    const placeholderUrl = `https://via.placeholder.com/800x1200?text=${encodeURIComponent(template.name)}`;

    res.json({
      success: true,
      data: {
        downloadUrl: placeholderUrl,
        filename: `${template.name.replace(/\s+/g, '_')}.png`,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to download poster', details: error.message });
  }
});

export default router;
