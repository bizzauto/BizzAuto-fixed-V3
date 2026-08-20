import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { prisma } from '../db.js';
import { decrypt, encrypt } from '../utils/auth.js';

/**
 * Unofficial WhatsApp API Provider Service
 * -----------------------------------------------------------------------------
 * A unified gateway for connecting to 3rd-party "unofficial" WhatsApp APIs such as:
 *  - SMS Gate Hub        (https://smsgatehub.com)
 *  - WPPConnect / WA-Automate (Node.js gateway that uses Baileys under the hood)
 *  - Venom / Baileys wrappers
 *  - Any custom REST API that follows the unofficial WA gateway pattern
 *
 * These services sit between Meta's official API and your account using QR-based
 * pairing. They are cheaper (or free) and don't require Meta business approval,
 * BUT they violate Meta's ToS — use with care.
 *
 * Common endpoint shape (all configurable per business):
 *   POST {baseUrl}/api/{session}/send-text       { phone, message }
 *   POST {baseUrl}/api/{session}/send-image      { phone, image, caption? }
 *   POST {baseUrl}/api/{session}/send-video      { phone, video, caption? }
 *   POST {baseUrl}/api/{session}/send-document   { phone, document, fileName? }
 *   GET  {baseUrl}/api/{session}/status
 *   GET  {baseUrl}/api/{session}/qrcode          (returns base64 PNG)
 *   POST {baseUrl}/api/{session}/connect
 *   POST {baseUrl}/api/{session}/logout
 *   GET  {baseUrl}/api/{session}/check-number/{phone}
 *
 * Configuration is stored in `Integration` table (type='unofficial_whatsapp'),
 * per-business. NO schema changes required.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GatewayProvider = 'wppconnect' | 'smsgatehub' | 'venom' | 'baileys' | 'custom';

export interface UnofficialWhatsAppConfig {
  enabled: boolean;
  // Which gateway style we're talking to
  provider: GatewayProvider;
  // Display name shown to user
  displayName: string;
  // Base URL of the gateway service (e.g. http://localhost:21465)
  baseUrl: string;
  // Session name (the gateway uses this to identify your device)
  session: string;
  // Optional API key / bearer token for the gateway (encrypted)
  apiKey?: string;
  // Optional HMAC secret for signed requests (encrypted)
  hmacSecret?: string;
  // Custom path overrides (for "custom" provider)
  paths?: {
    sendText?: string;
    sendImage?: string;
    sendVideo?: string;
    sendDocument?: string;
    status?: string;
    qrcode?: string;
    connect?: string;
    logout?: string;
    checkNumber?: string;
  };
  // Daily send limit (per business) — hard cap
  dailySendLimit: number;
  // Cost override in INR (these gateways are usually free — set to 0)
  costPerMessage: number;
  // Auto-reconnect on session disconnect
  autoReconnect: boolean;
  // Health check interval (seconds) — 0 = disabled
  healthCheckIntervalSec: number;
  // Last known status (populated by the service, not user-editable)
  lastStatus?: { connected: boolean; phone?: string; battery?: number; updatedAt: Date; error?: string };
}

export interface SendMessage {
  to: string;                    // E.164 phone number
  body: string;
  contactName?: string;
  contactId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  fileName?: string;
  caption?: string;
}

export interface SendResult {
  success: boolean;
  provider: GatewayProvider;
  providerMessageId?: string;
  cost: number;
  queued?: boolean;
  error?: string;
  raw?: any;
  timestamp: Date;
}

export interface SessionStatus {
  connected: boolean;
  phone?: string;
  battery?: number;
  qrCode?: string;        // base64 PNG (only when not connected)
  provider?: string;
  raw?: any;
}

// ---------------------------------------------------------------------------
// Default endpoint paths per provider
// ---------------------------------------------------------------------------

const DEFAULT_PATHS: Record<GatewayProvider, Required<NonNullable<UnofficialWhatsAppConfig['paths']>>> = {
  wppconnect: {
    sendText:     '/api/{session}/send-message',
    sendImage:    '/api/{session}/send-image',
    sendVideo:    '/api/{session}/send-video',
    sendDocument: '/api/{session}/send-document',
    status:       '/api/{session}/status',
    qrcode:       '/api/{session}/qrcode',
    connect:      '/api/{session}/start',
    logout:       '/api/{session}/logout',
    checkNumber:  '/api/{session}/check-number-status/{phone}',
  },
  smsgatehub: {
    sendText:     '/api/v1/send',
    sendImage:    '/api/v1/send-image',
    sendVideo:    '/api/v1/send-video',
    sendDocument: '/api/v1/send-document',
    status:       '/api/v1/status',
    qrcode:       '/api/v1/qr',
    connect:      '/api/v1/connect',
    logout:       '/api/v1/logout',
    checkNumber:  '/api/v1/check/{phone}',
  },
  venom: {
    sendText:     '/sendText',
    sendImage:    '/sendImage',
    sendVideo:    '/sendVideo',
    sendDocument: '/sendFile',
    status:       '/isConnected',
    qrcode:       '/getQrCode',
    connect:      '/start',
    logout:       '/close',
    checkNumber:  '/isValidNumber/{phone}',
  },
  baileys: {
    sendText:     '/messages/text',
    sendImage:    '/messages/image',
    sendVideo:    '/messages/video',
    sendDocument: '/messages/document',
    status:       '/session/status',
    qrcode:       '/session/qr',
    connect:      '/session/connect',
    logout:       '/session/logout',
    checkNumber:  '/contacts/check/{phone}',
  },
  custom: {
    sendText:     '/send',
    sendImage:    '/send/image',
    sendVideo:    '/send/video',
    sendDocument: '/send/document',
    status:       '/status',
    qrcode:       '/qr',
    connect:      '/connect',
    logout:       '/logout',
    checkNumber:  '/check/{phone}',
  },
};

export const GATEWAY_PROVIDER_LABELS: Record<GatewayProvider, { label: string; description: string; docs?: string }> = {
  wppconnect: { label: 'WPPConnect / WA-Automate', description: 'Node.js gateway using Baileys (most common)', docs: 'https://github.com/wppconnect-team/wppconnect-server' },
  smsgatehub: { label: 'SMS Gate Hub', description: 'Hosted unofficial WhatsApp gateway', docs: 'https://smsgatehub.com' },
  venom:      { label: 'Venom / Baileys Wrapper', description: 'Self-hosted venom-bot style REST wrapper' },
  baileys:    { label: 'Baileys REST Wrapper', description: 'Direct Baileys WebSocket wrapped in HTTP' },
  custom:     { label: 'Custom / Generic', description: 'Configure your own paths' },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UnofficialWhatsAppService {
  /**
   * Get or create per-business unofficial WA config.
   */
  static async getConfig(businessId: string): Promise<UnofficialWhatsAppConfig> {
    const integration = await prisma.integration.findUnique({
      where: { businessId_type: { businessId, type: 'unofficial_whatsapp' } },
    });

    if (!integration) {
      return this.defaultConfig();
    }

    try {
      const parsed = JSON.parse((integration as any).credentials as string);
      // Decrypt sensitive fields
      if (parsed.apiKey) {
        try { parsed.apiKey = decrypt(parsed.apiKey); } catch { /* keep as-is */ }
      }
      if (parsed.hmacSecret) {
        try { parsed.hmacSecret = decrypt(parsed.hmacSecret); } catch { /* keep as-is */ }
      }
      return { ...this.defaultConfig(), ...parsed };
    } catch {
      return this.defaultConfig();
    }
  }

  static defaultConfig(): UnofficialWhatsAppConfig {
    return {
      enabled: false,
      provider: 'wppconnect',
      displayName: 'My Gateway',
      baseUrl: '',
      session: 'bizzauto',
      apiKey: '',
      hmacSecret: '',
      paths: { ...DEFAULT_PATHS.wppconnect },
      dailySendLimit: 1000,
      costPerMessage: 0,
      autoReconnect: true,
      healthCheckIntervalSec: 60,
      lastStatus: undefined,
    };
  }

  /**
   * Save unofficial WA configuration. Encrypts secrets before storing.
   */
  static async saveConfig(businessId: string, cfg: UnofficialWhatsAppConfig): Promise<UnofficialWhatsAppConfig> {
    const toStore: any = { ...cfg };
    // Don't persist runtime status
    delete toStore.lastStatus;

    if (toStore.apiKey) toStore.apiKey = encrypt(toStore.apiKey);
    if (toStore.hmacSecret) toStore.hmacSecret = encrypt(toStore.hmacSecret);

    await prisma.integration.upsert({
      where: { businessId_type: { businessId, type: 'unofficial_whatsapp' } },
      update: { credentials: JSON.stringify(toStore), updatedAt: new Date() } as any,
      create: { businessId, type: 'unofficial_whatsapp', credentials: JSON.stringify(toStore) } as any,
    });
    return cfg;
  }

  /**
   * Build a per-call axios instance with auth + signature headers.
   */
  private static buildClient(cfg: UnofficialWhatsAppConfig): AxiosInstance {
    const client = axios.create({
      baseURL: cfg.baseUrl.replace(/\/$/, ''),
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    if (cfg.apiKey) {
      client.defaults.headers.common['Authorization'] = `Bearer ${cfg.apiKey}`;
    }

    // Optional HMAC request signing
    if (cfg.hmacSecret) {
      client.interceptors.request.use((config) => {
        const body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data || {});
        const sig = crypto
          .createHmac('sha256', cfg.hmacSecret as string)
          .update(body)
          .digest('hex');
        config.headers['X-Signature'] = sig;
        return config;
      });
    }

    return client;
  }

  /**
   * Resolve a path template, substituting {session} and {phone}.
   */
  private static resolvePath(template: string, session: string, phone?: string): string {
    let p = template.replace(/\{session\}/g, encodeURIComponent(session));
    if (phone) p = p.replace(/\{phone\}/g, encodeURIComponent(phone.replace(/[^\d]/g, '')));
    return p;
  }

  /**
   * Get current session status. Returns connected/phone/battery/qrCode.
   */
  static async getStatus(businessId: string): Promise<SessionStatus> {
    const cfg = await this.getConfig(businessId);
    if (!cfg.baseUrl || !cfg.session) {
      return { connected: false, raw: { error: 'Not configured' } };
    }
    const client = this.buildClient(cfg);
    const paths = { ...DEFAULT_PATHS[cfg.provider], ...(cfg.paths || {}) };
    try {
      const statusUrl = this.resolvePath(paths.status, cfg.session);
      const statusRes = await client.get(statusUrl).catch((e) => ({ data: { connected: false, error: e.message } }));
      const connected = !!(statusRes.data?.connected || statusRes.data?.status === 'CONNECTED' || statusRes.data?.isConnected);
      const phone = statusRes.data?.phone || statusRes.data?.number;
      const battery = statusRes.data?.battery;
      const provider = statusRes.data?.provider;

      let qrCode: string | undefined;
      if (!connected) {
        try {
          const qrUrl = this.resolvePath(paths.qrcode, cfg.session);
          const qrRes = await client.get(qrUrl, { responseType: 'arraybuffer' });
          qrCode = `data:image/png;base64,${Buffer.from(qrRes.data).toString('base64')}`;
        } catch { /* no qr available yet */ }
      }

      const status: SessionStatus = { connected, phone, battery, qrCode, provider, raw: statusRes.data };
      await this.updateLastStatus(businessId, status);
      return status;
    } catch (error: any) {
      const status: SessionStatus = { connected: false, raw: { error: error.message } };
      await this.updateLastStatus(businessId, status);
      return status;
    }
  }

  /**
   * Initiate session (generates QR for pairing if needed).
   */
  static async connect(businessId: string): Promise<SessionStatus> {
    const cfg = await this.getConfig(businessId);
    const client = this.buildClient(cfg);
    const paths = { ...DEFAULT_PATHS[cfg.provider], ...(cfg.paths || {}) };
    const url = this.resolvePath(paths.connect, cfg.session);
    try {
      await client.post(url, {}).catch(() => {/* some gateways return 4xx until QR is scanned */});
    } catch { /* ignore */ }
    return this.getStatus(businessId);
  }

  /**
   * Logout / disconnect session.
   */
  static async logout(businessId: string): Promise<{ success: boolean; error?: string }> {
    const cfg = await this.getConfig(businessId);
    const client = this.buildClient(cfg);
    const paths = { ...DEFAULT_PATHS[cfg.provider], ...(cfg.paths || {}) };
    const url = this.resolvePath(paths.logout, cfg.session);
    try {
      await client.post(url, {});
      await this.updateLastStatus(businessId, { connected: false, raw: { manual: 'logout' } });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check whether a phone number is on WhatsApp.
   */
  static async checkNumber(businessId: string, phone: string): Promise<{ exists: boolean; jid?: string; error?: string }> {
    const cfg = await this.getConfig(businessId);
    const client = this.buildClient(cfg);
    const paths = { ...DEFAULT_PATHS[cfg.provider], ...(cfg.paths || {}) };
    const url = this.resolvePath(paths.checkNumber, cfg.session, phone);
    try {
      const res = await client.get(url);
      return { exists: !!(res.data?.exists ?? res.data?.numberExists ?? res.data?.isRegistered), jid: res.data?.jid };
    } catch (error: any) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Send a single message (text or media).
   */
  static async send(businessId: string, msg: SendMessage): Promise<SendResult> {
    const cfg = await this.getConfig(businessId);
    if (!cfg.enabled) {
      return { success: false, provider: cfg.provider, cost: 0, error: 'Provider is disabled', timestamp: new Date() };
    }
    if (!cfg.baseUrl || !cfg.session) {
      return { success: false, provider: cfg.provider, cost: 0, error: 'Provider not configured', timestamp: new Date() };
    }
    // Daily limit check
    const sentToday = await this.countSentToday(businessId);
    if (sentToday >= cfg.dailySendLimit) {
      return { success: false, provider: cfg.provider, cost: 0, error: 'Daily send limit reached', timestamp: new Date() };
    }

    const client = this.buildClient(cfg);
    const paths = { ...DEFAULT_PATHS[cfg.provider], ...(cfg.paths || {}) };
    const phone = msg.to.replace(/[^\d]/g, '');

    try {
      let res: any;
      if (!msg.mediaUrl) {
        const url = this.resolvePath(paths.sendText, cfg.session);
        res = await client.post(url, this.buildTextPayload(cfg, phone, msg));
      } else {
        const pathKey = msg.mediaType === 'image' ? 'sendImage'
          : msg.mediaType === 'video' ? 'sendVideo'
          : 'sendDocument';
        const url = this.resolvePath(paths[pathKey], cfg.session);
        res = await client.post(url, this.buildMediaPayload(cfg, phone, msg));
      }
      const ok = !!(res.data?.success ?? res.data?.sent ?? res.data?.id ?? res.data?.messageId);
      const result: SendResult = {
        success: ok,
        provider: cfg.provider,
        providerMessageId: res.data?.id || res.data?.messageId || res.data?.key?.id,
        cost: cfg.costPerMessage,
        queued: !!res.data?.queued,
        raw: res.data,
        timestamp: new Date(),
      };
      if (ok) await this.recordSent(businessId, msg, result);
      return result;
    } catch (error: any) {
      return {
        success: false,
        provider: cfg.provider,
        cost: 0,
        error: error.response?.data?.message || error.message,
        raw: error.response?.data,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Build text payload — varies a bit per provider but the common fields work.
   */
  private static buildTextPayload(cfg: UnofficialWhatsAppConfig, phone: string, msg: SendMessage): any {
    switch (cfg.provider) {
      case 'wppconnect':
        return { phone, message: msg.body, isGroup: false };
      case 'smsgatehub':
        return { phone, message: msg.body };
      case 'venom':
        return { number: `${phone}@c.us`, message: msg.body };
      case 'baileys':
        return { jid: `${phone}@s.whatsapp.net`, text: msg.body };
      case 'custom':
      default:
        return { phone, message: msg.body };
    }
  }

  /**
   * Build media payload — most gateways accept URL + caption.
   */
  private static buildMediaPayload(cfg: UnofficialWhatsAppConfig, phone: string, msg: SendMessage): any {
    const base = { phone, url: msg.mediaUrl, caption: msg.caption || msg.body, fileName: msg.fileName };
    switch (cfg.provider) {
      case 'wppconnect':
        return { phone, url: msg.mediaUrl, caption: msg.caption || msg.body };
      case 'smsgatehub':
        return base;
      case 'venom':
        return { number: `${phone}@c.us`, url: msg.mediaUrl, caption: msg.caption || msg.body };
      case 'baileys':
        return { jid: `${phone}@s.whatsapp.net`, url: msg.mediaUrl, caption: msg.caption || msg.body };
      default:
        return base;
    }
  }

  /**
   * Send a bulk batch with concurrency cap.
   */
  static async sendBulk(businessId: string, messages: SendMessage[]): Promise<{ results: SendResult[]; summary: { total: number; sent: number; failed: number; totalCost: number } }> {
    const concurrency = 8;
    const results: SendResult[] = [];
    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      const r = await Promise.all(
        batch.map((m) => this.send(businessId, m).catch((e: any) => ({
          success: false, provider: 'custom' as GatewayProvider, cost: 0, error: e.message, timestamp: new Date(),
        } as SendResult)))
      );
      results.push(...r);
    }
    const sent = results.filter((r) => r.success).length;
    const totalCost = results.reduce((s, r) => s + (r.cost || 0), 0);
    return { results, summary: { total: messages.length, sent, failed: messages.length - sent, totalCost: Math.round(totalCost * 100) / 100 } };
  }

  /**
   * Quick connection test — pings the gateway base URL.
   */
  static async testConnection(businessId: string): Promise<{ ok: boolean; latencyMs: number; info?: any; error?: string }> {
    const start = Date.now();
    const cfg = await this.getConfig(businessId);
    if (!cfg.baseUrl) return { ok: false, latencyMs: 0, error: 'Base URL is empty' };
    try {
      const client = this.buildClient(cfg);
      const paths = { ...DEFAULT_PATHS[cfg.provider], ...(cfg.paths || {}) };
      const url = this.resolvePath(paths.status, cfg.session);
      const res = await client.get(url);
      return { ok: true, latencyMs: Date.now() - start, info: res.data };
    } catch (error: any) {
      return { ok: false, latencyMs: Date.now() - start, error: error.message };
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private static async updateLastStatus(businessId: string, status: SessionStatus): Promise<void> {
    try {
      const cfg = await this.getConfig(businessId);
      cfg.lastStatus = {
        connected: status.connected,
        phone: status.phone,
        battery: status.battery,
        updatedAt: new Date(),
        error: status.raw?.error,
      };
      const toStore: any = { ...cfg };
      delete toStore.lastStatus;
      if (toStore.apiKey) toStore.apiKey = encrypt(toStore.apiKey);
      if (toStore.hmacSecret) toStore.hmacSecret = encrypt(toStore.hmacSecret);
      await prisma.integration.upsert({
        where: { businessId_type: { businessId, type: 'unofficial_whatsapp' } },
        update: { credentials: JSON.stringify({ ...toStore, lastStatus: cfg.lastStatus }), updatedAt: new Date() } as any,
        create: { businessId, type: 'unofficial_whatsapp', credentials: JSON.stringify({ ...toStore, lastStatus: cfg.lastStatus }) } as any,
      });
    } catch { /* best-effort */ }
  }

  private static async countSentToday(businessId: string): Promise<number> {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    try {
      // Reuse the MessageLog table (any model that tracks WA messages)
      const logs = await (prisma as any).messageLog?.count({
        where: { businessId, channel: 'unofficial_whatsapp', createdAt: { gte: since } },
      }).catch(() => 0);
      return Number(logs || 0);
    } catch { return 0; }
  }

  private static async recordSent(businessId: string, msg: SendMessage, result: SendResult): Promise<void> {
    try {
      await (prisma as any).messageLog?.create({
        data: {
          businessId,
          channel: 'unofficial_whatsapp',
          to: msg.to,
          body: msg.body,
          contactId: msg.contactId || null,
          providerMessageId: result.providerMessageId,
          cost: result.cost,
          success: result.success,
        },
      }).catch(() => null);
    } catch { /* best-effort */ }
  }
}
