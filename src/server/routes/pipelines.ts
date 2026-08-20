import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/pipelines - List all pipelines with stages
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;

    const pipelines = await prisma.pipeline.findMany({
      where: { businessId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { contacts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Optimized: single query for stage-level aggregates instead of N+1
    const stageIds = pipelines.flatMap(p => p.stages.map(s => s.id));
    
    // Fetch all stage aggregates in one query
    const stageAggs = stageIds.length > 0 ? await prisma.contact.groupBy({
      by: ['stageId'],
      where: { businessId, stageId: { in: stageIds } },
      _count: { stageId: true },
      _sum: { dealValue: true },
    }) : [];
    
    const aggMap = new Map(stageAggs.map(a => [a.stageId, {
      dealCount: a._count.stageId,
      dealValue: a._sum.dealValue || 0,
    }]));

    // Map pipeline data using the pre-computed aggregates
    const result = pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isDefault: p.isDefault,
      stages: p.stages.map((s) => {
        const agg = aggMap.get(s.id) || { dealCount: 0, dealValue: 0 };
        return {
          id: s.id,
          name: s.name,
          order: s.order,
          color: s.color,
          dealCount: agg.dealCount,
          dealValue: agg.dealValue,
        };
      }),
      contactCount: p._count.contacts,
    }));

    res.json({ success: true, data: { pipelines: result } });
  } catch (error: any) {
    console.error('Get pipelines error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipelines', details: error.message });
  }
});

// POST /api/pipelines - Create a pipeline
router.post('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { name, description, stages } = req.body;
    const businessId = req.user.businessId;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Pipeline name is required' });
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        businessId,
        name,
        description,
        stages: {
          create: stages?.map((s: any, i: number) => ({
            name: s.name,
            order: s.order ?? i,
            color: s.color,
          })) || [
            { name: 'Lead Inbox', order: 0, color: '#3B82F6' },
            { name: 'Contacted', order: 1, color: '#F59E0B' },
            { name: 'Qualified', order: 2, color: '#8B5CF6' },
            { name: 'Proposal', order: 3, color: '#F97316' },
            { name: 'Negotiation', order: 4, color: '#EC4899' },
            { name: 'Closed Won', order: 5, color: '#10B981' },
            { name: 'Closed Lost', order: 6, color: '#EF4444' },
          ],
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ success: true, data: pipeline });
  } catch (error: any) {
    console.error('Create pipeline error:', error);
    res.status(500).json({ success: false, error: 'Failed to create pipeline', details: error.message });
  }
});

// POST /api/pipelines/:id/stages - Add a stage to a pipeline
router.post('/:id/stages', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const businessId = req.user.businessId;

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, businessId },
      include: { stages: true },
    });

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline not found' });
    }

    const maxOrder = pipeline.stages.reduce((max, s) => Math.max(max, s.order), 0);

    const stage = await prisma.stage.create({
      data: {
        pipelineId: id,
        name,
        order: maxOrder + 1,
        color,
      },
    });

    res.status(201).json({ success: true, data: stage });
  } catch (error: any) {
    console.error('Create stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to create stage', details: error.message });
  }
});

// DELETE /api/pipelines/:id - Delete a pipeline
router.delete('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, businessId },
    });

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline not found' });
    }

    // Move contacts out of this pipeline
    await prisma.contact.updateMany({
      where: { pipelineId: id },
      data: { pipelineId: null, stageId: null },
    });

    await prisma.pipeline.delete({ where: { id } });

    res.json({ success: true, message: 'Pipeline deleted' });
  } catch (error: any) {
    console.error('Delete pipeline error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete pipeline', details: error.message });
  }
});

export default router;
