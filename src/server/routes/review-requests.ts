import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { WhatsAppSendRouter } from '../services/whatsapp-send-router.service.js';

const router = Router();

// Get all review requests (paginated, filterable)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const status = req.query.status as string | undefined;
    const channel = req.query.channel as string | undefined;
    const contactId = req.query.contactId as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = {
      businessId: req.user.businessId,
    };

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (contactId) where.contactId = contactId;

    const [requests, total] = await Promise.all([
      prisma.reviewRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reviewRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get review requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review requests',
      details: error.message,
    });
  }
});

// Get review request stats (MUST be before /:id)
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [totalSent, totalCompleted, totalFailed, byChannel] = await Promise.all([
      prisma.reviewRequest.count({
        where: { businessId, status: { in: ['sent', 'opened', 'completed'] } },
      }),
      prisma.reviewRequest.count({
        where: { businessId, status: 'completed' },
      }),
      prisma.reviewRequest.count({
        where: { businessId, status: 'failed' },
      }),
      prisma.reviewRequest.groupBy({
        by: ['channel'],
        where: { businessId },
        _count: true,
      }),
    ]);

    const channelBreakdown = byChannel.reduce((acc: any, item: any) => {
      acc[item.channel] = item._count;
      return acc;
    }, {});

    const conversionRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 10000) / 100 : 0;

    res.json({
      success: true,
      data: {
        totalSent,
        totalCompleted,
        totalFailed,
        conversionRate,
        channelBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Get review request stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review request stats',
      details: error.message,
    });
  }
});

// Get single review request
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.reviewRequest.findFirst({
      where: {
        id: req.params.id as string,
        businessId: req.user.businessId,
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Review request not found',
      });
    }

    let contact = null;
    if (request.contactId) {
      contact = await prisma.contact.findUnique({
        where: { id: request.contactId },
        select: { id: true, name: true, phone: true, email: true },
      });
    }

    res.json({
      success: true,
      data: { ...request, contact },
    });
  } catch (error: any) {
    console.error('Get review request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review request',
      details: error.message,
    });
  }
});

// Send single review request
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, channel, message, reviewUrl, appointmentId, orderId } = req.body;

    if (!contactId || !channel || !reviewUrl) {
      return res.status(400).json({
        success: false,
        error: 'contactId, channel, and reviewUrl are required',
      });
    }

    if (!['whatsapp', 'email', 'sms'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'Channel must be whatsapp, email, or sms',
      });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId: req.user.businessId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const defaultMessage = message || `Hi ${contact.name || 'there'}! We'd love your feedback. Please leave us a review: ${reviewUrl}`;

    const request = await prisma.reviewRequest.create({
      data: {
        businessId: req.user.businessId,
        contactId,
        appointmentId: appointmentId || null,
        orderId: orderId || null,
        channel,
        message: defaultMessage,
        reviewUrl,
        status: 'pending',
      },
    });

    // Attempt to send immediately
    try {
      if (channel === 'whatsapp') {
        await WhatsAppSendRouter.sendTextMessage(req.user.businessId, contact.phone, defaultMessage);
        await prisma.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      } else if (channel === 'email' && contact.email) {
        const { EmailService } = await import('../services/email.service.js');
        await EmailService.sendEmail(contact.email, 'We\'d love your feedback!', defaultMessage);
        await prisma.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      } else if (channel === 'sms') {
        const twilioSid = process.env.TWILIO_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const smsApiKey = process.env.SMS_API_KEY;

        if (twilioSid && twilioAuthToken) {
          // TODO: Integrate with Twilio SMS API
          throw new Error('SMS via Twilio not yet implemented');
        } else if (smsApiKey) {
          // TODO: Integrate with configured SMS provider
          throw new Error('SMS provider not yet implemented');
        } else {
          throw new Error('SMS provider not configured. Configure TWILIO_SID and TWILIO_AUTH_TOKEN in .env');
        }
      }
    } catch (sendError: any) {
      console.error('Failed to send review request:', sendError);
      await prisma.reviewRequest.update({
        where: { id: request.id },
        data: { status: 'failed', errorMessage: sendError.message },
      });
    }

    const updated = await prisma.reviewRequest.findUnique({
      where: { id: request.id },
    });

    res.status(201).json({
      success: true,
      data: { ...updated, contact: { id: contact.id, name: contact.name, phone: contact.phone, email: contact.email } },
    });
  } catch (error: any) {
    console.error('Send review request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send review request',
      details: error.message,
    });
  }
});

// Send bulk review requests
router.post('/bulk', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactIds, channel, message, reviewUrl } = req.body;

    if (!contactIds?.length || !channel || !reviewUrl) {
      return res.status(400).json({
        success: false,
        error: 'contactIds (array), channel, and reviewUrl are required',
      });
    }

    if (!['whatsapp', 'email', 'sms'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'Channel must be whatsapp, email, or sms',
      });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        businessId: req.user.businessId,
      },
    });

    if (contacts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid contacts found',
      });
    }

    const created = [];
    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      const defaultMessage = message || `Hi ${contact.name || 'there'}! We'd love your feedback. Please leave us a review: ${reviewUrl}`;

      const request = await prisma.reviewRequest.create({
        data: {
          businessId: req.user.businessId,
          contactId: contact.id,
          channel,
          message: defaultMessage,
          reviewUrl,
          status: 'pending',
        },
      });

      try {
        if (channel === 'whatsapp') {
          await WhatsAppSendRouter.sendTextMessage(req.user.businessId, contact.phone, defaultMessage);
          await prisma.reviewRequest.update({
            where: { id: request.id },
            data: { status: 'sent', sentAt: new Date() },
          });
          sent++;
        } else if (channel === 'email' && contact.email) {
          const { EmailService } = await import('../services/email.service.js');
          await EmailService.sendEmail(contact.email, 'We\'d love your feedback!', defaultMessage);
          await prisma.reviewRequest.update({
            where: { id: request.id },
            data: { status: 'sent', sentAt: new Date() },
          });
          sent++;
        } else if (channel === 'sms') {
          const twilioSid = process.env.TWILIO_SID;
          const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
          const smsApiKey = process.env.SMS_API_KEY;

          if (twilioSid && twilioAuthToken) {
            // TODO: Integrate with Twilio SMS API
            throw new Error('SMS via Twilio not yet implemented');
          } else if (smsApiKey) {
            // TODO: Integrate with configured SMS provider
            throw new Error('SMS provider not yet implemented');
          } else {
            throw new Error('SMS provider not configured. Configure TWILIO_SID and TWILIO_AUTH_TOKEN in .env');
          }
        } else {
          await prisma.reviewRequest.update({
            where: { id: request.id },
            data: { status: 'failed' },
          });
          failed++;
        }
      } catch (sendErr: any) {
        await prisma.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'failed', errorMessage: sendErr.message || 'Send failed' },
        });
        failed++;
      }

      created.push(request.id);
    }

    res.status(201).json({
      success: true,
      data: {
        total: contacts.length,
        sent,
        failed,
        requestIds: created,
      },
    });
  } catch (error: any) {
    console.error('Bulk send review requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk review requests',
      details: error.message,
    });
  }
});

// List campaigns
router.get('/campaigns', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { businessId: req.user.businessId };

    const [campaigns, total] = await Promise.all([
      prisma.reviewRequestCampaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reviewRequestCampaign.count({ where }),
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
    console.error('Get review campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review campaigns',
      details: error.message,
    });
  }
});

// Create campaign
router.post('/campaigns', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, triggerType, triggerConfig, channel, messageTemplate, reviewUrl } = req.body;

    if (!name || !triggerType || !channel || !reviewUrl) {
      return res.status(400).json({
        success: false,
        error: 'name, triggerType, channel, and reviewUrl are required',
      });
    }

    if (!['appointment_completed', 'order_delivered', 'manual'].includes(triggerType)) {
      return res.status(400).json({
        success: false,
        error: 'triggerType must be appointment_completed, order_delivered, or manual',
      });
    }

    if (!['whatsapp', 'email', 'sms'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'Channel must be whatsapp, email, or sms',
      });
    }

    const campaign = await prisma.reviewRequestCampaign.create({
      data: {
        businessId: req.user.businessId,
        name,
        triggerType,
        triggerConfig: triggerConfig || {},
        channel,
        messageTemplate: messageTemplate || `Hi! We'd love your feedback. Please leave us a review: ${reviewUrl}`,
        reviewUrl,
        isActive: false,
        sentCount: 0,
        completedCount: 0,
      },
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error('Create review campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review campaign',
      details: error.message,
    });
  }
});

// Update campaign
router.put('/campaigns/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.reviewRequestCampaign.findFirst({
      where: {
        id: req.params.id as string,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const { name, triggerType, triggerConfig, channel, messageTemplate, reviewUrl } = req.body;

    if (triggerType && !['appointment_completed', 'order_delivered', 'manual'].includes(triggerType)) {
      return res.status(400).json({
        success: false,
        error: 'triggerType must be appointment_completed, order_delivered, or manual',
      });
    }

    if (channel && !['whatsapp', 'email', 'sms'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'Channel must be whatsapp, email, or sms',
      });
    }

    const updated = await prisma.reviewRequestCampaign.update({
      where: { id: req.params.id as string },
      data: {
        ...(name !== undefined && { name }),
        ...(triggerType !== undefined && { triggerType }),
        ...(triggerConfig !== undefined && { triggerConfig }),
        ...(channel !== undefined && { channel }),
        ...(messageTemplate !== undefined && { messageTemplate }),
        ...(reviewUrl !== undefined && { reviewUrl }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update review campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review campaign',
      details: error.message,
    });
  }
});

// Toggle campaign active status
router.patch('/campaigns/:id/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.reviewRequestCampaign.findFirst({
      where: {
        id: req.params.id as string,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const updated = await prisma.reviewRequestCampaign.update({
      where: { id: req.params.id as string },
      data: { isActive: !campaign.isActive },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Toggle review campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle review campaign',
      details: error.message,
    });
  }
});

// Delete campaign
router.delete('/campaigns/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.reviewRequestCampaign.findFirst({
      where: {
        id: req.params.id as string,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    await prisma.reviewRequestCampaign.delete({
      where: { id: req.params.id as string },
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete review campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review campaign',
      details: error.message,
    });
  }
});

// Manually trigger campaign for specific contact/appointment
router.post('/campaigns/:id/trigger', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, appointmentId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'contactId is required',
      });
    }

    const campaign = await prisma.reviewRequestCampaign.findFirst({
      where: {
        id: req.params.id as string,
        businessId: req.user.businessId,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId: req.user.businessId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const message = campaign.messageTemplate || `Hi ${contact.name || 'there'}! We'd love your feedback. Please leave us a review: ${campaign.reviewUrl}`;

    const request = await prisma.reviewRequest.create({
      data: {
        businessId: req.user.businessId,
        contactId,
        appointmentId: appointmentId || null,
        channel: campaign.channel,
        message,
        reviewUrl: campaign.reviewUrl,
        status: 'pending',
      },
    });

    // Attempt to send
    try {
      if (campaign.channel === 'whatsapp') {
        await WhatsAppSendRouter.sendTextMessage(req.user.businessId, contact.phone, message);
        await prisma.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      } else if (campaign.channel === 'email' && contact.email) {
        const { EmailService } = await import('../services/email.service.js');
        await EmailService.sendEmail(contact.email, 'We\'d love your feedback!', message);
        await prisma.reviewRequest.update({
          where: { id: request.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      } else if (campaign.channel === 'sms') {
        const twilioSid = process.env.TWILIO_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const smsApiKey = process.env.SMS_API_KEY;

        if (twilioSid && twilioAuthToken) {
          // TODO: Integrate with Twilio SMS API
          throw new Error('SMS via Twilio not yet implemented');
        } else if (smsApiKey) {
          // TODO: Integrate with configured SMS provider
          throw new Error('SMS provider not yet implemented');
        } else {
          throw new Error('SMS provider not configured. Configure TWILIO_SID and TWILIO_AUTH_TOKEN in .env');
        }
      }

      await prisma.reviewRequestCampaign.update({
        where: { id: campaign.id },
        data: { sentCount: { increment: 1 } },
      });
    } catch (sendError: any) {
      console.error('Failed to send triggered review request:', sendError);
      await prisma.reviewRequest.update({
        where: { id: request.id },
        data: { status: 'failed', errorMessage: sendError.message },
      });
    }

    const updated = await prisma.reviewRequest.findUnique({
      where: { id: request.id },
    });

    res.status(201).json({
      success: true,
      data: { ...updated, contact: { id: contact.id, name: contact.name, phone: contact.phone, email: contact.email } },
    });
  } catch (error: any) {
    console.error('Trigger review campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger review campaign',
      details: error.message,
    });
  }
});

// Public webhook: receive review submission notifications
router.post('/webhook/review-submitted', async (req: any, res: Response) => {
  try {
    const { requestId, contactId, rating, platform } = req.body;

    if (!requestId && !contactId) {
      return res.status(400).json({
        success: false,
        error: 'requestId or contactId is required',
      });
    }

    if (requestId) {
      const request = await prisma.reviewRequest.findUnique({
        where: { id: requestId },
      });

      if (request) {
        await prisma.reviewRequest.update({
          where: { id: requestId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        // Increment campaign completed count if linked
        if (request.appointmentId) {
          // Find campaign that matches this channel and is active
          const campaign = await prisma.reviewRequestCampaign.findFirst({
            where: {
              businessId: request.businessId,
              channel: request.channel,
              isActive: true,
            },
          });

          if (campaign) {
            await prisma.reviewRequestCampaign.update({
              where: { id: campaign.id },
              data: { completedCount: { increment: 1 } },
            });
          }
        }
      }
    }

    // Optionally create a Review record
    if (rating && contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (contact) {
        await prisma.review.create({
          data: {
            businessId: contact.businessId,
            platform: platform || 'google',
            externalId: `webhook-${Date.now()}`,
            reviewerName: contact.name || 'Anonymous',
            reviewerEmail: contact.email || undefined,
            rating: Number(rating),
            text: '',
            reviewDate: new Date(),
            isPublished: true,
          },
        });
      }
    }

    res.json({
      success: true,
      message: 'Review submission processed',
    });
  } catch (error: any) {
    console.error('Review webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process review webhook',
      details: error.message,
    });
  }
});

export default router;
