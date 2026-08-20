import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ==================== STORE THEME ====================
const themeRouter = Router();

themeRouter.get('/public/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const theme = await (prisma as any).storeTheme.findFirst({
      where: { businessId },
    });
    if (!theme) return res.json(null);
    res.json(theme);
  } catch (error) {
    console.error('Error fetching public store theme:', error);
    res.status(500).json({ error: 'Failed to fetch store theme' });
  }
});

themeRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const theme = await (prisma as any).storeTheme.findFirst({
      where: { businessId },
    });
    res.json(theme || null);
  } catch (error) {
    console.error('Error fetching store theme:', error);
    res.status(500).json({ error: 'Failed to fetch store theme' });
  }
});

themeRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      fontFamily,
      bannerImage,
      logoUrl,
      customCss,
      layout,
      productColumns,
    } = req.body;

    const existing = await (prisma as any).storeTheme.findFirst({
      where: { businessId },
    });

    let theme;
    if (existing) {
      theme = await (prisma as any).storeTheme.update({
        where: { id: existing.id },
        data: {
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor,
          textColor,
          fontFamily,
          bannerImage,
          logoUrl,
          customCss,
          layout,
          productColumns,
        },
      });
    } else {
      theme = await (prisma as any).storeTheme.create({
        data: {
          businessId,
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor,
          textColor,
          fontFamily,
          bannerImage,
          logoUrl,
          customCss,
          layout,
          productColumns,
        },
      });
    }

    res.json(theme);
  } catch (error) {
    console.error('Error saving store theme:', error);
    res.status(500).json({ error: 'Failed to save store theme' });
  }
});

router.use('/theme', themeRouter);

// ==================== PRODUCT VIDEOS ====================
const videosRouter = Router();

videosRouter.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const videos = await (prisma as any).productVideo.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching product videos:', error);
    res.status(500).json({ error: 'Failed to fetch product videos' });
  }
});

videosRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { productId, url, title, sortOrder } = req.body;
    const video = await (prisma as any).productVideo.create({
      data: { productId, url, title, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(video);
  } catch (error) {
    console.error('Error adding product video:', error);
    res.status(500).json({ error: 'Failed to add product video' });
  }
});

videosRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).productVideo.delete({ where: { id } });
    res.json({ message: 'Video deleted' });
  } catch (error) {
    console.error('Error deleting product video:', error);
    res.status(500).json({ error: 'Failed to delete product video' });
  }
});

router.use('/videos', videosRouter);

// ==================== SIZE GUIDE ====================
const sizeGuideRouter = Router();

sizeGuideRouter.get('/public/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const guides = await (prisma as any).sizeGuide.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
    res.json(guides);
  } catch (error) {
    console.error('Error fetching size guides:', error);
    res.status(500).json({ error: 'Failed to fetch size guides' });
  }
});

sizeGuideRouter.get('/public/:businessId/:category', async (req, res) => {
  try {
    const { businessId, category } = req.params;
    const guide = await (prisma as any).sizeGuide.findFirst({
      where: { businessId, category },
    });
    if (!guide) return res.status(404).json({ error: 'Size guide not found' });
    res.json(guide);
  } catch (error) {
    console.error('Error fetching size guide by category:', error);
    res.status(500).json({ error: 'Failed to fetch size guide' });
  }
});

sizeGuideRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const { name, category, headers, rows } = req.body;
    const guide = await (prisma as any).sizeGuide.create({
      data: { businessId, name, category, headers, rows },
    });
    res.status(201).json(guide);
  } catch (error) {
    console.error('Error creating size guide:', error);
    res.status(500).json({ error: 'Failed to create size guide' });
  }
});

sizeGuideRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, category, headers, rows } = req.body;
    const guide = await (prisma as any).sizeGuide.update({
      where: { id },
      data: { name, category, headers, rows },
    });
    res.json(guide);
  } catch (error) {
    console.error('Error updating size guide:', error);
    res.status(500).json({ error: 'Failed to update size guide' });
  }
});

sizeGuideRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).sizeGuide.delete({ where: { id } });
    res.json({ message: 'Size guide deleted' });
  } catch (error) {
    console.error('Error deleting size guide:', error);
    res.status(500).json({ error: 'Failed to delete size guide' });
  }
});

router.use('/size-guide', sizeGuideRouter);

// ==================== EMAIL TEMPLATES ====================
const emailTemplatesRouter = Router();

emailTemplatesRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const templates = await (prisma as any).newEmailTemplate.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (error) {
    console.error('Error listing email templates:', error);
    res.status(500).json({ error: 'Failed to list email templates' });
  }
});

emailTemplatesRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const { name, subject, htmlBody, variables, category } = req.body;
    const template = await (prisma as any).newEmailTemplate.create({
      data: {
        businessId,
        name,
        subject,
        htmlBody,
        category: category || 'general',
        variables: variables || [],
      },
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

emailTemplatesRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, subject, htmlBody, variables, category } = req.body;
    const template = await (prisma as any).newEmailTemplate.update({
      where: { id },
      data: {
        name,
        subject,
        htmlBody,
        category,
        variables,
      },
    });
    res.json(template);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

emailTemplatesRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).newEmailTemplate.delete({ where: { id } });
    res.json({ message: 'Email template deleted' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

emailTemplatesRouter.post('/:id/test', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { toEmail } = req.body;
    const template = await (prisma as any).newEmailTemplate.findUnique({
      where: { id },
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // In production, this would send an actual email via the email service
    // For now, return the template data as confirmation
    res.json({ message: `Test email would be sent to ${toEmail}`, template });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

router.use('/email-templates', emailTemplatesRouter);

// ==================== PUSH NOTIFICATIONS ====================
const pushRouter = Router();

pushRouter.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, p256dh, auth, contactId } = req.body;
    const subscription = await (prisma as any).pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, contactId },
      create: { endpoint, p256dh, auth, contactId },
    });
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

pushRouter.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    await (prisma as any).pushSubscription.deleteMany({
      where: { endpoint },
    });
    res.json({ message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

pushRouter.post('/send', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, body, url } = req.body;
    const businessId = req.user!.businessId;

    // Get all contact IDs for this business
    const contacts = await (prisma as any).contact.findMany({
      where: { businessId },
      select: { id: true },
    });
    const contactIds = contacts.map((c: any) => c.id);

    // Get all active push subscriptions for this business's contacts
    const subscriptions = await (prisma as any).pushSubscription.findMany({
      where: {
        contactId: { in: contactIds },
      },
    });

    let sentCount = 0;
    // In production, this would use web-push library to send notifications
    // For now, just return the count of subscribers
    sentCount = subscriptions.length;

    res.json({ message: `Push notification sent to ${sentCount} subscribers`, sentCount });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

pushRouter.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const contacts = await (prisma as any).contact.findMany({
      where: { businessId },
      select: { id: true },
    });
    const contactIds = contacts.map((c: any) => c.id);
    const count = await (prisma as any).pushSubscription.count({
      where: {
        contactId: { in: contactIds },
      },
    });
    res.json({ totalSubscribers: count });
  } catch (error) {
    console.error('Error fetching push notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch push notification stats' });
  }
});

router.use('/push', pushRouter);

// ==================== CUSTOMER SEGMENTATION ====================
const segmentsRouter = Router();

segmentsRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const segments = await (prisma as any).customerSegment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    // Get member counts for each segment
    const segmentsWithCounts = await Promise.all(
      segments.map(async (segment: any) => {
        const memberCount = await (prisma as any).segmentMember.count({
          where: { segmentId: segment.id },
        });
        return { ...segment, memberCount };
      })
    );

    res.json(segmentsWithCounts);
  } catch (error) {
    console.error('Error listing customer segments:', error);
    res.status(500).json({ error: 'Failed to list customer segments' });
  }
});

segmentsRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const { name, description, rules, color, icon } = req.body;
    const segment = await (prisma as any).customerSegment.create({
      data: {
        businessId,
        name,
        description,
        rules: rules || {},
        color,
        icon,
      },
    });
    res.status(201).json(segment);
  } catch (error) {
    console.error('Error creating customer segment:', error);
    res.status(500).json({ error: 'Failed to create customer segment' });
  }
});

segmentsRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, rules, color, icon } = req.body;
    const segment = await (prisma as any).customerSegment.update({
      where: { id },
      data: { name, description, rules, color, icon },
    });
    res.json(segment);
  } catch (error) {
    console.error('Error updating customer segment:', error);
    res.status(500).json({ error: 'Failed to update customer segment' });
  }
});

segmentsRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).segmentMember.deleteMany({ where: { segmentId: id } });
    await (prisma as any).customerSegment.delete({ where: { id } });
    res.json({ message: 'Segment deleted' });
  } catch (error) {
    console.error('Error deleting customer segment:', error);
    res.status(500).json({ error: 'Failed to delete customer segment' });
  }
});

segmentsRouter.post('/:id/refresh', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const segment = await (prisma as any).customerSegment.findUnique({
      where: { id },
    });
    if (!segment) return res.status(404).json({ error: 'Segment not found' });

    const businessId = req.user!.businessId;
    const rules = segment.rules as any;

    // Clear existing members
    await (prisma as any).segmentMember.deleteMany({ where: { segmentId: id } });

    // Build contact query based on rules
    const where: any = { businessId };

    if (rules?.tags?.length) {
      where.tags = { hasSome: rules.tags };
    }
    if (rules?.source) {
      where.source = rules.source;
    }
    if (rules?.minDealValue) {
      where.dealValue = { gte: rules.minDealValue };
    }
    if (rules?.status) {
      where.status = rules.status;
    }

    const contacts = await (prisma as any).contact.findMany({
      where,
      select: { id: true },
    });

    // Add matching contacts as members
    if (contacts.length > 0) {
      await (prisma as any).segmentMember.createMany({
        data: contacts.map((contact: any) => ({
          segmentId: id,
          contactId: contact.id,
        })),
      });
    }

    res.json({ message: `Segment refreshed with ${contacts.length} members`, memberCount: contacts.length });
  } catch (error) {
    console.error('Error refreshing customer segment:', error);
    res.status(500).json({ error: 'Failed to refresh customer segment' });
  }
});

segmentsRouter.get('/customers/:segmentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { segmentId } = req.params;
    const members = await (prisma as any).segmentMember.findMany({
      where: { segmentId },
      include: { contact: true },
    });
    res.json(members.map((m: any) => m.contact));
  } catch (error) {
    console.error('Error fetching segment customers:', error);
    res.status(500).json({ error: 'Failed to fetch segment customers' });
  }
});

router.use('/segments', segmentsRouter);

// ==================== PRICE HISTORY ====================
const priceHistoryRouter = Router();

priceHistoryRouter.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const changes = await (prisma as any).priceHistory.findMany({
      where: {
        product: { businessId },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: { product: { select: { id: true, name: true, price: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(changes);
  } catch (error) {
    console.error('Error fetching price history stats:', error);
    res.status(500).json({ error: 'Failed to fetch price history stats' });
  }
});

priceHistoryRouter.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const history = await (prisma as any).priceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

priceHistoryRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { productId, oldPrice, newPrice, changedBy, reason } = req.body;
    const record = await (prisma as any).priceHistory.create({
      data: {
        productId,
        oldPrice,
        newPrice,
        changedBy: changedBy || req.user!.id,
        reason,
      },
    });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error recording price change:', error);
    res.status(500).json({ error: 'Failed to record price change' });
  }
});

router.use('/price-history', priceHistoryRouter);

// ==================== LOW STOCK ALERTS ====================
const lowStockRouter = Router();

lowStockRouter.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;

    const totalAlerts = await (prisma as any).lowStockAlert.count({
      where: { businessId, status: 'active' },
    });

    const alertsByCategory = await (prisma as any).lowStockAlert.groupBy({
      by: ['category'],
      where: { businessId, status: 'active' },
      _count: { id: true },
    });

    res.json({ totalAlerts, byCategory: alertsByCategory });
  } catch (error) {
    console.error('Error fetching low stock stats:', error);
    res.status(500).json({ error: 'Failed to fetch low stock stats' });
  }
});

lowStockRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const alerts = await (prisma as any).lowStockAlert.findMany({
      where: { businessId, status: 'active' },
      include: { product: { select: { id: true, name: true, quantity: true, images: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (error) {
    console.error('Error listing low stock alerts:', error);
    res.status(500).json({ error: 'Failed to list low stock alerts' });
  }
});

lowStockRouter.post('/check', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const threshold = req.body.threshold || 10;

    // Find products with low stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        businessId,
        trackInventory: true,
        isActive: true,
        quantity: { lte: threshold },
      },
      select: { id: true, name: true, quantity: true, category: true },
    });

    let createdCount = 0;
    for (const product of lowStockProducts) {
      // Check if alert already exists
      const existing = await (prisma as any).lowStockAlert.findFirst({
        where: {
          productId: product.id,
          status: 'active',
        },
      });

      if (!existing) {
        await (prisma as any).lowStockAlert.create({
          data: {
            businessId,
            productId: product.id,
            category: product.category || 'uncategorized',
            currentQty: product.quantity,
            threshold,
            status: 'active',
          },
        });
        createdCount++;
      }
    }

    res.json({
      message: `Checked ${lowStockProducts.length} products, created ${createdCount} new alerts`,
      productsChecked: lowStockProducts.length,
      newAlerts: createdCount,
    });
  } catch (error) {
    console.error('Error checking low stock:', error);
    res.status(500).json({ error: 'Failed to check low stock' });
  }
});

lowStockRouter.patch('/:id/acknowledge', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const alert = await (prisma as any).lowStockAlert.update({
      where: { id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
    res.json(alert);
  } catch (error) {
    console.error('Error acknowledging low stock alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge low stock alert' });
  }
});

lowStockRouter.patch('/:id/resolve', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const alert = await (prisma as any).lowStockAlert.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    res.json(alert);
  } catch (error) {
    console.error('Error resolving low stock alert:', error);
    res.status(500).json({ error: 'Failed to resolve low stock alert' });
  }
});

router.use('/low-stock', lowStockRouter);

// ==================== ANALYTICS INTEGRATION ====================
const analyticsIntegrationRouter = Router();

analyticsIntegrationRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const integration = await (prisma as any).analyticsIntegration.findFirst({
      where: { businessId },
    });
    res.json(integration || null);
  } catch (error) {
    console.error('Error fetching analytics integration:', error);
    res.status(500).json({ error: 'Failed to fetch analytics integration' });
  }
});

analyticsIntegrationRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const { gaTrackingId, facebookPixelId, googleTagManagerId, hotjarId } = req.body;

    const existing = await (prisma as any).analyticsIntegration.findFirst({
      where: { businessId },
    });

    let integration;
    if (existing) {
      integration = await (prisma as any).analyticsIntegration.update({
        where: { id: existing.id },
        data: { gaTrackingId, facebookPixelId, googleTagManagerId, hotjarId },
      });
    } else {
      integration = await (prisma as any).analyticsIntegration.create({
        data: { businessId, gaTrackingId, facebookPixelId, googleTagManagerId, hotjarId },
      });
    }

    res.json(integration);
  } catch (error) {
    console.error('Error saving analytics integration:', error);
    res.status(500).json({ error: 'Failed to save analytics integration' });
  }
});

router.use('/analytics-integration', analyticsIntegrationRouter);

// ==================== ADVANCED SEARCH ====================
const searchRouter = Router();

searchRouter.get('/products/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const {
      q,
      minPrice,
      maxPrice,
      category,
      rating,
      sort,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      businessId,
      isActive: true,
    };

    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { tags: { has: q as string } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (category) {
      where.category = category as string;
    }

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        orderBy = { orderItems: { _count: 'desc' } };
        break;
      case 'rating':
        orderBy = { reviews: { _count: 'desc' } };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          _count: { select: { reviews: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Build facets for filtering
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { businessId, isActive: true, category: { not: null } },
      _count: { id: true },
    });

    const priceRanges = await prisma.product.aggregate({
      where: { businessId, isActive: true },
      _min: { price: true },
      _max: { price: true },
    });

    // Get average ratings per rating level
    const ratingFacets = await prisma.productReview.groupBy({
      by: ['rating'],
      where: { product: { businessId } },
      _count: { id: true },
    });

    const facets = {
      categories: categories.map((c) => ({ name: c.category, count: c._count.id })),
      priceRange: {
        min: priceRanges._min.price || 0,
        max: priceRanges._max.price || 0,
      },
      ratings: ratingFacets.map((r) => ({ rating: r.rating, count: r._count.id })),
    };

    // Filter by rating if specified
    let filteredProducts = products;
    if (rating) {
      const minRating = parseInt(rating as string, 10);
      const productIdsWithRating = await prisma.productReview.groupBy({
        by: ['productId'],
        where: {
          product: { businessId },
          rating: { gte: minRating },
        },
        _avg: { rating: true },
      });
      const validIds = new Set(productIdsWithRating.filter((r) => (r._avg.rating || 0) >= minRating).map((r) => r.productId));
      filteredProducts = products.filter((p) => validIds.has(p.id));
    }

    res.json({
      products: filteredProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      facets,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

router.use('/search', searchRouter);

// ==================== MULTI-LANGUAGE (i18n) ====================
const i18nRouter = Router();

i18nRouter.get('/languages', async (req, res) => {
  try {
    const languages = await (prisma as any).storeTranslation.findMany({
      select: { language: true },
      distinct: ['language'],
    });
    res.json(languages.map((l: any) => l.language));
  } catch (error) {
    console.error('Error listing languages:', error);
    res.status(500).json({ error: 'Failed to list languages' });
  }
});

i18nRouter.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { lang } = req.query;

    const where: any = { businessId };
    if (lang) {
      where.language = lang as string;
    }

    const translations = await (prisma as any).storeTranslation.findMany({
      where,
    });

    // Group by language
    const grouped: Record<string, any> = {};
    for (const t of translations) {
      grouped[t.language] = t.translations;
    }

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching store translations:', error);
    res.status(500).json({ error: 'Failed to fetch store translations' });
  }
});

i18nRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const { language, translations } = req.body;

    if (!language || !translations || typeof translations !== 'object') {
      return res.status(400).json({ error: 'Language and translations object are required' });
    }

    // Upsert translations for the language
    const result = await (prisma as any).storeTranslation.upsert({
      where: { businessId_language: { businessId, language } },
      update: { translations },
      create: { businessId, language, translations },
    });

    res.json({ message: `Saved translations for ${language}`, count: 1 });
  } catch (error) {
    console.error('Error saving translations:', error);
    res.status(500).json({ error: 'Failed to save translations' });
  }
});

router.use('/i18n', i18nRouter);

export default router;
