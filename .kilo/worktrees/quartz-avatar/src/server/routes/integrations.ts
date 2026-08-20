import { Router, Request, Response } from 'express';
import { prisma, authenticate } from '../index.js';
import { GoogleSheetsService } from '../services/google-sheets.service.js';
import { EmailService } from '../services/email.service.js';
import { WhatsAppService } from '../services/whatsapp.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/integrations
 * List all integrations for business
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const integrations = await prisma.integration.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/google-sheets
 * Configure Google Sheets integration
 */
router.post('/google-sheets', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { spreadsheetId, accessToken, refreshToken, expiryDate, autoSync, syncInterval } =
      req.body;

    const integration = await GoogleSheetsService.configureIntegration(businessId, {
      spreadsheetId,
      accessToken,
      refreshToken,
      expiryDate,
      autoSync,
      syncInterval,
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/integrations/google-sheets/oauth-url
 * Get Google OAuth URL
 */
router.get('/google-sheets/oauth-url', async (req: any, res: Response) => {
  try {
    const oauthUrl = GoogleSheetsService.getOAuthUrl();
    res.json({ success: true, data: { oauthUrl } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/integrations/google-sheets/callback
 * Handle Google OAuth callback
 */
router.get('/google-sheets/callback', async (req: any, res: Response) => {
  try {
    const { code, state } = req.query;
    const businessId = state; // Pass business ID in state parameter

    if (!code || !businessId) {
      return res.status(400).json({ success: false, error: 'Missing code or businessId' });
    }

    const result = await GoogleSheetsService.handleOAuthCallback(businessId as string, code as string);

    res.json({
      success: true,
      message: 'Google Sheets connected successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/google-sheets/sync
 * Sync contacts to Google Sheets
 */
router.post('/google-sheets/sync', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { spreadsheetId, sheetName, filter } = req.body;

    const result = await GoogleSheetsService.syncContacts(businessId, {
      spreadsheetId,
      sheetName,
      filter,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/google-sheets/import
 * Import contacts from Google Sheets
 */
router.post('/google-sheets/import', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { spreadsheetId, sheetName, range } = req.body;

    const result = await GoogleSheetsService.importContacts(businessId, {
      spreadsheetId,
      sheetName,
      range,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/google-sheets/create
 * Create new spreadsheet
 */
router.post('/google-sheets/create', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { title } = req.body;

    const result = await GoogleSheetsService.createSpreadsheet(businessId, title || 'CRM Contacts');

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/email
 * Configure email integration
 */
router.post('/email', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromName,
      enableAutoReply,
      autoReplyMessage,
    } = req.body;

    const integration = await EmailService.configureEmail(businessId, {
      smtpHost: smtpHost || 'smtp.gmail.com',
      smtpPort: smtpPort || 587,
      smtpSecure: smtpSecure || false,
      smtpUser,
      smtpPass,
      fromName: fromName || smtpUser,
      enableAutoReply,
      autoReplyMessage,
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/email/test
 * Test email configuration
 */
router.post('/email/test', async (req: any, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;

    const isValid = await EmailService.testEmailConfig(req.user.businessId, {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
    });

    res.json({ success: true, data: { valid: isValid } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/proxy
 * Add proxy for WhatsApp
 */
router.post('/proxy', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { url, username, password } = req.body;

    const proxy = await WhatsAppService.addProxy(businessId, {
      url,
      username,
      password,
    });

    res.json({ success: true, data: proxy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations
 * Create custom integration
 */
router.post('/', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { type, name, config, isActive } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        error: 'Type and name are required',
      });
    }

    const integration = await prisma.integration.create({
      data: {
        businessId,
        type,
        name,
        config: config || {},
        isActive: isActive !== false,
      },
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/integrations/:id
 * Update integration
 */
router.put('/:id', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;
    const { name, config, isActive } = req.body;

    const integration = await prisma.integration.update({
      where: { id, businessId },
      data: {
        ...(name && { name }),
        ...(config && { config }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/integrations/:id
 * Delete integration
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { id } = req.params;

    await prisma.integration.delete({
      where: { id, businessId },
    });

    res.json({ success: true, message: 'Integration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
