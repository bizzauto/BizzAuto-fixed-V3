import { Router, Response } from 'express';
import { prisma } from '../../db.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import {
  sendSuccess, sendCreated, sendError,
  ErrorCodes, parsePagination, encodeCursor, buildPaginationLinks,
} from './helpers.js';
import { qs } from '../../utils/query.js';

/**
 * V2 Invoices API — Breaking changes from v1:
 * 
 * 1. Cursor-based pagination (not offset)
 * 2. Consistent { data, meta, links } envelope
 * 3. Amounts are Int (paise) in the database — v2 exposes them as `amountPaise` directly
 * 4. Standard error codes (VALIDATION_ERROR, NOT_FOUND, etc.)
 * 5. All dates as ISO 8601
 * 6. Strict tenant isolation on all queries
 * 7. Status filter and search added
 */

const router = Router();

// GET /api/v2/invoices — List invoices with cursor pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { cursor, take, parsedCursor } = parsePagination(req.query as any);
    const { status, search } = req.query as any;

    const where: any = { businessId };

    if (parsedCursor) {
      where.OR = [
        { createdAt: { lt: parsedCursor.createdAt } },
        { createdAt: parsedCursor.createdAt, id: { gt: parsedCursor.id } },
      ];
    }

    if (status && typeof status === 'string') {
      where.status = status.toUpperCase();
    }
    if (search && typeof search === 'string') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerEmail: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      take: take + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const hasMore = invoices.length > take;
    const items = hasMore ? invoices.slice(0, take) : invoices;

    // amount is already stored as Int (paise) — expose directly
    const data = items.map((inv) => ({
      ...inv,
      amountPaise: inv.amount || 0,
      taxAmountPaise: 0,
      totalPaise: inv.amount || 0,
    }));

    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].createdAt)
      : undefined;

    sendSuccess(res, data, {
      pagination: { cursor: nextCursor, hasMore, limit: take },
      links: buildPaginationLinks('/api/v2/invoices', nextCursor, hasMore, !!parsedCursor),
      requestId: req.id,
    });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to fetch invoices',
      details: error.message,
      requestId: req.id,
    });
  }
});

// GET /api/v2/invoices/:id — Get single invoice
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: qs(req.params.id), businessId },
    });

    if (!invoice) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Invoice not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    const data = {
      ...invoice,
      amountPaise: invoice.amount || 0,
      taxAmountPaise: 0,
      totalPaise: invoice.amount || 0,
    };

    sendSuccess(res, data, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to fetch invoice',
      details: error.message,
      requestId: req.id,
    });
  }
});

// POST /api/v2/invoices — Create invoice (amountPaise instead of amount)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { amountPaise, customerName, customerEmail, status } = req.body;

    if (typeof amountPaise !== 'number' || amountPaise < 0) {
      return sendError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'amountPaise must be a non-negative integer',
        statusCode: 400,
        requestId: req.id,
      });
    }

    if (!customerName || typeof customerName !== 'string') {
      return sendError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'customerName is required',
        statusCode: 400,
        requestId: req.id,
      });
    }

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    // Invoice.amount is stored as Int (paise) — store amountPaise directly
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        invoiceNumber,
        amount: amountPaise,
        customerEmail: customerEmail || null,
        status: status || 'DRAFT',
      } as any,
    });

    const data = {
      ...invoice,
      amountPaise: invoice.amount || 0,
    };

    sendCreated(res, data, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to create invoice',
      details: error.message,
      requestId: req.id,
    });
  }
});

// PATCH /api/v2/invoices/:id — Update invoice
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const existing = await prisma.invoice.findFirst({
      where: { id: qs(req.params.id), businessId },
    });
    if (!existing) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Invoice not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    // Whitelist allowed fields to prevent mass assignment
    const { amountPaise, customerName, customerEmail, status } = req.body;
    const updateData: any = {};
    if (typeof amountPaise === 'number') updateData.amount = amountPaise;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
    if (status !== undefined) updateData.status = status;
    
    if (Object.keys(updateData).length === 0) {
      return sendError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No valid fields to update',
        statusCode: 400,
        requestId: req.id,
      });
    }

    const invoice = await prisma.invoice.update({
      where: { id: qs(req.params.id) },
      data: updateData,
    });

    const data = {
      ...invoice,
      amountPaise: invoice.amount || 0,
      taxAmountPaise: 0,
      totalPaise: invoice.amount || 0,
    };

    sendSuccess(res, data, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to update invoice',
      details: error.message,
      requestId: req.id,
    });
  }
});

// DELETE /api/v2/invoices/:id — Delete invoice
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const existing = await prisma.invoice.findFirst({
      where: { id: qs(req.params.id), businessId },
    });
    if (!existing) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Invoice not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    await prisma.invoice.delete({ where: { id: qs(req.params.id) } });

    sendSuccess(res, { deleted: true, id: qs(req.params.id) }, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to delete invoice',
      details: error.message,
      requestId: req.id,
    });
  }
});

export default router;
