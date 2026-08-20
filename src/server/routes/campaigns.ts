import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema, updateCampaignSchema, scheduleCampaignSchema } from '../validations/crm-schemas.js';
import { outreachQueue } from '../workers/outreach.worker.js';

const router = Router();

// Get all campaigns
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, status, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    if (status) where.status = status;
    if (type) where.type = type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      details: error.message,
    });
  }
});

// Get single campaign
router.get('/:id', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        messages: {
          take: 100,
          orderBy: { createdAt: 'desc' },
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
    console.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      details: error.message,
    });
  }
});

// Create campaign — OWNER/ADMIN only
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), validate(createCampaignSchema), async (req: any, res: any) => {
  try {
    const {
      name,
      type,
      templateName,
      templateVars,
      targetTags,
      targetFilters,
      scheduledAt,
      dripSteps,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        business: { connect: { id: req.user.businessId } },
        name,
        type,
        templateName,
        templateVars: templateVars || {},
        targetTags: targetTags || [],
        targetFilters: targetFilters || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        dripSteps: dripSteps || null,
        status: scheduledAt ? 'scheduled' : 'draft',
        content: req.body.content || { text: '', buttons: [], media: {} },
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      details: error.message,
    });
  }
});

// Update campaign — OWNER/ADMIN only
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), validate(updateCampaignSchema), async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
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

    const updated = await prisma.campaign.update({
      where: { id: req.params.id, businessId: req.user.businessId },
      data: {
        name: req.body.name,
        templateName: req.body.templateName,
        templateVars: req.body.templateVars,
        targetTags: req.body.targetTags,
        targetFilters: req.body.targetFilters,
        contactIds: req.body.contactIds,
        content: req.body.content,
        scheduledAt: req.body.scheduledAt,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      details: error.message,
    });
  }
});

// Delete campaign — OWNER/ADMIN only
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
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

    if (campaign.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active campaigns',
      });
    }

    await prisma.campaign.delete({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      details: error.message,
    });
  }
});

// Start campaign — OWNER/ADMIN only
router.post('/:id/start', authenticate, requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
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

    const updated = await prisma.campaign.updateMany({
      where: { id: req.params.id, status: 'draft' },
      data: { status: 'active', startedAt: new Date() },
    });
    if (updated.count === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign already started or not found',
      });
    }

    // Get target contacts
    const where: any = {
      businessId: req.user.businessId,
      whatsappOptIn: true,
    };

    if (campaign.targetTags && campaign.targetTags.length > 0) {
      where.tags = {
        hasSome: campaign.targetTags,
      };
    }

    if (campaign.targetFilters) {
      // Add custom filter logic here
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true },
    });

    // Create drip queue entries if it's a drip campaign
    if (campaign.type === 'drip' && campaign.dripSteps) {
      const steps = JSON.parse(campaign.dripSteps as string);

      for (const contact of contacts) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const sendAt = new Date();
          sendAt.setHours(sendAt.getHours() + (step.delay_hours || 0) * i);

          await prisma.dripQueue.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              step: i,
              sendAt,
            },
          });
        }
      }
    } else {
      if (!outreachQueue) {
        return res.status(503).json({
          success: false,
          error: 'Campaign service unavailable. Please try again later.',
        });
      }

      const contactIds = contacts.map((c: any) => c.id);
      const messageContent = (campaign.content as any)?.message || campaign.name || '';

      const messages = [];
      for (const contact of contacts) {
        const msg = await prisma.message.create({
          data: {
            businessId: req.user.businessId,
            contactId: contact.id,
            content: messageContent,
            direction: 'outbound',
            type: 'text',
            status: 'queued',
            campaignId: campaign.id,
          },
        }).catch(() => null);
        if (msg) messages.push(msg);
      }

      if (messages.length > 0) {
        await outreachQueue.add('send-bulk', {
          type: 'send-bulk',
          businessId: req.user.businessId,
          campaignId: campaign.id,
          messageType: 'initial',
          delayMs: 3000,
          maxMessages: 30,
        }, {
          delay: 5000,
        });
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id, businessId: req.user.businessId },
      data: {
        targetContacts: contacts.length,
      },
    });

    res.json({
      success: true,
      message: `Campaign started with ${contacts.length} contacts`,
      data: { contactCount: contacts.length },
    });
  } catch (error: any) {
    console.error('Start campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign',
      details: error.message,
    });
  }
});

// Pause campaign — OWNER/ADMIN only
router.post('/:id/pause', authenticate, requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
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

    await prisma.campaign.update({
      where: { id: campaign.id, businessId: req.user.businessId },
      data: { status: 'paused' },
    });

    res.json({
      success: true,
      message: 'Campaign paused successfully',
    });
  } catch (error: any) {
    console.error('Pause campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign',
      details: error.message,
    });
  }
});

// Send campaign (alias for start, for frontend parity) — OWNER/ADMIN only
router.post('/:id/send', authenticate, requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
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

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only send draft campaigns',
      });
    }

    // Get target contacts
    const where: any = {
      businessId: req.user.businessId,
      whatsappOptIn: true,
    };

    if (campaign.targetTags && campaign.targetTags.length > 0) {
      where.tags = {
        hasSome: campaign.targetTags,
      };
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true, phone: true },
    });

    // Queue messages via BullMQ
    if (outreachQueue && contacts.length > 0) {
      const messageContent = (campaign.content as any)?.message || campaign.name || '';

      // Create message records for each contact
      const messages = [];
      for (const contact of contacts) {
        const msg = await prisma.message.create({
          data: {
            businessId: req.user.businessId,
            contactId: contact.id,
            content: messageContent,
            direction: 'outbound',
            type: 'text',
            status: 'queued',
            campaignId: campaign.id,
          },
        }).catch(() => null);
        if (msg) messages.push(msg);
      }

      // Queue bulk send job
      if (messages.length > 0) {
        await outreachQueue.add('send-bulk', {
          type: 'send-bulk',
          businessId: req.user.businessId,
          campaignId: campaign.id,
          messageType: 'initial',
          delayMs: 3000,
          maxMessages: 30,
        }, {
          delay: 5000,
        });
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id, businessId: req.user.businessId },
      data: {
        status: 'active',
        startedAt: new Date(),
        targetContacts: contacts.length,
      },
    });

    res.json({
      success: true,
      message: `Campaign sent to ${contacts.length} contacts`,
      data: { contactCount: contacts.length },
    });
  } catch (error: any) {
    console.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send campaign',
      details: error.message,
    });
  }
});

// Schedule campaign — OWNER/ADMIN only
router.post('/:id/schedule', authenticate, requireRole('OWNER', 'ADMIN'), validate(scheduleCampaignSchema), async (req: any, res: any) => {
  try {
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required',
      });
    }

    const campaign = await prisma.campaign.findFirst({
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

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future',
      });
    }

    await prisma.campaign.update({
      where: { id: campaign.id, businessId: req.user.businessId },
      data: {
        status: 'scheduled',
        scheduledAt: scheduledDate,
      },
    });

    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      data: { scheduledAt: scheduledDate },
    });
  } catch (error: any) {
    console.error('Schedule campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule campaign',
      details: error.message,
    });
  }
});

// Get campaign statistics
router.get('/:id/stats', authenticate, async (req: any, res: any) => {
  try {
    const campaign = await prisma.campaign.findFirst({
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

    // Get campaign statistics
    const [sentCount, deliveredCount, readCount, repliedCount] = await Promise.all([
      prisma.message.count({
        where: {
          businessId: campaign.businessId,
            campaignId: campaign.id,
          status: 'sent',
        },
      }),
      prisma.message.count({
        where: {
          businessId: campaign.businessId,
            campaignId: campaign.id,
          status: 'delivered',
        },
      }),
      prisma.message.count({
        where: {
          businessId: campaign.businessId,
            campaignId: campaign.id,
          status: 'read',
        },
      }),
      prisma.message.count({
        where: {
          businessId: campaign.businessId,
            campaignId: campaign.id,
          status: 'replied',
        },
      }),
    ]);

    const totalRecipients = campaign.targetContacts || campaign.targetCount || 0;
    const deliveryRate = totalRecipients > 0 ? (deliveredCount / totalRecipients) * 100 : 0;
    const readRate = deliveredCount > 0 ? (readCount / deliveredCount) * 100 : 0;
    const replyRate = readCount > 0 ? (repliedCount / readCount) * 100 : 0;

    res.json({
      success: true,
      data: {
        businessId: campaign.businessId,
            campaignId: campaign.id,
        status: campaign.status,
        totalRecipients,
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        replied: repliedCount,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        readRate: Math.round(readRate * 100) / 100,
        replyRate: Math.round(replyRate * 100) / 100,
        scheduledAt: campaign.scheduledAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      },
    });
  } catch (error: any) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign statistics',
      details: error.message,
    });
  }
});

export default router;
