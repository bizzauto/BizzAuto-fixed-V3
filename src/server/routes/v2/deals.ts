import { Router, Response } from 'express';
import { prisma } from '../../db.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import {
  sendSuccess, sendCreated, sendNoContent, sendError,
  ErrorCodes, parsePagination, encodeCursor, buildPaginationLinks,
} from './helpers.js';
import { qs } from '../../utils/query.js';

/**
 * V2 Deals API — Breaking changes from v1:
 * 
 * 1. Cursor-based pagination
 * 2. Consistent envelope response
 * 3. Standard error codes
 * 4. Stage history tracked as activity feed
 * 5. Bulk stage updates supported
 * 6. Strict tenant isolation on all queries
 */

const router = Router();

// GET /api/v2/deals — List deals with cursor pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { cursor, take, parsedCursor } = parsePagination(req.query as any);
    const { stage, pipelineId, search, minValue, maxValue } = req.query as any;

    const where: any = {
      businessId: req.user.businessId,
      OR: [
        { dealValue: { gt: 0 } },
        { dealStage: { not: null } },
        { pipelineId: { not: null } },
      ],
    };

    if (parsedCursor) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { updatedAt: { lt: parsedCursor.createdAt } },
            { updatedAt: parsedCursor.createdAt, id: { gt: parsedCursor.id } },
          ],
        },
      ];
    }

    if (stage) where.dealStage = stage;
    if (pipelineId) where.pipelineId = pipelineId;
    if (minValue) where.dealValue = { ...where.dealValue, gte: parseFloat(minValue) };
    if (maxValue) where.dealValue = { ...where.dealValue, lte: parseFloat(maxValue) };

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      take: take + 1,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true, name: true, phone: true, email: true, company: true,
        dealValue: true, dealStage: true, stage: true,
        pipelineId: true, stageId: true, tags: true, source: true,
        createdAt: true, updatedAt: true,
        pipeline: { select: { id: true, name: true } },
      },
    });

    const hasMore = contacts.length > take;
    const items = hasMore ? contacts.slice(0, take) : contacts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].updatedAt)
      : undefined;

    // Calculate pipeline summary
    const pipeline = items.reduce((acc: Record<string, { count: number; value: number }>, c) => {
      const stage = c.dealStage || c.stage || 'Unknown';
      acc[stage] = acc[stage] || { count: 0, value: 0 };
      acc[stage].count++;
      acc[stage].value += c.dealValue || 0;
      return acc;
    }, {});

    sendSuccess(res, { deals: items, pipeline }, {
      pagination: { cursor: nextCursor, hasMore, limit: take },
      links: buildPaginationLinks('/api/v2/deals', nextCursor, hasMore, !!parsedCursor),
      requestId: req.id,
    });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to fetch deals',
      details: error.message,
      requestId: req.id,
    });
  }
});

// GET /api/v2/deals/stats — Deal statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const contacts = await prisma.contact.findMany({
      where: {
        businessId,
        OR: [{ dealValue: { gt: 0 } }, { dealStage: { not: null } }],
      },
      select: { dealValue: true, dealStage: true, stage: true },
    });

    const totalDealValue = contacts.reduce((s, c) => s + (c.dealValue || 0), 0);
    const wonDeals = contacts
      .filter(c => ['Closed Won', 'Won'].includes(c.dealStage || '') || c.stage === 'Won')
      .reduce((s, c) => s + (c.dealValue || 0), 0);
    const activeDeals = contacts.filter(c =>
      c.dealStage && !['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(c.dealStage)
    ).length;

    sendSuccess(res, {
      totalDealValue,
      wonDeals,
      activeDeals,
      totalDeals: contacts.length,
      winRate: contacts.length > 0 ? Math.round((wonDeals / totalDealValue) * 100) || 0 : 0,
    }, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to fetch deal stats',
      details: error.message,
      requestId: req.id,
    });
  }
});

// PUT /api/v2/deals/:id/stage — Update deal stage with activity logging
router.put('/:id/stage', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { stage, stageId, pipelineId } = req.body;

    const contact = await prisma.contact.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
    });

    if (!contact) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Deal not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    const oldStage = contact.dealStage || contact.stage;

    const updated = await prisma.contact.update({
      where: { id: qs(req.params.id) },
      data: {
        ...(stage !== undefined && { dealStage: stage, stage }),
        ...(stageId !== undefined && { stageId }),
        ...(pipelineId !== undefined && { pipelineId }),
      },
      select: { id: true, dealStage: true, stage: true, stageId: true, pipelineId: true, dealValue: true },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId: req.user.businessId,
        contactId: qs(req.params.id),
        type: 'deal_stage_changed',
        title: 'Deal stage changed',
        description: `Stage: "${oldStage || 'None'}" → "${stage || updated.dealStage || updated.stage}"`,
        stageFrom: oldStage || undefined,
        stageTo: stage || updated.dealStage || updated.stage || undefined,
        dealValue: updated.dealValue || undefined,
        createdBy: req.user.id,
      },
    });

    sendSuccess(res, updated, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to update deal stage',
      details: error.message,
      requestId: req.id,
    });
  }
});

// PUT /api/v2/deals/:id — Update deal details
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
    });

    if (!existing) {
      return sendError(res, {
        code: ErrorCodes.NOT_FOUND,
        message: 'Deal not found',
        statusCode: 404,
        requestId: req.id,
      });
    }

    // Whitelist allowed fields to prevent mass assignment
    const { dealValue, dealStage, stage, stageId, pipelineId } = req.body;
    const updateData: any = {};
    if (dealValue !== undefined) updateData.dealValue = parseFloat(dealValue);
    if (dealStage !== undefined) updateData.dealStage = dealStage;
    if (stage !== undefined) updateData.stage = stage;
    if (stageId !== undefined) updateData.stageId = stageId;
    if (pipelineId !== undefined) updateData.pipelineId = pipelineId;

    if (Object.keys(updateData).length === 0) {
      return sendError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No valid fields to update',
        statusCode: 400,
        requestId: req.id,
      });
    }

    const updated = await prisma.contact.update({
      where: { id: qs(req.params.id) },
      data: updateData,
    });

    sendSuccess(res, updated, { requestId: req.id });
  } catch (error: any) {
    sendError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to update deal',
      details: error.message,
      requestId: req.id,
    });
  }
});

export default router;
