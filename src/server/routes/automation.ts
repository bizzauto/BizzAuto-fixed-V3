import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import axios from 'axios';
import https from 'https';

const router = Router();

// Shared HTTPS agent for n8n API calls (skip SSL verification for internal Docker traffic)
const n8nHttpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Get the n8n API key for app-to-n8n API calls.
 * Uses N8N_APP_API_KEY env var, falls back to N8N_API_KEY for backwards compatibility.
 * This key must be created in the n8n UI (Settings > n8n API) and has the X-N8N-API-KEY format.
 */
function getN8nApiKey(): string | null {
  const key = process.env.N8N_APP_API_KEY || process.env.N8N_API_KEY || null;
  if (!key) {
    console.warn('[n8n] No API key configured. Set N8N_APP_API_KEY env var for n8n integration.');
  } else if (!process.env.N8N_APP_API_KEY && process.env.N8N_API_KEY) {
    console.warn('[n8n] Falling back to N8N_API_KEY for n8n calls. Recommended: set N8N_APP_API_KEY explicitly.');
  }
  return key;
}

/**
 * Get the n8n base URL from env vars with proper defaults
 */
function getN8nBaseUrl(): string {
  return process.env.N8N_URL || 'https://n8n.bizzautoai.com';
}

// All routes require authentication
router.use(authenticate);

// ==================== AUTOMATION RULES ====================

// Get all automation rules for business
router.get('/rules', async (req: AuthRequest, res: Response) => {
  try {
    const rules = await prisma.chatbotFlow.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automation rules',
      details: error.message,
    });
  }
});

// Get single automation rule
router.get('/rules/:id', async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Automation rule not found',
      });
    }

    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automation rule',
      details: error.message,
    });
  }
});

// Create automation rule
router.post('/rules', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, trigger, keywords, response, aiEnabled } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const rule = await prisma.chatbotFlow.create({
      data: {
        businessId: req.user.businessId,
        name,
        trigger: trigger || 'keyword',
        keywords: keywords || [],
        response: response || '',
        aiEnabled: aiEnabled || false,
      },
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to create automation rule',
      details: error.message,
    });
  }
});

// Update automation rule
router.put('/rules/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Automation rule not found',
      });
    }

    const { name, trigger, keywords, response, aiEnabled } = req.body;

    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(trigger !== undefined && { trigger }),
        ...(keywords !== undefined && { keywords }),
        ...(response !== undefined && { response }),
        ...(aiEnabled !== undefined && { aiEnabled }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to update automation rule',
      details: error.message,
    });
  }
});

// Toggle automation rule
router.patch('/rules/:id/toggle', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const rule = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Automation rule not found',
      });
    }

    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: { isActive: !rule.isActive },
    });

    res.json({
      success: true,
      message: `Automation ${updated.isActive ? 'activated' : 'deactivated'}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle automation',
      details: error.message,
    });
  }
});

// Delete automation rule
router.delete('/rules/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.chatbotFlow.delete({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    res.json({ success: true, message: 'Automation rule deleted' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete automation rule',
      details: error.message,
    });
  }
});

// Get n8n connection status
router.get('/n8n/status', async (req: AuthRequest, res: Response) => {
  try {
    const n8nUrl = getN8nBaseUrl();

    try {
      const response = await axios.get(`${n8nUrl}/healthz`, {
        timeout: 5000,
        httpsAgent: n8nHttpsAgent,
      });
      res.json({
        success: true,
        data: {
          connected: true,
          url: n8nUrl,
          status: response.data,
        },
      });
    } catch {
      res.json({
        success: true,
        data: {
          connected: false,
          url: n8nUrl,
          message: 'n8n is not reachable',
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check n8n status',
      details: error.message,
    });
  }
});

// Forward webhook to n8n workflow
router.post('/n8n/trigger/:workflowId', async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const n8nUrl = getN8nBaseUrl();

    const response = await axios.post(
      `${n8nUrl}/webhook/${workflowId}`,
      req.body,
      { 
        timeout: 30000,
        httpsAgent: n8nHttpsAgent,
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('n8n trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger n8n workflow',
      details: error.message,
    });
  }
});

// Get n8n workflows
router.get('/n8n/workflows', async (req: AuthRequest, res: Response) => {
  try {
    const n8nUrl = getN8nBaseUrl();
    const apiKey = getN8nApiKey();

    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['X-N8N-API-KEY'] = apiKey;
      }

      const response = await axios.get(`${n8nUrl}/api/v1/workflows`, {
        headers,
        timeout: 5000,
        httpsAgent: n8nHttpsAgent,
      });

      res.json({
        success: true,
        data: response.data.data || response.data.workflows || response.data || [],
      });
    } catch (error: any) {
      console.warn('[n8n] Workflows fetch failed:', error.message);
      res.json({
        success: true,
        data: [],
        message: 'n8n workflows not available',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch n8n workflows',
      details: error.message,
    });
  }
});

// Trigger n8n workflow (alternative endpoint)
router.post('/n8n/workflows/:workflowId/trigger', async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const n8nUrl = getN8nBaseUrl();

    const response = await axios.post(
      `${n8nUrl}/webhook/${workflowId}`,
      req.body,
      { 
        timeout: 30000,
        httpsAgent: n8nHttpsAgent,
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('n8n workflow trigger error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get auto-reply templates
router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.chatbotFlow.findMany({
      where: {
        businessId: req.user.businessId,
        trigger: 'auto_reply',
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: error.message,
    });
  }
});

// Get auto-reply settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        autoReplyEnabled: true,
        autoReplyMessage: true,
        businessHours: true,
      },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      details: error.message,
    });
  }
});

// Update auto-reply settings
router.put('/settings', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { autoReplyEnabled, autoReplyMessage, businessHours } = req.body;

    const business = await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        ...(autoReplyEnabled !== undefined && { autoReplyEnabled }),
        ...(autoReplyMessage !== undefined && { autoReplyMessage }),
        ...(businessHours !== undefined && { businessHours }),
      },
    });

    res.json({
      success: true,
      data: {
        autoReplyEnabled: business.autoReplyEnabled,
        autoReplyMessage: business.autoReplyMessage,
        businessHours: business.businessHours,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message,
    });
  }
});

// Get all automations for business
router.get('/automations', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', type, isActive } = req.query as { page?: string; limit?: string; type?: string; isActive?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [automations, total] = await Promise.all([
      prisma.automationRule.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.automationRule.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        automations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automations',
      details: error.message,
    });
  }
});

// Create new automation
router.post('/automations', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, trigger, actions, isActive, config } = req.body;

    if (!name || !trigger) {
      return res.status(400).json({
        success: false,
        error: 'Name and trigger are required',
      });
    }

    const automation = await prisma.automationRule.create({
      data: {
        businessId: req.user.businessId,
        name,
        description: type ? `Automation type: ${type}` : '',
        trigger: { type: trigger },
        actions: actions || [],
        isActive: isActive || false,
      },
    });

    res.status(201).json({ success: true, data: automation });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to create automation',
      details: error.message,
    });
  }
});

// Update automation
router.put('/automations/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const automation = await prisma.automationRule.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'Automation not found',
      });
    }

    const { name, description, isActive, trigger, actions } = req.body;
    const updated = await prisma.automationRule.update({
      where: { id: req.params.id },
      data: { name, description, isActive, trigger, actions },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to update automation',
      details: error.message,
    });
  }
});

// Delete automation
router.delete('/automations/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const automation = await prisma.automationRule.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'Automation not found',
      });
    }

    await prisma.automationRule.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Automation deleted' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete automation',
      details: error.message,
    });
  }
});

// Toggle automation (activate/pause)
router.post('/automations/:id/toggle', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const automation = await prisma.automationRule.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'Automation not found',
      });
    }

    const updated = await prisma.automationRule.update({
      where: { id: req.params.id },
      data: { isActive: !automation.isActive },
    });

    res.json({
      success: true,
      message: `Automation ${updated.isActive ? 'activated' : 'paused'}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle automation',
      details: error.message,
    });
  }
});

// Get automation templates
router.get('/automations/templates', async (req: AuthRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'tmpl_welcome_message',
        name: 'Welcome Message',
        type: 'whatsapp',
        description: 'Send an automated welcome message when a new contact is added',
        trigger: 'contact_added',
        actions: [
          { type: 'send_message', template: 'Welcome {{name}}! Thanks for connecting with us.' },
        ],
        config: { delay: 0, channel: 'whatsapp' },
      },
      {
        id: 'tmpl_lead_capture',
        name: 'Lead Capture & Follow-up',
        type: 'lead',
        description: 'Capture leads from forms and send automated follow-up messages',
        trigger: 'form_submitted',
        actions: [
          { type: 'create_contact', mapFields: true },
          { type: 'send_message', template: 'Hi {{name}}, we received your inquiry. Our team will contact you shortly.' },
          { type: 'notify_team', recipients: ['sales'] },
        ],
        config: { delay: 300, channel: 'whatsapp' },
      },
      {
        id: 'tmpl_review_request',
        name: 'Review Request After Delivery',
        type: 'review',
        description: 'Automatically request a review after order delivery',
        trigger: 'order_delivered',
        actions: [
          { type: 'wait', duration: 86400 },
          { type: 'send_message', template: 'Hi {{name}}, hope you enjoyed your order! Please leave us a review: {{review_link}}' },
        ],
        config: { delay: 86400, channel: 'whatsapp' },
      },
      {
        id: 'tmpl_crm_stage_move',
        name: 'CRM Stage Change Notification',
        type: 'crm',
        description: 'Notify team when a contact moves to a new pipeline stage',
        trigger: 'stage_changed',
        actions: [
          { type: 'notify_team', recipients: ['assigned_user'] },
          { type: 'send_message', template: 'Hi {{name}}, great news! Your deal has moved to {{stage_name}}.' },
          { type: 'create_activity', title: 'Stage changed to {{stage_name}}' },
        ],
        config: { delay: 0, channel: 'whatsapp' },
      },
      {
        id: 'tmpl_email_campaign',
        name: 'Email Drip Campaign',
        type: 'email',
        description: 'Send a series of automated emails to nurture leads',
        trigger: 'tag_applied',
        actions: [
          { type: 'send_email', template: 'welcome_email', delay: 0 },
          { type: 'send_email', template: 'value_proposition', delay: 172800 },
          { type: 'send_email', template: 'case_study', delay: 345600 },
          { type: 'send_email', template: 'offer', delay: 518400 },
        ],
        config: { delay: 0, channel: 'email', stopOnReply: true },
      },
      {
        id: 'tmpl_abandoned_cart',
        name: 'Abandoned Cart Recovery',
        type: 'whatsapp',
        description: 'Remind customers about items left in their cart',
        trigger: 'cart_abandoned',
        actions: [
          { type: 'wait', duration: 3600 },
          { type: 'send_message', template: 'Hi {{name}}, you left some items in your cart. Complete your order now: {{cart_link}}' },
          { type: 'wait', duration: 86400 },
          { type: 'send_message', template: 'Last chance! Your cart items are waiting. Use code SAVE10 for 10% off: {{cart_link}}' },
        ],
        config: { delay: 3600, channel: 'whatsapp', maxAttempts: 2 },
      },
      {
        id: 'tmpl_payment_reminder',
        name: 'Payment Due Reminder',
        type: 'whatsapp',
        description: 'Send automated payment reminders before and after due date',
        trigger: 'payment_due',
        actions: [
          { type: 'send_message', template: 'Hi {{name}}, a friendly reminder that your payment of {{amount}} is due on {{due_date}}.' },
          { type: 'wait', duration: 86400 },
          { type: 'send_message', template: 'Hi {{name}}, your payment of {{amount}} is now overdue. Please pay at: {{payment_link}}' },
        ],
        config: { delay: 0, channel: 'whatsapp', maxAttempts: 2 },
      },
      {
        id: 'tmpl_birthday_greeting',
        name: 'Birthday Greeting',
        type: 'whatsapp',
        description: 'Send automated birthday wishes to contacts',
        trigger: 'birthday_today',
        actions: [
          { type: 'send_message', template: 'Happy Birthday {{name}}! 🎂 Wishing you a wonderful day. Here\'s a special gift for you: {{offer_code}}' },
        ],
        config: { delay: 0, channel: 'whatsapp', timeOfDay: '09:00' },
      },
    ];

    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automation templates',
      details: error.message,
    });
  }
});

// ==================== DEPLOYABLE WORKFLOW TEMPLATES ====================

interface DeployableTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  config: Record<string, any>;
  nodes: any[];
  edges: any[];
}

const DEPLOYABLE_TEMPLATES: DeployableTemplate[] = [
  {
    id: 'leadgen-whatsapp-reply',
    name: 'Lead Gen → WhatsApp Auto Reply',
    description: 'When a new lead is captured from any source, automatically send a personalized WhatsApp reply and add a "Auto-Replied" tag',
    category: 'lead_generation',
    triggerType: 'lead_created',
    config: {
      welcomeMessage: "Hi {{contact.name}}! 👋\n\nThank you for your interest! We've received your inquiry and our team will get back to you shortly.",
      followUpDelay: 30,
      addTag: 'Auto-Replied',
    },
    nodes: [
      { id: 'trigger-1', type: 'workflowNode', position: { x: 250, y: 0 }, data: { label: 'Lead Created', nodeType: 'lead_created', category: 'trigger', config: { source: 'all' } } },
      { id: 'action-send', type: 'workflowNode', position: { x: 250, y: 120 }, data: { label: 'Send WhatsApp Reply', nodeType: 'send_whatsapp', category: 'action', config: { templateId: 'welcome', message: "Hi {{contact.name}}! 👋\n\nThank you for your interest! We've received your inquiry and our team will get back to you shortly.\n\nBest regards,\n{{business.name}}" } } },
      { id: 'action-tag', type: 'workflowNode', position: { x: 250, y: 260 }, data: { label: 'Add Auto-Replied Tag', nodeType: 'add_tag', category: 'action', config: { tagName: 'Auto-Replied' } } },
      { id: 'action-wait', type: 'workflowNode', position: { x: 250, y: 400 }, data: { label: 'Wait 30 Minutes', nodeType: 'wait_delay', category: 'condition', config: { delayType: 'fixed', duration: 30, unit: 'minutes' } } },
      { id: 'action-followup', type: 'workflowNode', position: { x: 250, y: 540 }, data: { label: 'Send Follow-up', nodeType: 'send_whatsapp', category: 'action', config: { templateId: 'follow_up', message: "Hi {{contact.name}}! Just following up on your recent inquiry. Do you have any questions? 😊" } } },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'action-send', type: 'smoothstep', animated: true },
      { id: 'e2-3', source: 'action-send', target: 'action-tag', type: 'smoothstep', animated: true },
      { id: 'e3-4', source: 'action-tag', target: 'action-wait', type: 'smoothstep', animated: true },
      { id: 'e4-5', source: 'action-wait', target: 'action-followup', type: 'smoothstep', animated: true },
    ],
  },
  {
    id: 'leadgen-ai-reply',
    name: 'Lead Gen → AI Smart Reply',
    description: 'When a lead is created, use AI to generate a personalized response based on their inquiry, then send via WhatsApp',
    category: 'lead_generation',
    triggerType: 'lead_created',
    config: {
      aiTone: 'professional',
      aiSystemPrompt: 'You are a helpful sales representative. Reply to leads professionally and warmly. Keep responses under 300 characters for WhatsApp.',
    },
    nodes: [
      { id: 'trigger-1', type: 'workflowNode', position: { x: 250, y: 0 }, data: { label: 'Lead Created', nodeType: 'lead_created', category: 'trigger', config: { source: 'all' } } },
      { id: 'ai-gen', type: 'workflowNode', position: { x: 250, y: 140 }, data: { label: 'AI Generate Reply', nodeType: 'ai_reply', category: 'ai', config: { model: 'gpt-4o-mini', sendAsWhatsApp: true, maxTokens: 300 } } },
      { id: 'action-score', type: 'workflowNode', position: { x: 250, y: 280 }, data: { label: 'AI Score Lead', nodeType: 'ai_score_lead', category: 'ai', config: { criteria: 'comprehensive', outputField: 'leadScore', updateContact: true } } },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-gen', type: 'smoothstep', animated: true },
      { id: 'e2-3', source: 'ai-gen', target: 'action-score', type: 'smoothstep', animated: true },
    ],
  },
  {
    id: 'incoming-msg-autoreply',
    name: 'Incoming Message → AI Auto Reply',
    description: 'When a message is received on WhatsApp, use AI to generate a smart reply automatically',
    category: 'support',
    triggerType: 'message_received',
    config: { businessHoursOnly: false, aiTone: 'friendly' },
    nodes: [
      { id: 'trigger-1', type: 'workflowNode', position: { x: 250, y: 0 }, data: { label: 'Message Received', nodeType: 'message_received', category: 'trigger', config: { channel: 'all' } } },
      { id: 'condition-1', type: 'workflowNode', position: { x: 250, y: 140 }, data: { label: 'Has Phone?', nodeType: 'if_else', category: 'condition', config: { field: 'contact.phone', operator: 'is_not_empty' } } },
      { id: 'action-reply', type: 'workflowNode', position: { x: 100, y: 300 }, data: { label: 'AI Reply via WhatsApp', nodeType: 'ai_reply', category: 'ai', config: { sendAsWhatsApp: true, promptTemplate: 'customer_support' } } },
      { id: 'action-log', type: 'workflowNode', position: { x: 450, y: 300 }, data: { label: 'Log Activity', nodeType: 'add_activity', category: 'action', config: { activityType: 'note', title: 'Message without phone', content: 'Could not reply - no phone number' } } },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'condition-1', type: 'smoothstep', animated: true },
      { id: 'e2-true', source: 'condition-1', target: 'action-reply', sourceHandle: 'true', type: 'smoothstep', animated: true, label: 'True' },
      { id: 'e2-false', source: 'condition-1', target: 'action-log', sourceHandle: 'false', type: 'smoothstep', animated: true, label: 'False' },
    ],
  },
  {
    id: 'leadgen-full-funnel',
    name: 'Complete Lead Gen Funnel',
    description: 'Full automation: Capture lead → WhatsApp reply → Add tag → Score lead → Notify team → Follow up after 24h',
    category: 'lead_generation',
    triggerType: 'lead_created',
    config: {},
    nodes: [
      { id: 'trigger-1', type: 'workflowNode', position: { x: 250, y: 0 }, data: { label: 'Lead Created', nodeType: 'lead_created', category: 'trigger', config: { source: 'all' } } },
      { id: 'action-welcome', type: 'workflowNode', position: { x: 250, y: 120 }, data: { label: 'Send Welcome WhatsApp', nodeType: 'send_whatsapp', category: 'action', config: { message: 'Hi {{contact.name}}! 🎉 Thanks for reaching out! Our team will contact you within 24 hours with the best solution for you.' } } },
      { id: 'action-tag', type: 'workflowNode', position: { x: 250, y: 240 }, data: { label: 'Tag: New Lead', nodeType: 'add_tag', category: 'action', config: { tagName: 'New-Lead' } } },
      { id: 'ai-score', type: 'workflowNode', position: { x: 250, y: 360 }, data: { label: 'AI Score Lead', nodeType: 'ai_score_lead', category: 'ai', config: { criteria: 'comprehensive', outputField: 'leadScore' } } },
      { id: 'condition-hot', type: 'workflowNode', position: { x: 250, y: 480 }, data: { label: 'High Score? (>70)', nodeType: 'if_else', category: 'condition', config: { field: 'leadScore', operator: 'greater_than', value: '70' } } },
      { id: 'action-notify', type: 'workflowNode', position: { x: 100, y: 620 }, data: { label: 'Notify Sales Team', nodeType: 'notify_team', category: 'action', config: { team: 'sales', message: '🔥 Hot lead alert! {{contact.name}} scored high. Follow up ASAP!' } } },
      { id: 'action-wait', type: 'workflowNode', position: { x: 400, y: 620 }, data: { label: 'Wait 24 Hours', nodeType: 'wait_delay', category: 'condition', config: { delayType: 'fixed', duration: 24, unit: 'hours' } } },
      { id: 'action-followup', type: 'workflowNode', position: { x: 400, y: 740 }, data: { label: 'Send Follow-up', nodeType: 'send_whatsapp', category: 'action', config: { message: 'Hi {{contact.name}}, just checking in! Have you had a chance to think about our offer? Let us know if you have any questions!' } } },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'action-welcome', type: 'smoothstep', animated: true },
      { id: 'e2-3', source: 'action-welcome', target: 'action-tag', type: 'smoothstep', animated: true },
      { id: 'e3-4', source: 'action-tag', target: 'ai-score', type: 'smoothstep', animated: true },
      { id: 'e4-5', source: 'ai-score', target: 'condition-hot', type: 'smoothstep', animated: true },
      { id: 'e5-true', source: 'condition-hot', target: 'action-notify', sourceHandle: 'true', type: 'smoothstep', animated: true, label: 'Hot Lead' },
      { id: 'e5-false', source: 'condition-hot', target: 'action-wait', sourceHandle: 'false', type: 'smoothstep', animated: true, label: 'Normal' },
      { id: 'e6-7', source: 'action-wait', target: 'action-followup', type: 'smoothstep', animated: true },
    ],
  },
];

// Get all workflow deployment templates
router.get('/deploy-templates', async (_req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true, data: DEPLOYABLE_TEMPLATES });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch deploy templates', details: error.message });
  }
});

// Deploy a template - creates a real Workflow from a template (no internal HTTP call)
router.post('/deploy-template', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, name, config } = req.body;
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'templateId is required' });
    }

    const fullTemplate = DEPLOYABLE_TEMPLATES.find(t => t.id === templateId);
    if (!fullTemplate) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Create the workflow from template
    const workflow = await prisma.workflow.create({
      data: {
        businessId: req.user.businessId,
        name: name || fullTemplate.name,
        description: fullTemplate.description || '',
        triggerType: fullTemplate.triggerType || 'lead_created',
        triggerConfig: config || fullTemplate.config || {},
        nodes: fullTemplate.nodes || [],
        edges: fullTemplate.edges || [],
        isActive: false,
        createdBy: req.user.id,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        businessId: req.user.businessId,
        type: 'workflow_deployed',
        title: `Workflow deployed: ${workflow.name}`,
        content: `Template: ${fullTemplate.name}. Go to Workflows to activate it.`,
        metadata: { templateId, workflowId: workflow.id },
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: `Workflow "${workflow.name}" deployed successfully! Go to Workflows to activate it.`,
      data: workflow,
    });
  } catch (error: any) {
    console.error('Deploy template error:', error);
    res.status(500).json({ success: false, error: 'Failed to deploy template', details: error.message });
  }
});

export default router;
