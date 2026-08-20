import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { WhatsAppSendRouter } from '../services/whatsapp-send-router.service.js';

const router = Router();

/**
 * GET /api/ai-sales-agent/stats
 * AI agent stats — MUST be before /:id
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [
      totalFollowUps,
      pendingFollowUps,
      sentFollowUps,
      cancelledFollowUps,
      byTriggerType,
      byChannel,
      last30Days,
    ] = await Promise.all([
      prisma.aIFollowUp.count({ where: { businessId } }),
      prisma.aIFollowUp.count({ where: { businessId, status: 'pending' } }),
      prisma.aIFollowUp.count({ where: { businessId, status: 'sent' } }),
      prisma.aIFollowUp.count({ where: { businessId, status: 'cancelled' } }),
      prisma.aIFollowUp.groupBy({
        by: ['triggerType'],
        where: { businessId },
        _count: true,
      }),
      prisma.aIFollowUp.groupBy({
        by: ['channel'],
        where: { businessId },
        _count: true,
      }),
      prisma.aIFollowUp.findMany({
        where: {
          businessId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { status: true, createdAt: true, triggerType: true },
      }),
    ]);

    const responseCount = await prisma.aIFollowUp.count({
      where: { businessId, status: 'sent', response: { not: null } },
    });

    const responseRate =
      sentFollowUps > 0 ? Math.round((responseCount / sentFollowUps) * 10000) / 100 : 0;

    const escalatedCount = await prisma.aIFollowUp.count({
      where: { businessId, nextAction: 'escalate' },
    });

    const closedCount = await prisma.aIFollowUp.count({
      where: { businessId, nextAction: 'close' },
    });

    const conversionRate =
      sentFollowUps > 0 ? Math.round((closedCount / sentFollowUps) * 10000) / 100 : 0;

    const triggerBreakdown = byTriggerType.reduce((acc: any, item: any) => {
      acc[item.triggerType] = item._count;
      return acc;
    }, {});

    const channelBreakdown = byChannel.reduce((acc: any, item: any) => {
      acc[item.channel] = item._count;
      return acc;
    }, {});

    const dailyMap = new Map<string, { sent: number; pending: number }>();
    for (const entry of last30Days) {
      const day = entry.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { sent: 0, pending: 0 });
      const bucket = dailyMap.get(day)!;
      if (entry.status === 'sent') bucket.sent++;
      if (entry.status === 'pending') bucket.pending++;
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        totalFollowUps,
        pendingFollowUps,
        sentFollowUps,
        cancelledFollowUps,
        responseRate,
        conversionRate,
        escalatedCount,
        closedCount,
        triggerBreakdown,
        channelBreakdown,
        dailyTrend,
      },
    });
  } catch (error: any) {
    console.error('AI sales agent stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch AI agent stats', details: error.message });
  }
});

/**
 * GET /api/ai-sales-agent/follow-ups
 * List follow-ups — filterable by status, triggerType, channel, contactId
 */
router.get('/follow-ups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const {
      page = 1,
      limit = 20,
      status,
      triggerType,
      channel,
      contactId,
      search,
      startDate,
      endDate,
    } = req.query;

    const where: any = { businessId };

    if (status) where.status = status;
    if (triggerType) where.triggerType = triggerType;
    if (channel) where.channel = channel;
    if (contactId) where.contactId = contactId;

    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { contact: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { contact: { phone: { contains: searchTerm, mode: 'insensitive' } } },
        { contact: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { message: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {} as any;
      if (startDate) (where.createdAt as any).gte = new Date(startDate as string);
      if (endDate) (where.createdAt as any).lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [followUps, total] = await Promise.all([
      prisma.aIFollowUp.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
      prisma.aIFollowUp.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        followUps,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('List AI follow-ups error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch follow-ups', details: error.message });
  }
});

/**
 * POST /api/ai-sales-agent/follow-ups
 * Create a follow-up
 */
router.post('/follow-ups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId, triggerType, channel, message, scheduledAt, nextAction } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    if (!triggerType || !['no_reply', 'deal_stale', 'payment_pending', 'appointment_missed'].includes(triggerType)) {
      return res.status(400).json({
        success: false,
        error: 'triggerType must be one of: no_reply, deal_stale, payment_pending, appointment_missed',
      });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'scheduledAt is required' });
    }

    const validChannel = ['whatsapp', 'email', 'sms'].includes(channel) ? channel : 'whatsapp';
    const validNextAction = ['follow_up', 'escalate', 'close'].includes(nextAction) ? nextAction : null;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const followUp = await prisma.aIFollowUp.create({
      data: {
        businessId,
        contactId,
        triggerType,
        channel: validChannel,
        message,
        scheduledAt: new Date(scheduledAt),
        status: 'pending',
        nextAction: validNextAction,
      },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (error: any) {
    console.error('Create AI follow-up error:', error);
    res.status(500).json({ success: false, error: 'Failed to create follow-up', details: error.message });
  }
});

/**
 * POST /api/ai-sales-agent/follow-ups/:id/send
 * Send a follow-up immediately
 */
router.post('/follow-ups/:id/send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const businessId = req.user.businessId;

    const followUp = await prisma.aIFollowUp.findFirst({
      where: { id, businessId },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!followUp) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }

    if (followUp.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Follow-up already sent' });
    }

    if (followUp.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cannot send a cancelled follow-up' });
    }

    if (!followUp.contact) {
      return res.status(400).json({ success: false, error: 'No contact linked to this follow-up' });
    }

    const contact = followUp.contact as any;
    let sendSuccess = false;
    let sendError = '';

    try {
      if (followUp.channel === 'whatsapp' && contact.phone) {
        await WhatsAppSendRouter.sendTextMessage(businessId, contact.phone, followUp.message, { messageId: followUp.id });
        sendSuccess = true;
      } else if (followUp.channel === 'email' && contact.email) {
        const { EmailService } = await import('../services/email.service.js');
        await EmailService.sendEmail(
          contact.email,
          'Follow-up from ' + (req.user as any).businessName || 'Your Business',
          `<p>Hi ${contact.name || 'there'},</p><p>${followUp.message.replace(/\n/g, '<br/>')}</p>`
        );
        sendSuccess = true;
      } else if ((followUp.channel === 'sms' || followUp.channel === 'whatsapp') && contact.phone) {
        await WhatsAppSendRouter.sendTextMessage(businessId, contact.phone, followUp.message, { messageId: followUp.id });
        sendSuccess = true;
      } else {
        sendError = `No valid contact info for channel "${followUp.channel}"`;
      }
    } catch (err: any) {
      sendError = err.message;
    }

    const updatedFollowUp = await prisma.aIFollowUp.update({
      where: { id: id as string },
      data: {
        status: sendSuccess ? 'sent' : 'pending',
        sentAt: sendSuccess ? new Date() : null,
        response: sendError || null,
      },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (sendSuccess) {
      res.json({ success: true, message: 'Follow-up sent successfully', data: updatedFollowUp });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send follow-up', details: sendError, data: updatedFollowUp });
    }
  } catch (error: any) {
    console.error('Send AI follow-up error:', error);
    res.status(500).json({ success: false, error: 'Failed to send follow-up', details: error.message });
  }
});

/**
 * PATCH /api/ai-sales-agent/follow-ups/:id/cancel
 * Cancel a pending follow-up
 */
router.patch('/follow-ups/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cancelId = req.params.id as string;
    const businessId = req.user.businessId;

    const followUp = await prisma.aIFollowUp.findFirst({
      where: { id: cancelId, businessId },
    });

    if (!followUp) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }

    if (followUp.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an already sent follow-up' });
    }

    if (followUp.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Follow-up is already cancelled' });
    }

    const updatedFollowUp = await prisma.aIFollowUp.update({
      where: { id: cancelId },
      data: { status: 'cancelled' },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    res.json({ success: true, message: 'Follow-up cancelled', data: updatedFollowUp });
  } catch (error: any) {
    console.error('Cancel AI follow-up error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel follow-up', details: error.message });
  }
});

/**
 * POST /api/ai-sales-agent/auto-follow-ups
 * AI generates follow-ups for stale leads
 */
router.post('/auto-follow-ups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId, triggerType, channel, customMessage } = req.body;

    const validTriggerType = ['no_reply', 'deal_stale', 'payment_pending', 'appointment_missed'].includes(triggerType)
      ? triggerType
      : 'no_reply';

    const validChannel = ['whatsapp', 'email', 'sms'].includes(channel) ? channel : 'whatsapp';

    let contactsToProcess: any[] = [];

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, businessId },
      });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact not found' });
      }
      contactsToProcess = [contact];
    } else {
      const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      contactsToProcess = await prisma.contact.findMany({
        where: {
          businessId,
          lastActivity: { lt: staleThreshold },
          status: { notIn: ['converted', 'do_not_contact'] },
        },
        take: 50,
      });
    }

    if (contactsToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No stale leads found',
        data: { created: 0, followUps: [] },
      });
    }

    const createdFollowUps: any[] = [];

    for (const contact of contactsToProcess) {
      const existingPending = await prisma.aIFollowUp.findFirst({
        where: {
          businessId,
          contactId: contact.id,
          triggerType: validTriggerType,
          status: 'pending',
        },
      });

      if (existingPending) continue;

      const message = customMessage || generateDefaultMessage(validTriggerType, contact);

      const scheduledAt = new Date();
      if (validTriggerType === 'no_reply') scheduledAt.setHours(scheduledAt.getHours() + 2);
      else if (validTriggerType === 'deal_stale') scheduledAt.setDate(scheduledAt.getDate() + 1);
      else if (validTriggerType === 'payment_pending') scheduledAt.setHours(scheduledAt.getHours() + 1);
      else scheduledAt.setDate(scheduledAt.getDate() + 1);

      const nextAction = validTriggerType === 'payment_pending' ? 'escalate' : 'follow_up';

      const followUp = await prisma.aIFollowUp.create({
        data: {
          businessId,
          contactId: contact.id,
          triggerType: validTriggerType,
          channel: validChannel,
          message,
          scheduledAt,
          status: 'pending',
          nextAction,
        },
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      });

      createdFollowUps.push(followUp);
    }

    res.status(201).json({
      success: true,
      message: `Created ${createdFollowUps.length} follow-up(s) for stale leads`,
      data: {
        created: createdFollowUps.length,
        followUps: createdFollowUps,
      },
    });
  } catch (error: any) {
    console.error('Auto follow-ups error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate auto follow-ups', details: error.message });
  }
});

/**
 * POST /api/ai-sales-agent/suggest
 * AI suggests next action for a contact based on history
 */
router.post('/suggest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const [followUps, recentMessages] = await Promise.all([
      prisma.aIFollowUp.findMany({
        where: { businessId, contactId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.message.findMany({
        where: { businessId, contactId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalFollowUps = followUps.length;
    const sentFollowUps = followUps.filter(f => f.status === 'sent').length;
    const respondedFollowUps = followUps.filter(f => f.status === 'sent' && f.response).length;
    const lastFollowUp = followUps[0];
    const lastMessage = recentMessages[0];

    let suggestedAction = 'follow_up';
    let suggestedChannel = 'whatsapp';
    let priority = 'medium';
    let reasoning = '';

    if (totalFollowUps === 0) {
      suggestedAction = 'follow_up';
      reasoning = 'No prior follow-ups. Initial outreach recommended.';
      priority = 'high';
    } else if (respondedFollowUps > 0) {
      const lastResponse = followUps.find(f => f.response);
      if (lastResponse && lastResponse.nextAction === 'close') {
        suggestedAction = 'close';
        reasoning = 'Contact has responded and deal is ready to close.';
        priority = 'high';
      } else if (lastResponse && lastResponse.nextAction === 'escalate') {
        suggestedAction = 'escalate';
        reasoning = 'Contact response indicates need for escalation.';
        priority = 'high';
      } else {
        suggestedAction = 'follow_up';
        reasoning = 'Contact has responded. Continue nurturing.';
        priority = 'medium';
      }
    } else if (sentFollowUps >= 3) {
      suggestedAction = 'escalate';
      reasoning = `${sentFollowUps} follow-ups sent with no response. Consider escalating to manual outreach.`;
      priority = 'high';
    } else if (lastFollowUp && lastFollowUp.status === 'sent') {
      const daysSinceLastFollowUp = Math.floor(
        (Date.now() - lastFollowUp.sentAt!.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastFollowUp >= 3) {
        suggestedAction = 'follow_up';
        reasoning = `${daysSinceLastFollowUp} days since last follow-up. Time for another touchpoint.`;
        priority = 'medium';
      } else {
        suggestedAction = 'wait';
        reasoning = `Last follow-up was ${daysSinceLastFollowUp} day(s) ago. Wait before next outreach.`;
        priority = 'low';
      }
    } else {
      suggestedAction = 'follow_up';
      reasoning = 'Pending follow-ups exist. Monitor for responses.';
      priority = 'medium';
    }

    if (contact.phone) suggestedChannel = 'whatsapp';
    else if (contact.email) suggestedChannel = 'email';

    const channelPerformance = followUps.reduce((acc: any, f) => {
      if (!acc[f.channel]) acc[f.channel] = { sent: 0, responded: 0 };
      if (f.status === 'sent') acc[f.channel].sent++;
      if (f.status === 'sent' && f.response) acc[f.channel].responded++;
      return acc;
    }, {});

    let bestChannel = suggestedChannel;
    let bestResponseRate = 0;
    for (const [ch, perf] of Object.entries(channelPerformance)) {
      const p = perf as any;
      if (p.sent > 0) {
        const rate = p.responded / p.sent;
        if (rate > bestResponseRate) {
          bestResponseRate = rate;
          bestChannel = ch;
        }
      }
    }
    if (bestResponseRate > 0) suggestedChannel = bestChannel;

    res.json({
      success: true,
      data: {
        contactId,
        contactName: contact.name,
        suggestedAction,
        suggestedChannel,
        priority,
        reasoning,
        stats: {
          totalFollowUps,
          sentFollowUps,
          respondedFollowUps,
          responseRate: sentFollowUps > 0 ? Math.round((respondedFollowUps / sentFollowUps) * 10000) / 100 : 0,
        },
        channelPerformance,
      },
    });
  } catch (error: any) {
    console.error('AI suggest error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate suggestion', details: error.message });
  }
});

function generateDefaultMessage(triggerType: string, contact: any): string {
  const name = contact.name || 'there';

  switch (triggerType) {
    case 'no_reply':
      return `Hi ${name}, just checking in! We haven't heard from you in a while. Is there anything we can help with?`;
    case 'deal_stale':
      return `Hi ${name}, we noticed our conversation has been quiet for some time. Would you like to revisit what we discussed? Happy to help!`;
    case 'payment_pending':
      return `Hi ${name}, this is a friendly reminder about your pending payment. Let us know if you need any assistance with the process.`;
    case 'appointment_missed':
      return `Hi ${name}, we missed you at your recent appointment. Would you like to reschedule? We're here when works best for you.`;
    default:
      return `Hi ${name}, just reaching out to see how you're doing. Let us know if there's anything we can help with!`;
  }
}

export default router;
