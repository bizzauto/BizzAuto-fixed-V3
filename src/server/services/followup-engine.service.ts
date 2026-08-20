import { prisma } from '../db.js';
import { AIService } from './ai.service.js';
import { WhatsAppSendRouter } from './whatsapp-send-router.service.js';

/**
 * Smart send: detects which WhatsApp channel is configured and routes accordingly.
 */
async function smartSendText(businessId: string, to: string, message: string): Promise<any> {
  return await WhatsAppSendRouter.sendTextMessage(businessId, to, message);
}

interface FollowUpRule {
  delayHours: number;
  maxFollowUps: number;
  templates: string[];
}

const DEFAULT_RULES: FollowUpRule = {
  delayHours: 24,
  maxFollowUps: 3,
  templates: [
    'Hi {name}, just following up on my previous message about helping {business} get online. Would you like to know more?',
    'Hi {name}, I wanted to share that we recently helped a similar business in {city} increase their customers by 40% with a new website. Interested in learning how?',
    'Hi {name}, last message from me! We\'re running a special offer this week — 20% off website development for new clients. Let me know if you\'d like to grab this deal!',
  ],
};

export class FollowUpEngineService {
  static async scheduleFollowUps(params: {
    businessId: string;
    campaignId: string;
    rules?: Partial<FollowUpRule>;
  }): Promise<{ scheduled: number }> {
    const { businessId, campaignId, rules: customRules } = params;
    const rules = { ...DEFAULT_RULES, ...customRules };

    // Find contacts who haven't replied and haven't received max follow-ups
    const unrepliedLogs = await prisma.outreachLog.groupBy({
      by: ['contactId'],
      where: {
        campaignId,
        status: { in: ['sent', 'delivered', 'read'] },
      },
      _count: { id: true },
    });

    let scheduled = 0;

    for (const log of unrepliedLogs) {
      const followUpCount = log._count.id;
      if (followUpCount >= rules.maxFollowUps) continue;

      // Check if contact has replied to any message
      const hasReplied = await prisma.outreachLog.findFirst({
        where: {
          campaignId,
          contactId: log.contactId,
          status: 'replied',
        },
      });

      if (hasReplied) continue;

      // Check if next follow-up is already scheduled
      const nextFollowUpType = `followup_${followUpCount + 1}` as const;
      const alreadyScheduled = await prisma.outreachLog.findFirst({
        where: {
          campaignId,
          contactId: log.contactId,
          messageType: nextFollowUpType,
        },
      });

      if (alreadyScheduled) continue;

      // Get contact info
      const contact = await prisma.contact.findUnique({
        where: { id: log.contactId },
      });

      if (!contact) continue;

      // Generate AI follow-up message
      const template = rules.templates[followUpCount] || rules.templates[rules.templates.length - 1];
      const message = await this.generateFollowUpMessage(contact, template, followUpCount + 1);

      // Create follow-up log (will be sent by worker after delay)
      const maxDelay = 7 * 24 * 60 * 60 * 1000; // 7 days
      const delayMs = Math.min(rules.delayHours * Math.pow(2, followUpCount) * 60 * 60 * 1000, maxDelay);

      await prisma.outreachLog.create({
        data: {
          campaignId,
          contactId: log.contactId,
          businessId,
          messageType: nextFollowUpType,
          message,
          status: 'pending',
        },
      });

      scheduled++;
    }

    return { scheduled };
  }

  static async processFollowUps(businessId: string): Promise<{ sent: number; errors: number }> {
    // Find all pending follow-ups that are ready to send
    const pendingFollowUps = await prisma.outreachLog.findMany({
      where: {
        businessId,
        messageType: { startsWith: 'followup_' },
        status: 'pending',
      },
      include: { contact: true, campaign: true },
      take: 10,
    });

    let sent = 0;
    let errors = 0;

    for (const log of pendingFollowUps) {
      try {
        if (!log.contact?.phone) { errors++; continue; }
        if (log.campaign?.status !== 'active') { errors++; continue; }

        // Send via WhatsApp (auto-detects Evolution vs Meta)
        const result = await smartSendText(businessId, log.contact.phone, log.message);

        await prisma.outreachLog.update({
          where: { id: log.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            whatsappMsgId: result?.messages?.[0]?.id || result?.messageId || null,
          },
        });

        // Update campaign sent count
        await prisma.outreachCampaign.update({
          where: { id: log.campaignId },
          data: { sent: { increment: 1 } },
        });

        sent++;

        // Random delay 2-4 seconds to avoid spam detection
        const randomDelay = Math.floor(Math.random() * 2000) + 2000; // 2000-4000ms
        await new Promise((r) => setTimeout(r, randomDelay));
      } catch {
        errors++;
        await prisma.outreachLog.update({
          where: { id: log.id },
          data: { status: 'failed' },
        });
      }
    }

    return { sent, errors };
  }

  static async handleReply(params: {
    businessId: string;
    contactId: string;
    campaignId: string;
    replyContent: string;
  }): Promise<void> {
    const { businessId, contactId, campaignId, replyContent } = params;

    // Mark all pending follow-ups for this contact as cancelled
    await prisma.outreachLog.updateMany({
      where: {
        campaignId,
        contactId,
        status: 'pending',
      },
      data: { status: 'failed' }, // Using 'failed' to indicate cancelled
    });

    // Mark the replied message
    await prisma.outreachLog.updateMany({
      where: {
        campaignId,
        contactId,
        status: { in: ['sent', 'delivered', 'read'] },
      },
      data: {
        status: 'replied',
        repliedAt: new Date(),
        replyContent,
      },
    });

    // Update campaign replied count
    await prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: { replied: { increment: 1 } },
    });
  }

  private static async generateFollowUpMessage(contact: any, template: string, followUpNumber: number): Promise<string> {
    const business = contact.company || contact.name;
    const city = contact.city || 'your area';

    // Use AI to personalize the template
    try {
      const message = await AIService.generateText(
        `Personalize this follow-up message for a WhatsApp outreach campaign:\n` +
        `Contact: ${contact.name}\n` +
        `Business: ${business}\n` +
        `City: ${city}\n` +
        `Follow-up number: ${followUpNumber}\n` +
        `Template: ${template}\n\n` +
        `Replace {name}, {business}, {city} placeholders. Keep it natural and under 100 words. Return ONLY the message text.`,
        { maxTokens: 200, temperature: 0.7 }
      );
      return message.trim();
    } catch {
      // Fallback: just replace placeholders
      return template
        .replace(/{name}/g, contact.name)
        .replace(/{business}/g, business)
        .replace(/{city}/g, city);
    }
  }
}
