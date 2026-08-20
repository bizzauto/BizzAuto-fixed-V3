import { Router } from 'express';
import { UnofficialWhatsAppService, GATEWAY_PROVIDER_LABELS } from '../services/unofficial-whatsapp.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { qs } from '../utils/query.js';

const router = Router();
router.use(authenticate);

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

router.get('/config', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const config = await UnofficialWhatsAppService.getConfig(businessId);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/config', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const config = await UnofficialWhatsAppService.saveConfig(businessId, req.body);
    res.json({ success: true, data: config, message: 'Configuration saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/providers', async (_req, res) => {
  res.json({ success: true, data: GATEWAY_PROVIDER_LABELS });
});

// ---------------------------------------------------------------------------
// SESSION MANAGEMENT
// ---------------------------------------------------------------------------

router.get('/status', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const status = await UnofficialWhatsAppService.getStatus(businessId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/connect', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const status = await UnofficialWhatsAppService.connect(businessId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const result = await UnofficialWhatsAppService.logout(businessId);
    res.json({ success: result.success, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const result = await UnofficialWhatsAppService.testConnection(businessId);
    res.json({ success: result.ok, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/check/:phone', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const result = await UnofficialWhatsAppService.checkNumber(businessId, qs(req.params.phone));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// SENDING
// ---------------------------------------------------------------------------

router.post('/send', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const result = await UnofficialWhatsAppService.send(businessId, req.body);
    res.json({ success: result.success, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/send-bulk', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });
    const { messages } = req.body as { messages: any[] };
    if (!Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages must be an array' });
    }
    const result = await UnofficialWhatsAppService.sendBulk(businessId, messages);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
