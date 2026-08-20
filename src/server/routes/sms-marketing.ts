import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ==================== CAMPAIGNS ====================

// GET /campaigns - List SMS campaigns
router.get('/campaigns', authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      prisma.sMSMessage.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sMSMessage.count({ where }),
    ]);

    // Distinct campaigns are derived from SMSCampaign model
    const smCampaigns = await prisma.sMSCampaign.findMany({
      where: {
        businessId: req.user.businessId,
        ...(status ? { status } : {}),
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const smTotal = await prisma.sMSCampaign.count({
      where: {
        businessId: req.user.businessId,
        ...(status ? { status } : {}),
      },
    });

    res.json({
      success: true,
      data: {
        campaigns: smCampaigns,
        pagination: {
          total: smTotal,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(smTotal / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get SMS campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS campaigns',
      details: error.message,
    });
  }
});

// GET /campaigns/:id - Get campaign with messages
router.get('/campaigns/:id', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.sMSCampaign.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error('Get SMS campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS campaign',
      details: error.message,
    });
  }
});

// POST /campaigns - Create campaign
router.post('/campaigns', authenticate, async (req: any, res: any) => {
  try {
    const { name, message, targetTags, scheduledAt } = req.body;

    if (!name || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name and message are required',
      });
    }

    const campaign = await prisma.sMSCampaign.create({
      data: {
        businessId: req.user.businessId,
        name,
        message,
        targetTags: targetTags || [],
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error('Create SMS campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create SMS campaign',
      details: error.message,
    });
  }
});

// PUT /campaigns/:id - Update campaign
router.put('/campaigns/:id', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.sMSCampaign.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update active or completed campaigns',
      });
    }

    const { name, message, targetTags, scheduledAt } = req.body;

    const updated = await prisma.sMSCampaign.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(message !== undefined && { message }),
        ...(targetTags !== undefined && { targetTags }),
        ...(scheduledAt !== undefined && {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? 'scheduled' : 'draft',
        }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update SMS campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update SMS campaign',
      details: error.message,
    });
  }
});

// DELETE /campaigns/:id - Delete campaign
router.delete('/campaigns/:id', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.sMSCampaign.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a running campaign',
      });
    }

    // Delete associated messages first
    await prisma.sMSMessage.deleteMany({
      where: { campaignId: campaign.id },
    });

    await prisma.sMSCampaign.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete SMS campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete SMS campaign',
      details: error.message,
    });
  }
});

// POST /campaigns/:id/send - Send campaign to contacts
router.post('/campaigns/:id/send', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.sMSCampaign.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: 'Can only send draft or scheduled campaigns',
      });
    }

    // Get target contacts based on tags
    const contactWhere: any = {
      businessId: req.user.businessId,
      phone: { not: null },
    };

    if (campaign.targetTags && campaign.targetTags.length > 0) {
      contactWhere.tags = {
        hasSome: campaign.targetTags,
      };
    }

    const contacts = await prisma.contact.findMany({
      where: contactWhere,
      select: { id: true, phone: true, name: true },
    });

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No contacts found matching target criteria',
      });
    }

    // Update campaign to running
    await prisma.sMSCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'running',
        startedAt: new Date(),
        targetCount: contacts.length,
      },
    });

    // Create SMS messages for each contact (queued for sending)
    const messages = contacts.map((contact) => ({
      businessId: req.user.businessId,
      phone: contact.phone!,
      content: campaign.message,
      status: 'pending' as const,
      campaignId: campaign.id,
      contactId: contact.id,
    }));

    // Batch create messages
    await prisma.sMSMessage.createMany({
      data: messages,
    });

    // In a real implementation, these would be queued to a worker (BullMQ etc.)
    // For now, mark them as sent
    await prisma.sMSMessage.updateMany({
      where: {
        campaignId: campaign.id,
        status: 'pending',
      },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Update campaign counts
    await prisma.sMSCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: contacts.length,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Campaign sent to ${contacts.length} contacts`,
      data: {
        contactCount: contacts.length,
        campaignId: campaign.id,
      },
    });
  } catch (error: any) {
    console.error('Send SMS campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS campaign',
      details: error.message,
    });
  }
});

// ==================== SINGLE SMS ====================

// POST /send - Send single SMS
router.post('/send', authenticate, async (req: any, res: any) => {
  try {
    const { phone, content, contactId } = req.body;

    if (!phone || !content) {
      return res.status(400).json({
        success: false,
        error: 'Phone and content are required',
      });
    }

    if (content.length > 1600) {
      return res.status(400).json({
        success: false,
        error: 'Message content exceeds maximum length of 1600 characters',
      });
    }

    const smsMessage = await prisma.sMSMessage.create({
      data: {
        businessId: req.user.businessId,
        phone,
        content,
        status: 'pending',
        contactId: contactId || null,
      },
    });

    // In a real implementation, this would be dispatched to an SMS provider (Twilio, etc.)
    // For now, simulate immediate send
    const updated = await prisma.sMSMessage.update({
      where: { id: smsMessage.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
      details: error.message,
    });
  }
});

// ==================== MESSAGES ====================

// GET /messages - List sent messages
router.get('/messages', authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, status, campaignId, contactId, phone } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;
    if (contactId) where.contactId = contactId;
    if (phone) where.phone = { contains: phone as string, mode: 'insensitive' };

    const [messages, total] = await Promise.all([
      prisma.sMSMessage.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.sMSMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get SMS messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS messages',
      details: error.message,
    });
  }
});

// ==================== STATS ====================

// GET /stats - SMS stats (sent, delivered, failed rates)
router.get('/stats', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;

    const [
      totalSent,
      totalDelivered,
      totalFailed,
      totalPending,
      totalCampaigns,
      activeCampaigns,
      recentMessages,
    ] = await Promise.all([
      prisma.sMSMessage.count({
        where: { businessId, status: 'sent' },
      }),
      prisma.sMSMessage.count({
        where: { businessId, status: 'delivered' },
      }),
      prisma.sMSMessage.count({
        where: { businessId, status: 'failed' },
      }),
      prisma.sMSMessage.count({
        where: { businessId, status: 'pending' },
      }),
      prisma.sMSCampaign.count({
        where: { businessId },
      }),
      prisma.sMSCampaign.count({
        where: { businessId, status: 'running' },
      }),
      prisma.sMSMessage.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          phone: true,
          content: true,
          status: true,
          sentAt: true,
          createdAt: true,
        },
      }),
    ]);

    const totalMessages = totalSent + totalDelivered + totalFailed + totalPending;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0;
    const successRate = totalSent > 0 ? ((totalSent + totalDelivered) / (totalMessages || 1)) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalMessages,
        totalSent,
        totalDelivered,
        totalFailed,
        totalPending,
        totalCampaigns,
        activeCampaigns,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        recentMessages,
      },
    });
  } catch (error: any) {
    console.error('Get SMS stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS statistics',
      details: error.message,
    });
  }
});

export default router;
