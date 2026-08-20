import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { qs } from '../utils/query.js';

const router = Router();

/**
 * GET /api/goals
 * List goals for the authenticated user's business.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Business ID required' });
    }

    const { type, period, active } = req.query;

    const where: any = { businessId };
    if (type) where.type = type;
    if (period) where.period = period;
    if (active !== undefined) where.isActive = active === 'true';

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Map to frontend Goal interface
    const mapped = goals.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      target: g.target,
      current: g.current,
      period: g.period,
      startDate: g.startDate.toISOString().split('T')[0],
      endDate: g.endDate.toISOString().split('T')[0],
      progress: g.target > 0 ? Math.min(Math.round((g.current / g.target) * 100), 100) : 0,
    }));

    res.json({ success: true, data: { goals: mapped } });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/goals
 * Create a new goal.
 */
router.post('/', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Business ID required' });
    }

    const { title, type, target, current, period, startDate, endDate } = req.body;

    if (!title || !type || !target) {
      return res.status(400).json({ success: false, error: 'title, type, and target are required' });
    }

    const goal = await prisma.goal.create({
      data: {
        businessId,
        title,
        type,
        target: parseFloat(target),
        current: current ? parseFloat(current) : 0,
        period: period || 'monthly',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    const mapped = {
      id: goal.id,
      title: goal.title,
      type: goal.type,
      target: goal.target,
      current: goal.current,
      period: goal.period,
      startDate: goal.startDate.toISOString().split('T')[0],
      endDate: goal.endDate.toISOString().split('T')[0],
      progress: goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0,
    };

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ success: false, error: 'Failed to create goal' });
  }
});

/**
 * PUT /api/goals/:id
 * Update a goal's current progress or details.
 */
router.put('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = qs(req.params.id);
    const businessId = req.businessId;

    const existing = await prisma.goal.findFirst({ where: { id, businessId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const { title, type, target, current, period, startDate, endDate, isActive } = req.body;

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(target !== undefined && { target: parseFloat(target) }),
        ...(current !== undefined && { current: parseFloat(current) }),
        ...(period !== undefined && { period }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    const mapped = {
      id: goal.id,
      title: goal.title,
      type: goal.type,
      target: goal.target,
      current: goal.current,
      period: goal.period,
      startDate: goal.startDate.toISOString().split('T')[0],
      endDate: goal.endDate.toISOString().split('T')[0],
      progress: goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0,
    };

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ success: false, error: 'Failed to update goal' });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a goal.
 */
router.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = qs(req.params.id);
    const businessId = req.businessId;

    const existing = await prisma.goal.findFirst({ where: { id, businessId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    await prisma.goal.delete({ where: { id } });
    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ success: false, error: 'Failed to delete goal' });
  }
});

export default router;
