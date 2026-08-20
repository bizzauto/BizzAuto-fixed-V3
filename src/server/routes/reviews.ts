import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import { qs } from '../utils/query.js';

const router = Router();

// Get reviews
router.get('/', authenticate, cacheResponse(30), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const where: any = { businessId: req.user.businessId };

    if (status === 'unread') {
      where.isRead = false;
    } else if (status === 'read') {
      where.isRead = true;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.review.count({ where }),
    ]);

    res.json({ success: true, data: { reviews, pagination: { total, page: Number(page), limit: Number(limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews', details: error.message });
  }
});

// Get review stats (MUST be before /:id)
router.get('/stats', authenticate, cacheResponse(30), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [totalReviews, averageRating, reviewsByRating, recentReviews] = await Promise.all([
      prisma.review.count({ where: { businessId } }),
      prisma.review.aggregate({
        where: { businessId },
        _avg: { rating: true },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { businessId },
        _count: true,
      }),
      prisma.review.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const ratingDistribution = reviewsByRating.reduce((acc: any, stat: any) => {
      acc[stat.rating] = stat._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalReviews,
        averageRating: averageRating._avg.rating || 0,
        ratingDistribution,
        recentReviews,
      },
    });
  } catch (error: any) {
    console.error('Get review stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch review stats', details: error.message });
  }
});

// Get single review
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
    });

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch review', details: error.message });
  }
});

// Update review reply
router.put('/:id/reply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { replyText } = req.body;
    await prisma.review.update({
      where: { id: qs(req.params.id) },
      data: { replyText, repliedAt: new Date(), replyStatus: 'sent' },
    });
    res.json({ success: true, message: 'Reply sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to send reply', details: error.message });
  }
});

// Sync reviews from Google Business Profile
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get GBP credentials
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return res.status(400).json({
        success: false,
        error: 'Google Business Profile not connected. Please connect in Settings → Integrations.',
      });
    }

    // Fetch reviews from Google My Business API
    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/reviews`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { pageSize: 100 },
      }
    );

    const gbpReviews = response.data.reviews || [];
    let synced = 0;

    for (const gbpReview of gbpReviews) {
      // Map GBP star rating to numeric
      const starMap: Record<string, number> = {
        FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1,
      };
      const rating = starMap[gbpReview.starRating] || 0;
      const externalId = gbpReview.reviewId || gbpReview.name;

      if (!externalId) continue;

      // Check if already synced
      const existing = await prisma.review.findFirst({
        where: { businessId: req.user.businessId, externalId },
      });

      const reviewData = {
        businessId: req.user.businessId,
        platform: 'google' as const,
        externalId,
        reviewerName: gbpReview.reviewer?.displayName || 'Anonymous',
        reviewerEmail: gbpReview.reviewer?.email || undefined,
        rating,
        text: gbpReview.comment || '',
        reviewDate: gbpReview.createTime ? new Date(gbpReview.createTime) : new Date(),
        isPublished: true,
        replyText: gbpReview.reviewReply?.comment || null,
        replyStatus: gbpReview.reviewReply?.comment ? 'replied' as const : null,
        repliedAt: gbpReview.reviewReply?.updateTime ? new Date(gbpReview.reviewReply.updateTime) : null,
      };

      if (existing) {
        await prisma.review.update({
          where: { id: existing.id },
          data: reviewData,
        });
      } else {
        await prisma.review.create({
          data: reviewData,
        });
      }
      synced++;
    }

    res.json({
      success: true,
      message: `Synced ${synced} reviews from Google Business Profile`,
      data: { synced },
    });
  } catch (error: any) {
    console.error('Review sync error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync reviews', details: error.message });
  }
});

export default router;
