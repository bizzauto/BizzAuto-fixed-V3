import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ==================== FUNNELS ====================

// List all funnels for business
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId: req.user.businessId };
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const [funnels, total] = await Promise.all([
      prisma.funnel.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { pages: true } },
        },
      }),
      prisma.funnel.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        funnels,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get funnels error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch funnels', details: error.message });
  }
});

// List funnel templates (BEFORE /:id to avoid route conflict)
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = category;

    const templates = await prisma.funnelTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });

    res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Get funnel templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates', details: error.message });
  }
});

// Get funnel with pages
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const funnel = await prisma.funnel.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        pages: { orderBy: { order: 'asc' } },
      },
    });

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    res.json({ success: true, data: funnel });
  } catch (error: any) {
    console.error('Get funnel error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch funnel', details: error.message });
  }
});

// Create funnel
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, domain, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const funnel = await prisma.funnel.create({
      data: {
        businessId: req.user.businessId,
        name,
        description,
        domain,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({ success: true, data: funnel });
  } catch (error: any) {
    console.error('Create funnel error:', error);
    res.status(500).json({ success: false, error: 'Failed to create funnel', details: error.message });
  }
});

// Update funnel
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, domain, isActive } = req.body;

    const existing = await prisma.funnel.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    const funnel = await prisma.funnel.update({
      where: { id: req.params.id },
      data: { name, description, domain, isActive },
    });

    res.json({ success: true, data: funnel });
  } catch (error: any) {
    console.error('Update funnel error:', error);
    res.status(500).json({ success: false, error: 'Failed to update funnel', details: error.message });
  }
});

// Delete funnel with all pages
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.funnel.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    await prisma.funnel.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Funnel deleted' });
  } catch (error: any) {
    console.error('Delete funnel error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete funnel', details: error.message });
  }
});

// Preview funnel as HTML
router.get('/:id/preview', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { format } = req.query;
    const isRawHtml = format === 'html';

    const funnel = await prisma.funnel.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    const pagesHtml = funnel.pages.map((page) => {
      const contentJson = page.content ? JSON.stringify(page.content) : '{}';
      return `
        <div class="funnel-page" data-page-id="${page.id}" data-slug="${page.slug}" data-type="${page.type}">
          <h2>${page.name}</h2>
          <div class="page-content" data-content='${contentJson.replace(/'/g, "&#39;")}'>
            ${page.html || '<p>No HTML rendered</p>'}
          </div>
          ${page.customCss ? `<style>${page.customCss}</style>` : ''}
          ${page.customJs ? `<script>${page.customJs}</script>` : ''}
        </div>
      `;
    }).join('\n');

    const html = `<!DOCTYPE html>\r\n<html lang="en">\r\n<head>\r\n  <meta charset="UTF-8">\r\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\r\n  <title>${funnel.name}</title>\r\n  <style>\r\n    * { margin: 0; padding: 0; box-sizing: border-box; }\r\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }\r\n    .funnel-page { padding: 2rem; border-bottom: 1px solid #eee; }\r\n    .funnel-page h2 { margin-bottom: 1rem; }\r\n  </style>\r\n</head>\r\n<body>\r\n  ${pagesHtml || '<p>No pages in this funnel</p>'}\r\n</body>\r\n</html>`;

    // If ?format=html, return raw HTML directly
    if (isRawHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    res.json({ success: true, data: { html, funnel: { id: funnel.id, name: funnel.name, pages: funnel.pages.length } } });
  } catch (error: any) {
    console.error('Preview funnel error:', error);
    res.status(500).json({ success: false, error: 'Failed to preview funnel', details: error.message });
  }
});

// ==================== FUNNEL PAGES ====================

// Add page to funnel
router.post('/:id/pages', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const funnel = await prisma.funnel.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { pages: true },
    });

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    const { name, slug, type, content, html, seoTitle, seoDescription, seoImage, customCss, customJs, conversionScript, isPublished } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Name and slug are required' });
    }

    const validTypes = ['landing', 'thank_you', 'checkout', 'opt_in', 'sales', 'order_form'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const maxOrder = funnel.pages.length > 0
      ? Math.max(...funnel.pages.map((p) => p.order))
      : -1;

    const page = await prisma.funnelPage.create({
      data: {
        funnelId: funnel.id,
        businessId: req.user.businessId,
        name,
        slug,
        type: type || 'landing',
        content: content || {},
        html,
        seoTitle,
        seoDescription,
        seoImage,
        customCss,
        customJs,
        conversionScript,
        isPublished: isPublished ?? false,
        order: maxOrder + 1,
      },
    });

    res.status(201).json({ success: true, data: page });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A page with this slug already exists in this funnel' });
    }
    console.error('Create funnel page error:', error);
    res.status(500).json({ success: false, error: 'Failed to create page', details: error.message });
  }
});

// Update funnel page
router.put('/pages/:pageId', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { pageId } = req.params;

    const existing = await prisma.funnelPage.findFirst({
      where: { id: pageId, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    const { name, slug, type, content, html, seoTitle, seoDescription, seoImage, customCss, customJs, conversionScript, isPublished, order } = req.body;

    const validTypes = ['landing', 'thank_you', 'checkout', 'opt_in', 'sales', 'order_form'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const page = await prisma.funnelPage.update({
      where: { id: pageId },
      data: {
        name,
        slug,
        type,
        content,
        html,
        seoTitle,
        seoDescription,
        seoImage,
        customCss,
        customJs,
        conversionScript,
        isPublished,
        order,
      },
    });

    res.json({ success: true, data: page });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A page with this slug already exists in this funnel' });
    }
    console.error('Update funnel page error:', error);
    res.status(500).json({ success: false, error: 'Failed to update page', details: error.message });
  }
});

// Delete funnel page
router.delete('/pages/:pageId', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { pageId } = req.params;

    const existing = await prisma.funnelPage.findFirst({
      where: { id: pageId, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    await prisma.funnelPage.delete({ where: { id: pageId } });

    res.json({ success: true, message: 'Page deleted' });
  } catch (error: any) {
    console.error('Delete funnel page error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete page', details: error.message });
  }
});

// Toggle page published status
router.patch('/pages/:pageId/publish', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { pageId } = req.params;

    const existing = await prisma.funnelPage.findFirst({
      where: { id: pageId, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    const page = await prisma.funnelPage.update({
      where: { id: pageId },
      data: { isPublished: !existing.isPublished },
    });

    res.json({ success: true, data: page });
  } catch (error: any) {
    console.error('Toggle page publish error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle publish status', details: error.message });
  }
});

// ==================== ANALYTICS & TRACKING ====================

// Track a page view
router.post('/pages/:pageId/view', async (req: AuthRequest | any, res: Response) => {
  try {
    const { pageId } = req.params;
    const { visitorId } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    const referer = req.headers['referer'] || null;

    const page = await prisma.funnelPage.findUnique({ where: { id: pageId } });
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    const view = await prisma.funnelPageView.create({
      data: {
        pageId,
        funnelId: page.funnelId,
        businessId: page.businessId,
        visitorId: visitorId || null,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
        userAgent: userAgent as string | null,
        referer: referer as string | null,
      },
    });

    res.json({ success: true, data: view });
  } catch (error: any) {
    console.error('Track page view error:', error);
    res.status(500).json({ success: false, error: 'Failed to track page view', details: error.message });
  }
});

// Get funnel analytics
router.get('/:id/analytics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const funnel = await prisma.funnel.findFirst({
      where: { id, businessId: req.user.businessId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' });
    }

    // Get total views per page
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pageViews = await prisma.funnelPageView.groupBy({
      by: ['pageId'],
      where: { funnelId: id, businessId: req.user.businessId, createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    // Get unique visitors per page (30 days)
    const uniqueVisitors = await prisma.funnelPageView.groupBy({
      by: ['pageId', 'visitorId'],
      where: { funnelId: id, businessId: req.user.businessId, createdAt: { gte: thirtyDaysAgo }, visitorId: { not: null } },
      _count: { id: true },
    });

    // Get all-time total views
    const totalViewsAllTime = await prisma.funnelPageView.count({
      where: { funnelId: id, businessId: req.user.businessId },
    });

    // Get views today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const viewsToday = await prisma.funnelPageView.count({
      where: { funnelId: id, businessId: req.user.businessId, createdAt: { gte: todayStart } },
    });

    // Build per-page analytics
    const pagesAnalytics = funnel.pages.map((page, index) => {
      const views = pageViews.find(pv => pv.pageId === page.id)?._count?.id || 0;
      const uniqueVisitorCount = new Set(
        uniqueVisitors
          .filter(uv => uv.pageId === page.id && uv.visitorId)
          .map(uv => uv.visitorId)
      ).size;

      // Conversion from previous page
      let conversionFromPrevious: number | null = null;
      if (index > 0) {
        const prevViews = pageViews.find(pv => pv.pageId === funnel.pages[index - 1].id)?._count?.id || 0;
        if (prevViews > 0) {
          conversionFromPrevious = Math.round((views / prevViews) * 100);
        }
      }

      return {
        pageId: page.id,
        pageName: page.name,
        pageType: page.type,
        slug: page.slug,
        order: page.order,
        views,
        uniqueVisitors: uniqueVisitorCount,
        conversionFromPrevious,
        isPublished: page.isPublished,
      };
    });

    // Overall analytics
    const firstPageViews = pagesAnalytics[0]?.views || 0;
    const lastPageViews = pagesAnalytics[pagesAnalytics.length - 1]?.views || 0;
    const overallConversionRate = firstPageViews > 0
      ? Math.round((lastPageViews / firstPageViews) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalViews: totalViewsAllTime,
        viewsToday,
        views30Days: pageViews.reduce((sum, pv) => sum + (pv._count?.id || 0), 0),
        overallConversionRate,
        pages: pagesAnalytics,
        funnelId: id,
        funnelName: funnel.name,
      },
    });
  } catch (error: any) {
    console.error('Get funnel analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics', details: error.message });
  }
});

// ==================== TEMPLATES ====================

// Clone template into funnel
router.post('/templates/:templateId/clone', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.params;
    const { name } = req.body;

    const template = await prisma.funnelTemplate.findUnique({ where: { id: templateId } });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const funnelName = name || `${template.name} (Copy)`;

    const funnel = await prisma.funnel.create({
      data: {
        businessId: req.user.businessId,
        name: funnelName,
        description: `Cloned from template: ${template.name}`,
      },
    });

    const templateContent = template.content as any;
    const pagesData = templateContent?.pages || [];

    if (pagesData.length > 0) {
      const pages = pagesData.map((p: any, index: number) => ({
        funnelId: funnel.id,
        businessId: req.user.businessId,
        name: p.name || `Page ${index + 1}`,
        slug: p.slug || `page-${index + 1}`,
        type: p.type || 'landing',
        content: p.content || {},
        html: p.html || null,
        seoTitle: p.seoTitle || null,
        seoDescription: p.seoDescription || null,
        seoImage: p.seoImage || null,
        customCss: p.customCss || null,
        customJs: p.customJs || null,
        conversionScript: p.conversionScript || null,
        isPublished: false,
        order: index,
      }));

      await prisma.funnelPage.createMany({ data: pages });
    }

    await prisma.funnelTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    const result = await prisma.funnel.findUnique({
      where: { id: funnel.id },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Clone template error:', error);
    res.status(500).json({ success: false, error: 'Failed to clone template', details: error.message });
  }
});

// ==================== PUBLIC ROUTE (NO AUTH) ====================

// Public page render
router.get('/p/:funnelSlug/:pageSlug', async (req: any, res: Response) => {
  try {
    const { funnelSlug, pageSlug } = req.params;

    const funnel = await prisma.funnel.findFirst({
      where: { isActive: true, domain: funnelSlug },
      include: {
        pages: {
          where: { slug: pageSlug, isPublished: true },
          take: 1,
        },
      },
    });

    if (!funnel || funnel.pages.length === 0) {
      // Fallback: try matching by funnel name slugified
      const allFunnels = await prisma.funnel.findMany({
        where: { isActive: true },
        include: {
          pages: {
            where: { slug: pageSlug, isPublished: true },
            take: 1,
          },
        },
      });

      const matched = allFunnels.find((f) => {
        const nameSlug = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return nameSlug === funnelSlug && f.pages.length > 0;
      });

      if (!matched) {
        return res.status(404).send('Page not found');
      }

      const page = matched.pages[0];
      const contentJson = page.content ? JSON.stringify(page.content) : '{}';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.seoTitle || page.name}</title>
  ${page.seoDescription ? `<meta name="description" content="${page.seoDescription}">` : ''}
  ${page.seoImage ? `<meta property="og:image" content="${page.seoImage}">` : ''}
  ${page.customCss ? `<style>${page.customCss}</style>` : ''}
</head>
<body>
  ${page.html || `<div data-content='${contentJson.replace(/'/g, "&#39;")}'></div>`}
  ${page.conversionScript || ''}
  ${page.customJs ? `<script>${page.customJs}</script>` : ''}
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    const page = funnel.pages[0];
    const contentJson = page.content ? JSON.stringify(page.content) : '{}';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.seoTitle || page.name}</title>
  ${page.seoDescription ? `<meta name="description" content="${page.seoDescription}">` : ''}
  ${page.seoImage ? `<meta property="og:image" content="${page.seoImage}">` : ''}
  ${page.customCss ? `<style>${page.customCss}</style>` : ''}
</head>
<body>
  ${page.html || `<div data-content='${contentJson.replace(/'/g, "&#39;")}'></div>`}
  ${page.conversionScript || ''}
  ${page.customJs ? `<script>${page.customJs}</script>` : ''}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Public page render error:', error);
    res.status(500).send('Internal server error');
  }
});

export default router;
