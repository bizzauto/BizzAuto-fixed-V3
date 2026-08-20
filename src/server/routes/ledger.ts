import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cacheResponse } from '../middleware/cache.js';
import { createLedgerEntrySchema, updateLedgerEntrySchema } from '../validations/crm-schemas.js';
import { qs } from '../utils/query.js';

const router = Router();

// GET /api/ledger - List all ledger entries with filtering
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { page = 1, limit = 50, type, category, startDate, endDate, search } = req.query;
    const businessId = req.user.businessId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { businessId };

    if (type) where.type = type;
    if (category) where.category = category as string;
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: { contact: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get ledger entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ledger entries', details: error.message });
  }
});

// GET /api/ledger/stats - Get ledger statistics
router.get('/stats', authenticate, cacheResponse(30), async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;

    const [totalIncome, totalExpenses, entryCount] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        where: { businessId, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { businessId, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.count({ where: { businessId } }),
    ]);

    const income = totalIncome._sum.amount || 0;
    const expenses = totalExpenses._sum.amount || 0;

    res.json({
      success: true,
      data: {
        totalIncome: income,
        totalExpenses: expenses,
        netProfit: income - expenses,
        profitMargin: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
        entryCount,
      },
    });
  } catch (error: any) {
    console.error('Get ledger stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ledger stats', details: error.message });
  }
});

// POST /api/ledger - Create a ledger entry
router.post('/', authenticate, validate(createLedgerEntrySchema), async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { type, category, description, amount, paymentMethod, referenceNo, contactId, invoiceId, date } = req.body;

    if (!type || !category || !description || amount === undefined) {
      return res.status(400).json({ success: false, error: 'type, category, description, and amount are required' });
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        businessId,
        type: type.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE',
        category,
        description,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod?.toUpperCase() || undefined,
        referenceNo,
        contactId,
        invoiceId,
        date: date ? new Date(date) : new Date(),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'ledger_entry',
        title: `${type === 'INCOME' ? 'Income' : 'Expense'} recorded`,
        content: `${description} - ₹${amount}`,
        metadata: { category, paymentMethod, amount },
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Create ledger entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to create ledger entry', details: error.message });
  }
});

// PUT /api/ledger/:id - Update a ledger entry
router.put('/:id', authenticate, validate(updateLedgerEntrySchema), async (req: AuthRequest, res: any) => {
  try {
    const id = qs(req.params.id);
    const businessId = req.user.businessId;

    const existing = await prisma.ledgerEntry.findFirst({ where: { id, businessId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    const { type, category, description, amount, paymentMethod, referenceNo, contactId, date } = req.body;

    const updated = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        ...(type && { type: type.toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE' }),
        ...(category && { category }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod?.toUpperCase() || undefined }),
        ...(referenceNo !== undefined && { referenceNo }),
        ...(contactId !== undefined && { contactId }),
        ...(date && { date: new Date(date) }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update ledger entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to update ledger entry', details: error.message });
  }
});

// DELETE /api/ledger/:id - Delete a ledger entry
router.delete('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const id = qs(req.params.id);
    const businessId = req.user.businessId;

    const existing = await prisma.ledgerEntry.findFirst({ where: { id, businessId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    await prisma.ledgerEntry.delete({ where: { id } });
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error: any) {
    console.error('Delete ledger entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete ledger entry', details: error.message });
  }
});

export default router;
