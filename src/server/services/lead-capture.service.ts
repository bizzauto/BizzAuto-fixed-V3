import axios from 'axios';
import { prisma } from '../db.js';
import { WhatsAppSendRouter } from './whatsapp-send-router.service.js';
import { EmailService } from './email.service.js';
import { handleLeadCapture as triggerLeadWorkflows } from './ai-auto-reply.service.js';

/**
 * Lead Capture Service
 * Handles leads from IndiaMART, JustDial, Facebook Ads, Instagram Ads
 * with auto-reply via WhatsApp and Email
 */
export class LeadCaptureService {
  /**
   * Capture lead from IndiaMART
   */
  static async captureIndiaMARTLead(
    businessId: string,
    leadData: {
      name: string;
      phone: string;
      email?: string;
      company?: string;
      product?: string;
      requirement?: string;
      city?: string;
      state?: string;
    },
    idempotencyKey?: string
  ): Promise<any> {
    // Idempotency: check if this lead was recently captured (within last 5 minutes)
    if (idempotencyKey) {
      const recent = await prisma.activity.findFirst({
        where: {
          businessId,
          type: 'lead_captured',
          metadata: { path: ['idempotencyKey'], equals: idempotencyKey },
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      });
      if (recent) {
        console.log(`[LeadCapture] Duplicate IndiaMART lead ignored: ${idempotencyKey}`);
        return { success: true, duplicate: true };
      }
    }

    // Create or update contact
    const contact = await this.upsertContact(businessId, {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      company: leadData.company,
      source: 'indiamart',
      tags: ['IndiaMART', 'Lead'],
      metadata: {
        product: leadData.product,
        requirement: leadData.requirement,
        city: leadData.city,
        state: leadData.state,
        capturedAt: new Date().toISOString(),
      },
    });

    // Send auto-reply via WhatsApp
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, autoReplyMessage: true, phone: true },
      });

      const welcomeMessage = business?.autoReplyMessage ||
        `Hi ${leadData.name}! 👋\n\nThank you for your inquiry about ${leadData.product || 'our products'} on IndiaMART.\n\nWe've received your requirement and our team will get back to you shortly.\n\nFor immediate assistance, please call us at ${business?.phone || 'our office'}.\n\nBest regards,\n${business?.name || 'Our Team'}`;


      await WhatsAppSendRouter.sendTextMessage(businessId, leadData.phone, welcomeMessage, {
        messageId: contact.id,
      });
    } catch (error: any) {
      console.error('Failed to send WhatsApp welcome message:', error.message);
    }

    // Send email if available
    if (leadData.email) {
      try {
        // Send email using proper signature: sendEmail(to, subject, html)
        await EmailService.sendEmail(
          leadData.email,
          'Thank you for your inquiry',
          `
            <h2>Thank you for contacting us!</h2>
            <p>Dear ${leadData.name},</p>
            <p>We have received your inquiry about <strong>${leadData.product || 'our products'}</strong> on IndiaMART.</p>
            <p>Our team will review your requirement and get back to you within 24 hours.</p>
            <p>Best regards,<br/>Your Business Team</p>
          `
        );
      } catch (error: any) {
        console.error('Failed to send email:', error.message);
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: contact.id,
        type: 'lead_captured',
        title: 'New lead from IndiaMART',
        content: `Product: ${leadData.product}, Requirement: ${leadData.requirement}`,
        metadata: { source: 'indiamart', idempotencyKey, ...leadData },
        createdBy: 'lead_capture_service',
      },
    });

    // Trigger internal workflows (lead_created)
    await triggerLeadWorkflows(businessId, contact.id, 'indiamart', {
      ...leadData,
      contact: { id: contact.id, name: leadData.name, phone: leadData.phone, email: leadData.email, company: leadData.company },
      source: 'indiamart',
      contactId: contact.id,
    });

    // Trigger n8n workflows
    await this.triggerN8nWorkflow(businessId, { ...leadData, source: 'indiamart', contactId: contact.id });

    return contact;
  }

  /**
   * Capture lead from JustDial
   */
  static async captureJustDialLead(
    businessId: string,
    leadData: {
      name: string;
      phone: string;
      email?: string;
      service?: string;
      location?: string;
      message?: string;
    }
  ): Promise<any> {
    const contact = await this.upsertContact(businessId, {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      source: 'justdial',
      tags: ['JustDial', 'Lead'],
      metadata: {
        service: leadData.service,
        location: leadData.location,
        message: leadData.message,
        capturedAt: new Date().toISOString(),
      },
    });

    // Send auto-reply
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, autoReplyMessage: true },
      });

      const welcomeMessage = business?.autoReplyMessage ||
        `Hi ${leadData.name}! 👋\n\nThank you for finding us on JustDial.\n\nWe've received your query about ${leadData.service || 'our services'} and will contact you soon.\n\nBest regards,\n${business?.name || 'Our Team'}`;

      await WhatsAppSendRouter.sendTextMessage(businessId, leadData.phone, welcomeMessage, {
        messageId: contact.id,
      });
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error.message);
    }

    await prisma.activity.create({
      data: {
        businessId,
        contactId: contact.id,
        type: 'lead_captured',
        title: 'New lead from JustDial',
        content: `Service: ${leadData.service}, Location: ${leadData.location}`,
        metadata: { source: 'justdial', ...leadData },
        createdBy: 'lead_capture_service',
      },
    });

    // Trigger internal workflows
    await triggerLeadWorkflows(businessId, contact.id, 'justdial', {
      ...leadData,
      contact: { id: contact.id, name: leadData.name, phone: leadData.phone, email: leadData.email },
      source: 'justdial',
      contactId: contact.id,
    });

    return contact;
  }

  /**
   * Capture lead from Facebook Ads
   */
  static async captureFacebookLead(
    businessId: string,
    leadData: {
      name: string;
      phone?: string;
      email?: string;
      formId?: string;
      adId?: string;
      campaignId?: string;
      customFields?: any;
    }
  ): Promise<any> {
    const contact = await this.upsertContact(businessId, {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      source: 'facebook_ads',
      tags: ['Facebook', 'Lead', 'Paid Ad'],
      metadata: {
        formId: leadData.formId,
        adId: leadData.adId,
        campaignId: leadData.campaignId,
        customFields: leadData.customFields,
        capturedAt: new Date().toISOString(),
      },
    });

    // Send WhatsApp if phone available
    if (leadData.phone) {
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { name: true, autoReplyMessage: true },
        });

        const welcomeMessage = business?.autoReplyMessage ||
          `Hi ${leadData.name}! 👋\n\nThanks for your interest! We received your inquiry from our Facebook ad.\n\nOur team will contact you shortly.\n\nBest regards,\n${business?.name || 'Our Team'}`;

        await WhatsAppSendRouter.sendTextMessage(businessId, leadData.phone, welcomeMessage, {
          messageId: contact.id,
        });
      } catch (error: any) {
        console.error('Failed to send WhatsApp:', error.message);
      }
    }

    await prisma.activity.create({
      data: {
        businessId,
        contactId: contact.id,
        type: 'lead_captured',
        title: 'New lead from Facebook Ads',
        content: `Form: ${leadData.formId}, Campaign: ${leadData.campaignId}`,
        metadata: { source: 'facebook_ads', ...leadData },
        createdBy: 'lead_capture_service',
      },
    });

    // Trigger internal workflows
    await triggerLeadWorkflows(businessId, contact.id, 'facebook_ads', {
      ...leadData,
      contact: { id: contact.id, name: leadData.name, phone: leadData.phone, email: leadData.email },
      source: 'facebook_ads',
      contactId: contact.id,
    });

    return contact;
  }

  /**
   * Capture lead from Instagram Ads
   */
  static async captureInstagramLead(
    businessId: string,
    leadData: {
      name: string;
      phone?: string;
      email?: string;
      username?: string;
      formId?: string;
      adId?: string;
    }
  ): Promise<any> {
    const contact = await this.upsertContact(businessId, {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      source: 'instagram_ads',
      tags: ['Instagram', 'Lead', 'Paid Ad'],
      metadata: {
        username: leadData.username,
        formId: leadData.formId,
        adId: leadData.adId,
        capturedAt: new Date().toISOString(),
      },
    });

    // Send WhatsApp if phone available
    if (leadData.phone) {
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { name: true, autoReplyMessage: true },
        });

        const welcomeMessage = business?.autoReplyMessage ||
          `Hi ${leadData.name}! 👋\n\nThanks for your interest from our Instagram ad!\n\nWe'll get back to you soon.\n\nBest regards,\n${business?.name || 'Our Team'}`;

        await WhatsAppSendRouter.sendTextMessage(businessId, leadData.phone, welcomeMessage, {
          messageId: contact.id,
        });
      } catch (error: any) {
        console.error('Failed to send WhatsApp:', error.message);
      }
    }

    await prisma.activity.create({
      data: {
        businessId,
        contactId: contact.id,
        type: 'lead_captured',
        title: 'New lead from Instagram Ads',
        content: `Form: ${leadData.formId}, Username: ${leadData.username}`,
        metadata: { source: 'instagram_ads', ...leadData },
        createdBy: 'lead_capture_service',
      },
    });

    // Trigger internal workflows
    await triggerLeadWorkflows(businessId, contact.id, 'instagram_ads', {
      ...leadData,
      contact: { id: contact.id, name: leadData.name, phone: leadData.phone, email: leadData.email },
      source: 'instagram_ads',
      contactId: contact.id,
    });

    return contact;
  }

  /**
   * Upsert contact (create or update)
   */
  static async upsertContact(
    businessId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      company?: string;
      source: string;
      tags: string[];
      metadata?: any;
    }
  ): Promise<any> {
    // Try to find existing contact by phone or email
    let contact = null;

    if (data.phone) {
      contact = await prisma.contact.findUnique({
        where: {
          businessId_phone: {
            phone: data.phone,
            businessId,
          },
        },
      });
    }

    if (!contact && data.email) {
      contact = await prisma.contact.findFirst({
        where: {
          email: data.email,
          businessId,
        },
      });
    }

    if (contact) {
      // Update existing contact
      const existingTags = contact.tags || [];
      const newTags = [...new Set([...existingTags, ...data.tags])];

      return prisma.contact.update({
        where: { id: contact.id },
        data: {
          name: data.name || contact.name,
          phone: data.phone || contact.phone,
          email: data.email || contact.email,
          company: data.company || contact.company,
          tags: newTags,
          source: data.source,
          lastActivity: new Date(),
          metadata: {
            ...(contact.metadata as any),
            ...data.metadata,
          },
        },
      });
    }

    // Create new contact
    return prisma.contact.create({
      data: {
        businessId,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        company: data.company,
        source: data.source,
        tags: data.tags,
        lastActivity: new Date(),
        metadata: data.metadata,
        whatsappOptIn: true,
        emailOptIn: !!data.email,
      },
    });
  }

  /**
   * Setup webhook for IndiaMART
   */
  static async setupIndiaMARTWebhook(
    businessId: string,
    webhookUrl: string
  ): Promise<string> {
    // Return webhook URL for IndiaMART to POST to
    return `${process.env.BASE_URL || 'http://localhost:4000'}/api/leads/indiamart/${businessId}`;
  }

  /**
   * Setup Facebook Lead Ads webhook
   */
  static async setupFacebookWebhook(
    businessId: string
  ): Promise<string> {
    return `${process.env.BASE_URL || 'http://localhost:4000'}/api/leads/facebook/${businessId}`;
  }

  /**
   * Auto-assign lead to sales rep
   */
  static async autoAssignLead(
    businessId: string,
    contactId: string,
    rules: {
      roundRobin?: boolean;
      byLocation?: boolean;
      byProduct?: boolean;
    } = {}
  ): Promise<string | null> {
    // Get team members
    const users = await prisma.user.findMany({
      where: { businessId, role: { in: ['ADMIN', 'MEMBER'] } },
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) return null;

    // Round robin assignment (simplified)
    if (rules.roundRobin) {
      const recentAssignments = await prisma.activity.findMany({
        where: { businessId, type: 'lead_assigned' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      const lastAssignedUserId = recentAssignments[0]?.createdBy;
      const lastIndex = users.findIndex((u) => u.id === lastAssignedUserId);
      const nextUser = users[(lastIndex + 1) % users.length];

      return nextUser.id;
    }

    // Default: assign to first admin
    return users[0].id;
  }

  /**
   * Trigger n8n workflow for new lead
   */
  static async triggerN8nWorkflow(businessId: string, leadData: any): Promise<void> {
    try {
      const n8nUrl = process.env.N8N_URL;
      if (!n8nUrl) return; // n8n not configured

      // Find active automation rules that trigger on lead capture
      const rules = await prisma.chatbotFlow.findMany({
        where: {
          businessId,
          isActive: true,
          trigger: 'new_lead',
        },
      });

      for (const rule of rules) {
        if ((rule as any).n8nWorkflowId) {
          try {
            await axios.post(`${n8nUrl}/webhook/${(rule as any).n8nWorkflowId}`, {
              event: 'new_lead',
              businessId,
              lead: leadData,
              timestamp: new Date().toISOString(),
            }, { timeout: 10000 });
            console.log(`[N8N] Triggered workflow ${(rule as any).n8nWorkflowId} for lead`);
          } catch (e: any) {
            console.error(`[N8N] Failed to trigger workflow:`, e.message);
          }
        }
      }
    } catch (error: any) {
      console.error(`[N8N] Error triggering workflows:`, error.message);
    }
  }
}

export default LeadCaptureService;
