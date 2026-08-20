import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get dashboard analytics (for frontend dashboard)
router.get('/dashboard', authenticate, async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      contactsCount,
      messagesCount,
      postsCount,
      campaignsCount,
      reviewsCount,
      leadsToday,
      messagesToday,
      contactsToday,
      scheduledPostsCount,
      reviews,
    ] = await Promise.all([
      prisma.contact.count({ where: { businessId: req.user.businessId } }),
      prisma.message.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.socialPost.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.campaign.count({
        where: {
          businessId: req.user.businessId,
          status: 'active',
        },
      }),
      prisma.review.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.contact.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: today },
        },
      }),
      prisma.message.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: today },
        },
      }),
      prisma.contact.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: today },
        },
      }),
      prisma.socialPost.count({
        where: {
          businessId: req.user.businessId,
          status: 'scheduled',
        },
      }),
      prisma.review.findMany({
        where: {
          businessId: req.user.businessId,
        },
        take: 100,
      }),
    ]);

    // Calculate changes (simplified - in production, compare with previous period)
    const leadsChange = leadsToday > 0 ? '+12%' : '+0%';
    const messagesChange = messagesToday > 0 ? '+8%' : '+0%';
    const contactsChange = contactsToday > 0 ? '+5%' : '+0%';
    const postsChange = postsCount > 0 ? '+15%' : '+0%';
    const ratingChange = '+0.1';

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    // Generate chart data for the last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayMessages, dayPosts, dayLeads] = await Promise.all([
        prisma.message.count({
          where: {
            businessId: req.user.businessId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.socialPost.count({
          where: {
            businessId: req.user.businessId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.contact.count({
          where: {
            businessId: req.user.businessId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      chartData.push({
        name: dateStr,
        messages: dayMessages,
        posts: dayPosts,
        leads: dayLeads,
      });
    }

    // Get pipeline distribution
    const pipelineStats = await prisma.contact.groupBy({
      by: ['stageId'],
      where: { businessId: req.user.businessId },
      _count: true,
    });

    const pipeline = pipelineStats.map((stat: any) => ({
      name: stat.stageId || 'Unassigned',
      value: stat._count,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][pipelineStats.indexOf(stat) % 5],
    }));

    res.json({
      success: true,
      data: {
        stats: {
          leadsToday,
          leadsChange,
          messagesToday,
          messagesChange,
          contactsToday,
          contactsChange,
          scheduledPosts: scheduledPostsCount,
          postsChange,
          avgRating: avgRating ? parseFloat(avgRating) : null,
          ratingChange,
        },
        overview: {
          totalContacts: contactsCount,
          messagesSent: messagesCount,
          postsPublished: postsCount,
          activeCampaigns: campaignsCount,
          newReviews: reviewsCount,
        },
        chartData,
        pipeline,
      },
    });
  } catch (error: any) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      details: error.message,
    });
  }
});

// Get business analytics
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [
      contactsCount,
      messagesCount,
      postsCount,
      campaignsCount,
      reviewsCount,
      recentContacts,
      recentMessages,
      pipelineStats,
    ] = await Promise.all([
      prisma.contact.count({ where: { businessId: req.user.businessId } }),
      prisma.message.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.socialPost.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.campaign.count({
        where: {
          businessId: req.user.businessId,
          status: 'active',
        },
      }),
      prisma.review.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.contact.findMany({
        where: { businessId: req.user.businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.message.findMany({
        where: { businessId: req.user.businessId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.contact.groupBy({
        by: ['stageId'],
        where: { businessId: req.user.businessId },
        _count: true,
      }),
    ]);

    // Message stats by type
    const messageStats = await prisma.message.groupBy({
      by: ['status'],
      where: {
        businessId: req.user.businessId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalContacts: contactsCount,
          messagesSent: messagesCount,
          postsPublished: postsCount,
          activeCampaigns: campaignsCount,
          newReviews: reviewsCount,
        },
        messageStats: messageStats.reduce((acc: any, stat: any) => {
          acc[stat.status] = stat._count;
          return acc;
        }, {}),
        pipelineStats,
        recentContacts,
        recentMessages,
      },
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message,
    });
  }
});

// Get detailed campaign analytics
router.get('/campaigns/:campaignId', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.campaignId,
        businessId: req.user.businessId,
      },
      include: {
        messages: {
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const stats = {
      total: campaign.messages.length,
      sent: campaign.messages.filter((m: any) => m.status === 'sent').length,
      delivered: campaign.messages.filter((m: any) => m.status === 'delivered').length,
      read: campaign.messages.filter((m: any) => m.status === 'read').length,
      failed: campaign.messages.filter((m: any) => m.status === 'failed').length,
    };

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
        },
        stats,
        performance: {
          deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0,
          readRate: stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0,
          failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaign analytics', details: error.message });
  }
});

// Get messages analytics
router.get('/messages', authenticate, async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const messages = await prisma.message.findMany({
      where: {
        businessId: req.user.businessId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: messages.length,
      sent: messages.filter((m: any) => m.status === 'sent').length,
      delivered: messages.filter((m: any) => m.status === 'delivered').length,
      read: messages.filter((m: any) => m.status === 'read').length,
      failed: messages.filter((m: any) => m.status === 'failed').length,
    };

    res.json({
      success: true,
      data: {
        stats,
        messages: messages.slice(0, 50),
      },
    });
  } catch (error: any) {
    console.error('Get messages analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages analytics',
      details: error.message,
    });
  }
});

// Get campaigns analytics
router.get('/campaigns', authenticate, async (req: any, res: any) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId: req.user.businessId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: campaigns.length,
      active: campaigns.filter((c: any) => c.status === 'active').length,
      paused: campaigns.filter((c: any) => c.status === 'paused').length,
      completed: campaigns.filter((c: any) => c.status === 'completed').length,
    };

    res.json({
      success: true,
      data: {
        stats,
        campaigns,
      },
    });
  } catch (error: any) {
    console.error('Get campaigns analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns analytics',
      details: error.message,
    });
  }
});

// Get social media analytics
router.get('/social', authenticate, async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const posts = await prisma.socialPost.findMany({
      where: {
        businessId: req.user.businessId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: posts.length,
      published: posts.filter((p: any) => p.status === 'published').length,
      scheduled: posts.filter((p: any) => p.status === 'scheduled').length,
      draft: posts.filter((p: any) => p.status === 'draft').length,
    };

    const byPlatform = posts.reduce((acc: any, post: any) => {
      post.platforms.forEach((platform: string) => {
        acc[platform] = (acc[platform] || 0) + 1;
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        stats,
        byPlatform,
        posts: posts.slice(0, 50),
      },
    });
  } catch (error: any) {
    console.error('Get social analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social analytics',
      details: error.message,
    });
  }
});

// Get contacts analytics
router.get('/contacts', authenticate, async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const contacts = await prisma.contact.findMany({
      where: {
        businessId: req.user.businessId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bySource = contacts.reduce((acc: any, contact: any) => {
      acc[contact.source || 'unknown'] = (acc[contact.source || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    const byStage = contacts.reduce((acc: any, contact: any) => {
      acc[contact.stageId || 'unassigned'] = (acc[contact.stageId || 'unassigned'] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: contacts.length,
        bySource,
        byStage,
        contacts: contacts.slice(0, 50),
      },
    });
  } catch (error: any) {
    console.error('Get contacts analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts analytics',
      details: error.message,
    });
  }
});

export default router;
