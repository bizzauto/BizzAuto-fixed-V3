import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cacheResponse } from '../middleware/cache.js';
import { createInvoiceSchema, updateInvoiceSchema, markInvoicePaidSchema } from '../validations/crm-schemas.js';

const router = Router();

// Helper: map Prisma Document to frontend Invoice shape
function mapDocToInvoice(doc: any) {
  const content = (doc.content as any) || {};
  const items = (content.items || []).map((item: any) => ({
    description: item.description || '',
    quantity: item.quantity || 1,
    rate: item.rate || 0,
    amount: item.amount || (item.quantity || 1) * (item.rate || 0),
  }));

  const subtotal = items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const taxRate = content.taxRate ?? 18;
  const tax = content.tax ?? Math.round((subtotal * taxRate) / 100);
  const total = doc.amount || content.total || (subtotal + tax);

  return {
    id: doc.id,
    number: doc.documentNumber || doc.name || 'INV-000',
    customerName: doc.clientName || '',
    customerEmail: doc.clientEmail || '',
    customerPhone: doc.clientPhone || '',
    items,
    subtotal,
    tax,
    total,
    status: doc.status || 'draft',
    date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '',
    dueDate: content.dueDate || '',
    paidDate: content.paidDate || null,
    paymentMethod: content.paymentMethod || null,
    notes: content.notes || doc.html || null,
    contactId: doc.contactId || null,
    createdAt: doc.createdAt,
  };
}

// GET /api/crm-invoices - List all invoices
router.get('/', authenticate, cacheResponse(15), async (req: AuthRequest, res: any) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const businessId = req.user.businessId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId,
      type: 'invoice',
    };

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { clientName: { contains: search as string, mode: 'insensitive' } },
        { clientEmail: { contains: search as string, mode: 'insensitive' } },
        { documentNumber: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true, phone: true, email: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    const invoices = documents.map(mapDocToInvoice);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices', details: error.message });
  }
});

// POST /api/crm-invoices - Create an invoice
router.post('/', authenticate, validate(createInvoiceSchema), async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { customerName, customerEmail, customerPhone, items, taxRate, notes, dueDate, contactId } = req.body;

    const invoiceItems = (items || []).map((item: any) => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      amount: item.amount || (item.quantity || 1) * (item.rate || 0),
    }));

    const subtotal = invoiceItems.reduce((sum: number, i: any) => sum + i.amount, 0);
    const rate = taxRate ?? 18;
    const tax = Math.round((subtotal * rate) / 100);
    const total = subtotal + tax;

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const doc = await prisma.document.create({
      data: {
        businessId,
        name: `Invoice - ${customerName || 'Customer'}`,
        type: 'invoice',
        documentNumber: invoiceNumber,
        clientName: customerName,
        clientEmail: customerEmail,
        clientPhone: customerPhone,
        amount: total,
        status: 'draft',
        contactId: contactId || undefined,
        content: {
          items: invoiceItems,
          subtotal,
          taxRate: rate,
          tax,
          total,
          dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes,
        },
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ success: true, data: mapDocToInvoice(doc) });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to create invoice', details: error.message });
  }
});

// PUT /api/crm-invoices/:id - Update an invoice
router.put('/:id', authenticate, validate(updateInvoiceSchema), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const { status, paidDate, paymentMethod, notes } = req.body;

    const existing = await prisma.document.findFirst({
      where: { id, businessId, type: 'invoice' },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const existingContent = (existing.content as any) || {};
    const newContent: any = { ...existingContent };
    if (notes !== undefined) newContent.notes = notes;
    if (paidDate !== undefined) newContent.paidDate = paidDate;
    if (paymentMethod !== undefined) newContent.paymentMethod = paymentMethod;

    const updated = await prisma.document.update({
      where: { id, businessId },
      data: {
        ...(status !== undefined && { status }),
        content: newContent,
      },
    });

    res.json({ success: true, data: mapDocToInvoice(updated) });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice', details: error.message });
  }
});

// PUT /api/crm-invoices/:id/pay - Mark invoice as paid
router.put('/:id/pay', authenticate, validate(markInvoicePaidSchema), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const existing = await prisma.document.findFirst({
      where: { id, businessId, type: 'invoice' },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const existingContent = (existing.content as any) || {};

    const updated = await prisma.document.update({
      where: { id, businessId },
      data: {
        status: 'paid',
        content: {
          ...existingContent,
          paidDate: new Date().toISOString().split('T')[0],
          paymentMethod: req.body.paymentMethod || 'Bank Transfer',
        },
      },
    });

    res.json({ success: true, data: mapDocToInvoice(updated) });
  } catch (error: any) {
    console.error('Mark invoice paid error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark invoice as paid', details: error.message });
  }
});

// DELETE /api/crm-invoices/:id - Delete an invoice
router.delete('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const existing = await prisma.document.findFirst({
      where: { id, businessId, type: 'invoice' },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    await prisma.document.delete({ where: { id, businessId } });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete invoice', details: error.message });
  }
});

export default router;
