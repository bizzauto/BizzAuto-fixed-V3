import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== ECOMMERCE STORE ====================

router.get('/store', async (req: any, res: any) => {
  try {
    let store = await prisma.eCommerceStore.findUnique({
      where: { businessId: req.user.businessId },
    });
    if (!store) {
      store = await prisma.eCommerceStore.create({
        data: { businessId: req.user.businessId, platform: 'custom' },
      });
    }
    res.json({ success: true, data: store });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/store', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const store = await prisma.eCommerceStore.upsert({
      where: { businessId: req.user.businessId },
      update: req.body,
      create: { businessId: req.user.businessId, ...req.body, platform: req.body.platform || 'custom' },
    });
    res.json({ success: true, data: store });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRODUCTS ====================

router.get('/products', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20', category, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);

    res.json({ success: true, data: { products, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/products', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const product = await prisma.product.create({
      data: { businessId: req.user.businessId, ...req.body },
    });
    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/products/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id, businessId: req.user.businessId },
      data: req.body,
    });
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/products/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id, businessId: req.user.businessId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single product
router.get('/products/:id', async (req: any, res: any) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ORDERS ====================

router.get('/orders', async (req: any, res: any) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        include: { contact: { select: { name: true, phone: true, email: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders', async (req: any, res: any) => {
  try {
    const order = await prisma.order.create({
      data: { businessId: req.user.businessId, ...req.body },
    });
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/orders/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single order
router.get('/orders/:id', async (req: any, res: any) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        contact: { select: { name: true, phone: true, email: true } },
        items: true,
      },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status
router.patch('/orders/:id/status', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, processing, shipped, delivered, cancelled, or refunded'
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
