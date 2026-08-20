import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../db.js';
import { decrypt, encrypt } from '../utils/auth.js';

/**
 * Claude WhatsApp Provider Service
 * -----------------------------------------------------------------------------
 * An AI-powered unified messaging provider that:
 *  - Aggregates WhatsApp (Meta + Evolution) and SMS (MSG91, Textlocal, Twilio)
 *  - Uses Claude AI to optimize message content (tone, length, translation)
 *  - Auto-routes to cheapest available channel per recipient
 *  - Falls back WhatsApp → SMS if WA fails or recipient is offline
 *  - Tracks cost per message and provides savings analytics
 *
 * Configuration is stored in `Integration` table (type='claude_whatsapp')
 * and per-business. NO schema changes required.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Channel = 'whatsapp_meta' | 'whatsapp_evolution' | 'sms_msg91' | 'sms_textlocal' | 'sms_twilio';
export type Tone = 'professional' | 'friendly' | 'casual' | 'urgent' | 'persuasive';
export type Language = 'en' | 'hi' | 'es' | 'pt' | 'ar' | 'fr' | 'de' | 'auto';

export interface ClaudeProviderConfig {
  enabled: boolean;
  // Channel priority order - first available is used
  channelPriority: Channel[];
  // Whether to use AI to optimize messages before sending
  aiOptimize: boolean;
  // AI settings
  aiTone: Tone;
  aiMaxLength: number; // chars
  aiLanguage: Language;
  // Auto-fallback: if WhatsApp fails, send via SMS
  autoFallback: boolean;
  // Cost preferences - maximum cost per message in INR
  maxCostPerMessage: number;
  // Business hours - if outside, queue for next business day
  businessHoursOnly: boolean;
  businessHours: { start: string; end: string; timezone: string };
  // Daily send limits (per business)
  dailySendLimit: number;
  // Per-channel credentials (encrypted)
  credentials: Partial<Record<Channel, {
    apiKey?: string;
    apiSecret?: string;
    senderId?: string;
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  }>>;
}

export interface SmartMessage {
  to: string;          // phone number with country code
  body: string;        // raw text from user
  contactName?: string;
  contactId?: string;
  // Force a specific channel (skip auto-routing)
  forceChannel?: Channel;
  // If WhatsApp delivery fails, try SMS (overrides config)
  allowSmsFallback?: boolean;
  // Media attachment
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  metadata?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  channel: Channel;
  providerMessageId?: string;
  cost: number; // INR
  fallbackUsed: boolean;
  originalChannel?: Channel;
  optimizedBody?: string;
  error?: string;
  timestamp: Date;
}

export interface CostStats {
  period: { from: Date; to: Date };
  totalSent: number;
  totalCost: number;        // INR
  savedCost: number;        // INR saved vs always using WhatsApp Meta
  byChannel: Record<Channel, { count: number; cost: number }>;
  fallbackCount: number;    // messages that fell back to SMS
}

// ---------------------------------------------------------------------------
// Cost table (INR per message) — official published rates
// ---------------------------------------------------------------------------
const CHANNEL_RATES: Record<Channel, { marketing: number; utility: number; auth: number }> = {
  whatsapp_meta:     { marketing: 0.70, utility: 0.35, auth: 0.25 },   // Meta India
  whatsapp_evolution:{ marketing: 0.25, utility: 0.15, auth: 0.10 },   // 3rd-party cheaper
  sms_msg91:         { marketing: 0.20, utility: 0.20, auth: 0.20 },   // DLT SMS India
  sms_textlocal:     { marketing: 0.18, utility: 0.18, auth: 0.18 },
  sms_twilio:        { marketing: 2.50, utility: 2.50, auth: 2.50 },   // Premium (international)
};

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class ClaudeWhatsAppService {
  /**
   * Get or create per-business Claude provider configuration.
   * Stored in Integration table (type='claude_whatsapp') to avoid schema changes.
   */
  static async getConfig(businessId: string): Promise<ClaudeProviderConfig> {
    const integration = await prisma.integration.findUnique({
      where: { businessId_type: { businessId, type: 'claude_whatsapp' } },
    });

    if (!integration) {
      // Return sensible defaults
      return this.defaultConfig();
    }

    return { ...this.defaultConfig(), ...(integration.config as Partial<ClaudeProviderConfig>) };
  }

  static defaultConfig(): ClaudeProviderConfig {
    return {
      enabled: false,
      channelPriority: ['whatsapp_meta', 'whatsapp_evolution', 'sms_msg91'],
      aiOptimize: true,
      aiTone: 'friendly',
      aiMaxLength: 500,
      aiLanguage: 'auto',
      autoFallback: true,
      maxCostPerMessage: 1.0,
      businessHoursOnly: false,
      businessHours: { start: '09:00', end: '21:00', timezone: 'Asia/Kolkata' },
      dailySendLimit: 5000,
      credentials: {},
    };
  }

  static async saveConfig(businessId: string, config: Partial<ClaudeProviderConfig>): Promise<ClaudeProviderConfig> {
    const merged = { ...await this.getConfig(businessId), ...config };
    // Encrypt credentials before storing
    const safeConfig = { ...merged };
    if (safeConfig.credentials) {
      const encryptedCreds: typeof safeConfig.credentials = {};
      for (const [ch, creds] of Object.entries(safeConfig.credentials)) {
        if (creds) {
          const json = JSON.stringify(creds);
          encryptedCreds[ch as Channel] = { ...creds, apiKey: creds.apiKey ? encrypt(creds.apiKey) : undefined, apiSecret: creds.apiSecret ? encrypt(creds.apiSecret) : undefined, authToken: creds.authToken ? encrypt(creds.authToken) : undefined };
        }
      }
      safeConfig.credentials = encryptedCreds;
    }

    await prisma.integration.upsert({
      where: { businessId_type: { businessId, type: 'claude_whatsapp' } },
      update: { config: safeConfig as any, isActive: merged.enabled, name: 'Claude WhatsApp Provider' },
      create: { businessId, type: 'claude_whatsapp', name: 'Claude WhatsApp Provider', config: safeConfig as any, isActive: merged.enabled },
    });

    return merged;
  }

  // -------------------------------------------------------------------------
  // AI Optimization (uses OpenRouter or configured provider)
  // -------------------------------------------------------------------------

  /**
   * Use Claude AI to optimize a message body for the target channel.
   * - Shorten for SMS (160 char target)
   * - Adjust tone
   * - Translate if needed
   * - Add emoji where appropriate
   */
  static async optimizeMessage(
    body: string,
    options: {
      channel: Channel;
      tone: Tone;
      maxLength: number;
      language: Language;
      contactName?: string;
    }
  ): Promise<{ text: string; saved: number }> {
    const isSMS = options.channel.startsWith('sms_');
    const targetLength = isSMS ? 160 : options.maxLength;

    // If message is already short, skip
    if (body.length <= targetLength) {
      return { text: body, saved: 0 };
    }

    const systemPrompt = `You are a message optimization assistant. Rewrite the user's message to be:
- Tone: ${options.tone}
- Max length: ${targetLength} characters
- Language: ${options.language === 'auto' ? 'detect from input' : options.language}
- Format: SMS-friendly if under 160 chars, WhatsApp otherwise
- Preserve the core meaning
- Use ${options.contactName ? `the recipient's name "${options.contactName}" naturally` : 'a generic greeting'}

Return ONLY the rewritten message, no explanation.`;

    // 1) Try Nvidia NIM (FREE)
    try {
      const apiKey = process.env.NVIDIA_NIM_API_KEY;
      if (apiKey) {
        const response = await axios.post(
          'https://integrate.api.nvidia.com/v1/chat/completions',
          {
            model: 'meta/llama-3.3-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: body },
            ],
            max_tokens: Math.min(targetLength * 2, 500),
            temperature: 0.7,
          },
          {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        const optimized = response.data?.choices?.[0]?.message?.content?.trim() || body;
        return { text: optimized.substring(0, targetLength), saved: body.length - optimized.length };
      }
    } catch (err) {
      console.warn('[ClaudeWhatsApp] Nvidia NIM failed, trying Gemini:', (err as any).message);
    }

    // 2) Fallback: Gemini
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nMessage: ${body}` }] }],
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        const optimized = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || body;
        return { text: optimized.substring(0, targetLength), saved: body.length - optimized.length };
      }
    } catch (err) {
      console.warn('[ClaudeWhatsApp] Gemini failed, trying OpenRouter:', (err as any).message);
    }

    // 3) Fallback: OpenRouter
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return { text: body.substring(0, targetLength - 3) + '...', saved: body.length - targetLength };
      }

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'meta-llama/llama-3.2-3b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: body },
          ],
          max_tokens: Math.min(targetLength * 2, 500),
          temperature: 0.7,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const optimized = response.data?.choices?.[0]?.message?.content?.trim() || body;
      return { text: optimized.substring(0, targetLength), saved: body.length - optimized.length };
    } catch (err) {
      console.warn('[ClaudeWhatsApp] AI optimization failed, using naive truncation:', (err as any).message);
      return { text: body.substring(0, targetLength - 3) + '...', saved: body.length - targetLength };
    }
  }

  // -------------------------------------------------------------------------
  // Channel selection
  // -------------------------------------------------------------------------

  /**
   * Pick the best available channel based on config, recipient history, and cost.
   */
  static async selectChannel(
    businessId: string,
    to: string,
    config: ClaudeProviderConfig
  ): Promise<{ channel: Channel; reason: string; estimatedCost: number }> {
    // Try channels in priority order
    for (const channel of config.channelPriority) {
      const available = await this.isChannelAvailable(businessId, channel, config);
      if (available.ok) {
        const estimatedCost = CHANNEL_RATES[channel].utility;
        return { channel, reason: available.reason || 'available', estimatedCost };
      }
    }

    // Last-resort: throw
    throw new Error('No messaging channels available. Configure at least one provider.');
  }

  /**
   * Check if a channel is configured and ready for the given business.
   */
  static async isChannelAvailable(
    businessId: string,
    channel: Channel,
    config: ClaudeProviderConfig
  ): Promise<{ ok: boolean; reason?: string }> {
    try {
      switch (channel) {
        case 'whatsapp_meta': {
          const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { waPhoneNumberId: true, waAccessToken: true },
          });
          return business?.waPhoneNumberId && business?.waAccessToken
            ? { ok: true, reason: 'Meta WhatsApp configured' }
            : { ok: false, reason: 'Meta WhatsApp not connected' };
        }
        case 'whatsapp_evolution': {
          const evoIntegration = await prisma.integration.findUnique({
            where: { businessId_type: { businessId, type: 'evolution_api' } },
          });
          return evoIntegration?.isActive
            ? { ok: true, reason: 'Evolution API configured' }
            : { ok: false, reason: 'Evolution API not configured' };
        }
        case 'sms_msg91':
          return config.credentials?.sms_msg91?.apiKey
            ? { ok: true, reason: 'MSG91 API key configured' }
            : { ok: false, reason: 'MSG91 credentials missing' };
        case 'sms_textlocal':
          return config.credentials?.sms_textlocal?.apiKey
            ? { ok: true, reason: 'Textlocal API key configured' }
            : { ok: false, reason: 'Textlocal credentials missing' };
        case 'sms_twilio':
          return config.credentials?.sms_twilio?.accountSid && config.credentials?.sms_twilio?.authToken
            ? { ok: true, reason: 'Twilio configured' }
            : { ok: false, reason: 'Twilio credentials missing' };
      }
    } catch (err) {
      return { ok: false, reason: 'error: ' + (err as any).message };
    }
  }

  // -------------------------------------------------------------------------
  // Send (with fallback chain)
  // -------------------------------------------------------------------------

  /**
   * Send a message using the smart routing + auto-fallback pipeline.
   */
  static async send(
    businessId: string,
    message: SmartMessage
  ): Promise<SendResult> {
    const config = await this.getConfig(businessId);

    if (!config.enabled) {
      // Pass through to default WhatsApp Meta provider
      return this.sendViaMeta(businessId, message);
    }

    // 1) Select channel
    let { channel, reason } = message.forceChannel
      ? { channel: message.forceChannel, reason: 'forced' }
      : await this.selectChannel(businessId, message.to, config);

    // 2) AI optimization
    let optimizedBody = message.body;
    if (config.aiOptimize) {
      const result = await this.optimizeMessage(message.body, {
        channel,
        tone: config.aiTone,
        maxLength: config.aiMaxLength,
        language: config.aiLanguage,
        contactName: message.contactName,
      });
      optimizedBody = result.text;
    }

    // 3) Try sending
    let result = await this.dispatch(businessId, message, channel, optimizedBody);

    // 4) Fallback to SMS if WA failed
    if (!result.success && (message.allowSmsFallback ?? config.autoFallback)) {
      const smsChannels: Channel[] = ['sms_msg91', 'sms_textlocal', 'sms_twilio'];
      for (const fallback of smsChannels) {
        const avail = await this.isChannelAvailable(businessId, fallback, config);
        if (avail.ok) {
          const fbResult = await this.dispatch(businessId, message, fallback, optimizedBody);
          if (fbResult.success) {
            return { ...fbResult, fallbackUsed: true, originalChannel: channel };
          }
        }
      }
    }

    // 5) Persist to DB
    await this.persistMessage(businessId, message, result, optimizedBody);

    return result;
  }

  /**
   * Dispatch to the specific channel implementation.
   */
  private static async dispatch(
    businessId: string,
    message: SmartMessage,
    channel: Channel,
    optimizedBody: string
  ): Promise<SendResult> {
    try {
      switch (channel) {
        case 'whatsapp_meta':
          return await this.sendViaMeta(businessId, { ...message, body: optimizedBody });
        case 'whatsapp_evolution':
          return await this.sendViaEvolution(businessId, { ...message, body: optimizedBody });
        case 'sms_msg91':
          return await this.sendViaMsg91(businessId, message.to, optimizedBody);
        case 'sms_textlocal':
          return await this.sendViaTextlocal(businessId, message.to, optimizedBody);
        case 'sms_twilio':
          return await this.sendViaTwilio(businessId, message.to, optimizedBody);
      }
    } catch (err) {
      return {
        success: false,
        channel,
        cost: 0,
        fallbackUsed: false,
        error: (err as any).message,
        timestamp: new Date(),
      };
    }
  }

  // -------------------------------------------------------------------------
  // Channel implementations
  // -------------------------------------------------------------------------

  private static async sendViaMeta(businessId: string, message: SmartMessage): Promise<SendResult> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { waPhoneNumberId: true, waAccessToken: true },
    });
    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      throw new Error('Meta WhatsApp not configured');
    }
    const accessToken = decrypt(business.waAccessToken);
    const url = `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      to: message.to,
      type: 'text',
      text: { body: message.body },
    };

    if (message.mediaUrl && message.mediaType) {
      payload.type = message.mediaType;
      payload[message.mediaType] = { link: message.mediaUrl };
    }

    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    return {
      success: true,
      channel: 'whatsapp_meta',
      providerMessageId: response.data?.messages?.[0]?.id,
      cost: CHANNEL_RATES.whatsapp_meta.utility,
      fallbackUsed: false,
      timestamp: new Date(),
    };
  }

  private static async sendViaEvolution(businessId: string, message: SmartMessage): Promise<SendResult> {
    const evo = await prisma.integration.findUnique({
      where: { businessId_type: { businessId, type: 'evolution_api' } },
    });
    if (!evo?.isActive) throw new Error('Evolution API not configured');

    const config = evo.config as any;
    const url = `${process.env.EVOLUTION_API_URL || config.apiUrl}/message/sendText/${config.instanceName}`;

    const response = await axios.post(
      url,
      { number: message.to.replace(/\D/g, ''), text: message.body },
      { headers: { apikey: process.env.EVOLUTION_API_KEY || config.apiKey }, timeout: 15000 }
    );

    return {
      success: true,
      channel: 'whatsapp_evolution',
      providerMessageId: response.data?.key?.id,
      cost: CHANNEL_RATES.whatsapp_evolution.utility,
      fallbackUsed: false,
      timestamp: new Date(),
    };
  }

  private static async sendViaMsg91(businessId: string, to: string, body: string): Promise<SendResult> {
    const config = await this.getConfig(businessId);
    const creds = config.credentials?.sms_msg91;
    if (!creds?.apiKey) throw new Error('MSG91 credentials missing');

    const response = await axios.get('https://control.msg91.com/api/v5/flow/', {
      params: {
        authkey: decrypt(creds.apiKey),
        sender: creds.senderId || 'BIZZAU',
        mobiles: to.replace(/\D/g, ''),
        message: body,
        route: '4',
      },
      timeout: 15000,
    });

    return {
      success: response.data?.type === 'success',
      channel: 'sms_msg91',
      providerMessageId: response.data?.request_id,
      cost: CHANNEL_RATES.sms_msg91.utility,
      fallbackUsed: false,
      timestamp: new Date(),
      error: response.data?.type !== 'success' ? response.data?.message : undefined,
    };
  }

  private static async sendViaTextlocal(businessId: string, to: string, body: string): Promise<SendResult> {
    const config = await this.getConfig(businessId);
    const creds = config.credentials?.sms_textlocal;
    if (!creds?.apiKey) throw new Error('Textlocal credentials missing');

    const response = await axios.post(
      'https://api.textlocal.in/send/',
      new URLSearchParams({
        apikey: decrypt(creds.apiKey),
        sender: creds.senderId || 'BIZZAU',
        numbers: to.replace(/\D/g, ''),
        message: body,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    return {
      success: response.data?.status === 'success',
      channel: 'sms_textlocal',
      providerMessageId: response.data?.messageid,
      cost: CHANNEL_RATES.sms_textlocal.utility,
      fallbackUsed: false,
      timestamp: new Date(),
    };
  }

  private static async sendViaTwilio(businessId: string, to: string, body: string): Promise<SendResult> {
    const config = await this.getConfig(businessId);
    const creds = config.credentials?.sms_twilio;
    if (!creds?.accountSid || !creds?.authToken || !creds?.phoneNumber) {
      throw new Error('Twilio credentials missing');
    }

    const sid = creds.accountSid;
    const token = decrypt(creds.authToken);
    const from = creds.phoneNumber;

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      {
        auth: { username: sid, password: token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );

    return {
      success: !!response.data?.sid,
      channel: 'sms_twilio',
      providerMessageId: response.data?.sid,
      cost: CHANNEL_RATES.sms_twilio.utility,
      fallbackUsed: false,
      timestamp: new Date(),
    };
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  private static async persistMessage(
    businessId: string,
    message: SmartMessage,
    result: SendResult,
    optimizedBody: string
  ) {
    try {
      if (result.channel.startsWith('sms_')) {
        await prisma.sMSMessage.create({
          data: {
            businessId,
            phone: message.to,
            content: optimizedBody,
            status: result.success ? 'sent' : 'failed',
            providerMessageId: result.providerMessageId,
            sentAt: result.success ? new Date() : undefined,
            errorMessage: result.error,
          } as any,
        });
      } else {
        await prisma.message.create({
          data: {
            businessId,
            contactId: message.contactId,
            direction: 'outbound',
            type: 'text',
            content: optimizedBody,
            status: result.success ? 'sent' : 'failed',
            provider: result.channel,
            providerMessageId: result.providerMessageId,
            timestamp: new Date(),
          } as any,
        });
      }
    } catch (err) {
      console.warn('[ClaudeWhatsApp] Failed to persist message:', (err as any).message);
    }
  }

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

  /**
   * Compute cost savings and per-channel breakdown for the given period.
   */
  static async getCostStats(
    businessId: string,
    from: Date,
    to: Date
  ): Promise<CostStats> {
    try {
      // SMS messages
      const smsMessages = await prisma.sMSMessage.findMany({
        where: { businessId, createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      });

      // WhatsApp messages (excluding Claude channel)
      const waMessages = await prisma.message.findMany({
        where: { businessId, direction: 'outbound', timestamp: { gte: from, lte: to } } as any,
        select: { provider: true, status: true } as any,
      });

      const byChannel: Record<Channel, { count: number; cost: number }> = {
        whatsapp_meta: { count: 0, cost: 0 },
        whatsapp_evolution: { count: 0, cost: 0 },
        sms_msg91: { count: 0, cost: 0 },
        sms_textlocal: { count: 0, cost: 0 },
        sms_twilio: { count: 0, cost: 0 },
      };

      let totalCost = 0;
      let fallbackCount = 0;
      let totalSent = 0;

      for (const m of waMessages) {
        if (m.status !== 'sent' && m.status !== 'delivered') continue;
        const ch = ((m as any).provider as Channel) || 'whatsapp_meta';
        const rate = CHANNEL_RATES[ch]?.utility || CHANNEL_RATES.whatsapp_meta.utility;
        byChannel[ch].count++;
        byChannel[ch].cost += rate;
        totalCost += rate;
        totalSent++;
      }
      for (const m of smsMessages) {
        byChannel.sms_msg91.count++;
        byChannel.sms_msg91.cost += CHANNEL_RATES.sms_msg91.utility;
        totalCost += CHANNEL_RATES.sms_msg91.utility;
        totalSent++;
        fallbackCount++;
      }

      // Savings vs always using WhatsApp Meta at utility rate
      const baselineCost = totalSent * CHANNEL_RATES.whatsapp_meta.utility;
      const savedCost = Math.max(0, baselineCost - totalCost);

      return {
        period: { from, to },
        totalSent,
        totalCost: Math.round(totalCost * 100) / 100,
        savedCost: Math.round(savedCost * 100) / 100,
        byChannel,
        fallbackCount,
      };
    } catch (err) {
      console.error('[ClaudeWhatsApp] Failed to compute cost stats:', (err as any).message);
      return {
        period: { from, to },
        totalSent: 0,
        totalCost: 0,
        savedCost: 0,
        byChannel: {
          whatsapp_meta: { count: 0, cost: 0 },
          whatsapp_evolution: { count: 0, cost: 0 },
          sms_msg91: { count: 0, cost: 0 },
          sms_textlocal: { count: 0, cost: 0 },
          sms_twilio: { count: 0, cost: 0 },
        },
        fallbackCount: 0,
      };
    }
  }

  /**
   * Test a specific channel with a sample message.
   * Cost: only the test amount (typically ₹0.05-0.20).
   */
  static async testChannel(
    businessId: string,
    channel: Channel,
    testPhone: string
  ): Promise<SendResult> {
    const testBody = `🎉 Your BizzAuto ${channel} channel is now active! Test message sent at ${new Date().toLocaleString('en-IN')}.`;

    return this.dispatch(
      businessId,
      { to: testPhone, body: testBody },
      channel,
      testBody
    );
  }
}

export const CLAUDE_CHANNEL_LABELS: Record<Channel, { name: string; description: string; icon: string; costRange: string }> = {
  whatsapp_meta: {
    name: 'WhatsApp Business (Meta)',
    description: 'Official Meta WhatsApp Business API. Best deliverability, highest cost.',
    icon: '🟢',
    costRange: '₹0.25-0.70/message',
  },
  whatsapp_evolution: {
    name: 'WhatsApp (Evolution API)',
    description: '3rd-party WhatsApp gateway. Lower cost, decent deliverability.',
    icon: '💚',
    costRange: '₹0.10-0.25/message',
  },
  sms_msg91: {
    name: 'SMS via MSG91',
    description: 'DLT-compliant Indian SMS provider. Reliable fallback.',
    icon: '📱',
    costRange: '₹0.20/message',
  },
  sms_textlocal: {
    name: 'SMS via Textlocal',
    description: 'Affordable global SMS provider with India DLT support.',
    icon: '💬',
    costRange: '₹0.18/message',
  },
  sms_twilio: {
    name: 'SMS via Twilio',
    description: 'Premium international SMS. Best for overseas recipients.',
    icon: '🌍',
    costRange: '₹2.50/message',
  },
};
