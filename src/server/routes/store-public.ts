import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import crypto from 'crypto';

const router = Router();

// ==================== PUBLIC STORE API (No Auth Required) ====================

// Get store info by businessId
router.get('/store/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const store = await prisma.eCommerceStore.findUnique({
      where: { businessId },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        isActive: true,
        business: {
          select: { name: true, logoUrl: true, phone: true, email: true, city: true },
        },
      },
    });

    if (!store || !store.isActive) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    res.json({ success: true, data: store });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get public products (no auth)
router.get('/store/:businessId/products', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { category, search, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      businessId,
      isActive: true,
      status: 'active',
    };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          compareAtPrice: true,
          category: true,
          quantity: true,
          images: true,
          mainImage: true,
          status: true,
          variants: {
            select: {
              id: true,
              name: true,
              options: true,
              price: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const categories = await prisma.product.findMany({
      where: { businessId, isActive: true, status: 'active' },
      select: { category: true },
      distinct: ['category'],
    });

    res.json({
      success: true,
      data: {
        products,
        categories: categories.map(c => c.category).filter(Boolean),
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single product
router.get('/store/:businessId/products/:productId', async (req: Request, res: Response) => {
  try {
    const { businessId, productId } = req.params;

    const product = await prisma.product.findFirst({
      where: { id: productId, businessId, isActive: true, status: 'active' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        compareAtPrice: true,
        category: true,
        quantity: true,
        images: true,
        mainImage: true,
        status: true,
        tags: true,
        variants: {
          select: {
            id: true,
            name: true,
            options: true,
            price: true,
            quantity: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate coupon (public)
router.post('/store/:businessId/coupons/validate', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        businessId,
        code: code.toUpperCase(),
        active: true,
      },
    });

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'Coupon has expired' });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
    }

    if (cartTotal && coupon.minOrder > 0 && cartTotal < coupon.minOrder) {
      return res.status(400).json({ success: false, error: `Minimum order of ₹${coupon.minOrder} required` });
    }

    let discount = 0;
    if (cartTotal) {
      discount = coupon.type === 'PERCENTAGE'
        ? (cartTotal * coupon.value) / 100
        : Math.min(coupon.value, cartTotal);
    }

    res.json({
      success: true,
      data: { code: coupon.code, type: coupon.type, value: coupon.value, discount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Place order (public - no auth, just businessId)
router.post('/store/:businessId/orders', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { customerName, customerPhone, customerEmail, items, shippingAddress, couponCode, paymentMethod, notes } = req.body;

    if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'customerName, customerPhone, and items are required' });
    }

    // Verify store exists
    const store = await prisma.eCommerceStore.findUnique({ where: { businessId } });
    if (!store || !store.isActive) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    // Create or find contact
    let contact = await prisma.contact.findFirst({
      where: { businessId, phone: customerPhone },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          businessId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          source: 'store',
        },
      });
    }

    // Validate and calculate
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, businessId, isActive: true },
      });
      if (!product) {
        return res.status(400).json({ success: false, error: `Product ${item.productId} not found` });
      }
      if (product.trackInventory && product.quantity < (item.quantity || 1)) {
        return res.status(400).json({ success: false, error: `"${product.name}" has only ${product.quantity} items in stock` });
      }
      const price = item.price || product.price;
      const qty = item.quantity || 1;
      subtotal += price * qty;
      orderItems.push({
        productId: item.productId,
        name: product.name + (item.variantName ? ` (${item.variantName})` : ''),
        quantity: qty,
        price,
        total: price * qty,
      });
    }

    // Apply coupon
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { businessId, code: couponCode.toUpperCase(), active: true },
      });
      if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
        if (coupon.minOrder === 0 || subtotal >= coupon.minOrder) {
          discount = coupon.type === 'PERCENTAGE' ? (subtotal * coupon.value) / 100 : Math.min(coupon.value, subtotal);
          discount = Math.round(discount * 100) / 100;
          await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        }
      }
    }

    const total = Math.max(0, subtotal - discount);
    const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          businessId,
          contactId: contact!.id,
          orderNumber,
          status: 'pending',
          paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
          subtotal,
          taxAmount: 0,
          shippingAmount: 0,
          discountAmount: discount,
          total,
          shippingAddress: shippingAddress || null,
          notes: notes || null,
          gateway: paymentMethod || 'store',
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Decrease inventory
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product?.trackInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity || 1 } },
          });
        }
      }

      return newOrder;
    });

    // Create Razorpay order if online payment
    let razorpayOrder = null;
    if (paymentMethod === 'razorpay' && process.env.RAZORPAY_KEY_ID) {
      try {
        const razorpay = (await import('razorpay')).default;
        const instance = new razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        razorpayOrder = await instance.orders.create({
          amount: Math.round(total * 100),
          currency: 'INR',
          receipt: order.id,
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { gatewayData: razorpayOrder as any },
        });
      } catch (err: any) {
        console.error('Razorpay order creation failed:', err.message);
      }
    }

    res.status(201).json({ success: true, data: { ...order, razorpayOrder } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track order (public)
router.get('/store/:businessId/track/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { businessId, orderNumber } = req.params;

    const order = await prisma.order.findFirst({
      where: { orderNumber, businessId },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
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

// Verify payment (public)
router.post('/store/:businessId/orders/:orderId/verify-payment', async (req: Request, res: Response) => {
  try {
    const { businessId, orderId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ success: false, error: 'Payment service misconfigured' });
      }
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSig === razorpay_signature) {
        const updated = await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            status: 'processing',
            gatewayData: {
              ...(order.gatewayData as any),
              payment_id: razorpay_payment_id,
              order_id: razorpay_order_id,
              signature: razorpay_signature,
            },
          },
        });

        // Record loyalty points
        try {
          const program = await prisma.loyaltyProgram.findFirst({
            where: { businessId, isActive: true },
          });
          if (program) {
            const pointsEarned = Math.floor(order.total * program.pointsPerRupee);
            await prisma.loyaltyPoints.create({
              data: {
                businessId,
                contactId: order.contactId,
                points: pointsEarned,
                type: 'earn',
                description: `Points earned for order ${order.orderNumber}`,
                orderId: order.id,
              },
            });
          }
        } catch (e) { /* non-critical */ }

        return res.json({ success: true, data: updated });
      }
    }

    return res.status(400).json({ success: false, error: 'Payment verification failed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
