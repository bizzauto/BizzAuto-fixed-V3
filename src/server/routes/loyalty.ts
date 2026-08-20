import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { qs } from '../utils/query.js';

const router = Router();

// ─── GET /program ───────────────────────────────────────────────────────────
router.get('/program', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const program = await prisma.loyaltyProgram.findFirst({
      where: { businessId: req.user.businessId, isActive: true },
    });

    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Get loyalty program error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loyalty program', details: error.message });
  }
});

// ─── POST /program ──────────────────────────────────────────────────────────
router.post('/program', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { name, pointsPerRupee, redemptionRate, minRedemption, tierThresholds } = req.body;

    const existing = await prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
    });

    let program;
    if (existing) {
      program = await prisma.loyaltyProgram.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name }),
          ...(pointsPerRupee !== undefined && { pointsPerRupee: parseFloat(pointsPerRupee) }),
          ...(redemptionRate !== undefined && { redemptionRate: parseFloat(redemptionRate) }),
          ...(minRedemption !== undefined && { minRedemption: parseInt(minRedemption) }),
          ...(tierThresholds !== undefined && { tierThresholds }),
        },
      });
    } else {
      program = await prisma.loyaltyProgram.create({
        data: {
          businessId,
          name: name || 'Loyalty Program',
          pointsPerRupee: pointsPerRupee ? parseFloat(pointsPerRupee) : 1,
          redemptionRate: redemptionRate ? parseFloat(redemptionRate) : 0.01,
          minRedemption: minRedemption ? parseInt(minRedemption) : 100,
          tierThresholds: tierThresholds || { bronze: 0, silver: 500, gold: 2000, platinum: 5000 },
          isActive: true,
        },
      });
    }

    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Create/update loyalty program error:', error);
    res.status(500).json({ success: false, error: 'Failed to save loyalty program', details: error.message });
  }
});

// ─── GET /points/:contactId ─────────────────────────────────────────────────
router.get('/points/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const businessId = req.user.businessId;
    const { page = '1', limit = '50' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [points, total, aggregated] = await Promise.all([
      prisma.loyaltyPoints.findMany({
        where: { businessId, contactId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {} as any,
      }),
      prisma.loyaltyPoints.count({ where: { businessId, contactId } }),
      prisma.loyaltyPoints.aggregate({
        where: { businessId, contactId },
        _sum: {
          points: true,
        },
      }),
    ]);

    // Calculate current balance by summing earn/adjust and subtracting redeem/expire
    const allPoints = await prisma.loyaltyPoints.findMany({
      where: { businessId, contactId },
      select: { points: true, type: true },
    });

    let balance = 0;
    for (const p of allPoints) {
      if (p.type === 'earn' || p.type === 'adjust') {
        balance += p.points;
      } else if (p.type === 'redeem' || p.type === 'expire') {
        balance -= p.points;
      }
    }

    res.json({
      success: true,
      data: {
        contactId,
        balance,
        history: points,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get contact points error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch points history', details: error.message });
  }
});

// ─── POST /points/earn ──────────────────────────────────────────────────────
router.post('/points/earn', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId, points, description, orderId, source } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    if (!points || typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ success: false, error: 'points must be a positive number' });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // Calculate expiry (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create earn record and update balance
    const [earnedPoints] = await prisma.$transaction([
      prisma.loyaltyPoints.create({
        data: {
          businessId,
          contactId,
          points: Math.round(points),
          type: 'earn',
          description: description || `Points earned via ${source || 'purchase'}`,
          orderId: orderId || null,
          expiresAt,
        },
      }),
      // Also update the balance snapshot for quick lookup
      prisma.loyaltyPoints.updateMany({
        where: { businessId, contactId },
        data: { balance: { increment: Math.round(points) } },
      }),
    ]);

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId,
        type: 'loyalty_points_earned',
        title: `${Math.round(points)} loyalty points earned`,
        content: description || `Points earned via ${source || 'purchase'}`,
        metadata: { pointsEarned: Math.round(points), source, orderId },
        createdBy: req.user.id,
      },
    });

    res.json({ success: true, message: `${Math.round(points)} points earned`, data: earnedPoints });
  } catch (error: any) {
    console.error('Earn points error:', error);
    res.status(500).json({ success: false, error: 'Failed to earn points', details: error.message });
  }
});

// ─── POST /points/redeem ────────────────────────────────────────────────────
router.post('/points/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId, points, description, orderId } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    if (!points || typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ success: false, error: 'points must be a positive number' });
    }

    // Get loyalty program config
    const program = await prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
    });

    const minRedemption = program?.minRedemption || 100;
    if (points < minRedemption) {
      return res.status(400).json({ success: false, error: `Minimum redemption is ${minRedemption} points` });
    }

    // Calculate current balance
    const allPoints = await prisma.loyaltyPoints.findMany({
      where: { businessId, contactId },
      select: { points: true, type: true },
    });

    let currentBalance = 0;
    for (const p of allPoints) {
      if (p.type === 'earn' || p.type === 'adjust') {
        currentBalance += p.points;
      } else if (p.type === 'redeem' || p.type === 'expire') {
        currentBalance -= p.points;
      }
    }

    if (currentBalance < points) {
      return res.status(400).json({ success: false, error: `Insufficient points. Available: ${currentBalance}` });
    }

    const [redeemedPoints] = await prisma.$transaction([
      prisma.loyaltyPoints.create({
        data: {
          businessId,
          contactId,
          points: Math.round(points),
          type: 'redeem',
          description: description || 'Points redeemed',
          orderId: orderId || null,
          balance: currentBalance - Math.round(points),
        },
      }),
      prisma.loyaltyPoints.updateMany({
        where: { businessId, contactId },
        data: { balance: { decrement: Math.round(points) } },
      }),
    ]);

    // Calculate monetary value of redeemed points
    const redemptionRate = program?.redemptionRate || 0.01;
    const monetaryValue = Math.round(points * redemptionRate);

    await prisma.activity.create({
      data: {
        businessId,
        contactId,
        type: 'loyalty_points_redeemed',
        title: `${Math.round(points)} loyalty points redeemed`,
        content: description || `Points redeemed (value: ₹${monetaryValue})`,
        metadata: { pointsRedeemed: Math.round(points), monetaryValue },
        createdBy: req.user.id,
      },
    });

    res.json({
      success: true,
      message: `${Math.round(points)} points redeemed`,
      data: {
        ...redeemedPoints,
        monetaryValue,
      },
    });
  } catch (error: any) {
    console.error('Redeem points error:', error);
    res.status(500).json({ success: false, error: 'Failed to redeem points', details: error.message });
  }
});

// ─── GET /rewards ───────────────────────────────────────────────────────────
router.get('/rewards', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { includeInactive } = req.query;

    const where: any = { businessId };
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const rewards = await prisma.loyaltyReward.findMany({
      where,
      orderBy: { pointsRequired: 'asc' },
    });

    res.json({ success: true, data: rewards });
  } catch (error: any) {
    console.error('List rewards error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rewards', details: error.message });
  }
});

// ─── POST /rewards ──────────────────────────────────────────────────────────
router.post('/rewards', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { name, description, pointsRequired, rewardType, rewardValue, maxRedemptions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    if (!pointsRequired || typeof pointsRequired !== 'number' || pointsRequired <= 0) {
      return res.status(400).json({ success: false, error: 'pointsRequired must be a positive number' });
    }

    const validRewardTypes = ['discount', 'free_product', 'free_shipping', 'custom'];
    const type = validRewardTypes.includes(rewardType) ? rewardType : 'custom';

    const reward = await prisma.loyaltyReward.create({
      data: {
        businessId,
        name,
        description: description || null,
        pointsRequired: Math.round(pointsRequired),
        rewardType: type,
        rewardValue: rewardValue ? parseFloat(rewardValue) : 0,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        redemptionCount: 0,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: reward });
  } catch (error: any) {
    console.error('Create reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to create reward', details: error.message });
  }
});

// ─── PUT /rewards/:id ───────────────────────────────────────────────────────
router.put('/rewards/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const { name, description, pointsRequired, rewardType, rewardValue, maxRedemptions, isActive } = req.body;

    const existing = await prisma.loyaltyReward.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    const reward = await prisma.loyaltyReward.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(pointsRequired !== undefined && { pointsRequired: Math.round(pointsRequired) }),
        ...(rewardType !== undefined && { rewardType }),
        ...(rewardValue !== undefined && { rewardValue: parseFloat(rewardValue) }),
        ...(maxRedemptions !== undefined && { maxRedemptions: maxRedemptions !== null ? parseInt(maxRedemptions) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: reward });
  } catch (error: any) {
    console.error('Update reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to update reward', details: error.message });
  }
});

// ─── POST /rewards/:id/redeem ───────────────────────────────────────────────
router.post('/rewards/:id/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    const reward = await prisma.loyaltyReward.findFirst({
      where: { id, businessId, isActive: true },
    });

    if (!reward) {
      return res.status(404).json({ success: false, error: 'Reward not found or inactive' });
    }

    if (reward.maxRedemptions !== null && reward.redemptionCount >= reward.maxRedemptions) {
      return res.status(400).json({ success: false, error: 'Reward has reached maximum redemptions' });
    }

    // Calculate current balance
    const allPoints = await prisma.loyaltyPoints.findMany({
      where: { businessId, contactId },
      select: { points: true, type: true },
    });

    let currentBalance = 0;
    for (const p of allPoints) {
      if (p.type === 'earn' || p.type === 'adjust') {
        currentBalance += p.points;
      } else if (p.type === 'redeem' || p.type === 'expire') {
        currentBalance -= p.points;
      }
    }

    if (currentBalance < reward.pointsRequired) {
      return res.status(400).json({
        success: false,
        error: `Insufficient points. Required: ${reward.pointsRequired}, Available: ${currentBalance}`,
      });
    }

    // Deduct points and increment redemption count
    const [redeemedPoints] = await prisma.$transaction([
      prisma.loyaltyPoints.create({
        data: {
          businessId,
          contactId,
          points: reward.pointsRequired,
          type: 'redeem',
          description: `Reward redeemed: ${reward.name}`,
          balance: currentBalance - reward.pointsRequired,
        },
      }),
      prisma.loyaltyReward.update({
        where: { id },
        data: {
          redemptionCount: { increment: 1 },
          ...(reward.maxRedemptions !== null && reward.redemptionCount + 1 >= reward.maxRedemptions
            ? { isActive: false }
            : {}),
        },
      }),
    ]);

    await prisma.activity.create({
      data: {
        businessId,
        contactId,
        type: 'loyalty_reward_redeemed',
        title: `Reward redeemed: ${reward.name}`,
        content: `${reward.pointsRequired} points used for ${reward.rewardType} reward`,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
          pointsUsed: reward.pointsRequired,
        },
        createdBy: req.user.id,
      },
    });

    res.json({
      success: true,
      message: `Reward "${reward.name}" redeemed successfully`,
      data: {
        reward,
        pointsUsed: reward.pointsRequired,
        remainingBalance: currentBalance - reward.pointsRequired,
      },
    });
  } catch (error: any) {
    console.error('Redeem reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to redeem reward', details: error.message });
  }
});

// ─── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [
      totalEarnedAgg,
      totalRedeemedAgg,
      totalExpiredAgg,
      activeMembers,
      totalRewards,
      recentPoints,
      bySource,
    ] = await Promise.all([
      prisma.loyaltyPoints.aggregate({
        where: { businessId, type: 'earn' },
        _sum: { points: true },
      }),
      prisma.loyaltyPoints.aggregate({
        where: { businessId, type: 'redeem' },
        _sum: { points: true },
      }),
      prisma.loyaltyPoints.aggregate({
        where: { businessId, type: 'expire' },
        _sum: { points: true },
      }),
      // Distinct contacts with at least one earn transaction
      prisma.loyaltyPoints.findMany({
        where: { businessId, type: 'earn' },
        select: { contactId: true },
        distinct: ['contactId'],
      }),
      prisma.loyaltyReward.count({ where: { businessId, isActive: true } }),
      prisma.loyaltyPoints.findMany({
        where: {
          businessId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { points: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loyaltyPoints.groupBy({
        by: ['description'],
        where: { businessId, type: 'earn' },
        _sum: { points: true },
        _count: true,
        orderBy: { _sum: { points: 'desc' } },
        take: 10,
      }),
    ]);

    const totalPointsIssued = totalEarnedAgg._sum.points || 0;
    const totalPointsRedeemed = totalRedeemedAgg._sum.points || 0;
    const totalPointsExpired = totalExpiredAgg._sum.points || 0;
    const activeMemberCount = activeMembers.length;

    // Outstanding balance
    const outstandingPoints = totalPointsIssued - totalPointsRedeemed - totalPointsExpired;

    // Last 30 days daily trend
    const dailyMap = new Map<string, { earned: number; redeemed: number }>();
    for (const entry of recentPoints) {
      const day = entry.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { earned: 0, redeemed: 0 });
      const bucket = dailyMap.get(day)!;
      if (entry.type === 'earn') bucket.earned += entry.points;
      if (entry.type === 'redeem') bucket.redeemed += entry.points;
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top earn sources
    const topSources = bySource.map((item) => ({
      source: item.description || 'Unknown',
      totalPoints: item._sum.points || 0,
      count: item._count,
    }));

    res.json({
      success: true,
      data: {
        totalPointsIssued,
        totalPointsRedeemed,
        totalPointsExpired,
        outstandingPoints,
        activeMemberCount,
        totalActiveRewards: totalRewards,
        dailyTrend,
        topSources,
      },
    });
  } catch (error: any) {
    console.error('Get loyalty stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loyalty stats', details: error.message });
  }
});

export default router;
