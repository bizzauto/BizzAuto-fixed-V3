import { Request, Response } from 'express';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // HTML
  variables: string[]; // {{name}}, {{company}}, etc.
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  recipients: string[]; // Contact IDs
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
}

interface DripSequence {
  id: string;
  name: string;
  trigger: 'signup' | 'purchase' | 'inactivity' | 'custom';
  delayDays: number;
  emails: {
    day: number;
    subject: string;
    body: string;
  }[];
  isActive: boolean;
}

const demoTemplates: EmailTemplate[] = [];

const demoDripSequences: DripSequence[] = [];

export class EmailMarketingService {
  private templates: EmailTemplate[] = demoTemplates;
  private campaigns: EmailCampaign[] = [];
  private dripSequences: DripSequence[] = demoDripSequences;

  // Get all templates
  getTemplates(): EmailTemplate[] {
    return this.templates;
  }

  // Create campaign
  async createCampaign(data: { name: string; subject: string; body: string; recipientIds: string[]; scheduledAt?: string }): Promise<EmailCampaign> {
    const campaign: EmailCampaign = {
      id: `campaign-${Date.now()}`,
      name: data.name,
      subject: data.subject,
      body: data.body,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      recipients: data.recipientIds,
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
      },
    };

    this.campaigns.push(campaign);
    return campaign;
  }

  // Send campaign
  async sendCampaign(campaignId: string): Promise<{ success: boolean; sent: number }> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return { success: false, sent: 0 };
    }

    // Simulate sending
    const sentCount = campaign.recipients.length;
    
    campaign.status = 'sending';
    campaign.stats = {
      sent: sentCount,
      delivered: Math.floor(sentCount * 0.95),
      opened: Math.floor(sentCount * 0.3),
      clicked: Math.floor(sentCount * 0.1),
      bounced: Math.floor(sentCount * 0.05),
    };

    setTimeout(() => {
      campaign.status = 'sent';
    }, 2000);

    return { success: true, sent: sentCount };
  }

  // Get campaigns
  getCampaigns(): EmailCampaign[] {
    return this.campaigns;
  }

  // Get drip sequences
  getDripSequences(): DripSequence[] {
    return this.dripSequences;
  }

  // Create drip sequence
  createDripSequence(data: Partial<DripSequence>): DripSequence {
    const sequence: DripSequence = {
      id: `drip-${Date.now()}`,
      name: data.name || 'New Sequence',
      trigger: data.trigger || 'custom',
      delayDays: data.delayDays || 0,
      emails: data.emails || [],
      isActive: false,
    };
    this.dripSequences.push(sequence);
    return sequence;
  }

  // Send single email (simulated)
  async sendEmail(to: string, subject: string, body: string, variables?: Record<string, string>): Promise<{ success: boolean; messageId: string }> {
    // Replace variables in template
    let processedBody = body;
    let processedSubject = subject;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        processedBody = processedBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
        processedSubject = processedSubject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }

    console.log(`📧 Sending email to ${to}: ${processedSubject}`);

    return {
      success: true,
      messageId: `email-${Date.now()}`,
    };
  }

  // Get email stats
  getStats() {
    const totalSent = this.campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalOpened = this.campaigns.reduce((sum, c) => sum + (c.stats?.opened || 0), 0);
    const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    return {
      totalCampaigns: this.campaigns.length,
      totalSent,
      avgOpenRate: avgOpenRate.toFixed(1) + '%',
      activeDripSequences: this.dripSequences.filter(d => d.isActive).length,
    };
  }
}

export const emailMarketingService = new EmailMarketingService();

// Route handlers
export const getTemplates = (_req: Request, res: Response) => {
  res.json({ success: true, data: emailMarketingService.getTemplates() });
};

export const createCampaign = async (req: Request, res: Response) => {
  const campaign = await emailMarketingService.createCampaign(req.body);
  res.json({ success: true, data: campaign });
};

export const sendCampaign = async (req: Request, res: Response) => {
  const result = await emailMarketingService.sendCampaign(req.body.campaignId);
  res.json(result);
};

export const getCampaigns = (_req: Request, res: Response) => {
  res.json({ success: true, data: emailMarketingService.getCampaigns() });
};

export const getDripSequences = (_req: Request, res: Response) => {
  res.json({ success: true, data: emailMarketingService.getDripSequences() });
};

export const getEmailStats = (_req: Request, res: Response) => {
  res.json({ success: true, data: emailMarketingService.getStats() });
};