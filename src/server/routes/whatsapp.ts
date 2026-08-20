
import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireBusinessOwner, AuthRequest } from '../middleware/auth.js';
import { checkMessageLimit } from '../middleware/planLimits.js';
import { WhatsAppSendRouter } from '../services/whatsapp-send-router.service.js';
import axios from 'axios';
import { encrypt, decrypt } from '../utils/auth.js';

const router = Router();

// WhatsApp API base URL
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

// Helper to get business WhatsApp credentials
async function getWhatsAppCredentials(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      waPhoneNumberId: true,
      waAccessToken: true,
      waWebhookSecret: true
    }
  });

  if (!business || !business.waPhoneNumberId || !business.waAccessToken) {
    throw new Error('WhatsApp not configured for this business');
  }

  return {
    phoneNumberId: business.waPhoneNumberId,
    accessToken: decrypt(business.waAccessToken),
  };
}

// WhatsApp webhook verification (Meta sends GET for webhook setup)
router.get('/webhook/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const verifyToken = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (!verifyToken) {
      return res.status(400).send('Missing verify_token');
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.waWebhookSecret) {
      return res.status(404).send('Business not found');
    }

    if (verifyToken === business.waWebhookSecret) {
      console.log(`[WhatsApp] Webhook verified for business ${businessId}`);
      return res.send(challenge);
    }

    return res.status(403).send('Verification failed');
  } catch (error) {
    console.error('[WhatsApp] Webhook verification error:', error);
    return res.status(500).send('Verification error');
  }
});

// WhatsApp webhook endpoint (public)
router.post('/webhook/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const body = req.body;

    // Verify webhook
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.waWebhookSecret) {
      return res.status(401).json({ error: 'Unauthorized - webhook not configured' });
    }

    // Handle verification (for Meta webhook setup) — GET request
    if (req.query['hub.verify_token']) {
      if (req.query['hub.verify_token'] === business.waWebhookSecret) {
        return res.send(req.query['hub.challenge']);
      }
      return res.status(403).send('Verification failed');
    }

    // For POST (incoming messages), verify webhook secret via query param or header
    const requestSecret = (req.query['secret'] as string) || (req.headers['x-webhook-secret'] as string);
    if (requestSecret && requestSecret !== business.waWebhookSecret) {
      console.warn(`[WhatsApp] Rejected webhook with invalid secret for business ${businessId}`);
      return res.status(403).json({ error: 'Invalid webhook secret' });
    }

    // Process incoming messages
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        const senderPhone = message.from;
        
        // Find or create contact
        let contact = await prisma.contact.findFirst({
          where: {
            businessId,
            phone: senderPhone,
          },
        });

        let isNewContact = false;

        if (!contact) {
          // NEW LEAD - Auto-create from WhatsApp message
          contact = await prisma.contact.create({
            data: {
              businessId,
              name: `WhatsApp ${senderPhone}`,
              phone: senderPhone,
              source: 'whatsapp',
              tags: ['WhatsApp Lead', 'Auto-Captured'],
              whatsappOptIn: true,
              lastActivity: new Date(),
              lastMessageAt: new Date(),
            },
          });
          isNewContact = true;
          console.log(`[WhatsApp] New lead created: ${senderPhone}`);

          // Create activity log
          await prisma.activity.create({
            data: {
              businessId,
              contactId: contact.id,
              type: 'lead_captured',
              title: 'New lead from WhatsApp',
              content: `Auto-captured from incoming WhatsApp message`,
              metadata: { source: 'whatsapp', phone: senderPhone },
              createdBy: 'system',
            },
          });
        } else {
          // Existing contact - update last activity
          await prisma.contact.update({
            where: { id: contact.id },
            data: { 
              lastMessageAt: new Date(),
              lastActivity: new Date(),
            },
          });
        }

        // AI Auto-Reply + Workflow Triggers (new intelligent handler)
        try {
          const { handleIncomingMessage } = await import('../services/ai-auto-reply.service.js');
          const messageText = message.text?.body || '';
          const autoResult = await handleIncomingMessage(businessId, senderPhone, messageText, message.id);
          console.log(`[WhatsApp] Auto-reply result: replied=${autoResult.replied}, channel=${autoResult.channel}, workflow=${autoResult.workflowTriggered}`);
        } catch (aiError: any) {
          console.error(`[WhatsApp] AI auto-reply failed, falling back to static:`, aiError.message);
          // Fallback to static auto-reply
          try {
            const business = await prisma.business.findUnique({
              where: { id: businessId },
              select: { autoReplyEnabled: true, autoReplyMessage: true, name: true },
            });
            if (business?.autoReplyEnabled && business?.autoReplyMessage) {
              const autoReply = business.autoReplyMessage
                .replace(/{{name}}/g, contact.name || 'Customer')
                .replace(/{{business}}/g, business.name || 'Business');
              const creds = await getWhatsAppCredentials(businessId);
              await axios.post(
                `${WHATSAPP_API_BASE}/${creds.phoneNumberId}/messages`,
                {
                  messaging_product: 'whatsapp',
                  to: senderPhone,
                  type: 'text',
                  text: { body: autoReply },
                },
                { headers: { Authorization: `Bearer ${creds.accessToken}` } }
              );
            }
          } catch (fallbackError: any) {
            console.error(`[WhatsApp] Static auto-reply also failed:`, fallbackError.message);
          }
        }

        // Save message
        const messageData: any = {
          businessId,
          contactId: contact.id,
          direction: 'inbound',
          type: message.type,
          status: 'received',
          waMessageId: message.id,
        };

        if (message.type === 'text') {
          messageData.content = message.text.body;
        } else if (message.type === 'image') {
          messageData.mediaUrl = message.image.id;
          messageData.content = message.image.caption || 'Image received';
        } else if (message.type === 'video') {
          messageData.mediaUrl = message.video.id;
          messageData.content = message.video.caption || 'Video received';
        } else if (message.type === 'audio') {
          messageData.mediaUrl = message.audio.id;
          messageData.content = 'Audio message';
        } else if (message.type === 'document') {
          messageData.mediaUrl = message.document.id;
          messageData.content = message.document.filename || 'Document received';
        } else {
          messageData.content = `${message.type} message received`;
        }

        await prisma.message.create({
          data: messageData,
        });

        // Check if chatbot should respond
        const chatbotFlow = await prisma.chatbotFlow.findFirst({
          where: {
            businessId,
            isActive: true,
          },
        });

        if (chatbotFlow) {
          console.log('Triggering chatbot for message:', message.id);
        }
      }
    }

    // Handle status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        await prisma.message.updateMany({
          where: {
            businessId,
            waMessageId: status.id,
          },
          data: {
            status: status.status,
            statusTimestamp: new Date(),
          },
        });
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get WhatsApp conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const conversations = await prisma.contact.findMany({
      where: {
        businessId: req.user.businessId,
        source: 'whatsapp',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastMessageAt: true,
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: Number(limit),
    });

    const total = await prisma.contact.count({
      where: {
        businessId: req.user.businessId,
        source: 'whatsapp',
      },
    });

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      details: error.message,
    });
  }
});

// Get conversation with a specific contact
router.get('/conversation/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        businessId: req.user.businessId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        contactId,
        businessId: req.user.businessId,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: Number(limit),
    });

    const total = await prisma.message.count({
      where: {
        contactId,
        businessId: req.user.businessId,
      },
    });

    res.json({
      success: true,
      data: {
        contact,
        messages,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
      details: error.message,
    });
  }
});

// Send text message (with plan limit check) — uses unified WhatsAppSendRouter
router.post('/send/text', authenticate, checkMessageLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, content, phone, message } = req.body;
    const textContent = content || message;

    if (!contactId && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID or phone number is required',
      });
    }

    if (!textContent) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required',
      });
    }

    let contact;
    if (contactId) {
      contact = await prisma.contact.findFirst({
        where: { id: contactId, businessId: req.user.businessId },
      });
    } else {
      contact = await prisma.contact.findFirst({
        where: { phone, businessId: req.user.businessId },
      });
    }

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    if (!contact.phone) {
      return res.status(400).json({
        success: false,
        error: 'Contact has no phone number',
      });
    }

    // Send via unified router (auto-detects Meta vs Evolution channel)
    const result = await WhatsAppSendRouter.sendTextMessage(
      req.user.businessId,
      contact.phone,
      textContent,
      { messageId: contact.id }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to send message',
      });
    }

    // Save message to DB
    const savedMessage = await prisma.message.create({
      data: {
        businessId: req.user.businessId,
        contactId: contact.id,
        direction: 'outbound',
        type: 'text',
        content: textContent,
        status: 'sent',
        waMessageId: result.messageId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        businessId: req.user.businessId,
        contactId: contact.id,
        type: 'whatsapp_sent',
        title: 'WhatsApp message sent',
        content: textContent,
        createdBy: req.user.id,
      },
    });

    res.json({
      success: true,
      channel: result.channel,
      data: savedMessage,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Get WhatsApp channel status (Meta vs Evolution)
router.get('/channel-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const info = await WhatsAppSendRouter.getChannelInfo(req.user.businessId);
    res.json({
      success: true,
      data: info,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Send template message (with plan limit check)
router.post('/send/template', authenticate, checkMessageLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, templateName, languageCode = 'en', components, phone } = req.body;

    if (!contactId && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID or phone number is required',
      });
    }

    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required',
      });
    }

    let contact;
    if (contactId) {
      contact = await prisma.contact.findFirst({
        where: { id: contactId, businessId: req.user.businessId },
      });
    } else {
      contact = await prisma.contact.findFirst({
        where: { phone, businessId: req.user.businessId },
      });
    }

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    // Decrypt access token before sending to API
    const accessToken = decrypt(business.waAccessToken);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: contact.phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components || [],
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const message = await prisma.message.create({
      data: {
        businessId: req.user.businessId,
        contact: { connect: { id: contact.id } },
        direction: 'outbound',
        type: 'template',
        templateName,
        templateLanguage: languageCode,
        content: components ? JSON.stringify(components) : '',
        status: 'sent',
        waMessageId: response.data.messages?.[0]?.id,
      },
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Send template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send template message',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Connect WhatsApp (Embedded Signup URL)
router.post('/connect', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.WHATSAPP_REDIRECT_URL;

    if (!appId || appId === 'your_meta_app_id') {
      return res.status(400).json({
        success: false,
        error: 'META_APP_ID not configured in .env file',
      });
    }

    // Generate Meta Embedded Signup URL
    // Step 1: Request permissions needed
    const scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',');

    // State token for CSRF protection (businessId + timestamp)
    const state = Buffer.from(JSON.stringify({
      businessId: req.user.businessId,
      ts: Date.now(),
    })).toString('base64');

    const signupUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`;

    res.json({
      success: true,
      data: {
        signupUrl,
        state,
        message: 'Redirect user to this URL to complete WhatsApp connection',
      },
    });
  } catch (error: any) {
    console.error('Connect WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate WhatsApp connection',
      details: error.message,
    });
  }
});

// OAuth Callback - Meta redirects here after user authorizes
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: fbError } = req.query;

    if (fbError) {
      console.error('[WhatsApp Callback] Facebook error:', fbError);
      return res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=auth_denied`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=no_code`);
    }

    // Decode state to get businessId
    let businessId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      businessId = stateData.businessId;

      // Validate state is not too old (5 min)
      if (Date.now() - stateData.ts > 5 * 60 * 1000) {
        return res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=state_expired`);
      }
    } catch {
      return res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=invalid_state`);
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.WHATSAPP_REDIRECT_URL;

    if (!appId || !appSecret) {
      console.error('[WhatsApp Callback] META_APP_ID or META_APP_SECRET not configured');
      return res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=server_config_missing`);
    }

    // Step 1: Exchange code for short-lived access token
    console.log('[WhatsApp Callback] Exchanging code for access token...');
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: code as string,
      },
    });

    const { access_token: shortToken } = tokenResponse.data;
    if (!shortToken) {
      console.error('[WhatsApp Callback] Failed to get access token');
      return res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=token_exchange_failed`);
    }

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    console.log('[WhatsApp Callback] Exchanging for long-lived token...');
    const longTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fetched_value: shortToken,
      },
    });

    const longLivedToken = longTokenResponse.data.access_token || shortToken;

    // Step 3: Get WhatsApp Business Account (WABA) ID and Phone Number ID
    console.log('[WhatsApp Callback] Fetching WABA and phone number...');
    const wabaResponse = await axios.get('https://graph.facebook.com/v18.0/debug_token', {
      params: {
        input_token: longLivedToken,
        access_token: `${appId}|${appSecret}`,
      },
    });

    // Extract WABA ID from token scopes
    const granularScopes = wabaResponse.data.data?.scopes || [];
    let wabaId = '';
    let phoneNumberId = '';

    // Try to find WABA from granted scopes
    for (const scope of granularScopes) {
      if (scope.scope === 'whatsapp_business_management') {
        // The target IDs contain the WABA ID
        wabaId = scope.target_ids?.[0] || '';
      }
    }

    // Step 4: If WABA ID found, get phone number ID
    if (wabaId) {
      try {
        const phoneResponse = await axios.get(`https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`, {
          params: {
            access_token: longLivedToken,
            fields: 'id,display_phone_number,verified_name,quality_rating',
          },
        });

        const phoneNumbers = phoneResponse.data?.data || [];
        if (phoneNumbers.length > 0) {
          phoneNumberId = phoneNumbers[0].id;
          console.log(`[WhatsApp Callback] Found phone number: ${phoneNumbers[0].display_phone_number} (${phoneNumberId})`);
        }
      } catch (phoneErr: any) {
        console.warn('[WhatsApp Callback] Could not fetch phone numbers:', phoneErr.message);
      }
    }

    // Step 5: Generate webhook secret
    const crypto = await import('crypto');
    const webhookSecret = crypto.randomBytes(24).toString('hex');

    // Step 6: Save to database
    console.log('[WhatsApp Callback] Saving credentials to database...');
    await prisma.business.update({
      where: { id: businessId },
      data: {
        wabaId: wabaId || null,
        waPhoneNumberId: phoneNumberId || null,
        waAccessToken: encrypt(longLivedToken),
        waWebhookSecret: webhookSecret,
      },
    });

    console.log(`[WhatsApp Callback] WhatsApp connected for business ${businessId}`);
    console.log(`[WhatsApp Callback] WABA ID: ${wabaId}`);
    console.log(`[WhatsApp Callback] Phone Number ID: ${phoneNumberId}`);

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/whatsapp?success=connected`);
  } catch (error: any) {
    console.error('[WhatsApp Callback] Error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/whatsapp?error=callback_failed`);
  }
});

// Manual connect - Enter credentials directly (for testing or if Embedded Signup fails)
router.post('/connect-manual', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { wabaId, phoneNumberId, accessToken, webhookSecret } = req.body;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumberId and accessToken are required',
      });
    }

    // Validate the access token by making a test API call
    let phoneNumber = '';
    try {
      const testResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${phoneNumberId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'display_phone_number,verified_name',
          },
        }
      );
      phoneNumber = testResponse.data?.display_phone_number || '';
    } catch (validationErr: any) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access token or phone number ID',
        details: validationErr.response?.data?.error?.message || validationErr.message,
      });
    }

    const crypto = await import('crypto');
    const finalWebhookSecret = webhookSecret || crypto.randomBytes(24).toString('hex');

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        wabaId: wabaId || null,
        waPhoneNumberId: phoneNumberId,
        waAccessToken: encrypt(accessToken),
        waWebhookSecret: finalWebhookSecret,
        waPhoneNumber: phoneNumber,
      },
    });

    console.log(`[WhatsApp] Manual connect successful for business ${req.user.businessId}`);

    res.json({
      success: true,
      data: {
        connected: true,
        phoneNumber,
        phoneNumberId,
        message: 'WhatsApp connected successfully',
      },
    });
  } catch (error: any) {
    console.error('Manual connect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect WhatsApp',
      details: error.message,
    });
  }
});

// Get WhatsApp templates
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business?.waAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    // Decrypt access token before sending to API
    const accessToken = decrypt(business.waAccessToken);

    // Fetch templates from Meta API
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      success: true,
      data: response.data.data || [],
    });
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// ==================== SCHEDULED MESSAGES ====================

// Create a scheduled message
router.post('/schedule', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, phone, type, content, mediaUrl, mediaType, templateName, templateVars, templateLanguage, scheduledAt, timezone } = req.body;

    if (!phone || !scheduledAt) {
      return res.status(400).json({ success: false, error: 'Phone number and scheduled time are required' });
    }

    if (!content && !templateName) {
      return res.status(400).json({ success: false, error: 'Message content or template is required' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
    }

    // Verify contact belongs to business if contactId provided
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, businessId: req.user.businessId },
      });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact not found' });
      }
    }

    const scheduledMessage = await prisma.scheduledMessage.create({
      data: {
        businessId: req.user.businessId,
        contactId: contactId || null,
        phone,
        type: type || 'text',
        content,
        mediaUrl,
        mediaType,
        templateName,
        templateVars,
        templateLanguage,
        scheduledAt: scheduledDate,
        status: 'pending',
      },
      include: { contact: true },
    });

    // Add to BullMQ scheduler queue with delay
    const delay = scheduledDate.getTime() - Date.now();
    const { queues } = await import('../workers/index.js');
    if (queues.whatsappMessages) {
      await queues.whatsappMessages.add(
        'scheduled-message',
        { scheduledMessageId: scheduledMessage.id, businessId: req.user.businessId },
        { delay }
      );
    } else {
      console.warn('[WhatsApp] Redis not available — scheduled message created but not queued');
    }

    res.json({ success: true, data: scheduledMessage });
  } catch (error: any) {
    console.error('Create scheduled message error:', error);
    res.status(500).json({ success: false, error: 'Failed to create scheduled message', details: error.message });
  }
});

// Get all scheduled messages
router.get('/scheduled', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { businessId: req.user.businessId };
    if (status) where.status = status;

    const [messages, total] = await Promise.all([
      prisma.scheduledMessage.findMany({
        where,
        include: { contact: { select: { id: true, name: true, phone: true } } },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.scheduledMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: { messages, pagination: { total, page: Number(page), limit: Number(limit) } },
    });
  } catch (error: any) {
    console.error('Get scheduled messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scheduled messages' });
  }
});

// Cancel a scheduled message
router.patch('/scheduled/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const scheduled = await prisma.scheduledMessage.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!scheduled) {
      return res.status(404).json({ success: false, error: 'Scheduled message not found' });
    }

    if (scheduled.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending messages can be cancelled' });
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'cancelled', updatedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Cancel scheduled message error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel scheduled message' });
  }
});

// Update a scheduled message
router.patch('/scheduled/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, scheduledAt, phone, templateName, templateVars } = req.body;

    const scheduled = await prisma.scheduledMessage.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!scheduled) {
      return res.status(404).json({ success: false, error: 'Scheduled message not found' });
    }

    if (scheduled.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending messages can be updated' });
    }

    if (scheduledAt) {
      const newDate = new Date(scheduledAt);
      if (newDate <= new Date()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
      }
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(phone && { phone }),
        ...(templateName !== undefined && { templateName }),
        ...(templateVars !== undefined && { templateVars }),
        updatedAt: new Date(),
      },
      include: { contact: true },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update scheduled message error:', error);
    res.status(500).json({ success: false, error: 'Failed to update scheduled message' });
  }
});

// Delete a scheduled message
router.delete('/scheduled/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const scheduled = await prisma.scheduledMessage.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!scheduled) {
      return res.status(404).json({ success: false, error: 'Scheduled message not found' });
    }

    if (scheduled.status === 'pending') {
      return res.status(400).json({ success: false, error: 'Cancel the message first before deleting' });
    }

    await prisma.scheduledMessage.delete({ where: { id } });
    res.json({ success: true, message: 'Scheduled message deleted' });
  } catch (error: any) {
    console.error('Delete scheduled message error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete scheduled message' });
  }
});

// Get messages for a specific contact (alias for conversation endpoint)
router.get('/messages/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        businessId: req.user.businessId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        contactId,
        businessId: req.user.businessId,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: Number(limit),
    });

    const total = await prisma.message.count({
      where: {
        contactId,
        businessId: req.user.businessId,
      },
    });

    res.json({
      success: true,
      data: {
        contact,
        messages,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      details: error.message,
    });
  }
});

// Send image message
router.post('/send/image', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, imageUrl, caption, phone } = req.body;

    if (!contactId && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID or phone number is required',
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
      });
    }

    let contact;
    if (contactId) {
      contact = await prisma.contact.findFirst({
        where: { id: contactId, businessId: req.user.businessId },
      });
    } else {
      contact = await prisma.contact.findFirst({
        where: { phone, businessId: req.user.businessId },
      });
    }

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    if (!contact.phone) {
      return res.status(400).json({
        success: false,
        error: 'Contact has no phone number',
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured for this business',
      });
    }

    const accessToken = decrypt(business.waAccessToken);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: contact.phone,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption || '',
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const message = await prisma.message.create({
      data: {
        businessId: req.user.businessId,
        contactId: contact.id,
        direction: 'outbound',
        type: 'image',
        mediaUrl: imageUrl,
        content: caption || '',
        status: 'sent',
        waMessageId: response.data.messages?.[0]?.id,
      },
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Send image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send image',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Create template
router.post('/templates', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, language, components } = req.body;

    if (!name || !category || !language) {
      return res.status(400).json({
        success: false,
        error: 'Name, category, and language are required',
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business?.waAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    const accessToken = decrypt(business.waAccessToken);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/message_templates`,
      {
        name,
        category,
        language,
        components: components || [],
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Delete template
router.delete('/templates/:id', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business?.waAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    const accessToken = decrypt(business.waAccessToken);

    await axios.delete(
      `https://graph.facebook.com/v18.0/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Get auto-replies
router.get('/auto-replies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const autoReplies = await prisma.autoReply.findMany({
      where: {
        businessId: req.user.businessId,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: autoReplies,
    });
  } catch (error: any) {
    console.error('Get auto-replies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch auto-replies',
      details: error.message,
    });
  }
});

// Create auto-reply
router.post('/auto-replies', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, response, isActive = true } = req.body;

    if (!keyword || !response) {
      return res.status(400).json({
        success: false,
        error: 'Keyword and response are required',
      });
    }

    const autoReply = await prisma.autoReply.create({
      data: {
        businessId: req.user.businessId,
        keyword,
        response,
        isActive,
      },
    });

    res.json({
      success: true,
      data: autoReply,
    });
  } catch (error: any) {
    console.error('Create auto-reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create auto-reply',
      details: error.message,
    });
  }
});

// Update auto-reply
router.put('/auto-replies/:id', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { keyword, response, isActive } = req.body;

    const autoReply = await prisma.autoReply.findFirst({
      where: {
        id,
        businessId: req.user.businessId,
      },
    });

    if (!autoReply) {
      return res.status(404).json({
        success: false,
        error: 'Auto-reply not found',
      });
    }

    const updated = await prisma.autoReply.update({
      where: { id },
      data: {
        ...(keyword && { keyword }),
        ...(response && { response }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update auto-reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update auto-reply',
      details: error.message,
    });
  }
});

// Delete auto-reply
router.delete('/auto-replies/:id', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const autoReply = await prisma.autoReply.findFirst({
      where: {
        id,
        businessId: req.user.businessId,
      },
    });

    if (!autoReply) {
      return res.status(404).json({
        success: false,
        error: 'Auto-reply not found',
      });
    }

    await prisma.autoReply.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Auto-reply deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete auto-reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete auto-reply',
      details: error.message,
    });
  }
});

// Anti-blocking helper: sleep with random jitter
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Send broadcast
router.post('/broadcast', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { templateName, languageCode = 'en', components, contactIds, drip } = req.body;

    if (!templateName || !contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: 'Template name and contact IDs are required',
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    const accessToken = decrypt(business.waAccessToken);

    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        businessId: req.user.businessId,
        whatsappOptIn: true,
      },
    });

    // Drip mode settings with defaults
    const dripEnabled = !!drip;
    const minDelay = drip?.minDelay ?? 30;
    const maxDelay = drip?.maxDelay ?? 120;
    const batchSize = drip?.batchSize ?? 10;
    const batchPauseMin = drip?.batchPauseMinutes ?? 5;
    const typingSim = drip?.typingSimulation ?? true;
    const randomJitter = drip?.randomJitter ?? true;
    const maxPerHour = drip?.maxPerHour ?? 50;
    const maxPerDay = drip?.maxPerDay ?? 500;

    const results = [];
    let sentThisHour = 0;
    let hourStart = Date.now();

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      // Rate limit: max per hour
      if (dripEnabled) {
        const elapsed = Date.now() - hourStart;
        if (elapsed >= 3600000) {
          sentThisHour = 0;
          hourStart = Date.now();
        }
        if (sentThisHour >= maxPerHour) {
          console.log(`[Drip] Hourly limit reached (${maxPerHour}). Waiting 60s...`);
          await sleep(60000);
          sentThisHour = 0;
          hourStart = Date.now();
        }

        // Typing simulation delay before each message
        if (typingSim) {
          const typingMs = randomInRange(1500, 4000);
          await sleep(typingMs);
        }

        // Random delay between messages
        let delayMs = randomInRange(minDelay * 1000, maxDelay * 1000);
        if (randomJitter) {
          const jitter = delayMs * 0.3;
          delayMs += randomInRange(-jitter, jitter);
          delayMs = Math.max(5000, delayMs);
        }
        await sleep(delayMs);

        // Batch pause
        if (batchSize > 0 && (i + 1) % batchSize === 0 && i + 1 < contacts.length) {
          console.log(`[Drip] Batch ${Math.floor(i / batchSize) + 1} complete. Pausing ${batchPauseMin}min...`);
          await sleep(batchPauseMin * 60 * 1000);
        }
      }

      try {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: contact.phone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode },
              components: components || [],
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        results.push({
          contactId: contact.id,
          success: true,
          messageId: response.data.messages?.[0]?.id,
        });
        sentThisHour++;
      } catch (err: any) {
        results.push({
          contactId: contact.id,
          success: false,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: contacts.length,
        successful: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        drip: dripEnabled,
        results,
      },
    });
  } catch (error: any) {
    console.error('Send broadcast error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send broadcast',
      details: error.message,
    });
  }
});

// Get WhatsApp contacts
router.get('/contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
      source: 'whatsapp',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts',
      details: error.message,
    });
  }
});

// Get WhatsApp status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        waPhoneNumberId: true,
        waAccessToken: true,
        waWebhookSecret: true,
      },
    });

    const isConnected = !!(business?.waPhoneNumberId && business?.waAccessToken);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        phoneNumberId: business?.waPhoneNumberId || null,
      },
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      details: error.message,
    });
  }
});

// Disconnect WhatsApp
router.post('/disconnect', authenticate, requireBusinessOwner, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        waPhoneNumberId: null,
        waAccessToken: null,
        waWebhookSecret: null,
      },
    });

    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect WhatsApp',
      details: error.message,
    });
  }
});

export default router;
