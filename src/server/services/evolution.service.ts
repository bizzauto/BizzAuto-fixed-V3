import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { circuitBreaker } from '../services/circuit-breaker.service.js';

/**
 * Evolution API Service
 * 
 * Integrates with Evolution API (https://github.com/EvolutionAPI/evolution-api)
 * for WhatsApp Web-based messaging via QR code scanning.
 * 
 * Supports: Instance management, QR code, send text/media/template,
 * webhook events, group management, profile settings.
 */
export class EvolutionApiService {
  /**
   * Get Evolution API config for a business
   */
  private static async getConfig(businessId: string): Promise<{
    baseUrl: string;
    apiKey: string;
    instanceName: string;
  }> {
    // First, try to get config from database (user-configured via UI)
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'evolution_api', isActive: true },
    });

    if (integration) {
      const config = integration.config as any;
      return {
        baseUrl: config.baseUrl || '',
        apiKey: config.apiKey || '',
        instanceName: config.instanceName || `biz_${businessId.slice(-8)}`,
      };
    }

    // FALLBACK: Read from environment variables as system default
    const envBaseUrl = process.env.EVOLUTION_API_URL;
    const envApiKey = process.env.EVOLUTION_API_KEY;
    const envInstanceName = process.env.EVOLUTION_INSTANCE_NAME;

    if (envBaseUrl && envApiKey) {
      return {
        baseUrl: envBaseUrl,
        apiKey: envApiKey,
        instanceName: envInstanceName || `biz_${businessId.slice(-8)}`,
      };
    }

    throw new Error('Evolution API not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY in .env or configure via UI.');
  }

  /**
   * Create a new Evolution API instance
   */
  static async createInstance(businessId: string, options: {
    baseUrl?: string;
    apiKey?: string;
    instanceName?: string;
    webhookUrl?: string;
    phone?: string;
  }): Promise<any> {
    if (!options.baseUrl || !options.apiKey) {
      const internalConfig = await this.getConfig(businessId);
      options.baseUrl = options.baseUrl || internalConfig.baseUrl;
      options.apiKey = options.apiKey || internalConfig.apiKey;
      options.instanceName = options.instanceName || internalConfig.instanceName;
    }
    const instanceName = options.instanceName || `biz_${businessId.slice(-8)}`;
    const phone = options.phone || '919999999999';

    try {
      const response = await axios.post(
        `${options.baseUrl}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          number: phone,
          rejectCall: false,
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: true,
          readStatus: true,
          syncFullHistory: false,
          webhook: options.webhookUrl ? {
            url: options.webhookUrl,
            webhookByEvents: true,
            events: [
              'QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT',
              'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONTACTS_UPSERT',
              'CHATS_UPSERT', 'CHATS_UPDATE', 'PRESENCE_UPDATE',
              'GROUPS_UPSERT', 'GROUP_UPDATE', 'GROUP_PARTICIPANTS_UPDATE',
            ],
          } : undefined,
        },
        {
          headers: { 'Content-Type': 'application/json', apikey: options.apiKey },
        }
      );

      await prisma.integration.upsert({
        where: { id: `evo_${businessId}` },
        create: {
          id: `evo_${businessId}`,
          businessId,
          type: 'evolution_api',
          name: 'Evolution API',
          config: {
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            instanceName,
            instanceId: response.data.instance?.id || '',
            status: 'created',
          },
          isActive: true,
        },
        update: {
          config: {
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            instanceName,
            instanceId: response.data.instance?.id || '',
            status: 'created',
          },
          isActive: true,
        },
      });

      return response.data;
    } catch (error: any) {
      const isAlreadyExists = error.response?.status === 403 && 
        (error.response?.data?.response?.message?.[0]?.includes('already in use') 
         || error.response?.data?.error === 'Forbidden');

      if (isAlreadyExists) {
        console.log('Evolution API instance already exists, saving config...');
        await prisma.integration.upsert({
          where: { id: `evo_${businessId}` },
          create: {
            id: `evo_${businessId}`,
            businessId,
            type: 'evolution_api',
            name: 'Evolution API',
            config: {
              baseUrl: options.baseUrl, apiKey: options.apiKey,
              instanceName, instanceId: '', status: 'exists',
            },
            isActive: true,
          },
          update: {
            config: {
              baseUrl: options.baseUrl, apiKey: options.apiKey,
              instanceName, instanceId: '', status: 'exists',
            },
            isActive: true,
          },
        });
        return { success: true, message: 'Instance already exists', instanceName };
      }

      console.error('Evolution API create instance error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create Evolution API instance');
    }
  }

  /**
   * Extract QR code data from an Evolution API response.
   */
  private static extractQR(d: any): string {
    if (typeof d === 'string') return d;
    if (d?.base64) return d.base64;
    if (d?.qrcode?.base64Image) return d.qrcode.base64Image;
    if (d?.qrcode?.code) return d.qrcode.code;
    if (d?.code) return d.code;
    if (d?.pairingCode) return d.pairingCode;
    return '';
  }

  /**
   * Connect to Evolution API and get QR code.
   * 
   * Strategy (Evolution API v2 compatible):
   * 1. Delete any existing instance (cleanup, suppress errors)
   * 2. Wait 3 seconds for cleanup to propagate
   * 3. Create a fresh instance via POST /instance/create
   * 4. Wait 2 seconds for instance to initialize
   * 5. Get QR code via GET /instance/connect/:name (with retries)
   * 6. If connect returns no QR, try /instance/qrcode/:name as fallback
   * 
   * Accepts optional instanceName from frontend; falls back to configured name.
   */
  static async connectInstance(businessId: string, instanceName?: string, phone?: string): Promise<{
    qrCode: string;
    qrCodeBase64?: string;
    status: string;
  }> {
    const config = await this.getConfig(businessId);
    const resolvedInstanceName = instanceName || config.instanceName;

    // Resolve phone number: explicit param > existing Integration config > default placeholder
    let resolvedPhone = phone || '';
    if (!resolvedPhone) {
      try {
        const existingIntegration = await prisma.integration.findFirst({
          where: { businessId, type: 'evolution_api' },
        });
        if (existingIntegration) {
          const existingConfig = existingIntegration.config as any;
          resolvedPhone = existingConfig.phone || '';
        }
      } catch {}
    }
    if (!resolvedPhone) {
      resolvedPhone = '919999999999'; // placeholder — user should update in settings
    }

    console.log(`[Evolution] === Starting connect for: ${resolvedInstanceName} ===`);

    // Step 1: Delete any existing instance (cleanup, suppress errors)
    try {
      await axios.delete(
        `${config.baseUrl}/instance/delete/${resolvedInstanceName}`,
        { headers: { apikey: config.apiKey }, timeout: 10000 }
      );
      console.log(`[Evolution] Deleted existing instance: ${resolvedInstanceName}`);
    } catch (e: any) {
      console.log(`[Evolution] Delete ${resolvedInstanceName} (may not exist): ${e?.response?.status || e.message}`);
    }

    // Also clean up any OTHER stale instances for this business
    try {
      const allInstances = await axios.get(
        `${config.baseUrl}/instance/fetchInstances`,
        { headers: { apikey: config.apiKey }, timeout: 10000 }
      );
      const staleInstances = (allInstances.data || []).filter((inst: any) => 
        inst.name !== resolvedInstanceName && 
        inst.connectionStatus !== 'open' &&
        inst._count?.Message === 0
      );
      for (const stale of staleInstances.slice(0, 5)) {
        try {
          await axios.delete(
            `${config.baseUrl}/instance/delete/${stale.name}`,
            { headers: { apikey: config.apiKey }, timeout: 5000 }
          );
          console.log(`[Evolution] Cleaned stale instance: ${stale.name}`);
        } catch {}
      }
    } catch {}

    // Step 2: Wait 3 seconds for cleanup to propagate
    console.log('[Evolution] Waiting 3s for cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Create fresh instance
    console.log(`[Evolution] Creating instance: ${resolvedInstanceName}`);
    let createResult: any;
    try {
      createResult = await axios.post(
        `${config.baseUrl}/instance/create`,
        {
          instanceName: resolvedInstanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          number: resolvedPhone,
          rejectCall: false, groupsIgnore: true,
          alwaysOnline: true, readMessages: true, readStatus: true,
          syncFullHistory: false,
        },
        {
          headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
          timeout: 30000,
        }
      );
      console.log('[Evolution] Instance created successfully');
    } catch (createErr: any) {
      // If instance already exists, that's fine — continue to connect
      const status = createErr?.response?.status;
      if (status === 403 || status === 409) {
        console.log('[Evolution] Instance already exists, proceeding to connect...');
      } else {
        throw new Error(`Failed to create instance: ${createErr?.response?.data?.message || createErr.message}`);
      }
    }

    // Step 4: Wait 2 seconds for instance to initialize
    console.log('[Evolution] Waiting 2s for instance initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Get QR code via connect endpoint (with 2 retries)
    console.log(`[Evolution] Connecting instance: ${resolvedInstanceName}`);
    let connectResponse: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        connectResponse = await axios.get(
          `${config.baseUrl}/instance/connect/${resolvedInstanceName}`,
          { headers: { apikey: config.apiKey }, timeout: 30000 }
        );
        console.log(`[Evolution] Connect attempt ${attempt} succeeded`);
        break;
      } catch (err: any) {
        lastError = err;
        console.error(`[Evolution] Connect attempt ${attempt} failed:`, err?.response?.data || err.message);
        if (attempt < 3) {
          const waitTime = attempt * 2000;
          console.log(`[Evolution] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!connectResponse) {
      throw new Error(
        `Failed to connect after 3 attempts: ${lastError?.response?.data?.message || lastError?.message || 'Unknown error'}`
      );
    }

    const data = connectResponse?.data;
    console.log('[Evolution] Connect response:', JSON.stringify({ hasBase64: !!data?.base64, hasCode: !!data?.code, count: data?.count }).substring(0, 200));

    // Step 6: Extract QR code from connect response
    const qrCodeRaw = this.extractQR(data);

    if (!qrCodeRaw) {
      // If connect returned { count: 0 }, try /instance/qrcode/:name as fallback
      if (data?.count === 0 || data?.count === undefined) {
        console.log('[Evolution] No QR from connect, trying qrcode fallback endpoint...');
        try {
          const qrResponse = await axios.get(
            `${config.baseUrl}/instance/qrcode/${resolvedInstanceName}`,
            { headers: { apikey: config.apiKey }, timeout: 15000 }
          );
          const fallbackQR = this.extractQR(qrResponse.data);
          if (fallbackQR) {
            console.log('[Evolution] QR fallback succeeded');
            await this.saveIntegrationConfig(businessId, config, resolvedInstanceName, qrResponse.data?.instance?.id || '');
            const isBase64Image = fallbackQR.startsWith('data:') || fallbackQR.startsWith('iVBOR');
            return { qrCode: fallbackQR, qrCodeBase64: isBase64Image ? fallbackQR : undefined, status: 'scanning' };
          }
        } catch (qrErr: any) {
          console.error('[Evolution] QR fallback also failed:', qrErr?.response?.data || qrErr.message);
        }
      }

      // Last resort: try waiting a bit and connecting again (QR may need time to generate)
      console.log('[Evolution] Final attempt: waiting 3s then retrying connect...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        const finalRes = await axios.get(
          `${config.baseUrl}/instance/connect/${resolvedInstanceName}`,
          { headers: { apikey: config.apiKey }, timeout: 30000 }
        );
        const finalQR = this.extractQR(finalRes.data);
        if (finalQR) {
          console.log('[Evolution] Final attempt succeeded!');
          await this.saveIntegrationConfig(businessId, config, resolvedInstanceName, finalRes.data?.instance?.id || '');
          const isBase64Image = finalQR.startsWith('data:') || finalQR.startsWith('iVBOR');
          return { qrCode: finalQR, qrCodeBase64: isBase64Image ? finalQR : undefined, status: 'scanning' };
        }
      } catch (finalErr: any) {
        console.error('[Evolution] Final attempt failed:', finalErr?.response?.data || finalErr.message);
      }

      throw new Error('No QR code returned from Evolution API. The instance may be stuck. Try refreshing after a few seconds.');
    }

    // Step 7: Save integration config to DB
    const instanceId = data?.instance?.id || createResult?.data?.instance?.id || '';
    await this.saveIntegrationConfig(businessId, config, resolvedInstanceName, instanceId, resolvedPhone);

    const isBase64Image = qrCodeRaw.startsWith('data:') || qrCodeRaw.startsWith('iVBOR');
    console.log(`[Evolution] === Connect complete for: ${resolvedInstanceName} ===`);
    return {
      qrCode: qrCodeRaw,
      qrCodeBase64: isBase64Image ? qrCodeRaw : undefined,
      status: 'scanning',
    };
  }

  /**
   * Save Evolution API integration config to DB
   */
  private static async saveIntegrationConfig(
    businessId: string,
    config: { baseUrl: string; apiKey: string; instanceName: string },
    resolvedInstanceName: string,
    instanceId: string,
    phone?: string
  ): Promise<void> {
    await prisma.integration.upsert({
      where: { id: `evo_${businessId}` },
      create: {
        id: `evo_${businessId}`, businessId,
        type: 'evolution_api', name: 'Evolution API',
        config: {
          baseUrl: config.baseUrl, apiKey: config.apiKey,
          instanceName: resolvedInstanceName, instanceId,
          phone: phone || '',
          status: 'scanning',
        },
        isActive: true,
      },
      update: {
        config: {
          baseUrl: config.baseUrl, apiKey: config.apiKey,
          instanceName: resolvedInstanceName, instanceId,
          phone: phone || '',
          status: 'scanning',
        },
        isActive: true,
      },
    });
  }

  /**
   * Get connection status
   */
  static async getConnectionStatus(businessId: string): Promise<{
    status: 'disconnected' | 'scanning' | 'connected';
    phone?: string;
    profileName?: string;
    profilePicUrl?: string;
  }> {
    try {
      const config = await this.getConfig(businessId);

      // Try to check actual connection state from Evolution API
      try {
        const response = await axios.get(
          `${config.baseUrl}/instance/connectionState/${config.instanceName}`,
          { headers: { apikey: config.apiKey }, timeout: 10000 }
        );

        const state = response.data?.instance?.state || 'close';

        if (state === 'open') {
          let phone = '';
          let profileName = '';
          let profilePicUrl = '';

          try {
            const fetchRes = await axios.get(
              `${config.baseUrl}/instance/fetchInstances?instanceName=${config.instanceName}`,
              { headers: { apikey: config.apiKey }, timeout: 10000 }
            );
            const instanceData = Array.isArray(fetchRes.data) ? fetchRes.data[0] : fetchRes.data;
            phone = instanceData?.instance?.phone || instanceData?.phone || '';
            profileName = instanceData?.instance?.profileName || instanceData?.profileName || profileName;
          } catch {}

          try {
            const profileRes = await axios.post(
              `${config.baseUrl}/chat/fetchProfilePictureUrl/${config.instanceName}`,
              { number: '' },
              { headers: { apikey: config.apiKey }, timeout: 10000 }
            );
            profilePicUrl = profileRes.data?.profilePictureUrl || '';
          } catch {}

          await this.updateStatus(businessId, 'connected');
          return { status: 'connected', phone, profileName, profilePicUrl };
        } else if (state === 'connecting' || state === 'pairing' || state === 'syncing') {
          return { status: 'scanning' };
        } else {
          return { status: 'disconnected' };
        }
      } catch (apiError: any) {
        // Evolution API unreachable or instance not found — fall back to DB cached status
        console.log(`[Evolution] Status check failed for ${config.instanceName}: ${apiError?.response?.status || apiError.message}`);

        // Read cached status from Integration config
        const integration = await prisma.integration.findFirst({
          where: { businessId, type: 'evolution_api' },
        });
        if (integration) {
          const cachedConfig = integration.config as any;
          const cachedStatus = cachedConfig?.status || 'disconnected';
          return { status: cachedStatus as any };
        }

        return { status: 'disconnected' };
      }
    } catch {
      return { status: 'disconnected' };
    }
  }

  /**
   * Disconnect / logout instance
   */
  static async disconnectInstance(businessId: string): Promise<void> {
    const config = await this.getConfig(businessId);
    try {
      await axios.delete(
        `${config.baseUrl}/instance/logout/${config.instanceName}`,
        { headers: { apikey: config.apiKey } }
      );
      await this.updateStatus(businessId, 'disconnected');
    } catch (error: any) {
      console.error('Evolution API disconnect error:', error.response?.data || error.message);
      throw new Error('Failed to disconnect instance');
    }
  }

  /**
   * Delete instance
   */
  static async deleteInstance(businessId: string): Promise<void> {
    const config = await this.getConfig(businessId);
    try {
      await axios.delete(
        `${config.baseUrl}/instance/delete/${config.instanceName}`,
        { headers: { apikey: config.apiKey } }
      );
      await prisma.integration.updateMany({
        where: { businessId, type: 'evolution_api' },
        data: { isActive: false },
      });
    } catch (error: any) {
      console.error('Evolution API delete error:', error.response?.data || error.message);
      throw new Error('Failed to delete instance');
    }
  }

  // ==================== MESSAGING ====================

  /**
   * Send text message
   */
  static async sendText(
    businessId: string,
    to: string,
    message: string,
    options: { delay?: number; linkPreview?: boolean } = {}
  ): Promise<any> {
    const config = await this.getConfig(businessId);
    const formattedNumber = this.formatPhone(to);
    const idempotencyKey = crypto.randomUUID();

    try {
      const response = await circuitBreaker.execute(
        'evolution-api',
        () => axios.post(
          `${config.baseUrl}/message/sendText/${config.instanceName}`,
          { number: formattedNumber, text: message, delay: options.delay || 0, linkPreview: options.linkPreview ?? true, optionsId: idempotencyKey },
          { headers: { apikey: config.apiKey }, timeout: 15000 }
        ),
        { timeoutMs: 15000 }
      );

      await prisma.message.create({
        data: { businessId, direction: 'outbound', type: 'text', content: message, waMessageId: response.data?.key?.id, status: 'sent' },
      });
      await prisma.business.update({ where: { id: businessId }, data: { totalMessages: { increment: 1 } } });

      return response.data;
    } catch (error: any) {
      await prisma.message.create({
        data: { businessId, direction: 'outbound', type: 'text', content: message, status: 'failed', error: error.response?.data?.message || error.message },
      });
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
    options: { delay?: number } = {}
  ): Promise<any> {
    const config = await this.getConfig(businessId);
    const formattedNumber = this.formatPhone(to);

    try {
      const response = await circuitBreaker.execute(
        'evolution-api',
        () => axios.post(
          `${config.baseUrl}/message/sendMedia/${config.instanceName}`,
          { number: formattedNumber, mediatype: mediaType, media: { url: mediaUrl }, delay: options.delay || 0, ...(caption ? { caption } : {}) },
          { headers: { apikey: config.apiKey }, timeout: 15000 }
        ),
        { timeoutMs: 15000 }
      );

      await prisma.message.create({
        data: { businessId, direction: 'outbound', type: mediaType, content: caption || '', mediaUrl, mediaType, waMessageId: response.data?.key?.id, status: 'sent' },
      });
      await prisma.business.update({ where: { id: businessId }, data: { totalMessages: { increment: 1 } } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Send template / button message
   */
  static async sendTemplate(
    businessId: string,
    to: string,
    template: {
      text: string;
      footer?: string;
      buttons: Array<{ type: 'reply' | 'url' | 'call'; title: string; url?: string; phone?: string }>;
    },
    options: { delay?: number } = {}
  ): Promise<any> {
    const config = await this.getConfig(businessId);
    const formattedNumber = this.formatPhone(to);
try {
      const response = await circuitBreaker.execute(
        'evolution-api',
        () => axios.post(
          `${config.baseUrl}/message/sendButtons/${config.instanceName}`,
          {
            number: formattedNumber,
            text: template.text,
            footer: template.footer || '',
            buttons: template.buttons.map((btn, i) => ({
              index: i + 1,
              type: btn.type === 'reply' ? 'replyButton' : btn.type === 'url' ? 'urlButton' : 'callButton',
              title: btn.title, ...(btn.url ? { url: btn.url } : {}), ...(btn.phone ? { phone: btn.phone } : {}),
            })),
            delay: options.delay || 0,
          },
          { headers: { apikey: config.apiKey }, timeout: 15000 }
        ),
        { timeoutMs: 15000 }
      );
      await prisma.message.create({
        data: { businessId, direction: 'outbound', type: 'template', content: template.text, interactiveType: 'button', waMessageId: response.data?.key?.id, status: 'sent' },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Bulk send messages with rate limiting
   */
  static async bulkSend(
    businessId: string,
    messages: Array<{ to: string; type: 'text' | 'template'; content: string; templateData?: any; contactId?: string }>,
    options: { delayBetween?: number; campaignId?: string } = {}
  ): Promise<{ queued: number; estimatedTime: string }> {
    const { delayBetween = 2000, campaignId } = options;

    const queued = await prisma.$transaction(
      messages.map((msg) =>
        prisma.message.create({
          data: { businessId, contactId: msg.contactId, campaignId, direction: 'outbound', type: msg.type, content: msg.content, status: 'queued', metadata: { provider: 'evolution_api', to: msg.to, templateData: msg.templateData, delayBetween, retryCount: 0, queuedAt: new Date().toISOString() } },
        })
      )
    );

    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { totalSent: { increment: messages.length }, targetContacts: { increment: messages.length } },
      });
    }

    const totalSeconds = Math.ceil((messages.length * delayBetween) / 1000);
    const estimatedTime = totalSeconds < 60 ? `${totalSeconds}s` : `${Math.ceil(totalSeconds / 60)}m ${totalSeconds % 60}s`;

    return { queued: messages.length, estimatedTime };
  }

  // ==================== CONTACTS & CHATS ====================

  static async fetchChats(businessId: string): Promise<any[]> {
    const config = await this.getConfig(businessId);
    try {
      const response = await axios.post(`${config.baseUrl}/chat/findChats/${config.instanceName}`, {}, { headers: { apikey: config.apiKey } });
      return response.data || [];
    } catch { return []; }
  }

  static async fetchMessages(businessId: string, remoteJid: string, options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    const config = await this.getConfig(businessId);
    try {
      const response = await axios.post(`${config.baseUrl}/chat/findMessages/${config.instanceName}`, { where: { key: { remoteJid } }, limit: options.limit || 50 }, { headers: { apikey: config.apiKey } });
      return response.data || [];
    } catch { return []; }
  }

  static async checkNumber(businessId: string, number: string): Promise<{ exists: boolean; jid: string }> {
    const config = await this.getConfig(businessId);
    try {
      const response = await axios.post(`${config.baseUrl}/chat/whatsappNumbers/${config.instanceName}`, { numbers: [number.replace(/\D/g, '')] }, { headers: { apikey: config.apiKey } });
      const result = response.data?.[0];
      return { exists: result?.exists || false, jid: result?.jid || '' };
    } catch { return { exists: false, jid: '' }; }
  }

  // ==================== WEBHOOK ====================

  static async processWebhook(businessId: string, payload: any): Promise<void> {
    const event = payload.event;
    switch (event) {
      case 'CONNECTION_UPDATE': {
        const state = payload.data?.status;
        if (state === 'open') await this.updateStatus(businessId, 'connected');
        else if (state === 'close') await this.updateStatus(businessId, 'disconnected');
        break;
      }
      case 'QRCODE_UPDATED': {
        await this.updateStatus(businessId, 'scanning');
        break;
      }
      case 'MESSAGES_UPSERT': {
        const msg = payload.data;
        if (msg.key?.fromMe) return;
        const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
        if (!content && !msg.message?.imageMessage && !msg.message?.audioMessage) return;

        let contact = await prisma.contact.findFirst({ where: { businessId, phone: from } });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { businessId, name: `WhatsApp ${from}`, phone: from, source: 'whatsapp', tags: ['WhatsApp Lead', 'Auto-Captured'], whatsappOptIn: true, lastActivity: new Date(), lastMessageAt: new Date() },
          });
          console.log(`[Evolution] New lead created: ${from}`);
          await prisma.activity.create({
            data: { businessId, contactId: contact.id, type: 'lead_captured', title: 'New lead from WhatsApp', content: 'Auto-captured from Evolution API message', metadata: { source: 'evolution', phone: from }, createdBy: 'system' },
          });
        } else {
          await prisma.contact.update({ where: { id: contact.id }, data: { lastMessageAt: new Date(), lastActivity: new Date() } });
        }

        const msgType = msg.message?.conversation || msg.message?.extendedTextMessage ? 'text' : msg.message?.imageMessage ? 'image' : msg.message?.videoMessage ? 'video' : msg.message?.audioMessage ? 'audio' : msg.message?.documentMessage ? 'document' : 'text';
        await prisma.message.create({ data: { businessId, contactId: contact.id, direction: 'inbound', type: msgType, content, waMessageId: msg.key?.id, status: 'received' } });
        break;
      }
      case 'MESSAGES_UPDATE': {
        const statusData = payload.data;
        const waMessageId = statusData?.key?.id;
        const status = statusData?.status;
        if (waMessageId && status) {
          const statusMap: Record<string, string> = { '0': 'sent', '1': 'delivered', '2': 'read', '3': 'read' };
          await prisma.message.updateMany({ where: { waMessageId }, data: { status: statusMap[status] || status, statusTimestamp: new Date() } });
        }
        break;
      }
    }
  }

  // ==================== HELPERS ====================

  private static formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = `91${cleaned}`;
    return cleaned;
  }

  private static async updateStatus(businessId: string, status: string): Promise<void> {
    const integration = await prisma.integration.findFirst({ where: { businessId, type: 'evolution_api' } });
    if (integration) {
      const config = integration.config as any;
      await prisma.integration.update({ where: { id: integration.id }, data: { config: { ...config, status } } });
    }
  }

  static async saveConfig(businessId: string, config: { baseUrl: string; apiKey: string; instanceName?: string; phone?: string }): Promise<void> {
    await prisma.integration.upsert({
      where: { id: `evo_${businessId}` },
      create: { id: `evo_${businessId}`, businessId, type: 'evolution_api', name: 'Evolution API', config: { ...config, instanceName: config.instanceName || `biz_${businessId.slice(-8)}`, phone: config.phone || '', status: 'disconnected' }, isActive: true },
      update: { config: { ...config, instanceName: config.instanceName || `biz_${businessId.slice(-8)}`, phone: config.phone || '', status: 'disconnected' }, isActive: true },
    });
  }

  static async getPublicConfig(businessId: string): Promise<{ configured: boolean; status: string; instanceName: string; baseUrl: string; apiKey: string; phone: string }> {
    const integration = await prisma.integration.findFirst({ where: { businessId, type: 'evolution_api' } });
    if (integration) {
      const config = integration.config as any;
      return { configured: true, status: config.status || 'disconnected', instanceName: config.instanceName || '', baseUrl: config.baseUrl || '', apiKey: config.apiKey || '', phone: config.phone || '' };
    }
    const envBaseUrl = process.env.EVOLUTION_API_URL;
    const envApiKey = process.env.EVOLUTION_API_KEY;
    if (envBaseUrl && envApiKey) {
      return { configured: true, status: 'disconnected', instanceName: process.env.EVOLUTION_INSTANCE_NAME || `biz_${businessId.slice(-8)}`, baseUrl: envBaseUrl, apiKey: envApiKey, phone: '' };
    }
    return { configured: false, status: 'disconnected', instanceName: '', baseUrl: '', apiKey: '', phone: '' };
  }
}

export default EvolutionApiService;
