import { prisma } from '../db.js';
import { decrypt } from '../utils/auth.js';
import axios from 'axios';
import { EvolutionApiService } from './evolution.service.js';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

export interface WhatsAppChannel {
  channel: 'meta' | 'evolution' | null;
  businessId: string;
  phoneNumberId?: string;
  instanceName?: string;
  baseUrl?: string;
  accessToken?: string;
  apiKey?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  channel: string;
  error?: string;
}

export interface ChannelResolution {
  channel: 'meta' | 'evolution' | null;
  reason: string;
}

/**
 * WhatsApp Send Router
 * 
 * Centralized router for all outbound WhatsApp messages.
 * Prefers Meta Cloud API if configured, falls back to Evolution API.
 * All user-facing sends MUST go through this service.
 */
export class WhatsAppSendRouter {
  private static channelCache = new Map<string, { channel: WhatsAppChannel; resolvedAt: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Resolve the best available WhatsApp channel for a business
   * Priority: Meta Cloud API (if waPhoneNumberId + waAccessToken set) > Evolution API (if integration exists) > null
   */
  static async resolveChannel(businessId: string): Promise<ChannelResolution> {
    // Check cache first
    const cached = this.channelCache.get(businessId);
    if (cached && Date.now() - cached.resolvedAt < this.CACHE_TTL) {
      return {
        channel: cached.channel.channel,
        reason: 'cached'
      };
    }

    // Check Meta Cloud API config
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        waPhoneNumberId: true,
        waAccessToken: true,
        waPhoneNumber: true,
      }
    });

    if (business?.waPhoneNumberId && business?.waAccessToken) {
      const channel: WhatsAppChannel = {
        channel: 'meta',
        businessId,
        phoneNumberId: business.waPhoneNumberId,
        accessToken: decrypt(business.waAccessToken!),
      };
      
      this.channelCache.set(businessId, { channel, resolvedAt: Date.now() });
      return { channel: 'meta', reason: 'meta_configured' };
    }

    // Check Evolution API config
    try {
      const integration = await prisma.integration.findFirst({
        where: { businessId, type: 'evolution_api', isActive: true },
      });

      if (integration) {
        const config = integration.config as any;
        if (config.baseUrl && config.apiKey && config.instanceName) {
          const channel: WhatsAppChannel = {
            channel: 'evolution',
            businessId,
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            instanceName: config.instanceName,
          };
          
          this.channelCache.set(businessId, { channel, resolvedAt: Date.now() });
          return { channel: 'evolution', reason: 'evolution_configured' };
        }
      }
    } catch (error) {
      console.error('[WhatsAppSendRouter] Error checking Evolution config:', error);
    }

    // Check env fallback for Evolution
    if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
      const channel: WhatsAppChannel = {
        channel: 'evolution',
        businessId,
        baseUrl: process.env.EVOLUTION_API_URL,
        apiKey: process.env.EVOLUTION_API_KEY,
        instanceName: process.env.EVOLUTION_INSTANCE_NAME || `biz_${businessId.slice(-8)}`,
      };
      
      this.channelCache.set(businessId, { channel, resolvedAt: Date.now() });
      return { channel: 'evolution', reason: 'evolution_env_fallback' };
    }

    return { channel: null, reason: 'no_channel_configured' };
  }

  /**
   * Send text message via the best available channel
   */
  static async sendTextMessage(
    businessId: string,
    to: string,
    message: string,
    options: { messageId?: string; useProxy?: boolean } = {}
  ): Promise<SendMessageResult> {
    const resolution = await this.resolveChannel(businessId);
    
    if (!resolution.channel) {
      const error = 'No WhatsApp channel configured for this business';
      console.error(`[WhatsAppSendRouter] ${error} for business ${businessId}`);
      return { success: false, channel: 'none', error };
    }

    try {
      if (resolution.channel === 'meta') {
        return await this.sendViaMeta(businessId, to, message, options);
      } else {
        return await this.sendViaEvolution(businessId, to, message);
      }
    } catch (error: any) {
      console.error(`[WhatsAppSendRouter] Send failed via ${resolution.channel}:`, error.message);
      
      // Try fallback to other channel if available
      const fallbackChannel = resolution.channel === 'meta' ? 'evolution' : 'meta';
      const fallbackResolution = await this.resolveChannel(businessId);
      
      // Only try fallback if it's a different channel
      if (fallbackResolution.channel && fallbackResolution.channel !== resolution.channel) {
        console.log(`[WhatsAppSendRouter] Attempting fallback to ${fallbackChannel}`);
        try {
          if (fallbackChannel === 'meta') {
            return await this.sendViaMeta(businessId, to, message, options);
          } else {
            return await this.sendViaEvolution(businessId, to, message);
          }
        } catch (fallbackError: any) {
          console.error(`[WhatsAppSendRouter] Fallback also failed:`, fallbackError.message);
        }
      }
      
      return { 
        success: false, 
        channel: resolution.channel, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send via Meta Cloud API
   */
  private static async sendViaMeta(
    businessId: string,
    to: string,
    message: string,
    options: { messageId?: string; useProxy?: boolean }
  ): Promise<SendMessageResult> {
    const cached = this.channelCache.get(businessId);
    if (!cached?.channel.phoneNumberId || !cached?.channel.accessToken) {
      throw new Error('Meta channel not properly configured');
    }

    const url = `${WHATSAPP_API_BASE}/${cached.channel.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    const config: any = {
      headers: {
        Authorization: `Bearer ${cached.channel.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (options.useProxy) {
      const proxy = await this.getAvailableProxy(businessId);
      if (proxy) {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
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

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      channel: 'meta',
    };
  }

  /**
   * Send via Evolution API
   */
  private static async sendViaEvolution(
    businessId: string,
    to: string,
    message: string
  ): Promise<SendMessageResult> {
    const result = await EvolutionApiService.sendText(businessId, to, message);
    
    return {
      success: true,
      messageId: result.data?.key?.id,
      channel: 'evolution',
    };
  }

  /**
   * Send template message via the best available channel
   */
  static async sendTemplate(
    businessId: string,
    to: string,
    templateName: string,
    language: string = 'en',
    variables: any[] = [],
    options: { useProxy?: boolean } = {}
  ): Promise<SendMessageResult> {
    const resolution = await this.resolveChannel(businessId);
    
    if (!resolution.channel) {
      const error = 'No WhatsApp channel configured for this business';
      return { success: false, channel: 'none', error };
    }

    try {
      if (resolution.channel === 'meta') {
        return await this.sendTemplateViaMeta(businessId, to, templateName, language, variables, options);
      } else {
        return await this.sendTemplateViaEvolution(businessId, to, templateName, language, variables);
      }
    } catch (error: any) {
      console.error(`[WhatsAppSendRouter] Template send failed via ${resolution.channel}:`, error.message);
      return { 
        success: false, 
        channel: resolution.channel, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send template via Meta Cloud API
   */
  private static async sendTemplateViaMeta(
    businessId: string,
    to: string,
    templateName: string,
    language: string,
    variables: any[],
    options: { useProxy?: boolean }
  ): Promise<SendMessageResult> {
    const cached = this.channelCache.get(businessId);
    if (!cached?.channel.phoneNumberId || !cached?.channel.accessToken) {
      throw new Error('Meta channel not properly configured');
    }

    const url = `${WHATSAPP_API_BASE}/${cached.channel.phoneNumberId}/messages`;
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

    if (variables.length > 0) {
      payload.template.components.push({
        type: 'body',
        parameters: variables.map((v) => ({ type: 'text', text: v })),
      });
    }

    const config: any = {
      headers: {
        Authorization: `Bearer ${cached.channel.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (options.useProxy) {
      const proxy = await this.getAvailableProxy(businessId);
      if (proxy) {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        config.httpsAgent = new HttpsProxyAgent(proxy.url);
      }
    }

    const response = await axios.post(url, payload, config);

    await prisma.message.create({
      data: {
        businessId,
        direction: 'outbound',
        type: 'template',
        content: `Template: ${templateName}`,
        waMessageId: response.data.messages?.[0]?.id,
        status: 'sent',
      },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: { totalMessages: { increment: 1 } },
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      channel: 'meta',
    };
  }

  /**
   * Send template via Evolution API
   */
  private static async sendTemplateViaEvolution(
    businessId: string,
    to: string,
    templateName: string,
    language: string,
    variables: any[]
  ): Promise<SendMessageResult> {
    const config = await EvolutionApiService['getConfig'](businessId);
    const formattedNumber = EvolutionApiService['formatPhone'](to);

    const response = await axios.post(
      `${config.baseUrl}/message/sendTemplate/${config.instanceName}`,
      {
        number: formattedNumber,
        templateName,
        language,
        components: variables.length > 0 ? [{
          type: 'body',
          parameters: variables.map(v => ({ type: 'text', text: v }))
        }] : []
      },
      { headers: { apikey: config.apiKey }, timeout: 15000 }
    );

    return {
      success: true,
      messageId: response.data?.key?.id,
      channel: 'evolution',
    };
  }

  /**
   * Send media message via the best available channel
   */
  static async sendMedia(
    businessId: string,
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    options: { delay?: number } = {}
  ): Promise<SendMessageResult> {
    const resolution = await this.resolveChannel(businessId);
    
    if (!resolution.channel) {
      const error = 'No WhatsApp channel configured for this business';
      return { success: false, channel: 'none', error };
    }

    try {
      if (resolution.channel === 'meta') {
        return await this.sendMediaViaMeta(businessId, to, mediaUrl, mediaType, caption, options);
      } else {
        return await this.sendMediaViaEvolution(businessId, to, mediaUrl, mediaType, caption, options);
      }
    } catch (error: any) {
      console.error(`[WhatsAppSendRouter] Media send failed via ${resolution.channel}:`, error.message);
      return { 
        success: false, 
        channel: resolution.channel, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send media via Meta Cloud API
   */
  private static async sendMediaViaMeta(
    businessId: string,
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    options: { delay?: number } = {}
  ): Promise<SendMessageResult> {
    const cached = this.channelCache.get(businessId);
    if (!cached?.channel.phoneNumberId || !cached?.channel.accessToken) {
      throw new Error('Meta channel not properly configured');
    }

    const url = `${WHATSAPP_API_BASE}/${cached.channel.phoneNumberId}/messages`;
    
    // Meta uses different field names for media types
    const mediaTypeMap: Record<string, string> = {
      image: 'image',
      video: 'video',
      document: 'document',
      audio: 'audio',
    };

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: mediaTypeMap[mediaType],
      [mediaTypeMap[mediaType]]: { link: mediaUrl },
    };

    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      payload[mediaTypeMap[mediaType]].caption = caption;
    }

    const config = {
      headers: {
        Authorization: `Bearer ${cached.channel.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await axios.post(url, payload, config);

    await prisma.message.create({
      data: {
        businessId,
        direction: 'outbound',
        type: mediaType,
        content: caption || `Media: ${mediaType}`,
        waMessageId: response.data.messages?.[0]?.id,
        status: 'sent',
      },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: { totalMessages: { increment: 1 } },
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      channel: 'meta',
    };
  }

  /**
   * Send media via Evolution API
   */
  private static async sendMediaViaEvolution(
    businessId: string,
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document' | 'audio',
    caption?: string,
    options: { delay?: number } = {}
  ): Promise<SendMessageResult> {
    const result = await EvolutionApiService.sendMedia(businessId, to, mediaUrl, mediaType, caption, options);
    
    return {
      success: true,
      messageId: result.data?.key?.id,
      channel: 'evolution',
    };
  }

  /**
   * Get available proxy for business (placeholder - implement as needed)
   */
  private static async getAvailableProxy(businessId: string): Promise<{ url: string } | null> {
    // Implementation depends on your proxy setup
    // Return proxy configuration if available
    return null;
  }

  /**
   * Clear channel cache for a business (call when config changes)
   */
  static clearCache(businessId: string): void {
    this.channelCache.delete(businessId);
  }

  /**
   * Check if business has any WhatsApp channel configured
   */
  static async hasChannel(businessId: string): Promise<boolean> {
    const resolution = await this.resolveChannel(businessId);
    return resolution.channel !== null;
  }

  /**
   * Get current channel info for a business (for status/debugging)
   */
  static async getChannelInfo(businessId: string): Promise<ChannelResolution & { metaConfigured: boolean; evolutionConfigured: boolean }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { waPhoneNumberId: true, waAccessToken: true },
    });

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'evolution_api', isActive: true },
    });

    const resolution = await this.resolveChannel(businessId);

    return {
      ...resolution,
      metaConfigured: !!(business?.waPhoneNumberId && business?.waAccessToken),
      evolutionConfigured: !!(integration?.config && 
        (integration.config as any).baseUrl && 
        (integration.config as any).apiKey && 
        (integration.config as any).instanceName),
    };
  }
}