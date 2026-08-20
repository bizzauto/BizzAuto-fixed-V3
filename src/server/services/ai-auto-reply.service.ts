import { prisma } from '../db.js';
import { triggerWorkflows } from './workflow-execution.service.js';
import { WhatsAppSendRouter } from './whatsapp-send-router.service.js';

const autoReplyRateMap = new Map<string, number[]>();

interface AutoReplyResult {
  replied: boolean;
  response?: string;
  channel?: string;
  error?: string;
  workflowTriggered?: boolean;
}

// Main entry: handle incoming message with AI auto-reply + workflow triggers
export async function handleIncomingMessage(
  businessId: string,
  senderPhone: string,
  messageText: string,
  messageId?: string,
  metadata?: Record<string, any>
): Promise<AutoReplyResult> {
  const result: AutoReplyResult = { replied: false, workflowTriggered: false };

  if (metadata?.autoReply) {
    return result;
  }

  const rateKey = `${businessId}:${senderPhone}`;
  const now = Date.now();
  const recentReplies = autoReplyRateMap.get(rateKey) || [];
  const recentHour = recentReplies.filter((t) => now - t < 3600000);
  if (recentHour.length >= 5) {
    result.error = 'Auto-reply rate limit exceeded for this contact';
    return result;
  }

  try {
    // Find or create contact
    const normalizedPhone = senderPhone.replace(/\D/g, '');
    let contact = await prisma.contact.findFirst({
      where: {
        businessId,
        phone: { contains: normalizedPhone.slice(-10) },
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          businessId,
          phone: senderPhone,
          name: `Customer ${normalizedPhone.slice(-4)}`,
          source: 'whatsapp',
          status: 'lead',
          tags: ['auto-captured'],
        },
      });
    }

    // Store inbound message
    await prisma.message.create({
      data: {
        businessId,
        contactId: contact.id,
        direction: 'inbound',
        type: 'text',
        content: messageText,
        status: 'received',
        waMessageId: messageId || undefined,
        metadata: { phone: senderPhone },
      },
    });

    // Update contact activity
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date(), lastActivity: new Date() },
    });

    // 1. Check if autopilot is enabled
    const autopilot = await prisma.autopilotSettings.findFirst({
      where: { businessId },
    });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { autoReplyEnabled: true, autoReplyMessage: true, name: true },
    });

    // 2. Check keyword-based auto-replies first
    const keywordReply = await prisma.autoReply.findFirst({
      where: {
        businessId,
        isActive: true,
        keyword: {
          path: '$',
          array_contains: messageText.toLowerCase(),
        } as any,
      },
    });

    if (keywordReply) {
      await sendAutoReply(businessId, senderPhone, keywordReply.response, contact.id);
      result.replied = true;
      result.response = keywordReply.response;
      result.channel = 'keyword';
      const timestamps = autoReplyRateMap.get(rateKey) || [];
      timestamps.push(Date.now());
      autoReplyRateMap.set(rateKey, timestamps.filter((t) => Date.now() - t < 3600000));
      return result;
    }

    // 3. Check business hours
    if (autopilot?.businessHoursOnly) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 9 || hour >= 18) {
        // Outside business hours — send scheduled response
        if (autopilot.welcomeMessage) {
          const afterHoursMsg = `Thanks for reaching out! Our business hours are 9 AM - 6 PM. We'll get back to you soon.\n\n${autopilot.welcomeMessage}`;
          await sendAutoReply(businessId, senderPhone, afterHoursMsg, contact.id);
          result.replied = true;
          result.response = afterHoursMsg;
          result.channel = 'after_hours';
          const timestamps = autoReplyRateMap.get(rateKey) || [];
          timestamps.push(Date.now());
          autoReplyRateMap.set(rateKey, timestamps.filter((t) => Date.now() - t < 3600000));
        }
        return result;
      }
    }

    // 4. AI auto-reply if enabled
    const shouldUseAI = autopilot?.aiEnabled !== false && business?.autoReplyEnabled !== false;

    if (shouldUseAI) {
      const aiResponse = await generateAIResponse(businessId, contact, messageText, autopilot);

      if (aiResponse) {
        await sendAutoReply(businessId, senderPhone, aiResponse, contact.id);
        result.replied = true;
        result.response = aiResponse;
        result.channel = 'ai';
      }
    } else if (business?.autoReplyEnabled && business?.autoReplyMessage) {
      // Static auto-reply
      const reply = business.autoReplyMessage
        .replace(/{{name}}/g, contact.name || 'Customer')
        .replace(/{{business}}/g, business.name || 'Business');
      await sendAutoReply(businessId, senderPhone, reply, contact.id);
      result.replied = true;
      result.response = reply;
      result.channel = 'static';
    }

    // 5. Trigger workflows
    try {
      const conversationHistory = await prisma.message.findMany({
        where: { contactId: contact.id, businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { direction: true, content: true, createdAt: true },
      });

      const triggerData = {
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          source: contact.source,
          tags: contact.tags,
        },
        message: messageText,
        phone: senderPhone,
        contactId: contact.id,
        messageId,
        conversationHistory: conversationHistory.reverse().map((m) => ({
          role: m.direction === 'inbound' ? 'user' : 'assistant',
          content: m.content || '',
        })),
      };

      const workflowResults = await triggerWorkflows(businessId, 'message_received', triggerData);
      result.workflowTriggered = workflowResults.length > 0;
    } catch (err: any) {
      console.error('[AutoReply] Workflow trigger failed:', err.message);
    }

    if (result.replied) {
      const timestamps = autoReplyRateMap.get(rateKey) || [];
      timestamps.push(Date.now());
      autoReplyRateMap.set(rateKey, timestamps.filter((t) => Date.now() - t < 3600000));
    }

    return result;
  } catch (err: any) {
    console.error('[AutoReply] Error:', err.message);
    result.error = err.message;
    return result;
  }
}

// Generate AI response using the business's AI service
async function generateAIResponse(
  businessId: string,
  contact: any,
  messageText: string,
  autopilot: any
): Promise<string | null> {
  try {
    const { AIService } = await import('./ai.service.js');

    const hasCredits = await AIService.checkCredits(businessId);
    if (!hasCredits) {
      return 'Thank you for your message. Our team will get back to you shortly.';
    }
    await AIService.useCredit(businessId, 1);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const tone = autopilot?.aiTone || 'professional';
    const language = autopilot?.aiLanguage || 'english';

    const systemPrompt =
      `You are a ${tone} customer service representative for ${business?.name || 'this business'}. ` +
      `Reply in ${language}. ` +
      `Keep your response under 250 characters (WhatsApp friendly). ` +
      `Do NOT use markdown formatting. Be helpful, concise, and natural. ` +
      `If you don't know something, say you'll connect them with the team.`;

    // Get recent conversation context
    const recentMessages = await prisma.message.findMany({
      where: { contactId: contact.id, businessId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { direction: true, content: true },
    });

    const conversationContext = recentMessages.reverse().map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content || '',
    }));

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationContext.slice(0, -1), // exclude current message
      { role: 'user' as const, content: messageText },
    ];

    const response = await (AIService as any).generateText(messages, { maxTokens: 300 });
    return response;
  } catch (err: any) {
    console.error('[AutoReply] AI generation failed:', err.message);
    return null;
  }
}

// Send auto-reply via WhatsApp
async function sendAutoReply(
  businessId: string,
  to: string,
  message: string,
  contactId: string
): Promise<boolean> {
  try {
    const result = await WhatsAppSendRouter.sendTextMessage(businessId, to, message, { messageId: contactId });
    return result.success;
  } catch (err: any) {
    console.error('[AutoReply] Send failed:', err.message);
    return false;
  }
}

// Handle lead capture events — trigger workflows + optional auto-reply
export async function handleLeadCapture(
  businessId: string,
  contactId: string,
  source: string,
  leadData: Record<string, any>
): Promise<void> {
  try {
    // Trigger lead_created workflows
    await triggerWorkflows(businessId, 'lead_created', {
      contact: leadData,
      contactId,
      source,
      ...leadData,
    });

    // Send welcome message if phone available
    const autopilot = await prisma.autopilotSettings.findFirst({ where: { businessId } });
    if (autopilot?.welcomeMessage && leadData.phone) {
      const welcomeMsg = autopilot.welcomeMessage
        .replace(/{{name}}/g, leadData.name || 'there')
        .replace(/{{business}}/g, (await prisma.business.findUnique({ where: { id: businessId } }))?.name || '');

      await sendAutoReply(businessId, leadData.phone, welcomeMsg, contactId);
    }
  } catch (err: any) {
    console.error('[LeadCapture] Workflow trigger failed:', err.message);
  }
}
