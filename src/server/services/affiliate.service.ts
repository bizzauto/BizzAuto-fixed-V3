import { Request, Response } from 'express';
import { qs } from '../utils/query.js';

interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  refereeId?: string;
  refereeName?: string;
  refereeEmail?: string;
  status: 'pending' | 'signed_up' | 'subscribed' | 'rewarded';
  rewardAmount: number;
  rewardType: 'credit' | 'cash' | 'discount';
  createdAt: Date;
  convertedAt?: Date;
}

interface AffiliateStats {
  totalReferrals: number;
  successfulConversions: number;
  totalEarnings: number;
  pendingRewards: number;
}

class AffiliateService {
  private referrals: Referral[] = [];
  
  // Referral codes (in production, use proper code generation)
  private generateReferralCode(userId: string): string {
    return `REF${userId.substring(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
  }

  // Create referral link
  createReferral(userId: string, userName: string): { code: string; link: string } {
    const code = this.generateReferralCode(userId);
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${code}`;
    
    // Store as pending referral
    this.referrals.push({
      id: `ref-${Date.now()}`,
      referrerId: userId,
      referrerName: userName,
      status: 'pending',
      rewardAmount: 500, // ₹500 credit
      rewardType: 'credit',
      createdAt: new Date(),
    });

    return { code, link };
  }

  // Track referral signup
  trackSignup(referralCode: string, refereeId: string, refereeName: string, refereeEmail: string): Referral | null {
    const referral = this.referrals.find(r => r.status === 'pending' && r.referrerId === referralCode.substring(3, 7));
    if (referral) {
      referral.status = 'signed_up';
      referral.refereeId = refereeId;
      referral.refereeName = refereeName;
      referral.refereeEmail = refereeEmail;
      return referral;
    }
    return null;
  }

  // Mark as subscribed (reward triggered)
  markSubscribed(referralId: string): Referral | null {
    const referral = this.referrals.find(r => r.id === referralId);
    if (referral && referral.status === 'signed_up') {
      referral.status = 'subscribed';
      referral.convertedAt = new Date();
      // Increase reward for actual subscription
      referral.rewardAmount = 1000;
      return referral;
    }
    return null;
  }

  // Get referrer's stats
  getStats(referrerId: string): AffiliateStats {
    const userRefs = this.referrals.filter(r => r.referrerId === referrerId);
    return {
      totalReferrals: userRefs.length,
      successfulConversions: userRefs.filter(r => r.status === 'subscribed' || r.status === 'rewarded').length,
      totalEarnings: userRefs.filter(r => r.status === 'rewarded').reduce((s, r) => s + r.rewardAmount, 0),
      pendingRewards: userRefs.filter(r => r.status === 'subscribed').reduce((s, r) => s + r.rewardAmount, 0),
    };
  }

  // Get referrer's referrals
  getReferrals(referrerId: string): Referral[] {
    return this.referrals.filter(r => r.referrerId === referrerId);
  }

  // Claim reward
  claimReward(referralId: string): { success: boolean; amount: number } {
    const referral = this.referrals.find(r => r.id === referralId && r.status === 'subscribed');
    if (referral) {
      referral.status = 'rewarded';
      return { success: true, amount: referral.rewardAmount };
    }
    return { success: false, amount: 0 };
  }

  // Validate referral code
  validateCode(code: string): { valid: boolean; referrerName?: string } {
    const referral = this.referrals.find(r => r.status === 'pending' && r.referrerId === code.substring(3, 7));
    return {
      valid: !!referral,
      referrerName: referral?.referrerName,
    };
  }

  // Leaderboard
  getLeaderboard(): { userId: string; name: string; referrals: number; earnings: number }[] {
    const byUser: Record<string, { name: string; referrals: number; earnings: number }> = {};
    
    this.referrals.forEach(r => {
      if (!byUser[r.referrerId]) {
        byUser[r.referrerId] = { name: r.referrerName, referrals: 0, earnings: 0 };
      }
      byUser[r.referrerId].referrals++;
      if (r.status === 'rewarded') {
        byUser[r.referrerId].earnings += r.rewardAmount;
      }
    });

    return Object.entries(byUser)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10);
  }
}

export const affiliateService = new AffiliateService();

// Routes
export const createReferral = (req: Request, res: Response) => {
  const { userId, userName } = req.body;
  const result = affiliateService.createReferral(userId, userName);
  res.json({ success: true, data: result });
};

export const getReferrals = (req: Request, res: Response) => {
  const userId = qs(req.params.userId);
  const referrals = affiliateService.getReferrals(userId);
  res.json({ success: true, data: referrals });
};

export const getAffiliateStats = (req: Request, res: Response) => {
  const userId = qs(req.params.userId);
  const stats = affiliateService.getStats(userId);
  res.json({ success: true, data: stats });
};

export const claimReward = (req: Request, res: Response) => {
  const referralId = qs(req.params.referralId);
  const result = affiliateService.claimReward(referralId);
  res.json(result);
};

export const validateReferralCode = (req: Request, res: Response) => {
  const code = qs(req.params.code);
  const result = affiliateService.validateCode(code);
  res.json({ success: true, data: result });
};

export const getLeaderboard = (_req: Request, res: Response) => {
  const leaderboard = affiliateService.getLeaderboard();
  res.json({ success: true, data: leaderboard });
};

export const trackSignup = (req: Request, res: Response) => {
  const { code, refereeId, refereeName, refereeEmail } = req.body;
  const result = affiliateService.trackSignup(code, refereeId, refereeName, refereeEmail);
  res.json({ success: !!result, data: result });
};