import { prisma } from '../db.js';
import { AIService } from './ai.service.js';
import { WhatsAppSendRouter } from './whatsapp-send-router.service.js';

interface OutreachParams {
  businessId: string;
  campaignId: string;
  contactId: string;
  messageType?: string;
}

/**
 * Smart send: detects which WhatsApp channel is configured and routes accordingly.
 * Evolution API (QR-based) vs Meta Official API.
 */
async function smartSendText(businessId: string, to: string, message: string, opts?: { messageId?: string }): Promise<any> {
  return await WhatsAppSendRouter.sendTextMessage(businessId, to, message, opts);
}

// Variation seeds — each message gets a different persona so WhatsApp can't detect templates
const VARIATION_SEEDS = [
  'Write as a friendly local who noticed their business while browsing online.',
  'Write as a helpful consultant who specializes in helping small businesses grow digitally.',
  'Write as someone who recently helped a similar business and wanted to share the experience.',
  'Write as a neighbor reaching out with a useful suggestion, not a sales pitch.',
  'Write as a young entrepreneur who genuinely admires their business and wants to help.',
  'Write as a digital marketing enthusiast who spotted a quick win for their business.',
  'Write as a former customer who loved their service and wants to give back.',
  'Write as a local business advisor sharing a free tip.',
  'Write as a friendly freelancer who can help them get more customers online.',
  'Write as a community member who wants to support local businesses.',
  'Write as a tech-savvy friend explaining a simple way to get more leads.',
  'Write as someone who owns a similar business and found what works.',
  'Write as a helpful stranger who saw their Google listing and had an idea.',
  'Write as a local marketing volunteer who helps businesses get discovered.',
  'Write as a peer business owner sharing what worked for you.',
];

const GREETING_VARIATIONS = [
  'Hey {name}!',
  'Hello {name},',
  'Hi {name}!',
  'Hey there {name},',
  'Hi {name}, hope you\'re doing well!',
  'Good morning {name}!',
  'Good afternoon {name}!',
  'Hey {name}, hope business is good!',
  'Hi {name}, quick question —',
  'Hello {name}, just wanted to reach out.',
];

const CTA_VARIATIONS = [
  'Would you be open to a quick chat about this?',
  'Want me to send you some details?',
  'Interested in learning more?',
  'Can I share a quick example of what this looks like?',
  'Would a free demo be helpful?',
  'Want to see how this works for businesses like yours?',
  'Happy to walk you through it — no strings attached.',
  'Should I send you a quick portfolio?',
  'Would you like to see some results from similar businesses?',
  'Let me know if this sounds useful!',
];

export class AiOutreachService {
  static async generatePersonalizedMessage(params: {
    contactId: string;
    businessId: string;
    template?: string;
    businessName?: string;
  }): Promise<string> {
    const { contactId, businessId, template, businessName } = params;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { leadScores: true },
    });
    if (!contact) throw new Error('Contact not found');

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, phone: true },
    });

    const leadData = (contact.leadFinderData as any) || {};
    const gaps = ((contact.leadScores as any)?.reasons?.reasons) || [];

    // Pick random variations so every message is structurally different
    const seed = VARIATION_SEEDS[Math.floor(Math.random() * VARIATION_SEEDS.length)];
    const greeting = GREETING_VARIATIONS[Math.floor(Math.random() * GREETING_VARIATIONS.length)]
      .replace('{name}', contact.name || 'there');
    const cta = CTA_VARIATIONS[Math.floor(Math.random() * CTA_VARIATIONS.length)];

    const prompt = template || `Generate a UNIQUE WhatsApp outreach message for this business lead.

PERSONA: ${seed}

CRITICAL RULES:
- Start EXACTLY with: ${greeting}
- Use DIFFERENT sentence structures — do NOT follow a formula
- Mix up word order, use contractions, sound like a real human
- Mention ONE specific gap: ${gaps.length ? gaps[0] : 'no professional online presence'}
- End with this CTA: ${cta}
- Sign off as: ${business?.name || 'Team'}

Lead info:
- Business: ${contact.name}
- City: ${contact.city || 'Unknown'}
- Missing: ${gaps.length ? gaps.join(', ') : 'No website, limited online presence'}

Our company: ${business?.name || 'We'}

Write the message ONLY. No labels, no quotes, no explanation. Under 120 words. Max 2 emojis.`;

    try {
      const message = await AIService.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.9, // Higher temperature = more variation between messages
      });
      return message.trim();
    } catch {
      // Fallback template with random variations
      return `${greeting}

I came across ${contact.name} while looking at local businesses and noticed ${gaps.length ? `you don't have ${gaps[0].toLowerCase()}` : 'there might be room to grow your online presence'}.

We help businesses like yours get more customers online. Thought it might be worth a quick chat.

${cta}

Best,
${business?.name || 'Team'}`;
    }
  }

  static async generateBulkMessages(params: {
    businessId: string;
    contactIds: string[];
    template?: string;
  }): Promise<{ contactId: string; message: string }[]> {
    const { businessId, contactIds, template } = params;
    const results: { contactId: string; message: string }[] = [];

    for (const contactId of contactIds) {
      try {
        const message = await this.generatePersonalizedMessage({
          contactId,
          businessId,
          template,
        });
        results.push({ contactId, message });
      } catch {
        // Skip failed generations
      }
    }

    return results;
  }

  static async createCampaign(params: {
    businessId: string;
    name: string;
    template: string;
    contactIds: string[];
  }): Promise<any> {
    const { businessId, name, template, contactIds } = params;

    const campaign = await prisma.outreachCampaign.create({
      data: {
        businessId,
        name,
        template,
        status: 'draft',
        totalLeads: contactIds.length,
      },
    });

    // Create outreach logs for each contact
    for (const contactId of contactIds) {
      await prisma.outreachLog.create({
        data: {
          campaignId: campaign.id,
          contactId,
          businessId,
          messageType: 'initial',
          message: '', // Will be generated before sending
          status: 'pending',
        },
      });
    }

    return campaign;
  }

  static async sendMessage(params: OutreachParams): Promise<any> {
    const { businessId, campaignId, contactId, messageType = 'initial' } = params;

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact?.phone) throw new Error('Contact phone not found');

    // Get or generate message
    let outreachLog = await prisma.outreachLog.findFirst({
      where: { campaignId, contactId, messageType },
    });

    if (!outreachLog) throw new Error('Outreach log not found');

    let message = outreachLog.message;
    if (!message) {
      message = await this.generatePersonalizedMessage({
        contactId,
        businessId,
      });
    }

    // Send via WhatsApp (auto-detects Evolution vs Meta)
    const result = await smartSendText(businessId, contact.phone, message);

    // Update outreach log
    await prisma.outreachLog.update({
      where: { id: outreachLog.id },
      data: {
        message,
        status: 'sent',
        sentAt: new Date(),
        whatsappMsgId: result?.messages?.[0]?.id || result?.messageId || null,
      },
    });

    // Update campaign stats
    await prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: { sent: { increment: 1 } },
    });

    return { success: true, messageId: result?.messages?.[0]?.id };
  }

  static async sendBulkMessages(params: {
    businessId: string;
    campaignId: string;
    messageType?: string;
    delayMs?: number;
    maxMessages?: number;
  }): Promise<{ queued: number; errors: number }> {
    const { businessId, campaignId, messageType = 'initial', delayMs = 3000, maxMessages = 30 } = params;

    const pendingLogs = await prisma.outreachLog.findMany({
      where: {
        campaignId,
        messageType,
        status: 'pending',
      },
      include: { contact: true },
      take: Math.min(maxMessages, 50), // Cap at 50 per batch
    });

    let queued = 0;
    let errors = 0;

    for (const log of pendingLogs) {
      try {
        if (!log.contact?.phone) { errors++; continue; }

        await this.sendMessage({
          businessId,
          campaignId,
          contactId: log.contactId,
          messageType,
        });

        queued++;

        // Random delay between 2-4 seconds to avoid WhatsApp spam detection
        if (delayMs > 0) {
          const minDelay = 2000;
          const maxDelay = 4000;
          const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          await new Promise((r) => setTimeout(r, randomDelay));
        }
      } catch {
        errors++;
      }
    }

    return { queued, errors };
  }

  static async getCampaignStats(campaignId: string, businessId?: string): Promise<any> {
    const where: any = { id: campaignId };
    if (businessId) where.businessId = businessId;

    const campaign = await prisma.outreachCampaign.findFirst({
      where,
      include: {
        outreachLogs: {
          select: { status: true, messageType: true, sentAt: true, repliedAt: true },
        },
      },
    });

    if (!campaign) throw new Error('Campaign not found');

    const stats = {
      total: campaign.totalLeads,
      sent: campaign.outreachLogs.filter((l) => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length,
      delivered: campaign.outreachLogs.filter((l) => l.status === 'delivered' || l.status === 'read').length,
      replied: campaign.outreachLogs.filter((l) => l.status === 'replied').length,
      failed: campaign.outreachLogs.filter((l) => l.status === 'failed').length,
      pending: campaign.outreachLogs.filter((l) => l.status === 'pending').length,
      deliveryRate: 0,
      replyRate: 0,
    };

    stats.deliveryRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0;
    stats.replyRate = stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;

    return { campaign, stats };
  }

  static async listCampaigns(businessId: string, limit = 20): Promise<any[]> {
    return prisma.outreachCampaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
