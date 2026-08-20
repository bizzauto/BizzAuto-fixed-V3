import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AiOutreachService } from '../services/ai-outreach.service.js';
import { FollowUpEngineService } from '../services/followup-engine.service.js';
import { outreachQueue } from '../workers/outreach.worker.js';

const router = Router();

// ==================== MESSAGES ====================

/**
 * POST /api/outreach/generate
 * Generate personalized message for a contact
 */
router.post('/generate', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { contactId, template } = req.body;
    if (!contactId) {
      return res.status(400).json({ success: false, error: 'contactId is required' });
    }

    const message = await AiOutreachService.generatePersonalizedMessage({
      contactId,
      businessId,
      template,
    });

    res.json({ success: true, data: { message } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/preview
 * Preview messages for multiple contacts
 */
router.post('/preview', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { contactIds, template } = req.body;
    if (!contactIds?.length) {
      return res.status(400).json({ success: false, error: 'contactIds array is required' });
    }

    const messages = await AiOutreachService.generateBulkMessages({
      businessId,
      contactIds,
      template,
    });

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/send
 * Send single message
 */
router.post('/send', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { campaignId, contactId, messageType } = req.body;
    if (!campaignId || !contactId) {
      return res.status(400).json({ success: false, error: 'campaignId and contactId are required' });
    }

    const result = await AiOutreachService.sendMessage({
      businessId,
      campaignId,
      contactId,
      messageType,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/bulk
 * Bulk send messages (queued via BullMQ)
 */
router.post('/bulk', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { campaignId, messageType = 'initial', delayMs = 3000, maxMessages = 30 } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'campaignId is required' });
    }

    // Queue via BullMQ if available
    if (outreachQueue) {
      await outreachQueue.add('send-bulk', {
        businessId,
        campaignId,
        messageType,
        delayMs,
        maxMessages,
      }, {
        priority: 1,
        delay: 0,
      });

      res.json({ success: true, message: 'Bulk send queued successfully' });
    } else {
      // Fallback: send directly
      const result = await AiOutreachService.sendBulkMessages({
        businessId,
        campaignId,
        messageType,
        delayMs,
        maxMessages,
      });

      res.json({ success: true, data: result });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CAMPAIGNS ====================

/**
 * POST /api/outreach/campaigns
 * Create a new campaign
 */
router.post('/campaigns', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { name, template, contactIds } = req.body;
    if (!name || !template || !contactIds?.length) {
      return res.status(400).json({ success: false, error: 'name, template, and contactIds are required' });
    }

    const campaign = await AiOutreachService.createCampaign({
      businessId,
      name,
      template,
      contactIds,
    });

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/outreach/campaigns
 * List all campaigns
 */
router.get('/campaigns', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const campaigns = await AiOutreachService.listCampaigns(businessId);

    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/outreach/campaigns/:id
 * Get campaign stats
 */
router.get('/campaigns/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AiOutreachService.getCampaignStats(id, req.user.businessId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/campaigns/:id/activate
 * Activate a campaign
 */
router.post('/campaigns/:id/activate', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.outreachCampaign.update({
      where: { id, businessId: req.user.businessId },
      data: { status: 'active' },
    });

    res.json({ success: true, message: 'Campaign activated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/campaigns/:id/pause
 * Pause a campaign
 */
router.post('/campaigns/:id/pause', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.outreachCampaign.update({
      where: { id, businessId: req.user.businessId },
      data: { status: 'paused' },
    });

    res.json({ success: true, message: 'Campaign paused' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FOLLOW-UP ====================

/**
 * POST /api/outreach/followup/schedule
 * Schedule follow-ups for a campaign
 */
router.post('/followup/schedule', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { campaignId, rules } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'campaignId is required' });
    }

    const result = await FollowUpEngineService.scheduleFollowUps({
      businessId,
      campaignId,
      rules,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/followup/process
 * Process pending follow-ups (triggered by worker/cron)
 */
router.post('/followup/process', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const result = await FollowUpEngineService.processFollowUps(businessId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/outreach/reply
 * Handle incoming WhatsApp reply
 */
router.post('/reply', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { contactId, campaignId, replyContent } = req.body;
    if (!contactId || !campaignId) {
      return res.status(400).json({ success: false, error: 'contactId and campaignId are required' });
    }

    await FollowUpEngineService.handleReply({
      businessId,
      contactId,
      campaignId,
      replyContent: replyContent || '',
    });

    res.json({ success: true, message: 'Reply processed, follow-ups cancelled' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
