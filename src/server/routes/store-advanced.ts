import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// ==================== PRODUCT BUNDLES ====================
const bundlesRouter = Router();

bundlesRouter.get('/public/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const bundles = await prisma.productBundle.findMany({
      where: { businessId, isActive: true },
      include: { items: { include: { product: true } } },
    });
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bundles' });
  }
});

bundlesRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user!.businessId;
    const bundle = await prisma.productBundle.findFirst({
      where: { id, businessId },
      include: { items: { include: { product: true } } },
    });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bundle' });
  }
});

bundlesRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, discountType, discountValue, items } = req.body;
    const businessId = req.user!.businessId;
    const bundle = await prisma.productBundle.create({
      data: {
        name,
        description,
        discountType,
        discountValue,
        businessId,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(bundle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bundle' });
  }
});

bundlesRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, discountType, discountValue, items } = req.body;
    const bundle = await prisma.productBundle.update({
      where: { id },
      data: {
        name,
        description,
        discountType,
        discountValue,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        }),
      },
      include: { items: true },
    });
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bundle' });
  }
});

bundlesRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.productBundle.delete({ where: { id } });
    res.json({ message: 'Bundle deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bundle' });
  }
});

bundlesRouter.post('/:id/order', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user!.businessId;

    const bundle = await prisma.productBundle.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

    let subtotal = 0;
    const orderItems = bundle.items.map((item) => {
      const itemTotal = item.product.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        total: itemTotal,
      };
    });

    let discount = 0;
    if (bundle.discountType === 'PERCENTAGE') {
      discount = (subtotal * bundle.discountValue) / 100;
    } else {
      discount = bundle.discountValue;
    }

    const total = Math.max(0, subtotal - discount);

    const order = await prisma.order.create({
      data: {
        contactId: req.user!.id,
        businessId,
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
        subtotal,
        total,
        discountAmount: discount,
        status: 'pending',
        items: { create: orderItems },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order from bundle' });
  }
});

router.use('/bundles', bundlesRouter);

// ==================== FLASH SALES ====================
const flashSalesRouter = Router();

flashSalesRouter.get('/public/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const now = new Date();
    const sales = await prisma.flashSale.findMany({
      where: {
        businessId,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flash sales' });
  }
});

flashSalesRouter.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const sales = await prisma.flashSale.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active flash sales' });
  }
});

flashSalesRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user!.businessId;
    const sale = await prisma.flashSale.findFirst({
      where: { id, businessId },
    });
    if (!sale) return res.status(404).json({ error: 'Flash sale not found' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flash sale' });
  }
});

flashSalesRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, discountType, discountValue, startsAt, endsAt, productIds } = req.body;
    const businessId = req.user!.businessId;
    const sale = await prisma.flashSale.create({
      data: {
        name,
        discountType,
        discountValue,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        businessId,
        isActive: true,
        productIds,
      },
    });
    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create flash sale' });
  }
});

flashSalesRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, discountType, discountValue, startsAt, endsAt, productIds } = req.body;
    const sale = await prisma.flashSale.update({
      where: { id },
      data: {
        name,
        discountType,
        discountValue,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        ...(productIds && { productIds }),
      },
    });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update flash sale' });
  }
});

flashSalesRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.flashSale.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ message: 'Flash sale deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete flash sale' });
  }
});

router.use('/flash-sales', flashSalesRouter);

// ==================== GIFT CARDS ====================
const giftCardsRouter = Router();

giftCardsRouter.post('/create', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, recipientName, recipientEmail, recipientPhone, message } = req.body;
    const purchaserContactId = req.user!.id;
    const businessId = req.user!.businessId;
    const code = `gift-${crypto.randomBytes(4).toString('hex')}`;

    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        amount,
        balance: amount,
        recipientName,
        recipientEmail,
        recipientPhone,
        message,
        purchaserContactId,
        businessId,
      },
    });
    res.status(201).json(giftCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create gift card' });
  }
});

giftCardsRouter.post('/redeem', authenticate, async (req: AuthRequest, res) => {
  try {
    const { code, amount } = req.body;
    const giftCard = await prisma.giftCard.findUnique({ where: { code } });
    if (!giftCard) return res.status(404).json({ error: 'Gift card not found' });
    if (giftCard.balance < amount) {
      return res.status(400).json({ error: 'Insufficient gift card balance' });
    }

    const updated = await prisma.giftCard.update({
      where: { code },
      data: { balance: giftCard.balance - amount },
    });
    res.json({ message: 'Gift card redeemed', balance: updated.balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to redeem gift card' });
  }
});

giftCardsRouter.get('/balance/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const giftCard = await prisma.giftCard.findUnique({
      where: { code },
      select: { code: true, balance: true, amount: true },
    });
    if (!giftCard) return res.status(404).json({ error: 'Gift card not found' });
    res.json(giftCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check balance' });
  }
});

giftCardsRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const giftCards = await prisma.giftCard.findMany({
      where: { businessId },
    });
    res.json(giftCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gift cards' });
  }
});

giftCardsRouter.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const purchaserContactId = req.user!.id;
    const giftCards = await prisma.giftCard.findMany({
      where: { purchaserContactId },
    });
    res.json(giftCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your gift cards' });
  }
});

router.use('/gift-cards', giftCardsRouter);

// ==================== RECENTLY VIEWED ====================
const recentlyViewedRouter = Router();

recentlyViewedRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const { productId } = req.body;

    const existing = await prisma.recentlyViewed.findUnique({
      where: { contactId_productId: { contactId, productId } },
    });

    if (existing) {
      await prisma.recentlyViewed.update({
        where: { id: existing.id },
        data: { viewCount: existing.viewCount + 1 },
      });
    } else {
      await prisma.recentlyViewed.create({
        data: { contactId, productId, viewCount: 1 },
      });
    }

    res.status(201).json({ message: 'View recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record view' });
  }
});

recentlyViewedRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const items = await prisma.recentlyViewed.findMany({
      where: { contactId },
      include: { product: true },
      orderBy: { viewedAt: 'desc' },
      take: 20,
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recently viewed' });
  }
});

recentlyViewedRouter.delete('/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const { productId } = req.params;
    await prisma.recentlyViewed.deleteMany({
      where: { contactId, productId },
    });
    res.json({ message: 'Removed from recently viewed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from recently viewed' });
  }
});

router.use('/recently-viewed', recentlyViewedRouter);

// ==================== PRODUCT COMPARISON ====================
const compareRouter = Router();

compareRouter.post('/save', authenticate, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.user!.id;
    const { productIds } = req.body;

    const existing = await prisma.productComparison.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.productComparison.update({
        where: { id: existing.id },
        data: { productIds, updatedAt: new Date() },
      });
      res.json({ message: 'Comparison updated', id: existing.id });
    } else {
      const comparison = await prisma.productComparison.create({
        data: { sessionId, productIds },
      });
      res.status(201).json(comparison);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save comparison' });
  }
});

compareRouter.get('/latest', authenticate, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.user!.id;
    const comparison = await prisma.productComparison.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
    if (!comparison) return res.status(404).json({ error: 'No comparison found' });
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comparison' });
  }
});

compareRouter.get('/products', authenticate, async (req: AuthRequest, res) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.status(400).json({ error: 'ids query parameter required' });
    const ids = idsParam.split(',').map((id) => id.trim());
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products for comparison' });
  }
});

router.use('/compare', compareRouter);

// ==================== MULTIPLE ADDRESSES ====================
const addressesRouter = Router();

addressesRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const addresses = await prisma.customerAddress.findMany({
      where: { contactId },
      orderBy: { isDefault: 'desc' },
    });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

addressesRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const businessId = req.user!.businessId;
    const { label, name, phone, email, address, city, state, pincode, isDefault } = req.body;

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { contactId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: { label, name, phone, email, address, city, state, pincode, isDefault, contactId, businessId },
    });
    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add address' });
  }
});

addressesRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { label, name, phone, email, address, city, state, pincode, isDefault } = req.body;

    if (isDefault) {
      const existing = await prisma.customerAddress.findUnique({ where: { id } });
      if (existing) {
        await prisma.customerAddress.updateMany({
          where: { contactId: existing.contactId, isDefault: true },
          data: { isDefault: false },
        });
      }
    }

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: { label, name, phone, email, address, city, state, pincode, isDefault },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

addressesRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.customerAddress.delete({ where: { id } });
    res.json({ message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

addressesRouter.patch('/:id/default', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const address = await prisma.customerAddress.findUnique({ where: { id } });
    if (!address) return res.status(404).json({ error: 'Address not found' });

    await prisma.customerAddress.updateMany({
      where: { contactId: address.contactId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: { isDefault: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

router.use('/addresses', addressesRouter);

// ==================== RETURN/REFUND ====================
const returnsRouter = Router();

returnsRouter.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const businessId = req.user!.businessId;
    const { orderId, reason, description, images } = req.body;

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        contactId,
        businessId,
        reason,
        description,
        images: images || [],
        status: 'pending',
      },
    });
    res.status(201).json(returnRequest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create return request' });
  }
});

returnsRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const returns = await prisma.returnRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch return requests' });
  }
});

returnsRouter.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const returns = await prisma.returnRequest.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your return requests' });
  }
});

returnsRouter.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, refundAmount, refundMethod } = req.body;

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        ...(refundAmount !== undefined && { refundAmount }),
        ...(refundMethod && { refundMethod }),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update return status' });
  }
});

returnsRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
    });
    if (!returnRequest) return res.status(404).json({ error: 'Return request not found' });
    res.json(returnRequest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch return request' });
  }
});

router.use('/returns', returnsRouter);

// ==================== SUBSCRIPTION PRODUCTS ====================
const subscriptionsRouter = Router();

subscriptionsRouter.get('/plans/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const plans = await prisma.subscriptionPlan.findMany({
      where: { businessId, isActive: true },
      include: { product: true },
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

subscriptionsRouter.post('/plans', authenticate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user!.businessId;
    const { name, description, interval, price, productId } = req.body;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        interval,
        price,
        productId,
        businessId,
        isActive: true,
      },
      include: { product: true },
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subscription plan' });
  }
});

subscriptionsRouter.put('/plans/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, interval, price, productId } = req.body;

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { name, description, interval, price, productId },
      include: { product: true },
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription plan' });
  }
});

subscriptionsRouter.delete('/plans/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ message: 'Subscription plan deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subscription plan' });
  }
});

subscriptionsRouter.post('/subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const businessId = req.user!.businessId;
    const { planId } = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Subscription plan not found' });

    const nextBillingDate = new Date();
    if (plan.interval === 'MONTHLY') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (plan.interval === 'WEEKLY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
    } else if (plan.interval === 'YEARLY') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    const subscription = await prisma.customerSubscription.create({
      data: {
        contactId,
        planId,
        businessId,
        status: 'active',
        nextBillingDate,
      },
    });
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

subscriptionsRouter.patch('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const subscription = await prisma.customerSubscription.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

subscriptionsRouter.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const contactId = req.user!.id;
    const subscriptions = await prisma.customerSubscription.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.use('/subscriptions', subscriptionsRouter);

// ==================== INVOICE PDF ====================
const invoicesRouter = Router();

invoicesRouter.get('/:orderId/pdf', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        contact: true,
      },
    }) as any;

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const subtotal = order.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );
    const taxRate = 0;
    const taxAmount = (subtotal * taxRate) / 100;

    const invoice = {
      invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
      date: order.createdAt,
      business: {
        name: '',
        address: '',
        phone: '',
        email: '',
        taxId: '',
      },
      customer: {
        name:         order.contact?.name || '',
        email: order.contact?.email || '',
        phone: order.contact?.phone || '',
      },
      items: order.items.map((item: any) => ({
        productName: item.product?.name || 'Unknown',
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
      })),
      subtotal,
      discount: order.discountAmount || 0,
      taxRate,
      taxAmount,
      total: order.total,
      status: order.status,
    };

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

router.use('/invoices', invoicesRouter);

// ==================== SOCIAL PROOF ====================
const socialProofRouter = Router();

socialProofRouter.get('/recent-purchases/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const orders = await prisma.order.findMany({
      where: { businessId, status: 'completed' },
      include: {
        contact: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const purchases = orders.flatMap((order: any) =>
      order.items.map((item: any) => {
        const fullName =         order.contact?.name || 'Customer';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || fullName;
        const lastInitial = nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0]}.` : '';

        const now = new Date();
        const diffMs = now.getTime() - new Date(order.createdAt).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeAgo = '';
        if (diffMins < 1) timeAgo = 'just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h ago`;
        else timeAgo = `${Math.floor(diffMins / 1440)}d ago`;

        return {
          customerName: `${firstName}${lastInitial}`,
          productName: item.product?.name || 'Product',
          timeAgo,
        };
      })
    );

    res.json(purchases.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent purchases' });
  }
});

socialProofRouter.get('/product-stats/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const viewCount = await prisma.recentlyViewed.aggregate({
      where: { productId },
      _sum: { viewCount: true },
    });

    const purchaseCount = await prisma.orderItem.count({
      where: { productId, order: { status: 'completed' } },
    });

    res.json({
      productId,
      viewCount: viewCount._sum.viewCount || 0,
      purchaseCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product stats' });
  }
});

router.use('/social-proof', socialProofRouter);

export default router;
