import { Router } from 'express';
import { EvolutionApiService } from '../services/evolution.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ==================== CONFIG ====================

// Get Evolution API config status
router.get('/config', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const config = await EvolutionApiService.getPublicConfig(businessId);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save Evolution API config
router.post('/config', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { baseUrl, apiKey, instanceName } = req.body;
    if (!baseUrl || !apiKey) {
      return res.status(400).json({ success: false, error: 'baseUrl and apiKey are required' });
    }

    await EvolutionApiService.saveConfig(businessId, { baseUrl, apiKey, instanceName });
    res.json({ success: true, message: 'Evolution API config saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== INSTANCE ====================

// Create Evolution API instance
router.post('/instance', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { baseUrl, apiKey, instanceName, webhookUrl } = req.body;
    if (!baseUrl || !apiKey) {
      return res.status(400).json({ success: false, error: 'baseUrl and apiKey are required' });
    }

    const result = await EvolutionApiService.createInstance(businessId, {
      baseUrl, apiKey, instanceName, webhookUrl,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connect instance & get QR code
router.post('/connect', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const result = await EvolutionApiService.connectInstance(businessId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get connection status
router.get('/status', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const status = await EvolutionApiService.getConnectionStatus(businessId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect instance
router.post('/disconnect', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    await EvolutionApiService.disconnectInstance(businessId);
    res.json({ success: true, message: 'Disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete instance
router.delete('/instance', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    await EvolutionApiService.deleteInstance(businessId);
    res.json({ success: true, message: 'Instance deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MESSAGING ====================

// Send text message
router.post('/send/text', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { to, message, delay, linkPreview } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'to and message are required' });
    }

    const result = await EvolutionApiService.sendText(businessId, to, message, {
      delay, linkPreview,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send media message
router.post('/send/media', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { to, mediaUrl, mediaType, caption, delay } = req.body;
    if (!to || !mediaUrl || !mediaType) {
      return res.status(400).json({ success: false, error: 'to, mediaUrl and mediaType are required' });
    }

    const result = await EvolutionApiService.sendMedia(
      businessId, to, mediaUrl, mediaType, caption, { delay }
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send template message
router.post('/send/template', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { to, templateData } = req.body;
    if (!to || !templateData) {
      return res.status(400).json({ success: false, error: 'to and templateData are required' });
    }

    const result = await EvolutionApiService.sendTemplate(businessId, to, templateData);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk send messages
router.post('/send/bulk', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { messages, delayBetween, campaignId } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const result = await EvolutionApiService.bulkSend(businessId, messages, {
      delayBetween, campaignId,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CHATS ====================

// Fetch all chats
router.get('/chats', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const chats = await EvolutionApiService.fetchChats(businessId);
    res.json({ success: true, data: chats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch messages for a chat
router.post('/messages', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { remoteJid, limit, offset } = req.body;
    if (!remoteJid) {
      return res.status(400).json({ success: false, error: 'remoteJid is required' });
    }

    const messages = await EvolutionApiService.fetchMessages(businessId, remoteJid, { limit, offset });
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if number exists on WhatsApp
router.post('/check-number', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { number } = req.body;
    if (!number) {
      return res.status(400).json({ success: false, error: 'number is required' });
    }

    const result = await EvolutionApiService.checkNumber(businessId, number);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WEBHOOK ====================

// Webhook receiver (no auth - called by Evolution API server)
router.post('/webhook/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    await EvolutionApiService.processWebhook(businessId, req.body);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Evolution webhook error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
