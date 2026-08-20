import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import { validate } from '../middleware/validate.js';
import { updateDealStageSchema, updateDealSchema } from '../validations/crm-schemas.js';
import { qs } from '../utils/query.js';

const router = Router();

// GET /api/deals - List all deals (contacts with deal info)
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { page = 1, limit = 50, stage, pipelineId, search } = req.query;
    const businessId = req.user.businessId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId,
      OR: [
        { dealValue: { gt: 0 } },
        { dealStage: { not: null } },
        { pipelineId: { not: null } },
        { stageId: { not: null } },
      ],
    };

    if (stage) {
      where.dealStage = stage as string;
    }
    if (pipelineId) {
      where.pipelineId = pipelineId as string;
    }
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
            { company: { contains: search as string, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          company: true,
          dealValue: true,
          dealStage: true,
          pipelineId: true,
          stageId: true,
          stage: true,
          tags: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          pipeline: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    // Map contacts to Deal format for the frontend
    const deals = contacts.map((c) => ({
      id: c.id,
      contactId: c.id,
      contactName: c.name,
      title: c.dealStage
        ? `${c.name} - ${c.dealStage}`
        : c.name,
      value: c.dealValue || 0,
      stage: c.dealStage || c.stage || 'New Lead',
      stageId: c.stageId,
      pipelineId: c.pipelineId,
      probability: getProbability(c.dealStage || c.stage),
      expectedClose: getExpectedClose(c.dealStage || c.stage),
      createdAt: c.createdAt.toISOString(),
      contact: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        company: c.company,
        tags: c.tags,
        source: c.source,
      },
    }));

    res.json({
      success: true,
      data: {
        deals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get deals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deals', details: error.message });
  }
});

// GET /api/deals/stats - Get deal statistics
router.get('/stats', authenticate, cacheResponse(30), async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;

    const contacts = await prisma.contact.findMany({
      where: {
        businessId,
        OR: [
          { dealValue: { gt: 0 } },
          { dealStage: { not: null } },
        ],
      },
      select: { dealValue: true, dealStage: true, stage: true, createdAt: true, updatedAt: true },
    });

    const totalDealValue = contacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const wonDeals = contacts
      .filter((c) => c.dealStage === 'Closed Won' || c.dealStage === 'Won' || c.stage === 'Won')
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const lostDeals = contacts
      .filter((c) => c.dealStage === 'Closed Lost' || c.dealStage === 'Lost' || c.stage === 'Lost')
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);
    const activeDeals = contacts.filter(
      (c) => c.dealStage && !['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(c.dealStage)
    ).length;

    // Pipeline distribution
    const pipelineMap = new Map<string, { count: number; value: number }>();
    for (const c of contacts) {
      const stage = c.dealStage || c.stage || 'Unknown';
      const existing = pipelineMap.get(stage) || { count: 0, value: 0 };
      pipelineMap.set(stage, {
        count: existing.count + 1,
        value: existing.value + (c.dealValue || 0),
      });
    }

    // Weighted pipeline value (dealValue × probability %)
    let weightedPipelineValue = 0;
    const pipeline = Array.from(pipelineMap.entries()).map(([name, data]) => {
      const prob = getProbability(name) / 100;
      const weighted = data.value * prob;
      weightedPipelineValue += weighted;
      return {
        name,
        count: data.count,
        value: data.value,
        probability: getProbability(name),
        weightedValue: Math.round(weighted),
      };
    });

    // Conversion rates (stage-by-stage)
    const totalContacts = contacts.length || 1;
    const wonCount = contacts.filter(c => ['Won', 'Closed Won'].includes(c.dealStage || c.stage || '')).length;
    const lostCount = contacts.filter(c => ['Lost', 'Closed Lost'].includes(c.dealStage || c.stage || '')).length;
    const winRate = totalContacts > 0 ? Math.round((wonCount / totalContacts) * 100) : 0;
    const lossRate = totalContacts > 0 ? Math.round((lostCount / totalContacts) * 100) : 0;

    // Forecast data
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const monthDeals = contacts.filter(c => new Date(c.createdAt) >= monthStart);
    const quarterDeals = contacts.filter(c => new Date(c.createdAt) >= quarterStart);
    const monthlyForecast = Math.round(weightedPipelineValue * 0.4); // Conservative 40% close rate
    const quarterlyForecast = Math.round(weightedPipelineValue * 0.65);

    // Average deal age (in days)
    let totalAgeDays = 0;
    let ageCount = 0;
    for (const c of contacts) {
      if (c.createdAt) {
        const days = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        totalAgeDays += Math.max(0, days);
        ageCount++;
      }
    }
    const avgDealAge = ageCount > 0 ? Math.round(totalAgeDays / ageCount) : 0;

    res.json({
      success: true,
      data: {
        totalDealValue,
        wonDeals,
        lostDeals,
        activeDeals,
        totalDeals: contacts.length,
        weightedPipelineValue,
        winRate,
        lossRate,
        avgDealAge,
        monthlyForecast,
        quarterlyForecast,
        pipeline,
      },
    });
  } catch (error: any) {
    console.error('Get deal stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deal stats', details: error.message });
  }
});

// PUT /api/deals/:id/stage - Update deal stage (for drag-and-drop) — OWNER/ADMIN only
router.put('/:id/stage', authenticate, requireRole('OWNER', 'ADMIN'), validate(updateDealStageSchema), async (req: AuthRequest, res: any) => {
  try {
    const id = qs(req.params.id);
    const { stage, stageId, pipelineId } = req.body;
    const businessId = req.user.businessId;

    const contact = await prisma.contact.findFirst({
      where: { id, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact/deal not found' });
    }

    const oldStage = contact.dealStage || contact.stage;

    const updated = await prisma.contact.update({
      where: { id, businessId },
      data: {
        ...(stage !== undefined && { dealStage: stage, stage }),
        ...(stageId !== undefined && { stageId }),
        ...(pipelineId !== undefined && { pipelineId }),
      },
      select: {
        id: true, name: true, dealValue: true, dealStage: true, stage: true,
        stageId: true, pipelineId: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: id,
        type: 'deal_stage_changed',
        title: 'Deal stage changed',
        description: `Stage changed from "${oldStage || 'None'}" to "${stage || updated.dealStage || updated.stage}"`,
        stageFrom: oldStage || undefined,
        stageTo: stage || updated.dealStage || updated.stage || undefined,
        dealValue: updated.dealValue || undefined,
        createdBy: req.user.id,
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        stage: updated.dealStage || updated.stage,
        stageId: updated.stageId,
        pipelineId: updated.pipelineId,
      },
    });
  } catch (error: any) {
    console.error('Update deal stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to update deal stage', details: error.message });
  }
});

// PUT /api/deals/:id - Update deal value/details — OWNER/ADMIN only
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), validate(updateDealSchema), async (req: AuthRequest, res: any) => {
  try {
    const id = qs(req.params.id);
    const { dealValue, dealStage, stage, stageId, pipelineId } = req.body;
    const businessId = req.user.businessId;

    const contact = await prisma.contact.findFirst({
      where: { id, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact/deal not found' });
    }

    const updated = await prisma.contact.update({
      where: { id, businessId },
      data: {
        ...(dealValue !== undefined && { dealValue: parseFloat(dealValue) }),
        ...(dealStage !== undefined && { dealStage }),
        ...(stage !== undefined && { stage }),
        ...(stageId !== undefined && { stageId }),
        ...(pipelineId !== undefined && { pipelineId }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update deal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update deal', details: error.message });
  }
});

function getProbability(stage: string | null | undefined): number {
  const normalized = (stage || '').toLowerCase().trim();
  if (normalized.includes('new') || normalized.includes('lead inbox')) return 10;
  if (normalized.includes('contact')) return 25;
  if (normalized.includes('qualif')) return 50;
  if (normalized.includes('proposal')) return 65;
  if (normalized.includes('negotiat')) return 80;
  if (normalized.includes('won') || normalized === 'closed won') return 100;
  if (normalized.includes('lost') || normalized === 'closed lost') return 0;
  return 20;
}

function getExpectedClose(stage: string | null | undefined): string {
  const now = new Date();
  switch (stage) {
    case 'New Lead':
      now.setDate(now.getDate() + 30);
      break;
    case 'Contacted':
      now.setDate(now.getDate() + 21);
      break;
    case 'Qualified':
      now.setDate(now.getDate() + 14);
      break;
    case 'Proposal':
      now.setDate(now.getDate() + 10);
      break;
    case 'Negotiation':
      now.setDate(now.getDate() + 5);
      break;
    default:
      now.setDate(now.getDate() + 30);
  }
  return now.toISOString().split('T')[0];
}

export default router;
