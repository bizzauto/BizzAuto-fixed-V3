import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireBusinessOwner } from '../middleware/auth.js';
import axios from 'axios';
import { encrypt, decrypt } from '../utils/auth';

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

// WhatsApp webhook endpoint (public)
router.post('/webhook/:businessId', async (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    const body = req.body;

    // Verify webhook
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.waWebhookSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle verification (for Meta webhook setup)
    if (req.query['hub.verify_token']) {
      if (req.query['hub.verify_token'] === business.waWebhookSecret) {
        return res.send(req.query['hub.challenge']);
      }
      return res.status(403).send('Verification failed');
    }

    // Process incoming messages
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        // Find or create contact
        let contact = await prisma.contact.findFirst({
          where: {
            businessId,
            phone: message.from,
          },
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              businessId,
              phone: message.from,
              source: 'whatsapp',
              whatsappOptIn: true,
            },
          });
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
          messageData.content = message.image.caption;
        }

        await prisma.message.create({
          data: messageData,
        });

        // Update contact last activity
        await prisma.contact.update({
          where: { id: contact.id },
          data: { lastMessageAt: new Date() },
        });

        // Check if chatbot should respond
        const chatbotFlow = await prisma.chatbotFlow.findFirst({
          where: {
            businessId,
            isActive: true,
          },
        });

        if (chatbotFlow) {
          // Trigger chatbot response (async)
          // This would be handled by a queue in production
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
router.get('/conversations', authenticate, async (req: any, res: any) => {
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
router.get('/conversation/:contactId', authenticate, async (req: any, res: any) => {
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

// Send text message
router.post('/send/text', authenticate, async (req: any, res: any) => {
  try {
    const { contactId, content } = req.body;

    if (!contactId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID and content are required',
      });
    }

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

    // Decrypt access token before sending to API
    const accessToken = decrypt(business.waAccessToken);

    // Send via WhatsApp API
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: contact.phone,
        type: 'text',
        text: { body: content },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Save message to DB
    const message = await prisma.message.create({
      data: {
        businessId: req.user.businessId,
        contactId,
        direction: 'outbound',
        type: 'text',
        content,
        status: 'sent',
        waMessageId: response.data.messages?.[0]?.id,
      },
    });

    // Update business stats
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { totalMessages: { increment: 1 } },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        businessId: req.user.businessId,
        contactId,
        type: 'whatsapp_sent',
        content,
      },
    });

    res.json({
      success: true,
      data: message,
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

// Send template message
router.post('/send/template', authenticate, async (req: any, res: any) => {
  try {
    const { contactId, templateName, languageCode = 'en', components } = req.body;

    if (!contactId || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID and template name are required',
      });
    }

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
        contactId,
        direction: 'outbound',
        type: 'template',
        templateName,
        templateLanguage: languageCode,
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
router.post('/connect', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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

    // Generate embedded signup URL
    // This would use Meta's Embedded Signup flow
    const signupUrl = `https://developers.facebook.com/dialog/whatsapp_business_api_embedded_signup?app_id=${process.env.META_APP_ID}&redirect_uri=${process.env.WHATSAPP_REDIRECT_URL}`;

    res.json({
      success: true,
      data: {
        signupUrl,
        message: 'Complete the signup flow to connect your WhatsApp Business number',
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

// Get WhatsApp templates
router.get('/templates', authenticate, async (req: any, res: any) => {
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
router.post('/schedule', authenticate, async (req: any, res: any) => {
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
        timezone: timezone || 'Asia/Kolkata',
        status: 'pending',
      },
      include: { contact: true },
    });

    // Add to BullMQ scheduler queue with delay
    const delay = scheduledDate.getTime() - Date.now();
    const { queues } = await import('../workers/index.js');
    await queues.whatsappMessages.add(
      'scheduled-message',
      { scheduledMessageId: scheduledMessage.id, businessId: req.user.businessId },
      { delay }
    );

    res.json({ success: true, data: scheduledMessage });
  } catch (error: any) {
    console.error('Create scheduled message error:', error);
    res.status(500).json({ success: false, error: 'Failed to create scheduled message', details: error.message });
  }
});

// Get all scheduled messages
router.get('/scheduled', authenticate, async (req: any, res: any) => {
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
router.patch('/scheduled/:id/cancel', authenticate, async (req: any, res: any) => {
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
router.patch('/scheduled/:id', authenticate, async (req: any, res: any) => {
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
router.delete('/scheduled/:id', authenticate, async (req: any, res: any) => {
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
router.get('/messages/:contactId', authenticate, async (req: any, res: any) => {
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
router.post('/send/image', authenticate, async (req: any, res: any) => {
  try {
    const { contactId, imageUrl, caption } = req.body;

    if (!contactId || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID and image URL are required',
      });
    }

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
        contactId,
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
router.post('/templates', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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
router.delete('/templates/:id', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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
router.get('/auto-replies', authenticate, async (req: any, res: any) => {
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
router.post('/auto-replies', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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
router.put('/auto-replies/:id', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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
router.delete('/auto-replies/:id', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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

// Send broadcast
router.post('/broadcast', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { templateName, languageCode = 'en', components, contactIds } = req.body;

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

    const results = [];
    for (const contact of contacts) {
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
router.get('/contacts', authenticate, async (req: any, res: any) => {
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
router.get('/status', authenticate, async (req: any, res: any) => {
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
router.post('/disconnect', authenticate, requireBusinessOwner, async (req: any, res: any) => {
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
