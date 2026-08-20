import { Router } from 'express';
import { ClaudeWhatsAppService, CLAUDE_CHANNEL_LABELS } from '../services/claude-whatsapp.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require auth
router.use(authenticate);

// =========================================================================
// CONFIGURATION
// =========================================================================

// Get current Claude WhatsApp configuration for this business
router.get('/config', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const config = await ClaudeWhatsAppService.getConfig(businessId);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save Claude WhatsApp configuration
router.post('/config', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const config = await ClaudeWhatsAppService.saveConfig(businessId, req.body);
    res.json({ success: true, data: config, message: 'Configuration saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get channel labels & metadata
router.get('/channels', async (_req, res) => {
  res.json({ success: true, data: CLAUDE_CHANNEL_LABELS });
});

// =========================================================================
// SENDING (the main feature - smart routing with auto-fallback)
// =========================================================================

// Send a message via the Claude provider (auto-selects channel + AI optimize + fallback)
router.post('/send', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const result = await ClaudeWhatsAppService.send(businessId, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk send with smart routing
router.post('/send-bulk', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const { messages } = req.body as { messages: any[] };
    if (!Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages must be an array' });
    }
    // Process in parallel with a concurrency limit
    const concurrency = 10;
    const results: any[] = [];
    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((m: any) =>
          ClaudeWhatsAppService.send(businessId, m).catch((e: any) => ({
            success: false,
            channel: 'unknown',
            cost: 0,
            fallbackUsed: false,
            error: e.message,
            timestamp: new Date(),
          }))
        )
      );
      results.push(...batchResults);
    }
    const successCount = results.filter((r) => r.success).length;
    const fallbackCount = results.filter((r) => r.fallbackUsed).length;
    const totalCost = results.reduce((s, r) => s + (r.cost || 0), 0);
    res.json({
      success: true,
      data: {
        results,
        summary: { total: messages.length, sent: successCount, failed: messages.length - successCount, fallbacks: fallbackCount, totalCost: Math.round(totalCost * 100) / 100 },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// AI OPTIMIZATION (preview the optimized message before sending)
// =========================================================================

router.post('/optimize', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const config = await ClaudeWhatsAppService.getConfig(businessId);
    const { body, channel = 'whatsapp_meta', contactName } = req.body;
    if (!body) return res.status(400).json({ success: false, error: 'body required' });
    const result = await ClaudeWhatsAppService.optimizeMessage(body, {
      channel,
      tone: config.aiTone,
      maxLength: config.aiMaxLength,
      language: config.aiLanguage,
      contactName,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// CHANNEL TESTING
// =========================================================================

router.post('/test/:channel', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const { channel } = req.params;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'phone required for test' });
    const result = await ClaudeWhatsAppService.testChannel(businessId, channel as any, phone);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// COST ANALYTICS & SAVINGS
// =========================================================================

router.get('/cost-stats', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const { from, to } = req.query;
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();
    const stats = await ClaudeWhatsAppService.getCostStats(businessId, fromDate, toDate);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// CHANNEL STATUS (which providers are connected for this business)
// =========================================================================

router.get('/status', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const config = await ClaudeWhatsAppService.getConfig(businessId);
    const channels: any[] = [];
    for (const ch of Object.keys(CLAUDE_CHANNEL_LABELS) as (keyof typeof CLAUDE_CHANNEL_LABELS)[]) {
      const avail = await ClaudeWhatsAppService.isChannelAvailable(businessId, ch, config);
      channels.push({ channel: ch, ...CLAUDE_CHANNEL_LABELS[ch], available: avail.ok, reason: avail.reason });
    }
    res.json({ success: true, data: { config, channels } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
