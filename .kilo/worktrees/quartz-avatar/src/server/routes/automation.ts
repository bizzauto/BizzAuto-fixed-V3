
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== AUTOMATION RULES ====================

// Get all automation rules for business
router.get('/rules', async (req: any, res: any) => {
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
router.get('/rules/:id', async (req: any, res: any) => {
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
router.post('/rules', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const { name, description, triggerType, triggerValue, flowData, nodes, edges } = req.body;

    if (!name || !triggerType) {
      return res.status(400).json({
        success: false,
        error: 'Name and triggerType are required',
      });
    }

    const rule = await prisma.chatbotFlow.create({
      data: {
        businessId: req.user.businessId,
        name,
        description: description || '',
        triggerType,
        triggerValue: triggerValue || '',
        flowData: flowData || {},
        nodes: nodes || [],
        edges: edges || [],
        isActive: false,
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
router.put('/rules/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
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
      data: req.body,
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
router.patch('/rules/:id/toggle', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
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
router.delete('/rules/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
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

// ==================== N8N INTEGRATION ====================

// Get n8n connection status
router.get('/n8n/status', async (req: any, res: any) => {
  try {
    const n8nUrl = process.env.N8N_URL || 'http://n8n:5678';

    try {
      const response = await axios.get(`${n8nUrl}/healthz`, { timeout: 5000 });
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
router.post('/n8n/trigger/:workflowId', async (req: any, res: any) => {
  try {
    const { workflowId } = req.params;
    const n8nUrl = process.env.N8N_URL || 'http://n8n:5678';

    const response = await axios.post(
      `${n8nUrl}/webhook/${workflowId}`,
      req.body,
      { timeout: 30000 }
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
router.get('/n8n/workflows', async (req: any, res: any) => {
  try {
    const n8nUrl = process.env.N8N_URL || 'http://n8n:5678';

    try {
      const response = await axios.get(`${n8nUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY || ''}`,
        },
        timeout: 5000,
      });

      res.json({
        success: true,
        data: response.data.data || response.data.workflows || [],
      });
    } catch {
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
router.post('/n8n/workflows/:workflowId/trigger', async (req: any, res: any) => {
  try {
    const { workflowId } = req.params;
    const n8nUrl = process.env.N8N_URL || 'http://n8n:5678';

    const response = await axios.post(
      `${n8nUrl}/webhook/${workflowId}`,
      req.body,
      { timeout: 30000 }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('n8n workflow trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger n8n workflow',
      details: error.message,
    });
  }
});

// ==================== AUTO-REPLY TEMPLATES ====================

// Get auto-reply templates
router.get('/templates', async (req: any, res: any) => {
  try {
    const templates = await prisma.chatbotFlow.findMany({
      where: {
        businessId: req.user.businessId,
        triggerType: 'auto_reply',
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

// ==================== BUSINESS AUTO-REPLY SETTINGS ====================

// Get auto-reply settings
router.get('/settings', async (req: any, res: any) => {
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
router.put('/settings', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
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

// ==================== AUTOMATIONS (NEW) ====================

// Get all automations for business
router.get('/automations', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20', type, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [automations, total] = await Promise.all([
      prisma.chatbotFlow.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chatbotFlow.count({ where }),
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
router.post('/automations', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const { name, type, trigger, actions, isActive, config } = req.body;

    if (!name || !trigger) {
      return res.status(400).json({
        success: false,
        error: 'Name and trigger are required',
      });
    }

    const automation = await prisma.chatbotFlow.create({
      data: {
        businessId: req.user.businessId,
        name,
        description: type ? `Automation type: ${type}` : '',
        triggerType: trigger,
        triggerValue: config?.triggerValue || '',
        flowData: actions || {},
        nodes: config?.nodes || [],
        edges: config?.edges || [],
        variables: config?.variables || null,
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
router.put('/automations/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const automation = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'Automation not found',
      });
    }

    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: req.body,
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
router.delete('/automations/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const automation = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'Automation not found',
      });
    }

    await prisma.chatbotFlow.delete({
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
router.post('/automations/:id/toggle', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const automation = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'Automation not found',
      });
    }

    const updated = await prisma.chatbotFlow.update({
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
router.get('/automations/templates', async (req: any, res: any) => {
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

export default router;
