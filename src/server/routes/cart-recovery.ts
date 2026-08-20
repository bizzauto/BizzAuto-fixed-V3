import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { WhatsAppSendRouter } from '../services/whatsapp-send-router.service.js';

/** Local view type for a CartRecovery row with its linked contact. The
 * generated Prisma client can lag the schema in this environment, so we assert
 * the included relation shape explicitly rather than depending on client types. */
type CartRecoveryWithContact = {
  id: string;
  businessId: string;
  status: string;
  channel: string;
  cartItems: unknown;
  cartValue: number;
  reminderCount: number;
  contactId?: string | null;
  contact?: { id: string; name: string | null; phone: string | null; email: string | null } | null;
};

const router = Router();

/**
 * GET /api/cart-recovery/stats
 * Recovery statistics — MUST be before /:id
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [
      totalAbandoned,
      totalReminded,
      totalRecovered,
      totalLost,
      abandonedCarts,
      recoveredCarts,
      byChannel,
      last30Days,
    ] = await Promise.all([
      prisma.cartRecovery.count({ where: { businessId, status: 'abandoned' } }),
      prisma.cartRecovery.count({ where: { businessId, status: 'reminded' } }),
      prisma.cartRecovery.count({ where: { businessId, status: 'recovered' } }),
      prisma.cartRecovery.count({ where: { businessId, status: 'lost' } }),
      prisma.cartRecovery.aggregate({
        where: { businessId, status: 'abandoned' },
        _sum: { cartValue: true },
        _avg: { cartValue: true },
      }),
      prisma.cartRecovery.aggregate({
        where: { businessId, status: 'recovered' },
        _sum: { recoveredAmount: true },
      }),
      prisma.cartRecovery.groupBy({
        by: ['channel'],
        where: { businessId },
        _count: true,
      }),
      prisma.cartRecovery.findMany({
        where: {
          businessId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { status: true, createdAt: true },
      }),
    ]);

    const totalTracked = totalAbandoned + totalReminded + totalRecovered + totalLost;
    const conversionRate =
      totalTracked > 0 ? Math.round((totalRecovered / totalTracked) * 10000) / 100 : 0;
    const totalAbandonedValue = abandonedCarts._sum.cartValue || 0;
    const totalRecoveredValue = recoveredCarts._sum.recoveredAmount || 0;
    const avgCartValue = abandonedCarts._avg.cartValue || 0;
    const revenueRecoveredPct =
      totalAbandonedValue > 0
        ? Math.round((totalRecoveredValue / totalAbandonedValue) * 10000) / 100
        : 0;

    const channelBreakdown = byChannel.reduce((acc: any, item: any) => {
      acc[item.channel] = item._count;
      return acc;
    }, {});

    // Daily breakdown for last 30 days
    const dailyMap = new Map<string, { abandoned: number; recovered: number }>();
    for (const entry of last30Days) {
      const day = entry.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { abandoned: 0, recovered: 0 });
      const bucket = dailyMap.get(day)!;
      if (entry.status === 'abandoned' || entry.status === 'reminded') bucket.abandoned++;
      if (entry.status === 'recovered') bucket.recovered++;
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        totalAbandoned,
        totalReminded,
        totalRecovered,
        totalLost,
        totalTracked,
        conversionRate,
        totalAbandonedValue,
        totalRecoveredValue,
        revenueRecoveredPct,
        avgCartValue: Math.round(avgCartValue * 100) / 100,
        channelBreakdown,
        dailyTrend,
      },
    });
  } catch (error: any) {
    console.error('Cart recovery stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cart recovery stats', details: error.message });
  }
});

/**
 * GET /api/cart-recovery
 * List abandoned carts — filterable by status, channel, search, date range
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const {
      page = 1,
      limit = 20,
      status,
      channel,
      search,
      startDate,
      endDate,
      minCartValue,
      maxCartValue,
    } = req.query;

    const where: any = { businessId };

    if (status) where.status = status;
    if (channel) where.channel = channel;

    if (search) {
      where.OR = [
        { contact: { name: { contains: search as string, mode: 'insensitive' } } },
        { contact: { phone: { contains: search as string, mode: 'insensitive' } } },
        { contact: { email: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (minCartValue || maxCartValue) {
      where.cartValue = {};
      if (minCartValue) where.cartValue.gte = parseFloat(minCartValue as string);
      if (maxCartValue) where.cartValue.lte = parseFloat(maxCartValue as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [carts, total] = await Promise.all([
      prisma.cartRecovery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
      prisma.cartRecovery.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        carts,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('List cart recoveries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cart recoveries', details: error.message });
  }
});

/**
 * GET /api/cart-recovery/:id
 * Get cart recovery details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const cart = await prisma.cartRecovery.findFirst({
      where: { id, businessId },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, email: true, source: true, tags: true },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart recovery record not found' });
    }

    res.json({ success: true, data: cart });
  } catch (error: any) {
    console.error('Get cart recovery error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cart recovery record', details: error.message });
  }
});

/**
 * POST /api/cart-recovery
 * Record an abandoned cart (webhook from ecommerce platform)
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId, cartItems, cartValue, channel } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'cartItems array is required and must not be empty' });
    }

    if (cartValue === undefined || cartValue === null || typeof cartValue !== 'number' || cartValue <= 0) {
      return res.status(400).json({ success: false, error: 'cartValue must be a positive number' });
    }

    const validChannel = ['whatsapp', 'email', 'sms'].includes(channel) ? channel : 'whatsapp';

    // Deduplicate: if same contact has an active abandoned cart within last 24 hours, merge items
    if (contactId) {
      const recentCart = await prisma.cartRecovery.findFirst({
        where: {
          businessId,
          contactId,
          status: { in: ['abandoned', 'reminded'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentCart) {
        const existingItems = (recentCart.cartItems as any[]) || [];
        const mergedItems = [...existingItems, ...cartItems];
        const mergedValue = mergedItems.reduce((sum: number, item: any) => {
          return sum + (item.price || 0) * (item.quantity || 1);
        }, 0);

        const updated = await prisma.cartRecovery.update({
          where: { id: recentCart.id },
          data: {
            cartItems: mergedItems,
            cartValue: mergedValue,
          },
          include: {
            contact: { select: { id: true, name: true, phone: true, email: true } },
          },
        });

        return res.json({ success: true, message: 'Cart merged with existing abandoned cart', data: updated });
      }
    }

    const cart = await prisma.cartRecovery.create({
      data: {
        businessId,
        contactId: contactId || null,
        cartItems,
        cartValue,
        status: 'abandoned',
        channel: validChannel,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Abandoned cart recorded', data: cart });
  } catch (error: any) {
    console.error('Record cart abandonment error:', error);
    res.status(500).json({ success: false, error: 'Failed to record abandoned cart', details: error.message });
  }
});

/**
 * POST /api/cart-recovery/:id/remind
 * Send a reminder via WhatsApp / email / SMS for an abandoned cart
 */
router.post('/:id/remind', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const { channel, message } = req.body;

    const cart = (await prisma.cartRecovery.findFirst({
      where: { id, businessId },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    })) as CartRecoveryWithContact | null;

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart recovery record not found' });
    }

    if (cart.status === 'recovered' || cart.status === 'lost') {
      return res.status(400).json({ success: false, error: `Cannot remind a cart with status "${cart.status}"` });
    }

    if (!cart.contact) {
      return res.status(400).json({ success: false, error: 'No contact linked to this cart — cannot send reminder' });
    }

    const contact = cart.contact;
    const reminderChannel = (['whatsapp', 'email', 'sms'].includes(channel) ? channel : cart.channel) as string;
    const cartItems = (cart.cartItems as any[]) || [];
    const itemCount = cartItems.length;
    const itemSummary = cartItems.slice(0, 3).map((i: any) => i.name || 'Item').join(', ');
    const moreItems = itemCount > 3 ? ` and ${itemCount - 3} more` : '';

    const defaultMessage =
      message ||
      `Hi ${contact.name || 'there'}! Just a reminder — you left ${itemCount} item${itemCount > 1 ? 's' : ''} in your cart (${itemSummary}${moreItems}) worth ₹${cart.cartValue.toFixed(2)}. Complete your purchase now!`;

    let sendSuccess = false;
    let sendError = '';

    try {
      if (reminderChannel === 'whatsapp' && contact.phone) {
        await WhatsAppSendRouter.sendTextMessage(businessId, contact.phone, defaultMessage, { messageId: cart.id });
        sendSuccess = true;
      } else if (reminderChannel === 'email' && contact.email) {
        const { EmailService } = await import('../services/email.service.js');
        await EmailService.sendEmail(
          contact.email,
          'You left items in your cart!',
          `<p>Hi ${contact.name || 'there'},</p><p>${defaultMessage.replace(/\n/g, '<br/>')}</p>`
        );
        sendSuccess = true;
      } else if ((reminderChannel === 'sms' || reminderChannel === 'whatsapp') && contact.phone) {
        await WhatsAppSendRouter.sendTextMessage(businessId, contact.phone, defaultMessage, { messageId: cart.id });
        sendSuccess = true;
      } else {
        sendError = `No valid contact info for channel "${reminderChannel}"`;
      }
    } catch (err: any) {
      sendError = err.message;
    }

    const updated = await prisma.cartRecovery.update({
      where: { id },
      data: {
        status: 'reminded',
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: cart.contactId,
        type: 'cart_reminder',
        title: `Cart recovery reminder sent via ${reminderChannel}`,
        content: sendSuccess
          ? `Reminder sent successfully. Items: ${itemSummary}${moreItems}, Cart value: ₹${cart.cartValue.toFixed(2)}`
          : `Reminder attempt failed: ${sendError}`,
        metadata: { cartId: cart.id, channel: reminderChannel, reminderCount: updated.reminderCount, sendSuccess },
        createdBy: req.user.id,
      },
    });

    if (!sendSuccess && sendError) {
      return res.status(502).json({
        success: false,
        error: `Reminder recorded but send failed: ${sendError}`,
        data: updated,
      });
    }

    res.json({ success: true, message: 'Reminder sent successfully', data: updated });
  } catch (error: any) {
    console.error('Send cart reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to send cart reminder', details: error.message });
  }
});

/**
 * PATCH /api/cart-recovery/:id/recover
 * Mark a cart as recovered
 */
router.patch('/:id/recover', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const { recoveredAmount } = req.body;

    const cart = await prisma.cartRecovery.findFirst({
      where: { id, businessId },
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart recovery record not found' });
    }

    if (cart.status === 'recovered' || cart.status === 'lost') {
      return res.status(400).json({ success: false, error: `Cart is already "${cart.status}"` });
    }

    const finalAmount =
      recoveredAmount !== undefined && typeof recoveredAmount === 'number' && recoveredAmount > 0
        ? recoveredAmount
        : cart.cartValue;

    const updated = await prisma.cartRecovery.update({
      where: { id },
      data: {
        status: 'recovered',
        recoveredAt: new Date(),
        recoveredAmount: finalAmount,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: cart.contactId,
        type: 'cart_recovered',
        title: 'Cart recovered',
        content: `Cart worth ₹${cart.cartValue.toFixed(2)} recovered for ₹${finalAmount.toFixed(2)}`,
        metadata: {
          cartId: cart.id,
          originalValue: cart.cartValue,
          recoveredAmount: finalAmount,
          reminderCount: cart.reminderCount,
          channel: cart.channel,
        },
        createdBy: req.user.id,
      },
    });

    res.json({ success: true, message: 'Cart marked as recovered', data: updated });
  } catch (error: any) {
    console.error('Recover cart error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark cart as recovered', details: error.message });
  }
});

/**
 * PATCH /api/cart-recovery/:id/lost
 * Mark a cart as lost (unrecoverable)
 */
router.patch('/:id/lost', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const cart = await prisma.cartRecovery.findFirst({
      where: { id, businessId },
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart recovery record not found' });
    }

    if (cart.status === 'recovered' || cart.status === 'lost') {
      return res.status(400).json({ success: false, error: `Cart is already "${cart.status}"` });
    }

    const updated = await prisma.cartRecovery.update({
      where: { id },
      data: { status: 'lost' },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: cart.contactId,
        type: 'cart_lost',
        title: 'Cart marked as lost',
        content: `Cart worth ₹${cart.cartValue.toFixed(2)} marked as lost after ${cart.reminderCount} reminder(s)`,
        metadata: { cartId: cart.id, originalValue: cart.cartValue, reminderCount: cart.reminderCount, channel: cart.channel },
        createdBy: req.user.id,
      },
    });

    res.json({ success: true, message: 'Cart marked as lost', data: updated });
  } catch (error: any) {
    console.error('Mark cart lost error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark cart as lost', details: error.message });
  }
});

export default router;
