import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ==================== 1. PRODUCT REVIEWS ====================

const reviewsRouter = Router();

// Public: get approved reviews for a product
reviewsRouter.get('/public/:businessId/:productId', async (req, res: Response) => {
  try {
    const { businessId, productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = { businessId, productId, isApproved: true };

    const [reviews, totalCount] = await Promise.all([
      prisma.productReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.productReview.count({ where }),
    ]);

    const avgResult = await prisma.productReview.aggregate({
      where: { businessId, productId, isApproved: true },
      _avg: { rating: true },
    });

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: avgResult._avg.rating || 0,
        totalCount,
        page,
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: submit a review
reviewsRouter.post('/public/:businessId/:productId', async (req, res: Response) => {
  try {
    const { businessId, productId } = req.params;
    const { customerName, customerEmail, rating, title, comment } = req.body;

    if (!customerName || !rating) {
      return res.status(400).json({ success: false, error: 'customerName and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const review = await prisma.productReview.create({
      data: {
        businessId,
        productId,
        customerName,
        customerEmail: customerEmail || null,
        rating: parseInt(rating),
        title: title || null,
        comment: comment || null,
        isApproved: false,
        isVerified: false,
      },
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated: get all reviews for business
reviewsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { productId, isApproved } = req.query;

    const where: any = { businessId: req.user.businessId };
    if (productId) where.productId = productId;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, images: true, mainImage: true } } },
      }),
      prisma.productReview.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated: approve a review
reviewsRouter.patch('/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.productReview.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const updated = await prisma.productReview.update({
      where: { id: req.params.id },
      data: { isApproved: true },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated: delete a review
reviewsRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.productReview.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    await prisma.productReview.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Review deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated: review statistics
reviewsRouter.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [totalReviews, avgResult, distribution, pendingCount] = await Promise.all([
      prisma.productReview.count({ where: { businessId, isApproved: true } }),
      prisma.productReview.aggregate({ where: { businessId, isApproved: true }, _avg: { rating: true } }),
      prisma.productReview.groupBy({
        by: ['rating'],
        where: { businessId, isApproved: true },
        _count: true,
      }),
      prisma.productReview.count({ where: { businessId, isApproved: false } }),
    ]);

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distribution) {
      dist[d.rating] = d._count;
    }

    res.json({
      success: true,
      data: {
        averageRating: avgResult._avg.rating || 0,
        totalReviews,
        distribution: dist,
        pendingCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/reviews', reviewsRouter);

// ==================== 2. WISHLIST ====================

const wishlistRouter = Router();
wishlistRouter.use(authenticate);

// Get user's wishlist
wishlistRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { contactId: req.user.id },
      include: {
        product: {
          select: {
            id: true, name: true, price: true, compareAtPrice: true,
            images: true, mainImage: true, category: true, status: true, quantity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: wishlist });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to wishlist
wishlistRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const existing = await prisma.wishlist.findFirst({
      where: { contactId: req.user.id, productId },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Product already in wishlist' });
    }

    const item = await prisma.wishlist.create({
      data: {
        contactId: req.user.id,
        productId,
        businessId: product.businessId,
      },
      include: { product: { select: { id: true, name: true, price: true, images: true, mainImage: true } } },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove from wishlist
wishlistRouter.delete('/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.wishlist.findFirst({
      where: { contactId: req.user.id, productId: req.params.productId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item not found in wishlist' });
    }

    await prisma.wishlist.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if product is in wishlist
wishlistRouter.get('/check/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.wishlist.findFirst({
      where: { contactId: req.user.id, productId: req.params.productId },
    });

    res.json({ success: true, data: { isWishlisted: !!item } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/wishlist', wishlistRouter);

// ==================== 3. STOCK ALERTS ====================

const stockAlertsRouter = Router();

// Public: register for stock alert
stockAlertsRouter.post('/', async (req, res: Response) => {
  try {
    const { businessId, productId, customerEmail, customerPhone } = req.body;

    if (!businessId || !productId || (!customerEmail && !customerPhone)) {
      return res.status(400).json({ success: false, error: 'businessId, productId, and customerEmail or customerPhone are required' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const existing = await prisma.stockAlert.findFirst({
      where: { businessId, productId, customerEmail: customerEmail || null,       customerPhone: customerPhone || null, status: 'pending' },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already registered for this stock alert' });
    }

    const alert = await prisma.stockAlert.create({
      data: {
        businessId,
        productId,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        status: 'pending',
      },
    });

    res.status(201).json({ success: true, data: alert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated: list all stock alerts for business
stockAlertsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const alerts = await prisma.stockAlert.findMany({
      where: { businessId: req.user.businessId },
      include: {
        product: { select: { id: true, name: true, images: true, mainImage: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated: mark as notified
stockAlertsRouter.post('/:id/notify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.stockAlert.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Stock alert not found' });
    }

    const updated = await prisma.stockAlert.update({
      where: { id: req.params.id },
      data: { status: 'notified', notifiedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/stock-alerts', stockAlertsRouter);

// ==================== 4. SHIPPING RULES ====================

const shippingRouter = Router();

// Public: get shipping rules for a store
shippingRouter.get('/rules/:businessId', async (req, res: Response) => {
  try {
    const rules = await prisma.shippingRule.findMany({
      where: { businessId: req.params.businessId, isActive: true },
      orderBy: { minOrderAmount: 'asc' },
    });

    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: calculate shipping
shippingRouter.post('/calculate', async (req, res: Response) => {
  try {
    const { businessId, pincode, state, cartTotal } = req.body;

    if (!businessId || cartTotal === undefined) {
      return res.status(400).json({ success: false, error: 'businessId and cartTotal are required' });
    }

    const rules = await prisma.shippingRule.findMany({
      where: { businessId, isActive: true },
      orderBy: { minOrderAmount: 'desc' },
    });

    let matchedRule: any = null;
    for (const rule of rules) {
      if (rule.minOrderAmount !== null && cartTotal < rule.minOrderAmount) continue;
      if (rule.maxOrderAmount !== null && cartTotal > rule.maxOrderAmount) continue;

      if (rule.pincodePrefixes && Array.isArray(rule.pincodePrefixes) && rule.pincodePrefixes.length > 0 && pincode) {
        const matchesPincode = rule.pincodePrefixes.some((prefix: string) => pincode.startsWith(prefix));
        if (!matchesPincode) continue;
      }

      if (rule.states && Array.isArray(rule.states) && rule.states.length > 0 && state) {
        if (!rule.states.includes(state)) continue;
      }

      matchedRule = rule;
      break;
    }

    let shippingFee = 0;
    if (matchedRule) {
      if (matchedRule.freeAbove !== null && cartTotal >= matchedRule.freeAbove) {
        shippingFee = 0;
      } else {
        shippingFee = matchedRule.shippingFee;
      }
    }

    res.json({
      success: true,
      data: {
        shippingFee,
        rule: matchedRule ? { id: matchedRule.id, name: matchedRule.name } : null,
        freeShipping: shippingFee === 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticated routes
shippingRouter.get('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rules = await prisma.shippingRule.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { minOrderAmount: 'asc' },
    });

    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

shippingRouter.post('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, minOrderAmount, maxOrderAmount, shippingFee, freeAbove, pincodePrefixes, states } = req.body;

    if (!name || shippingFee === undefined) {
      return res.status(400).json({ success: false, error: 'name and shippingFee are required' });
    }

    const rule = await prisma.shippingRule.create({
      data: {
        businessId: req.user.businessId,
        name,
        minOrderAmount: minOrderAmount !== undefined ? parseFloat(minOrderAmount) : null,
        maxOrderAmount: maxOrderAmount !== undefined ? parseFloat(maxOrderAmount) : null,
        shippingFee: parseFloat(shippingFee),
        freeAbove: freeAbove !== undefined ? parseFloat(freeAbove) : null,
        pincodePrefixes: pincodePrefixes || [],
        states: states || [],
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

shippingRouter.put('/rules/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.shippingRule.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Shipping rule not found' });
    }

    const { name, minOrderAmount, maxOrderAmount, shippingFee, freeAbove, pincodePrefixes, states, isActive } = req.body;

    const updated = await prisma.shippingRule.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(minOrderAmount !== undefined && { minOrderAmount: minOrderAmount !== null ? parseFloat(minOrderAmount) : null }),
        ...(maxOrderAmount !== undefined && { maxOrderAmount: maxOrderAmount !== null ? parseFloat(maxOrderAmount) : null }),
        ...(shippingFee !== undefined && { shippingFee: parseFloat(shippingFee) }),
        ...(freeAbove !== undefined && { freeAbove: freeAbove !== null ? parseFloat(freeAbove) : null }),
        ...(pincodePrefixes !== undefined && { pincodePrefixes }),
        ...(states !== undefined && { states }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

shippingRouter.delete('/rules/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.shippingRule.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Shipping rule not found' });
    }

    await prisma.shippingRule.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Shipping rule deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/shipping', shippingRouter);

// ==================== 5. SALES ANALYTICS ====================

const analyticsRouter = Router();
analyticsRouter.use(authenticate);

analyticsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const period = (req.query.period as string) || '30d';

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '1y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const prevStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

    const [
      totalRevenueResult,
      totalOrders,
      currentPeriodOrders,
      prevPeriodOrders,
      ordersByStatus,
      topProducts,
      topCategories,
      paymentMethodBreakdown,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { businessId, createdAt: { gte: startDate }, paymentStatus: 'paid' },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.order.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.order.findMany({
        where: { businessId, createdAt: { gte: startDate } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { businessId, createdAt: { gte: prevStartDate, lt: startDate } },
        select: { total: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { businessId, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.orderItem.findMany({
        where: { order: { businessId, createdAt: { gte: startDate } }, productId: { not: null } },
        select: { productId: true, name: true, quantity: true, total: true },
        orderBy: { total: 'desc' },
        take: 10,
      }),
      prisma.orderItem.findMany({
        where: { order: { businessId, createdAt: { gte: startDate } } },
        select: { name: true, total: true },
      }),
      prisma.order.groupBy({
        by: ['gateway'],
        where: { businessId, createdAt: { gte: startDate } },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    const totalRevenue = totalRevenueResult._sum.total || 0;
    const prevRevenue = prevPeriodOrders.reduce((sum, o) => sum + o.total, 0);
    const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + o.total, 0);
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Daily revenue for the last 30 days
    const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayOrders = currentPeriodOrders.filter(
        (o) => o.createdAt >= dayStart && o.createdAt < dayEnd
      );
      dailyRevenue.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      });
    }

    // Aggregate top products
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of topProducts) {
      const key = item.productId || item.name;
      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total;
      } else {
        productMap.set(key, { name: item.name, quantity: item.quantity, revenue: item.total });
      }
    }
    const aggregatedTopProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Aggregate categories
    const categoryMap = new Map<string, number>();
    for (const item of topCategories) {
      const cat = item.name || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + item.total);
    }
    const aggregatedCategories = Array.from(categoryMap.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const statusBreakdown: Record<string, number> = {};
    for (const s of ordersByStatus) {
      statusBreakdown[s.status] = s._count;
    }

    const paymentMethods: Record<string, { count: number; total: number }> = {};
    for (const pm of paymentMethodBreakdown) {
      paymentMethods[pm.gateway || 'unknown'] = { count: pm._count, total: pm._sum.total || 0 };
    }

    // Customer stats
    const [newCustomers, returningCustomers] = await Promise.all([
      prisma.contact.count({
        where: { businessId, createdAt: { gte: startDate } },
      }),
      prisma.order.groupBy({
        by: ['contactId'],
        where: { businessId, createdAt: { lt: startDate } },
      }).then((result) => {
        const contactIds = result.map((r) => r.contactId);
        return prisma.order.findMany({
          where: { businessId, createdAt: { gte: startDate }, contactId: { in: contactIds } },
          distinct: ['contactId'],
        }).then((orders) => orders.length);
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalRevenueResult._avg.total || 0,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        ordersByStatus: statusBreakdown,
        dailyRevenue,
        topProducts: aggregatedTopProducts,
        topCategories: aggregatedCategories,
        customerStats: { newCustomers, returningCustomers },
        paymentMethodBreakdown: paymentMethods,
        period,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export orders as CSV
analyticsRouter.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { businessId: req.user.businessId },
      include: {
        contact: { select: { name: true, phone: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Order Number,Date,Customer Name,Customer Phone,Customer Email,Status,Payment Status,Subtotal,Tax,Shipping,Discount,Total,Payment Gateway,Items\n';
    const rows = orders.map((o) => {
      const items = o.items.map((i) => `${i.name} x${i.quantity}`).join('; ');
      return [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.contact?.name || '',
        o.contact?.phone || '',
        o.contact?.email || '',
        o.status,
        o.paymentStatus,
        o.subtotal,
        o.taxAmount,
        o.shippingAmount,
        o.discountAmount,
        o.total,
        o.gateway || '',
        `"${items.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csv = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/analytics', analyticsRouter);

// ==================== 6. BULK IMPORT/EXPORT ====================

const bulkRouter = Router();
bulkRouter.use(authenticate);

// Import products from CSV
bulkRouter.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ success: false, error: 'csvData string is required in request body' });
    }

    const lines = csvData.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV must have a header row and at least one data row' });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const requiredHeaders = ['name', 'price'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required CSV columns: ${missingHeaders.join(', ')}` });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map((v: string) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => {
          row[h] = values[idx] || '';
        });

        if (!row.name || !row.price) {
          errorCount++;
          errors.push({ row: i + 1, error: 'Missing name or price' });
          continue;
        }

        await prisma.product.create({
          data: {
            businessId: req.user.businessId,
            name: row.name,
            description: row.description || null,
            price: parseFloat(row.price),
            compareAtPrice: row.compareatprice ? parseFloat(row.compareatprice) : null,
            sku: row.sku || `SKU-${Date.now()}-${i}`,
            barcode: row.barcode || null,
            quantity: row.quantity ? parseInt(row.quantity) : 0,
            trackInventory: row.trackinventory !== 'false',
            images: row.images ? row.images.split(';').map((s: string) => s.trim()) : [],
            mainImage: row.mainimage || null,
            category: row.category || 'General',
            tags: row.tags ? row.tags.split(';').map((s: string) => s.trim()) : [],
            status: 'active',
            isActive: true,
          },
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push({ row: i + 1, error: err.message });
      }
    }

    res.json({
      success: true,
      data: { successCount, errorCount, errors },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export products as CSV
bulkRouter.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Name,Description,Price,Compare At Price,SKU,Barcode,Quantity,Category,Tags,Status,Active\n';
    const rows = products.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.price,
      p.compareAtPrice || '',
      p.sku || '',
      p.barcode || '',
      p.quantity,
      p.category || '',
      `"${(p.tags || []).join('; ')}"`,
      p.status,
      p.isActive,
    ].join(','));

    const csv = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/bulk', bulkRouter);

// ==================== 7. NOTIFICATIONS ====================

const notificationsRouter = Router();

// Internal: send order status notification
notificationsRouter.post('/order-status', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, status, channel = 'email' } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: 'orderId and status are required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        contact: { select: { name: true, phone: true, email: true } },
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const statusMessages: Record<string, string> = {
      pending: `Your order ${order.orderNumber} has been received and is pending confirmation.`,
      processing: `Your order ${order.orderNumber} is now being processed.`,
      shipped: `Great news! Your order ${order.orderNumber} has been shipped.`,
      delivered: `Your order ${order.orderNumber} has been delivered. Thank you for your purchase!`,
      cancelled: `Your order ${order.orderNumber} has been cancelled.`,
      refunded: `Your order ${order.orderNumber} has been refunded.`,
    };

    const message = statusMessages[status] || `Your order ${order.orderNumber} status has been updated to ${status}.`;

    const notification = await prisma.orderNotification.create({
      data: {
        businessId: order.businessId,
        orderId,
        type: status,
        title: `Order ${order.orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message,
        read: false,
      },
    });

    // Try to send via available services
    if (channel === 'email' && order.contact?.email) {
      try {
        const emailMod = await import('../services/email.service.js') as any;
        const sendEmail = emailMod.sendEmail || emailMod.EmailService?.sendEmail;
        await sendEmail({
          to: order.contact.email,
          subject: `Order ${order.orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          html: `<p>Hi ${order.contact.name || 'Customer'},</p><p>${message}</p><p>Total: ₹${order.total}</p>`,
          businessId: order.businessId,
        });
      } catch (e) {
        // Email service unavailable, don't fail
      }
    }

    if (channel === 'whatsapp' && order.contact?.phone) {
      try {
        const waMod = await import('../services/whatsapp.service.js') as any;
        const sendWhatsAppMessage = waMod.sendWhatsAppMessage || waMod.WhatsAppService?.sendTextMessage;
        await sendWhatsAppMessage({
          phone: order.contact.phone,
          message,
          businessId: order.businessId,
        });
      } catch (e) {
        // WhatsApp service unavailable, don't fail
      }
    }

    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Internal: notify customer when product is back in stock
notificationsRouter.post('/stock-alert-notify', async (req: AuthRequest, res: Response) => {
  try {
    const { stockAlertId } = req.body;

    if (!stockAlertId) {
      return res.status(400).json({ success: false, error: 'stockAlertId is required' });
    }

    const alert = await prisma.stockAlert.findUnique({
      where: { id: stockAlertId },
      include: {
        product: { select: { id: true, name: true, price: true, images: true, mainImage: true } },
      },
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Stock alert not found' });
    }

    if (alert.status === 'notified') {
      return res.status(400).json({ success: false, error: 'Customer already notified' });
    }

    const message = `Great news! "${alert.product.name}" is back in stock and available for purchase. Order now before it sells out again!`;

    // Try email
    if (alert.customerEmail) {
      try {
        const emailMod = await import('../services/email.service.js') as any;
        const sendEmail = emailMod.sendEmail || emailMod.EmailService?.sendEmail;
        await sendEmail({
          to: alert.customerEmail,
          subject: `${alert.product.name} is back in stock!`,
          html: `<p>Hi,</p><p>${message}</p><p>Price: ₹${alert.product.price}</p>`,
          businessId: alert.businessId,
        });
      } catch (e) {
        // Service unavailable
      }
    }

    // Try WhatsApp
    if (alert.customerPhone) {
      try {
        const waMod = await import('../services/whatsapp.service.js') as any;
        const sendWhatsAppMessage = waMod.sendWhatsAppMessage || waMod.WhatsAppService?.sendTextMessage;
        await sendWhatsAppMessage({
          phone: alert.customerPhone,
          message,
          businessId: alert.businessId,
        });
      } catch (e) {
        // Service unavailable
      }
    }

    await prisma.stockAlert.update({
      where: { id: stockAlertId },
      data: { status: 'notified', notifiedAt: new Date() },
    });

    res.json({ success: true, message: 'Customer notified successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/notifications', notificationsRouter);

// ==================== 8. DISCOUNT RULES ====================

const discountsRouter = Router();

// Public: validate and apply discount rules
discountsRouter.post('/validate', async (req, res: Response) => {
  try {
    const { businessId, cartItems, couponCode } = req.body;

    if (!businessId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'businessId and cartItems array are required' });
    }

    let cartTotal = 0;
    const enrichedItems: any[] = [];

    for (const item of cartItems) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, businessId },
      });
      if (!product) continue;
      const price = item.price || product.price;
      const qty = item.quantity || 1;
      cartTotal += price * qty;
      enrichedItems.push({ ...item, product, price, quantity: qty });
    }

    let discountAmount = 0;
    const appliedRules: any[] = [];

    // Check coupon code (existing coupon system)
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { businessId, code: couponCode.toUpperCase(), active: true },
      });

      if (!coupon) {
        return res.status(400).json({ success: false, error: 'Invalid coupon code' });
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, error: 'Coupon has expired' });
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
      }

      if (coupon.minOrder > 0 && cartTotal < coupon.minOrder) {
        return res.status(400).json({ success: false, error: `Minimum order of ₹${coupon.minOrder} required` });
      }

      let couponDiscount = 0;
      if (coupon.type === 'PERCENTAGE') {
        couponDiscount = (cartTotal * coupon.value) / 100;
      } else {
        couponDiscount = Math.min(coupon.value, cartTotal);
      }
      couponDiscount = Math.round(couponDiscount * 100) / 100;

      discountAmount += couponDiscount;
      appliedRules.push({
        type: coupon.type,
        code: coupon.code,
        value: coupon.value,
        discount: couponDiscount,
        description: coupon.description || `${coupon.type === 'PERCENTAGE' ? coupon.value + '%' : '₹' + coupon.value} off`,
      });
    }

    // Check discount rules for the business
    const discountRules = await prisma.discountRule.findMany({
      where: { businessId, isActive: true },
    });

    for (const rule of discountRules) {
      if (rule.minQuantity && enrichedItems.reduce((sum, i) => sum + i.quantity, 0) < rule.minQuantity) continue;

      switch (rule.type) {
        case 'PERCENTAGE': {
          let applicableTotal = 0;
          if (rule.productIds && Array.isArray(rule.productIds) && rule.productIds.length > 0) {
            for (const item of enrichedItems) {
              if (rule.productIds.includes(item.productId)) {
                applicableTotal += item.price * item.quantity;
              }
            }
          } else {
            applicableTotal = cartTotal;
          }
          const pctDiscount = Math.round((applicableTotal * rule.value) / 100 * 100) / 100;
          if (pctDiscount > 0) {
            discountAmount += pctDiscount;
            appliedRules.push({
              type: 'PERCENTAGE',
              ruleId: rule.id,
              name: rule.name,
              value: rule.value,
              discount: pctDiscount,
            });
          }
          break;
        }
        case 'FIXED': {
          const fixedDiscount = Math.min(rule.value, cartTotal - discountAmount);
          if (fixedDiscount > 0) {
            discountAmount += fixedDiscount;
            appliedRules.push({
              type: 'FIXED',
              ruleId: rule.id,
              name: rule.name,
              value: rule.value,
              discount: fixedDiscount,
            });
          }
          break;
        }
        case 'BUY_X_GET_Y': {
          const buyProductId = rule.productIds?.[0];
          const getProductId = rule.productIds?.[1];
          if (!buyProductId || !getProductId || !rule.buyX || !rule.getY) break;

          const buyProductItems = enrichedItems.filter((i) => i.productId === buyProductId);
          const totalBuyQty = buyProductItems.reduce((sum, i) => sum + i.quantity, 0);

          if (totalBuyQty >= rule.buyX) {
            const freeGetItems = Math.floor(totalBuyQty / rule.buyX) * rule.getY;
            const getProduct = enrichedItems.find((i) => i.productId === getProductId);
            if (getProduct) {
              const freeDiscount = Math.min(freeGetItems, getProduct.quantity) * getProduct.price;
              if (freeDiscount > 0) {
                discountAmount += freeDiscount;
                appliedRules.push({
                  type: 'BUY_X_GET_Y',
                  ruleId: rule.id,
                  name: rule.name,
                  discount: freeDiscount,
                  description: `Buy ${rule.buyX} get ${rule.getY} free`,
                });
              }
            }
          }
          break;
        }
        case 'BULK_DISCOUNT': {
          const minQty = rule.minQuantity || 5;
          const totalQty = enrichedItems.reduce((sum, i) => sum + i.quantity, 0);

          if (totalQty >= minQty) {
            const bulkDiscount = Math.round((cartTotal * rule.value) / 100 * 100) / 100;
            if (bulkDiscount > 0) {
              discountAmount += bulkDiscount;
              appliedRules.push({
                type: 'BULK_DISCOUNT',
                ruleId: rule.id,
                name: rule.name,
                value: rule.value,
                discount: bulkDiscount,
                description: `Bulk discount: ${rule.value}% off for ${minQty}+ items`,
              });
            }
          }
          break;
        }
      }
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    if (discountAmount > cartTotal) discountAmount = cartTotal;
    const newTotal = Math.round((cartTotal - discountAmount) * 100) / 100;

    res.json({
      success: true,
      data: {
        discountAmount,
        appliedRules,
        originalTotal: cartTotal,
        newTotal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use('/discounts', discountsRouter);

export default router;
