import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Generate unique referral code
function generateReferralCode(): string {
  return 'BIZZ' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET /api/referrals - Get user's referral info
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    let referral = await prisma.platformReferral.findUnique({
      where: { userId },
      include: {
        rewards: { orderBy: { createdAt: 'desc' }, take: 10 },
        payouts: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    // Auto-create referral if not exists
    if (!referral) {
      const code = generateReferralCode();
      referral = await prisma.platformReferral.create({
        data: { userId, referralCode: code },
        include: {
          rewards: { orderBy: { createdAt: 'desc' }, take: 10 },
          payouts: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    }

    res.json({ success: true, data: referral });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/referrals/apply - Apply referral code during signup
router.post('/apply', (async (req: Request, res: Response) => {
  try {
    const { referralCode, newUserId } = (req as any).body;

    if (!referralCode || !newUserId) {
      return res.status(400).json({ success: false, error: 'Referral code and user ID required' });
    }

    // Find referral by code
    const referral = await prisma.platformReferral.findFirst({
      where: { referralCode: referralCode.toUpperCase(), isActive: true },
    });

    if (!referral) {
      return res.status(404).json({ success: false, error: 'Invalid referral code' });
    }

    // Cannot refer yourself
    if (referral.userId === newUserId) {
      return res.status(400).json({ success: false, error: 'Cannot refer yourself' });
    }

    // Create reward for referrer (signup bonus)
    await prisma.platformReferralReward.create({
      data: {
        referrerId: referral.userId,
        refereeId: newUserId,
        referralId: referral.id,
        rewardType: 'signup',
        rewardAmount: 100, // ₹100 signup bonus
        status: 'credited',
        creditedAt: new Date(),
      },
    });

    // Update referral stats
    await prisma.platformReferral.update({
      where: { id: referral.id },
      data: {
        totalReferrals: { increment: 1 },
        totalEarnings: { increment: 100 },
        pendingPayout: { increment: 100 },
      },
    });

    res.json({ success: true, message: 'Referral applied successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}) as any);

// POST /api/referrals/reward - Reward on subscription
router.post('/reward', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refereeId, rewardType, amount } = req.body;

    // Find who referred this user
    const reward = await prisma.platformReferralReward.findFirst({
      where: { refereeId, rewardType: 'signup' },
    });

    if (!reward) return res.json({ success: true, message: 'No referral found' });

    // Create subscription reward
    await prisma.platformReferralReward.create({
      data: {
        referrerId: reward.referrerId,
        refereeId,
        referralId: reward.referralId,
        rewardType: rewardType || 'subscription',
        rewardAmount: amount || 200,
        status: 'credited',
        creditedAt: new Date(),
      },
    });

    // Update referral totals
    await prisma.platformReferral.update({
      where: { id: reward.referralId },
      data: {
        totalEarnings: { increment: amount || 200 },
        pendingPayout: { increment: amount || 200 },
      },
    });

    res.json({ success: true, message: 'Reward credited' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/referrals/leaderboard - Top referrers
router.get('/leaderboard', (async (req: Request, res: Response) => {
  try {
    const topReferrers = await prisma.platformReferral.findMany({
      where: { isActive: true },
      orderBy: { totalReferrals: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.json({ success: true, data: topReferrers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}) as any);

// POST /api/referrals/payout - Request payout
router.post('/payout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { method, amount } = req.body;

    const referral = await prisma.platformReferral.findUnique({ where: { userId } });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });

    if (referral.pendingPayout < (amount || 100)) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Create payout request
    const payout = await prisma.platformReferralPayout.create({
      data: {
        referralId: referral.id,
        amount: amount || referral.pendingPayout,
        method: method || 'upi',
        status: 'pending',
      },
    });

    // Deduct from pending
    await prisma.platformReferral.update({
      where: { id: referral.id },
      data: { pendingPayout: { decrement: amount || referral.pendingPayout } },
    });

    res.json({ success: true, data: payout });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;