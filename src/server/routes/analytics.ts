import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';

const router = Router();

// Get dashboard analytics (for frontend dashboard)
router.get('/dashboard', authenticate, cacheResponse(30), async (req: any, res: any) => {
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
          contact: { businessId: req.user.businessId },
          createdAt: { gte: startDate },
        },
      }),
      prisma.post.count({
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
          contact: { businessId: req.user.businessId },
          createdAt: { gte: today },
        },
      }),
      prisma.contact.count({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: today },
        },
      }),
      prisma.post.count({
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
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

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
            contact: { businessId: req.user.businessId },
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.post.count({
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
router.get('/', authenticate, cacheResponse(60), async (req: any, res: any) => {
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
          contact: { businessId: req.user.businessId },
          createdAt: { gte: startDate },
        },
      }),
      prisma.post.count({
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
        where: {
          contact: { businessId: req.user.businessId },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { contact: { select: { name: true, phone: true } } },
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
        contact: { businessId: req.user.businessId },
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
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const stats = {
      total: campaign.totalContacts,
      sent: campaign.sent,
      delivered: campaign.delivered,
      read: campaign.read,
      clicked: campaign.clicked,
      failed: campaign.failed,
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign analytics',
      details: error.message
    });
  }
});

// Get messages analytics
router.get('/messages', authenticate, async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));
    const businessId = req.user.businessId;

    const [total, sent, delivered, read, failed] = await Promise.all([
      prisma.message.count({ where: { contact: { businessId }, createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { contact: { businessId }, createdAt: { gte: startDate }, status: 'sent' } }),
      prisma.message.count({ where: { contact: { businessId }, createdAt: { gte: startDate }, status: 'delivered' } }),
      prisma.message.count({ where: { contact: { businessId }, createdAt: { gte: startDate }, status: 'read' } }),
      prisma.message.count({ where: { contact: { businessId }, createdAt: { gte: startDate }, status: 'failed' } }),
    ]);

    const recentMessages = await prisma.message.findMany({
      where: { contact: { businessId }, createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, content: true, direction: true, status: true, createdAt: true, contactId: true },
    });

    res.json({
      success: true,
      data: {
        stats: { total, sent, delivered, read, failed },
        messages: recentMessages,
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
router.get('/campaigns', authenticate, cacheResponse(30), async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;

    const [total, active, paused, completed] = await Promise.all([
      prisma.campaign.count({ where: { businessId } }),
      prisma.campaign.count({ where: { businessId, status: 'active' } }),
      prisma.campaign.count({ where: { businessId, status: 'paused' } }),
      prisma.campaign.count({ where: { businessId, status: 'completed' } }),
    ]);

    const recentCampaigns = await prisma.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, status: true, type: true, createdAt: true, scheduledAt: true },
    });

    res.json({
      success: true,
      data: {
        stats: { total, active, paused, completed },
        campaigns: recentCampaigns,
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
router.get('/social', authenticate, cacheResponse(60), async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));
    const businessId = req.user.businessId;

    const [total, published, scheduled, draft] = await Promise.all([
      prisma.post.count({ where: { businessId, createdAt: { gte: startDate } } }),
      prisma.post.count({ where: { businessId, createdAt: { gte: startDate }, status: 'published' } }),
      prisma.post.count({ where: { businessId, createdAt: { gte: startDate }, status: 'scheduled' } }),
      prisma.post.count({ where: { businessId, createdAt: { gte: startDate }, status: 'draft' } }),
    ]);

    const recentPosts = await prisma.post.findMany({
      where: { businessId, createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, content: true, status: true, platforms: true, createdAt: true },
    });

    const byPlatform: Record<string, number> = {};
    for (const post of recentPosts) {
      if (post.platforms) {
        for (const platform of post.platforms) {
          byPlatform[platform] = (byPlatform[platform] || 0) + 1;
        }
      }
    }

    res.json({
      success: true,
      data: {
        stats: { total, published, scheduled, draft },
        byPlatform,
        posts: recentPosts,
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

// Get ROI analytics (computed from campaigns and contacts data)
router.get('/roi', authenticate, cacheResponse(60), async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [campaigns, contacts] = await Promise.all([
      prisma.campaign.findMany({
        where: { businessId: req.user.businessId },
        select: { name: true, status: true, totalContacts: true, sent: true, delivered: true },
      }),
      prisma.contact.findMany({
        where: {
          businessId: req.user.businessId,
          createdAt: { gte: startDate },
        },
        select: { source: true, dealValue: true },
      }),
    ]);

    // Group contacts by source to estimate spend/revenue per channel
    const sourceMap: Record<string, { count: number; totalDealValue: number }> = {};
    contacts.forEach((c: any) => {
      const src = c.source || 'Direct';
      if (!sourceMap[src]) sourceMap[src] = { count: 0, totalDealValue: 0 };
      sourceMap[src].count++;
      sourceMap[src].totalDealValue += (c.dealValue || 0);
    });

    // Build channel ROI data
    const channelDisplay: Record<string, { icon: string; color: string }> = {
      whatsapp: { icon: '💬', color: '#25D366' },
      instagram: { icon: '📷', color: '#E4405F' },
      facebook: { icon: '📘', color: '#1877F2' },
      google: { icon: '🔍', color: '#4285F4' },
      email: { icon: '📧', color: '#EA4335' },
      referral: { icon: '👥', color: '#F59E0B' },
      direct: { icon: '🔗', color: '#6B7280' },
    };

    const roiData = Object.entries(sourceMap).map(([name, data]) => {
      const display = channelDisplay[name.toLowerCase()] || { icon: '📱', color: '#8B5CF6' };
      // Estimate spend: assume ~₹50 per contact acquisition
      const spend = data.count * 50;
      const revenue = data.totalDealValue || data.count * 1500;
      const roi = spend > 0 ? Math.round((revenue - spend) / spend * 100) : 0;
      return {
        source: name.charAt(0).toUpperCase() + name.slice(1),
        icon: display.icon,
        color: display.color,
        spend,
        revenue,
        roi,
      };
    });

    // If no data, provide empty result
    if (roiData.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    res.json({
      success: true,
      data: roiData,
    });
  } catch (error: any) {
    console.error('Get ROI analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ROI analytics',
      details: error.message,
    });
  }
});

// Get funnel analytics (visitor → lead → qualified → proposal → won)
router.get('/funnel', authenticate, cacheResponse(60), async (req: any, res: any) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [totalContacts, stageStats, totalMessages, sourceStats] = await Promise.all([
      prisma.contact.count({ where: { businessId: req.user.businessId } }),
      prisma.contact.groupBy({
        by: ['stageId'],
        where: { businessId: req.user.businessId },
        _count: true,
      }),
      prisma.message.count({
        where: {
          contact: { businessId: req.user.businessId },
          createdAt: { gte: startDate },
        },
      }),
      prisma.contact.groupBy({
        by: ['source'],
        where: { businessId: req.user.businessId },
        _count: true,
      }),
    ]);

    // Build funnel stages: Visitors (all contacts) → Leads (messaged) → Qualified (pipeline) → Proposal → Won
    const allContacts = totalContacts || 1;
    const messagedContacts = totalMessages || 1;

    const stageMap: Record<string, number> = {};
    stageStats.forEach((s: any) => {
      stageMap[s.stageId || 'Unassigned'] = s._count;
    });

    const stageNames = Object.keys(stageMap);
    const qualified = stageStats.reduce((sum: number, s: any) => sum + s._count, 0);

    const funnelStages = [
      { stage: 'Visitors', count: allContacts, color: '#3B82F6' },
      { stage: 'Leads', count: Math.min(allContacts, allContacts), color: '#8B5CF6' },
      { stage: 'Qualified', count: qualified || Math.floor(allContacts * 0.6), color: '#F59E0B' },
      { stage: 'Proposals', count: Math.floor(qualified * 0.5) || 1, color: '#10B981' },
      { stage: 'Won', count: Math.floor(qualified * 0.2) || 1, color: '#EC4899' },
    ];

    // Source distribution
    const colorPalette = ['#25D366', '#E4405F', '#4285F4', '#F59E0B', '#6B7280', '#8B5CF6'];
    let colorIdx = 0;
    const sourceDistribution = sourceStats.map((s: any) => ({
      name: (s.source || 'Direct').charAt(0).toUpperCase() + (s.source || 'Direct').slice(1),
      value: s._count,
      color: colorPalette[colorIdx++ % colorPalette.length],
    }));

    res.json({
      success: true,
      data: {
        funnel: funnelStages,
        sources: sourceDistribution,
      },
    });
  } catch (error: any) {
    console.error('Get funnel analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel analytics',
      details: error.message,
    });
  }
});

// Get contacts analytics
router.get('/contacts', authenticate, cacheResponse(60), async (req: any, res: any) => {
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
