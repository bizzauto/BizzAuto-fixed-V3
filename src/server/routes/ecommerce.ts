import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';
import { qs, qn } from '../utils/query.js';

const router = Router();
router.use(authenticate);

// ==================== ECOMMERCE STORE ====================

router.get('/store', async (req: AuthRequest, res: Response) => {
  try {
    let store = await prisma.eCommerceStore.findUnique({
      where: { businessId: req.user.businessId },
    });
    if (!store) {
      store = await prisma.eCommerceStore.create({
        data: { businessId: req.user.businessId, name: 'My Store', provider: 'custom' },
      });
    }
    res.json({ success: true, data: store });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/store', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, url, provider, config, isActive } = req.body;
    const store = await prisma.eCommerceStore.upsert({
      where: { businessId: req.user.businessId },
      update: { name, description, url, provider, config, isActive },
      create: { businessId: req.user.businessId, name: name || 'My Store', provider: provider || 'custom', description, url, config, isActive },
    });
    res.json({ success: true, data: store });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRODUCTS ====================

router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const page = qn(req.query.page) || 1;
    const limit = qn(req.query.limit) || 20;
    const category = qs(req.query.category);
    const isActive = qs(req.query.isActive);
    const search = qs(req.query.search);
    const skip = (page - 1) * limit;
    const where: any = { businessId: req.user.businessId };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);

    res.json({ success: true, data: { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/products', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, compareAtPrice, sku, barcode, quantity, trackInventory, images, mainImage, category, tags, status, variants } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'name and price are required' });
    }

    const product = await prisma.product.create({
      data: {
        businessId: req.user.businessId,
        name,
        description: description || null,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        sku: sku || `SKU-${Date.now()}`,
        barcode: barcode || null,
        quantity: quantity !== undefined ? parseInt(quantity) : 0,
        trackInventory: trackInventory !== false,
        images: images || [],
        mainImage: mainImage || null,
        category: category || 'General',
        tags: tags || [],
        status: status || 'active',
        isActive: true,
      },
    });

    // Create variants if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map((v: any) => ({
          productId: product.id,
          name: v.name || `${v.size || ''} ${v.color || ''}`.trim(),
          options: { size: v.size, color: v.color },
          price: v.price ? parseFloat(v.price) : null,
          sku: v.sku || null,
          quantity: v.quantity !== undefined ? parseInt(v.quantity) : 0,
        })),
      });
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true },
    });

    res.status(201).json({ success: true, data: fullProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/products/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { name, description, price, compareAtPrice, sku, barcode, quantity, trackInventory, images, mainImage, category, tags, isActive, status } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(compareAtPrice !== undefined && { compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null }),
        ...(sku !== undefined && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(trackInventory !== undefined && { trackInventory }),
        ...(images !== undefined && { images }),
        ...(mainImage !== undefined && { mainImage }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags }),
        ...(isActive !== undefined && { isActive }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/products/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await prisma.productVariant.deleteMany({ where: { productId: req.params.id } });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { variants: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== COUPONS ====================

router.get('/coupons', async (req: AuthRequest, res: Response) => {
  try {
    const page = qn(req.query.page) || 1;
    const limit = qn(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where: { businessId: req.user.businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where: { businessId: req.user.businessId } }),
    ]);

    res.json({ success: true, data: { coupons, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/coupons', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt, description } = req.body;

    if (!code || !type || value === undefined) {
      return res.status(400).json({ success: false, error: 'code, type, and value are required' });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be PERCENTAGE or FIXED' });
    }

    const existing = await prisma.coupon.findFirst({
      where: { businessId: req.user.businessId, code: code.toUpperCase() },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        businessId: req.user.businessId,
        code: code.toUpperCase(),
        type: type as any,
        value: parseFloat(value),
        minOrder: minOrder ? parseFloat(minOrder) : 0,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description: description || null,
        active: true,
      },
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/coupons/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.coupon.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    const { code, type, value, minOrder, maxUses, expiresAt, description, active } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(minOrder !== undefined && { minOrder: parseFloat(minOrder) }),
        ...(maxUses !== undefined && { maxUses: maxUses !== null ? parseInt(maxUses) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
      },
    });

    res.json({ success: true, data: coupon });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/coupons/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.coupon.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate coupon
router.post('/coupons/validate', async (req: AuthRequest, res: Response) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        businessId: req.user.businessId,
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
      data: {
        ...coupon,
        discount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CART (Server-Side Persistence) ====================

router.get('/cart', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    // Find or create a contact for this user to use as cart owner
    let contact = await prisma.contact.findFirst({
      where: { businessId, email: req.user.email },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          businessId,
          name: req.user.email || 'Customer',
          email: req.user.email || undefined,
          source: 'cart',
        },
      });
    }
    const contactId = contact.id;

    let cart = await prisma.cart.findFirst({
      where: { businessId, contactId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { businessId, contactId, status: 'active' },
        include: { items: { include: { product: true } } },
      });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variantPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        ...cart,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cart/items', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    // Find or create a contact for this user
    let contact = await prisma.contact.findFirst({
      where: { businessId, email: req.user.email },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { businessId, name: req.user.email || 'Customer', email: req.user.email || undefined, source: 'cart' },
      });
    }
    const contactId = contact.id;
    const { productId, quantity = 1, variantId, variantName, variantPrice } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId, isActive: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check stock
    if (product.trackInventory && product.quantity < quantity) {
      return res.status(400).json({ success: false, error: `Only ${product.quantity} items in stock` });
    }

    // Get or create cart
    let cart = await prisma.cart.findFirst({
      where: { businessId, contactId },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { businessId, contactId, status: 'active' },
      });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.trackInventory && product.quantity < newQty) {
        return res.status(400).json({ success: false, error: `Only ${product.quantity} items in stock` });
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          variantId: variantId || null,
          variantName: variantName || null,
          variantPrice: variantPrice ? parseFloat(variantPrice) : null,
        },
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });

    const subtotal = updatedCart!.items.reduce((sum, item) => {
      const price = item.variantPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        ...updatedCart,
        subtotal,
        itemCount: updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/cart/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const businessId = req.user.businessId;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ success: false, error: 'quantity is required and must be >= 0' });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { businessId, contactId: req.user.id } },
      include: { product: true },
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      if (cartItem.product.trackInventory && cartItem.product.quantity < quantity) {
        return res.status(400).json({ success: false, error: `Only ${cartItem.product.quantity} items in stock` });
      }
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    const cart = await prisma.cart.findFirst({
      where: { businessId, contactId: req.user.id },
      include: { items: { include: { product: true } } },
    });

    const subtotal = cart!.items.reduce((sum, item) => {
      const price = item.variantPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        ...cart,
        subtotal,
        itemCount: cart!.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/cart/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const businessId = req.user.businessId;

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { businessId, contactId: req.user.id } },
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    const cart = await prisma.cart.findFirst({
      where: { businessId, contactId: req.user.id },
      include: { items: { include: { product: true } } },
    });

    const subtotal = cart!.items.reduce((sum, item) => {
      const price = item.variantPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        ...cart,
        subtotal,
        itemCount: cart!.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/cart', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    let contact = await prisma.contact.findFirst({ where: { businessId, email: req.user.email } });
    const contactId = contact?.id;

    if (contactId) {
      const cart = await prisma.cart.findFirst({ where: { businessId, contactId } });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.delete({ where: { id: cart.id } });
      }
    }

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CHECKOUT & ORDERS ====================

// Checkout - create order from cart
router.post('/checkout', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    let contact = await prisma.contact.findFirst({ where: { businessId, email: req.user.email } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { businessId, name: req.user.email || 'Customer', email: req.user.email || undefined, source: 'checkout' },
      });
    }
    const contactId = contact.id;
    const { shippingAddress, notes, couponCode, paymentMethod = 'razorpay' } = req.body;

    // Get cart
    const cart = await prisma.cart.findFirst({
      where: { businessId, contactId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    // Validate stock for all items
    for (const item of cart.items) {
      if (item.product.trackInventory && item.product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `"${item.product.name}" has only ${item.product.quantity} items in stock`,
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of cart.items) {
      const price = item.variantPrice || item.product.price;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.product.name + (item.variantName ? ` (${item.variantName})` : ''),
        quantity: item.quantity,
        price,
        total: itemTotal,
      });
    }

    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { businessId, code: couponCode.toUpperCase(), active: true },
      });

      if (coupon) {
        if (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            if (coupon.minOrder === 0 || subtotal >= coupon.minOrder) {
              discount = coupon.type === 'PERCENTAGE'
                ? (subtotal * coupon.value) / 100
                : Math.min(coupon.value, subtotal);
              discount = Math.round(discount * 100) / 100;

              // Increment used count
              await prisma.coupon.update({
                where: { id: coupon.id },
                data: { usedCount: { increment: 1 } },
              });
            }
          }
        }
      }
    }

    const total = Math.max(0, subtotal - discount);
    const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          businessId,
          contactId,
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
          gateway: paymentMethod,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      // Decrease inventory
      for (const item of cart.items) {
        if (item.product.trackInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.delete({ where: { id: cart.id } });

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

    res.status(201).json({
      success: true,
      data: {
        ...order,
        razorpayOrder,
        discount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify payment and update order
router.post('/orders/:id/verify-payment', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const order = await prisma.order.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Verify signature
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body)
        .digest('hex');

      if (expectedSig === razorpay_signature) {
        const updated = await prisma.order.update({
          where: { id },
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
            where: { businessId: req.user.businessId, isActive: true },
          });
          if (program) {
            const pointsEarned = Math.floor(order.total * program.pointsPerRupee);
            await prisma.loyaltyPoints.create({
              data: {
                businessId: req.user.businessId,
                contactId: req.user.id,
                points: pointsEarned,
                type: 'earn',
                description: `Points earned for order ${order.orderNumber}`,
                orderId: order.id,
              },
            });
          }
        } catch (e) {
          // Non-critical, don't fail checkout
        }

        return res.json({ success: true, data: updated });
      }
    }

    return res.status(400).json({ success: false, error: 'Payment verification failed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Orders CRUD
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const status = qs(req.query.status);
    const page = qn(req.query.page) || 1;
    const limit = qn(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = { businessId: req.user.businessId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { name: true, phone: true, email: true } },
          items: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual order creation (admin)
router.post('/orders', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, items, shippingAddress, notes, paymentMethod, couponCode } = req.body;

    if (!contactId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'contactId and items array are required' });
    }

    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, businessId: req.user.businessId },
      });
      if (!product) {
        return res.status(400).json({ success: false, error: `Product ${item.productId} not found` });
      }
      const price = item.price || product.price;
      const qty = item.quantity || 1;
      subtotal += price * qty;
      orderItems.push({
        productId: item.productId,
        name: product.name,
        quantity: qty,
        price,
        total: price * qty,
      });
    }

    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { businessId: req.user.businessId, code: couponCode.toUpperCase(), active: true },
      });
      if (coupon) {
        discount = coupon.type === 'PERCENTAGE'
          ? (subtotal * coupon.value) / 100
          : Math.min(coupon.value, subtotal);
        discount = Math.round(discount * 100) / 100;
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    const total = Math.max(0, subtotal - discount);
    const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          businessId: req.user.businessId,
          contactId,
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
          gateway: paymentMethod || 'manual',
          items: { create: orderItems },
        },
        include: { items: true, contact: { select: { name: true, phone: true, email: true } } },
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

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        contact: { select: { name: true, phone: true, email: true } },
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

router.put('/orders/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const { status, paymentStatus, notes, shippingAddress } = req.body;

    // If cancelling or refunding, restore inventory
    if (status === 'cancelled' || status === 'refunded') {
      const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of orderItems) {
        if (item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(notes !== undefined && { notes }),
        ...(shippingAddress !== undefined && { shippingAddress }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/orders/:id/status', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, processing, shipped, delivered, cancelled, or refunded',
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // If cancelling or refunding, restore inventory
    if (status === 'cancelled' || status === 'refunded') {
      const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of orderItems) {
        if (item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
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

// Public: Get order by order number (for tracking)
router.get('/track/:orderNumber', async (req: AuthRequest, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const order = await prisma.order.findFirst({
      where: { orderNumber, businessId: req.user.businessId },
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

export default router;
