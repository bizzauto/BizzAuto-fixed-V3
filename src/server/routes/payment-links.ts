import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPaymentLinkSchema } from '../validations/remaining-schemas.js';
import { verifyPaymentSignature } from '../services/razorpay.service.js';
import { WhatsAppSendRouter } from '../services/whatsapp-send-router.service.js';
import crypto from 'crypto';

const router = Router();

// Helper: generate unique short code
function generateShortCode(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).replace(/[^a-zA-Z0-9]/g, 'X').toLowerCase();
}

// ==================== PUBLIC ROUTES (no auth) ====================

/**
 * GET /api/payment-links/s/:shortCode
 * Public endpoint - get payment link info for the payment page.
 */
router.get('/s/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    const link = await prisma.paymentLink.findUnique({
      where: { shortCode },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        currency: true,
        type: true,
        minAmount: true,
        isActive: true,
        expiresAt: true,
        maxPayments: true,
        paymentCount: true,
        businessId: true,
        business: {
          select: { name: true, logo: true, phone: true, email: true } as any,
        },
      },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    if (!link.isActive) {
      return res.status(410).json({ success: false, error: 'This payment link has been deactivated' });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'This payment link has expired' });
    }

    if (link.maxPayments && link.paymentCount >= link.maxPayments) {
      return res.status(410).json({ success: false, error: 'This payment link has reached its payment limit' });
    }

    res.json({ success: true, data: link });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch payment link' });
  }
});

/**
 * POST /api/payment-links/s/:shortCode/pay
 * Public endpoint - process a payment on a link.
 * Expects Razorpay payment verification data in the body.
 */
router.post('/s/:shortCode/pay', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount,
      contactName,
      contactPhone,
      contactEmail,
    } = req.body;

    const link = await prisma.paymentLink.findUnique({
      where: { shortCode },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    if (!link.isActive) {
      return res.status(410).json({ success: false, error: 'This payment link has been deactivated' });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: 'This payment link has expired' });
    }

    if (link.maxPayments && link.paymentCount >= link.maxPayments) {
      return res.status(410).json({ success: false, error: 'This payment link has reached its payment limit' });
    }

    if (link.type === 'fixed' && amount && amount !== link.amount) {
      return res.status(400).json({ success: false, error: `Fixed amount is ₹${link.amount}` });
    }

    if (link.type === 'flexible' && link.minAmount && amount < link.minAmount) {
      return res.status(400).json({ success: false, error: `Minimum amount is ₹${link.minAmount}` });
    }

    // Verify Razorpay signature
    if (razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Payment verification failed' });
      }
    }

    // Create or find contact
    let contactId = link.contactId || null;
    if (contactPhone || contactEmail) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          businessId: link.businessId,
          OR: [
            ...(contactPhone ? [{ phone: contactPhone }] : []),
            ...(contactEmail ? [{ email: contactEmail }] : []),
          ],
        },
      });

      if (existingContact) {
        contactId = existingContact.id;
      } else if (contactPhone || contactEmail) {
        const newContact = await prisma.contact.create({
          data: {
            businessId: link.businessId,
            name: contactName || 'Customer',
            phone: contactPhone || null,
            email: contactEmail || null,
          },
        });
        contactId = newContact.id;
      }
    }

    const paymentAmount = amount || link.amount;

    // Create transaction record
    const transaction = await prisma.paymentLinkTransaction.create({
      data: {
        linkId: link.id,
        contactId,
        razorpayPaymentId: razorpayPaymentId || null,
        amount: paymentAmount,
        currency: link.currency,
        status: razorpayPaymentId ? 'captured' : 'pending',
        metadata: {
          razorpayOrderId,
          contactName,
          contactPhone,
          contactEmail,
        },
      },
    });

    // Update link stats
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        paymentCount: { increment: 1 },
        totalCollected: { increment: paymentAmount },
      },
    });

    res.json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to process payment' });
  }
});

// ==================== AUTHENTICATED ROUTES ====================

router.use(authenticate);

/**
 * GET /api/payment-links
 * List payment links for the business (paginated).
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      type,
      isActive,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId: req.user.businessId };

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { shortCode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [links, total] = await Promise.all([
      prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip,
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      prisma.paymentLink.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        links,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch payment links' });
  }
});

/**
 * GET /api/payment-links/:id
 * Get a single payment link with its transactions.
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        transactions: {
          orderBy: { paidAt: 'desc' },
          take: 50,
        },
        _count: { select: { transactions: true } },
      },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    res.json({ success: true, data: link });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch payment link' });
  }
});

/**
 * POST /api/payment-links
 * Create a new payment link.
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      amount,
      currency = 'INR',
      type = 'fixed',
      minAmount,
      contactId,
      invoiceId,
      maxPayments,
      expiresAt,
      metadata,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    if (type === 'flexible' && minAmount && minAmount > amount) {
      return res.status(400).json({ success: false, error: 'minAmount cannot exceed amount' });
    }

    // Generate unique short code (retry up to 5 times on collision)
    let shortCode = generateShortCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await prisma.paymentLink.findUnique({ where: { shortCode } });
      if (!existing) break;
      shortCode = generateShortCode();
    }

    const link = await prisma.paymentLink.create({
      data: {
        businessId: req.user.businessId,
        name,
        description: description || null,
        amount: parseFloat(amount),
        currency,
        type,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        shortCode,
        contactId: contactId || null,
        invoiceId: invoiceId || null,
        maxPayments: maxPayments ? parseInt(maxPayments) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: metadata || undefined,
      },
    });

    res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create payment link' });
  }
});

/**
 * PUT /api/payment-links/:id
 * Update a payment link.
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    const {
      name,
      description,
      amount,
      currency,
      type,
      minAmount,
      contactId,
      invoiceId,
      maxPayments,
      expiresAt,
      isActive,
      metadata,
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (type !== undefined) updateData.type = type;
    if (minAmount !== undefined) updateData.minAmount = minAmount ? parseFloat(minAmount) : null;
    if (contactId !== undefined) updateData.contactId = contactId || null;
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId || null;
    if (maxPayments !== undefined) updateData.maxPayments = maxPayments ? parseInt(maxPayments) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (metadata !== undefined) updateData.metadata = metadata;

    const link = await prisma.paymentLink.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ success: true, data: link });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update payment link' });
  }
});

/**
 * DELETE /api/payment-links/:id
 * Deactivate a payment link (soft delete).
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    await prisma.paymentLink.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Payment link deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to deactivate payment link' });
  }
});

/**
 * GET /api/payment-links/:id/transactions
 * Get transactions for a payment link.
 */
router.get('/:id/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      select: { id: true },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    const {
      page = '1',
      limit = '50',
      status,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { linkId: req.params.id };

    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.paymentLinkTransaction.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        take: parseInt(limit as string),
        skip,
      }),
      prisma.paymentLinkTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/payment-links/:id/send
 * Send payment link via WhatsApp to the linked contact.
 */
router.post('/:id/send', async (req: AuthRequest, res: Response) => {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, email: true },
        },
        business: {
          select: { id: true, name: true },
        },
      } as any,
    }) as any;

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }

    if (!link.contact?.phone) {
      return res.status(400).json({ success: false, error: 'Contact does not have a phone number' });
    }

    const paymentUrl = `${process.env.FRONTEND_URL || 'https://bizzautoai.com'}/pay/${link.shortCode}`;

    const message = [
      `Hi ${link.contact.name || 'there'},`,
      '',
      `You have a payment request from ${link.business.name}:`,
      '',
      `*${link.name}*`,
      link.description ? `${link.description}` : '',
      `Amount: ₹${link.amount}`,
      '',
      `Pay here: ${paymentUrl}`,
      '',
      'Thank you!',
    ].filter(Boolean).join('\n');

    await WhatsAppSendRouter.sendTextMessage(
      req.user.businessId,
      link.contact.phone,
      message,
      { messageId: link.contactId || undefined }
    );

    res.json({
      success: true,
      data: {
        message: 'Payment link sent via WhatsApp',
        phone: link.contact.phone,
        paymentUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to send payment link' });
  }
});

export default router;
