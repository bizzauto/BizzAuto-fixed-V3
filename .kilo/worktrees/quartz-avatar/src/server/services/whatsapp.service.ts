import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { prisma } from '../index.js';
import { decrypt, encrypt } from '../utils/auth.js';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * WhatsApp Service with proxy support and bulk messaging
 */
export class WhatsAppService {
  /**
   * Send text message
   */
  static async sendTextMessage(
    businessId: string,
    to: string,
    message: string,
    options: {
      messageId?: string;
      useProxy?: boolean;
    } = {}
  ): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { waPhoneNumberId: true, waAccessToken: true },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      throw new Error('WhatsApp not configured for this business');
    }

    const accessToken = decrypt(business.waAccessToken);
    const url = `${WHATSAPP_API_BASE}/${business.waPhoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    try {
      const config: any = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      // Use proxy if enabled
      if (options.useProxy) {
        const proxy = await this.getAvailableProxy(businessId);
        if (proxy) {
          config.httpsAgent = new HttpsProxyAgent(proxy.url);
        }
      }

      const response = await axios.post(url, payload, config);

      // Save message to database
      await prisma.message.create({
        data: {
          businessId,
          contactId: options.messageId,
          direction: 'outbound',
          type: 'text',
          content: message,
          waMessageId: response.data.messages?.[0]?.id,
          status: 'sent',
        },
      });

      // Update business stats
      await prisma.business.update({
        where: { id: businessId },
        data: { totalMessages: { increment: 1 } },
      });

      return response.data;
    } catch (error: any) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      
      // Save failed message
      await prisma.message.create({
        data: {
          businessId,
          contactId: options.messageId,
          direction: 'outbound',
          type: 'text',
          content: message,
          status: 'failed',
          error: error.response?.data?.error?.message || error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Send template message
   */
  static async sendTemplate(
    businessId: string,
    to: string,
    templateName: string,
    language: string = 'en',
    variables: any[] = [],
    options: { useProxy?: boolean } = {}
  ): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { waPhoneNumberId: true, waAccessToken: true },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      throw new Error('WhatsApp not configured');
    }

    const accessToken = decrypt(business.waAccessToken);
    const url = `${WHATSAPP_API_BASE}/${business.waPhoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [],
      },
    };

    // Add variables if provided
    if (variables.length > 0) {
      payload.template.components.push({
        type: 'body',
        parameters: variables.map((v) => ({ type: 'text', text: v })),
      });
    }

    try {
      const config: any = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (options.useProxy) {
        const proxy = await this.getAvailableProxy(businessId);
        if (proxy) {
          config.httpsAgent = new HttpsProxyAgent(proxy.url);
        }
      }

      const response = await axios.post(url, payload, config);

      await prisma.message.create({
        data: {
          businessId,
          direction: 'outbound',
          type: 'template',
          content: templateName,
          templateName,
          templateVars: variables,
          templateLanguage: language,
          waMessageId: response.data.messages?.[0]?.id,
          status: 'sent',
        },
      });

      await prisma.business.update({
        where: { id: businessId },
        data: { totalMessages: { increment: 1 } },
      });

      return response.data;
    } catch (error: any) {
      console.error('WhatsApp template send error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send media message
   */
  static async sendMedia(
    businessId: string,
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    options: { useProxy?: boolean } = {}
  ): Promise<any> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { waPhoneNumberId: true, waAccessToken: true },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      throw new Error('WhatsApp not configured');
    }

    const accessToken = decrypt(business.waAccessToken);
    const url = `${WHATSAPP_API_BASE}/${business.waPhoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
        caption,
      },
    };

    try {
      const config: any = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (options.useProxy) {
        const proxy = await this.getAvailableProxy(businessId);
        if (proxy) {
          config.httpsAgent = new HttpsProxyAgent(proxy.url);
        }
      }

      const response = await axios.post(url, payload, config);

      await prisma.message.create({
        data: {
          businessId,
          direction: 'outbound',
          type: mediaType,
          content: caption || '',
          mediaUrl,
          mediaType,
          waMessageId: response.data.messages?.[0]?.id,
          status: 'sent',
        },
      });

      await prisma.business.update({
        where: { id: businessId },
        data: { totalMessages: { increment: 1 } },
      });

      return response.data;
    } catch (error: any) {
      console.error('WhatsApp media send error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Bulk send messages with queue
   */
  static async bulkSend(
    businessId: string,
    messages: Array<{
      to: string;
      type: 'text' | 'template';
      content: string;
      templateName?: string;
      variables?: any[];
      contactId?: string;
    }>,
    options: {
      rateLimit?: number;
      useProxy?: boolean;
      campaignId?: string;
    } = {}
  ): Promise<{ queued: number; estimatedTime: string }> {
    const { rateLimit = 80, useProxy = false, campaignId } = options;

    // Validate rate limit
    if (rateLimit > 100) {
      throw new Error('Rate limit cannot exceed 100 messages/second');
    }

    // Queue messages for background processing
    const queued = await prisma.$transaction(
      messages.map((msg) =>
        prisma.message.create({
          data: {
            businessId,
            contactId: msg.contactId,
            campaignId,
            direction: 'outbound',
            type: msg.type,
            content: msg.content,
            templateName: msg.templateName,
            templateVars: msg.variables,
            status: 'queued',
            metadata: {
              useProxy,
              retryCount: 0,
              queuedAt: new Date().toISOString(),
            },
          },
        })
      )
    );

    // Update campaign stats if applicable
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalSent: { increment: messages.length },
          targetContacts: { increment: messages.length },
        },
      });
    }

    const estimatedSeconds = Math.ceil(messages.length / rateLimit);
    const estimatedTime =
      estimatedSeconds < 60
        ? `${estimatedSeconds}s`
        : `${Math.ceil(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`;

    return { queued: messages.length, estimatedTime };
  }

  /**
   * Get available proxy for business
   */
  private static async getAvailableProxy(
    businessId: string
  ): Promise<{ url: string; id: string } | null> {
    // Check if business has proxy configured
    const integration = await prisma.integration.findFirst({
      where: {
        businessId,
        type: 'proxy',
        isActive: true,
      },
    });

    if (!integration) return null;

    // Proxy URL from config
    return {
      url: (integration.config as any).proxyUrl,
      id: integration.id,
    };
  }

  /**
   * Add proxy for business
   */
  static async addProxy(
    businessId: string,
    proxyConfig: {
      url: string;
      username?: string;
      password?: string;
    }
  ): Promise<any> {
    return prisma.integration.create({
      data: {
        businessId,
        type: 'proxy',
        name: 'WhatsApp Proxy',
        config: proxyConfig as any,
        isActive: true,
      },
    });
  }

  /**
   * Fetch message templates from Meta
   */
  static async getTemplates(businessId: string): Promise<any[]> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { wabaId: true, waAccessToken: true },
    });

    if (!business?.wabaId || !business?.waAccessToken) {
      throw new Error('WhatsApp not configured');
    }

    const accessToken = decrypt(business.waAccessToken);
    const url = `${WHATSAPP_API_BASE}/${business.wabaId}/message_templates`;

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 },
      });

      return response.data.data || [];
    } catch (error: any) {
      console.error('Fetch templates error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Process queued messages
   */
  static async processQueue(limit = 100): Promise<number> {
    const queuedMessages = await prisma.message.findMany({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let processed = 0;

    for (const msg of queuedMessages) {
      try {
        if (msg.type === 'text') {
          await this.sendTextMessage(
            msg.businessId,
            (msg.metadata as any)?.to || '',
            msg.content || '',
            {
              messageId: msg.contactId || undefined,
              useProxy: (msg.metadata as any)?.useProxy || false,
            }
          );
        } else if (msg.type === 'template') {
          await this.sendTemplate(
            msg.businessId,
            (msg.metadata as any)?.to || '',
            msg.templateName || '',
            msg.templateLanguage || 'en',
            msg.templateVars as any[] || [],
            {
              useProxy: (msg.metadata as any)?.useProxy || false,
            }
          );
        }

        await prisma.message.update({
          where: { id: msg.id },
          data: { status: 'sent', statusTimestamp: new Date() },
        });

        processed++;
      } catch (error: any) {
        const metadata = (msg.metadata as any) || {};
        const retryCount = metadata.retryCount || 0;

        if (retryCount < 3) {
          // Retry
          await prisma.message.update({
            where: { id: msg.id },
            data: {
              metadata: {
                ...metadata,
                retryCount: retryCount + 1,
                lastError: error.message,
                lastRetryAt: new Date().toISOString(),
              },
            },
          });
        } else {
          // Mark as failed
          await prisma.message.update({
            where: { id: msg.id },
            data: {
              status: 'failed',
              error: error.message,
              metadata: {
                ...metadata,
                retryCount,
                lastError: error.message,
                failedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    }

    return processed;
  }

  /**
   * Generate QR code for WhatsApp Web login
   */
  static async generateQRCode(businessId: string): Promise<string> {
    // This would integrate with a WhatsApp Web API service
    // For official API, we use OAuth flow instead
    // Implementation depends on your WhatsApp provider
    
    // For now, return placeholder
    return 'qr-code-placeholder';
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expected}`;
  }
}

export default WhatsAppService;
