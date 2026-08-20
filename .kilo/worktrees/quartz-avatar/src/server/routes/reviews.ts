import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get reviews
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const where: any = { businessId: req.user.businessId };
    if (status) where.isRead = status === 'unread' ? false : true;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.review.count({ where }),
    ]);

    res.json({ success: true, data: { reviews, pagination: { total, page: Number(page), limit: Number(limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews', details: error.message });
  }
});

// Update review reply
router.put('/:id/reply', authenticate, async (req: any, res: any) => {
  try {
    const { replyText } = req.body;
    await prisma.review.update({
      where: { id: req.params.id },
      data: { replyText, repliedAt: new Date(), replyStatus: 'sent' },
    });
    res.json({ success: true, message: 'Reply sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to send reply', details: error.message });
  }
});

// Get review stats
router.get('/stats', authenticate, async (req: any, res: any) => {
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

// Sync reviews (placeholder for Google Business Profile integration)
router.post('/sync', authenticate, async (req: any, res: any) => {
  try {
    // This would integrate with Google Business Profile API
    // For now, return success
    res.json({
      success: true,
      message: 'Review sync initiated',
      data: { synced: 0, message: 'Google Business Profile integration required' },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to sync reviews', details: error.message });
  }
});

export default router;
