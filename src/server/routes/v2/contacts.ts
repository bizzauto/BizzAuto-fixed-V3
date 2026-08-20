import { Router, Response } from 'express';
import { prisma } from '../../db.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createContactSchema, updateContactSchema } from '../../validations/schemas.js';
import {
  sendSuccess, sendCreated, sendNoContent, sendError,
  ErrorCodes, parsePagination, encodeCursor, buildPaginationLinks,
} from './helpers.js';
import { qs } from '../../utils/query.js';

/**
 * V2 Contacts API — Breaking changes from v1:
 * 
 * 1. Cursor-based pagination (not offset)
 * 2. Consistent { data, meta, links } envelope
 * 3. Standard error codes (VALIDATION_ERROR, NOT_FOUND, etc.)
 * 4. All dates as ISO 8601
 * 5. Null fields explicitly included
 * 6. Strict tenant isolation (always uses req.user.businessId)
 * 7. Bulk operations return detailed results
 * 8. Search via cursor, not page numbers
 */

const router = Router();

// GET /api/v2/contacts — List contacts with cursor pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { cursor, take, parsedCursor } = parsePagination(req.query as any);
    const { search, source, status, tag } = req.query as any;

    const where: any = { businessId: req.user.businessId };

    // Cursor-based filtering
    if (parsedCursor) {
      where.OR = [
        { createdAt: { lt: parsedCursor.createdAt } },
        { createdAt: parsedCursor.createdAt, id: { gt: parsedCursor.id } },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { company: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (source) where.source = source;
    if (status) where.status = status;
    if (tag) where.tags = { has: tag };

    const contacts = await prisma.contact.findMany({
      where,
      take: take + 1, // fetch one extra to determine hasMore
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        company: true,
        title: true,
        designation: true,
        tags: true,
        source: true,
        status: true,
        dealValue: true,
        dealStage: true,
        pipelineId: true,
        stageId: true,
        whatsappOptIn: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = contacts.length > take;
    const items = hasMore ? contacts.slice(0, take) : contacts;

    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].createdAt)
      : undefined;

    const pagination = {
      cursor: nextCursor,
      hasMore,
      limit: take,
    };

    const links = buildPaginationLinks('/api/v2/contacts', nextCursor, hasMore, !!parsedCursor);

    sendSuccess(res, items, { pagination, links, requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to fetch contacts',
      details: error.message,
      requestId: req.id,
    });
  }
});

// GET /api/v2/contacts/:id — Get single contact
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
    });

    if (!contact) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Contact not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    sendSuccess(res, contact, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to fetch contact',
      details: error.message,
      requestId: req.id,
    });
  }
});

// POST /api/v2/contacts — Create contact with strict validation
router.post('/', authenticate, validate(createContactSchema), async (req: AuthRequest, res: Response) => {
  try {
    // Enforce businessId from auth (prevents mass assignment)
    const { name, phone, email, tags, customFields, pipelineId, stageId } = req.body;

    // Check for duplicate phone within business
    if (phone) {
      const existing = await prisma.contact.findFirst({
        where: { businessId: req.user.businessId, phone },
      });
      if (existing) {
        return sendError(res, {
          code: ErrorCodes.CONFLICT,
          message: `Contact with phone ${phone} already exists`,
          details: { existingContactId: existing.id, existingContactName: existing.name },
          statusCode: 409,
          requestId: req.id,
        });
      }
    }

    const contact = await prisma.contact.create({
      data: {
        businessId: req.user.businessId,
        name,
        phone: phone || null,
        email: email || null,
        tags: tags || [],
        customFields: customFields || {},
        pipelineId: pipelineId || null,
        stageId: stageId || null,
        source: 'api_v2',
      },
    });

    sendCreated(res, contact, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to create contact',
      details: error.message,
      requestId: req.id,
    });
  }
});

// PUT /api/v2/contacts/:id — Update contact with strict validation
router.put('/:id', authenticate, validate(updateContactSchema), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Contact not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    // Check phone uniqueness if changing
    if (req.body.phone && req.body.phone !== existing.phone) {
      const phoneTaken = await prisma.contact.findFirst({
        where: { businessId: req.user.businessId, phone: req.body.phone, id: { not: qs(req.params.id) } },
      });
      if (phoneTaken) {
        return sendError(res, {
          code: ErrorCodes.CONFLICT,
          message: `Phone ${req.body.phone} is already used by another contact`,
          statusCode: 409,
          requestId: req.id,
        });
      }
    }

    const updated = await prisma.contact.update({
      where: { id: qs(req.params.id) },
      data: req.body,
    });

    sendSuccess(res, updated, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to update contact',
      details: error.message,
      requestId: req.id,
    });
  }
});

// DELETE /api/v2/contacts/:id — Delete contact
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Contact not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    await prisma.contact.delete({ where: { id: qs(req.params.id) } });
    sendNoContent(res);
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to delete contact',
      details: error.message,
      requestId: req.id,
    });
  }
});

// POST /api/v2/contacts/bulk — Bulk create contacts with detailed results
router.post('/bulk', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return sendError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'contacts array is required',
        statusCode: 400,
        requestId: req.id,
      });
    }

    if (contacts.length > 1000) {
      return sendError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Maximum 1000 contacts per bulk operation',
        statusCode: 400,
        requestId: req.id,
      });
    }

    const results = { created: 0, skipped: 0, errors: [] as any[] };

    for (const c of contacts) {
      try {
        if (!c.phone && !c.email) { results.skipped++; continue; }

        // Check duplicate
        if (c.phone) {
          const dup = await prisma.contact.findFirst({
            where: { businessId: req.user.businessId, phone: c.phone },
          });
          if (dup) { results.skipped++; continue; }
        }

        await prisma.contact.create({
          data: {
            businessId: req.user.businessId,
            name: c.name || 'Imported',
            phone: c.phone || null,
            email: c.email || null,
            tags: c.tags || [],
            source: 'api_v2_bulk',
          },
        });
        results.created++;
      } catch (err: any) {
        results.errors.push({ name: c.name, error: err.message });
      }
    }

    sendSuccess(res, results, { statusCode: results.created > 0 ? 201 : 200, requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Bulk create failed',
      details: error.message,
      requestId: req.id,
    });
  }
});

export default router;
