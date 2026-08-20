/**
 * @jest-environment node
 *
 * Evolution API Service Unit Tests
 * Tests the EvolutionApiService class methods with mocked Prisma and axios.
 */

import { EvolutionApiService } from '../src/server/services/evolution.service';

// ======== Mocks ========
jest.mock('../src/server/db', () => ({
  prisma: {
    integration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
    campaign: {
      update: jest.fn(),
    },
    business: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('axios');
jest.mock('../src/server/utils/auth', () => ({
  encrypt: jest.fn((s: string) => `enc_${s}`),
  decrypt: jest.fn((s: string) => s.replace('enc_', '')),
}));

import axios from 'axios';
import { prisma } from '../src/server/db';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedPrisma = prisma as any;

const BUSINESS_ID = 'test-business-123';
const BASE_URL = 'https://evolution-api.test.com';
const API_KEY = 'sk-test-key-abc123';
const INSTANCE_NAME = 'biz_test-bus';

describe('EvolutionApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== CONFIGURATION ====================

  describe('Config Management', () => {
    describe('getPublicConfig', () => {
      it('returns configured=false when no integration exists', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue(null);

        const result = await EvolutionApiService.getPublicConfig(BUSINESS_ID);

        expect(result).toEqual({
          configured: false,
          status: 'disconnected',
          instanceName: '',
          baseUrl: '',
          apiKey: '',
          phone: '',
        });
        expect(mockedPrisma.integration.findFirst).toHaveBeenCalledWith({
          where: { businessId: BUSINESS_ID, type: 'evolution_api' },
        });
      });

      it('returns configured=true with config when integration exists', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: {
            baseUrl: BASE_URL,
            apiKey: API_KEY,
            instanceName: INSTANCE_NAME,
            status: 'connected',
            phone: '',
          },
        });

        const result = await EvolutionApiService.getPublicConfig(BUSINESS_ID);

        expect(result).toEqual({
          configured: true,
          status: 'connected',
          instanceName: INSTANCE_NAME,
          baseUrl: BASE_URL,
          apiKey: API_KEY,
          phone: '',
        });
      });

      it('returns default status disconnected when config has no status field', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: {
            baseUrl: BASE_URL,
            apiKey: API_KEY,
          },
        });

        const result = await EvolutionApiService.getPublicConfig(BUSINESS_ID);

        expect(result.configured).toBe(true);
        expect(result.status).toBe('disconnected');
        expect(result.phone).toBe('');
      });
    });

    describe('saveConfig', () => {
      it('creates new integration when none exists', async () => {
        mockedPrisma.integration.upsert.mockResolvedValue({});

        await EvolutionApiService.saveConfig(BUSINESS_ID, {
          baseUrl: BASE_URL,
          apiKey: API_KEY,
          instanceName: INSTANCE_NAME,
        });

        expect(mockedPrisma.integration.upsert).toHaveBeenCalledWith({
          where: { id: `evo_${BUSINESS_ID}` },
          create: {
            id: `evo_${BUSINESS_ID}`,
            businessId: BUSINESS_ID,
            type: 'evolution_api',
            name: 'Evolution API',
            config: {
              baseUrl: BASE_URL,
              apiKey: API_KEY,
              instanceName: INSTANCE_NAME,
              status: 'disconnected',
              phone: '',
            },
            isActive: true,
          },
          update: {
            config: {
              baseUrl: BASE_URL,
              apiKey: API_KEY,
              instanceName: INSTANCE_NAME,
              status: 'disconnected',
              phone: '',
            },
            isActive: true,
          },
        });
      });

      it('generates default instanceName when not provided', async () => {
        mockedPrisma.integration.upsert.mockResolvedValue({});

        await EvolutionApiService.saveConfig(BUSINESS_ID, {
          baseUrl: BASE_URL,
          apiKey: API_KEY,
        });

        const upsertCall = mockedPrisma.integration.upsert.mock.calls[0][0];
        expect(upsertCall.create.config.instanceName).toBe(`biz_${BUSINESS_ID.slice(-8)}`);
        expect(upsertCall.create.config.phone).toBe('');
      });
    });
  });

  // ==================== INSTANCE MANAGEMENT ====================

  describe('Instance Management', () => {
    // connectInstance has hardcoded real setTimeout delays (3s + 2s)
    // so we need a longer timeout
    jest.setTimeout(30000);

    describe('createInstance', () => {
      it('creates instance and saves integration', async () => {
        mockedAxios.post.mockResolvedValue({
          data: {
            instance: { id: 'inst-123', state: 'created' },
          },
        });
        mockedPrisma.integration.upsert.mockResolvedValue({});

        const result = await EvolutionApiService.createInstance(BUSINESS_ID, {
          baseUrl: BASE_URL,
          apiKey: API_KEY,
          instanceName: INSTANCE_NAME,
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/instance/create`,
          expect.objectContaining({
            instanceName: INSTANCE_NAME,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
          expect.objectContaining({
            headers: expect.objectContaining({ apikey: API_KEY }),
          })
        );

        expect(mockedPrisma.integration.upsert).toHaveBeenCalled();
        expect(result).toEqual({ instance: { id: 'inst-123', state: 'created' } });
      });

      it('creates instance with webhook URL when provided', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });
        mockedPrisma.integration.upsert.mockResolvedValue({});

        const webhookUrl = `${BASE_URL}/webhook/${BUSINESS_ID}`;
        await EvolutionApiService.createInstance(BUSINESS_ID, {
          baseUrl: BASE_URL,
          apiKey: API_KEY,
          instanceName: INSTANCE_NAME,
          webhookUrl,
        });

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.webhook).toBeDefined();
        expect(axiosCall.webhook.url).toBe(webhookUrl);
        expect(axiosCall.webhook.webhookByEvents).toBe(true);
        expect(axiosCall.webhook.events).toContain('QRCODE_UPDATED');
        expect(axiosCall.webhook.events).toContain('CONNECTION_UPDATE');
        expect(axiosCall.webhook.events).toContain('MESSAGES_UPSERT');
      });

      it('generates default instanceName from businessId when not provided', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });
        mockedPrisma.integration.upsert.mockResolvedValue({});

        await EvolutionApiService.createInstance(BUSINESS_ID, {
          baseUrl: BASE_URL,
          apiKey: API_KEY,
        });

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.instanceName).toBe(`biz_${BUSINESS_ID.slice(-8)}`);
      });

      it('throws and does not save integration on API error', async () => {
        mockedAxios.post.mockRejectedValue({
          response: { data: { message: 'Server error' } },
        });
        mockedPrisma.integration.upsert.mockResolvedValue({});

        await expect(
          EvolutionApiService.createInstance(BUSINESS_ID, {
            baseUrl: BASE_URL,
            apiKey: API_KEY,
          })
        ).rejects.toThrow('Server error');

        // Integration should NOT be saved when creation fails
        expect(mockedPrisma.integration.upsert).not.toHaveBeenCalled();
      });

      it('throws generic error when API response has no message', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Network error'));

        await expect(
          EvolutionApiService.createInstance(BUSINESS_ID, {
            baseUrl: BASE_URL,
            apiKey: API_KEY,
          })
        ).rejects.toThrow('Failed to create Evolution API instance');
      });
    });

    describe('connectInstance', () => {
      beforeEach(() => {
        // Set up all the axios mocks needed for the complex connectInstance flow
        // connectInstance does: delete(fetchInstances) -> wait3s -> create -> wait2s -> connect(with retries)
        mockedAxios.delete.mockResolvedValue({ data: {} });
        mockedAxios.post.mockResolvedValue({ data: { instance: { id: 'inst-123' } } });
        mockedPrisma.integration.upsert.mockResolvedValue({});

        // Default get mock - first call (fetchInstances) returns non-array (handled by catch)
        // Subsequent calls (connect) return QR data
        mockedAxios.get.mockResolvedValue({
          data: {
            qrcode: { code: 'qr-code-string' },
          },
        });
      });

      it('connects and returns QR code data', async () => {
        // Mock getConfig via findFirst
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });

        const result = await EvolutionApiService.connectInstance(BUSINESS_ID);

        expect(result).toEqual({
          qrCode: 'qr-code-string',
          status: 'scanning',
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
          `${BASE_URL}/instance/connect/${INSTANCE_NAME}`,
          expect.objectContaining({ headers: { apikey: API_KEY }, timeout: 30000 })
        );

        // Config should be saved via upsert
        expect(mockedPrisma.integration.upsert).toHaveBeenCalled();
      });

      it('falls back to base64Image when qrcode.code is not available', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });
        // Connect returns data with base64 (no qrcode.code)
        mockedAxios.get.mockResolvedValue({
          data: { base64: 'direct-base64' },
        });

        const result = await EvolutionApiService.connectInstance(BUSINESS_ID);

        expect(result.qrCode).toBe('direct-base64');
      });

      it('throws error when not configured', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue(null);

        await expect(
          EvolutionApiService.connectInstance(BUSINESS_ID)
        ).rejects.toThrow('Evolution API not configured');
      });

      it('throws error on API failure', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });
        // Make the connect call (3rd, 4th etc. axios.get call) fail after retries
        // connectInstance wraps connect in retry loop (3 attempts), so we mock all gets to reject
        mockedAxios.get.mockRejectedValue(
          new Error('Connection timeout')
        );

        await expect(
          EvolutionApiService.connectInstance(BUSINESS_ID)
        ).rejects.toThrow('Failed to connect after');
      });
    });

    describe('getConnectionStatus', () => {
      beforeEach(() => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });
        mockedPrisma.integration.update.mockResolvedValue({});
      });

      it('returns connected with phone number when state is open', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            instance: {
              state: 'open',
              phone: '9198983027975',
              profileName: 'Test User',
            },
          },
        });
        mockedAxios.post.mockResolvedValue({
          data: { profilePictureUrl: 'https://example.com/pic.jpg' },
        });

        const result = await EvolutionApiService.getConnectionStatus(BUSINESS_ID);

        expect(result).toEqual({
          status: 'connected',
          phone: '9198983027975',
          profileName: 'Test User',
          profilePicUrl: 'https://example.com/pic.jpg',
        });
      });

      it('returns scanning when state is connecting', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            instance: {
              state: 'connecting',
            },
          },
        });

        const result = await EvolutionApiService.getConnectionStatus(BUSINESS_ID);

        expect(result).toEqual({ status: 'scanning' });
      });

      it('returns disconnected when state is close', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            instance: {
              state: 'close',
            },
          },
        });

        const result = await EvolutionApiService.getConnectionStatus(BUSINESS_ID);

        expect(result).toEqual({ status: 'disconnected' });
      });

      it('returns disconnected on API error', async () => {
        mockedAxios.get.mockRejectedValue(new Error('API unavailable'));

        const result = await EvolutionApiService.getConnectionStatus(BUSINESS_ID);

        expect(result).toEqual({ status: 'disconnected' });
      });

      it('returns disconnected when connectionState returns unexpected format', async () => {
        // Service now uses connectionState endpoint which expects { instance: { state } }
        // An array response means no matching instance found → disconnected
        mockedAxios.get.mockResolvedValue({
          data: [
            {
              instance: { state: 'open', phone: '911234567890' },
            },
          ],
        });

        const result = await EvolutionApiService.getConnectionStatus(BUSINESS_ID);

        expect(result.status).toBe('disconnected');
      });

      it('handles profile picture fetch gracefully on failure', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            instance: { state: 'open', phone: '911234567890', profileName: 'User' },
          },
        });
        mockedAxios.post.mockRejectedValue(new Error('Profile fetch failed'));

        const result = await EvolutionApiService.getConnectionStatus(BUSINESS_ID);

        expect(result.status).toBe('connected');
        expect(result.phone).toBe('911234567890');
        expect(result.profileName).toBe('User');
      });
    });

    describe('disconnectInstance', () => {
      it('disconnects and updates status', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });
        mockedPrisma.integration.update.mockResolvedValue({});
        mockedAxios.delete.mockResolvedValue({ data: {} });

        await EvolutionApiService.disconnectInstance(BUSINESS_ID);

        expect(mockedAxios.delete).toHaveBeenCalledWith(
          `${BASE_URL}/instance/logout/${INSTANCE_NAME}`,
          expect.objectContaining({ headers: { apikey: API_KEY } })
        );
      });      it('throws error when not configured', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue(null);

        await expect(
          EvolutionApiService.disconnectInstance(BUSINESS_ID)
        ).rejects.toThrow('Evolution API not configured');
      });

      it('throws error on API failure', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });
        mockedAxios.delete.mockRejectedValue(new Error('Logout failed'));

        await expect(
          EvolutionApiService.disconnectInstance(BUSINESS_ID)
        ).rejects.toThrow('Failed to disconnect instance');
      });
    });

    describe('deleteInstance', () => {
      it('deletes instance and deactivates integration', async () => {
        mockedPrisma.integration.findFirst.mockResolvedValue({
          config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
        });
        mockedPrisma.integration.updateMany.mockResolvedValue({ count: 1 });
        mockedAxios.delete.mockResolvedValue({ data: {} });

        await EvolutionApiService.deleteInstance(BUSINESS_ID);

        expect(mockedAxios.delete).toHaveBeenCalledWith(
          `${BASE_URL}/instance/delete/${INSTANCE_NAME}`,
          expect.objectContaining({ headers: { apikey: API_KEY } })
        );

        expect(mockedPrisma.integration.updateMany).toHaveBeenCalledWith({
          where: { businessId: BUSINESS_ID, type: 'evolution_api' },
          data: { isActive: false },
        });
      });
    });
  });

  // ==================== MESSAGING ====================

  describe('Messaging', () => {
    beforeEach(() => {
      mockedPrisma.integration.findFirst.mockResolvedValue({
        config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
      });
      mockedPrisma.message.create.mockResolvedValue({});
      mockedPrisma.business.update.mockResolvedValue({});
    });

    describe('sendText', () => {
      const TO_NUMBER = '+91 98765 43210';
      const FORMATTED = '919876543210';
      const MESSAGE = 'Hello from test!';

      it('sends text message and saves to database', async () => {
        mockedAxios.post.mockResolvedValue({
          data: { key: { id: 'wa-msg-123' } },
        });

        const result = await EvolutionApiService.sendText(BUSINESS_ID, TO_NUMBER, MESSAGE);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/message/sendText/${INSTANCE_NAME}`,
          expect.objectContaining({
            number: FORMATTED,
            text: MESSAGE,
            linkPreview: true,
          }),
          expect.objectContaining({ headers: { apikey: API_KEY } })
        );

        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              businessId: BUSINESS_ID,
              direction: 'outbound',
              type: 'text',
              content: MESSAGE,
              status: 'sent',
            }),
          })
        );

        expect(result).toEqual({ key: { id: 'wa-msg-123' } });
      });

      it('formats Indian 10-digit numbers with +91', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });

        await EvolutionApiService.sendText(BUSINESS_ID, '9876543210', MESSAGE);

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.number).toBe('919876543210');
      });

      it('saves failed message when API call fails', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Invalid number'));

        await expect(
          EvolutionApiService.sendText(BUSINESS_ID, TO_NUMBER, MESSAGE)
        ).rejects.toThrow('Invalid number');

        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              businessId: BUSINESS_ID,
              direction: 'outbound',
              type: 'text',
              content: MESSAGE,
              status: 'failed',
              error: 'Invalid number',
            }),
          })
        );
      });

      it('supports link preview option', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });

        await EvolutionApiService.sendText(BUSINESS_ID, TO_NUMBER, MESSAGE, { linkPreview: false });

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.linkPreview).toBe(false);
      });
    });

    describe('sendMedia', () => {
      const TO_NUMBER = '+91 98765 43210';
      const MEDIA_URL = 'https://example.com/image.jpg';
      const CAPTION = 'Check this out!';

      it('sends image message', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });

        await EvolutionApiService.sendMedia(BUSINESS_ID, TO_NUMBER, MEDIA_URL, 'image', CAPTION);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/message/sendMedia/${INSTANCE_NAME}`,
          expect.objectContaining({
            mediatype: 'image',
            media: { url: MEDIA_URL },
            caption: CAPTION,
          }),
          expect.any(Object)
        );
      });

      it('sends video message without caption', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });

        await EvolutionApiService.sendMedia(BUSINESS_ID, TO_NUMBER, MEDIA_URL, 'video');

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.mediatype).toBe('video');
        expect(axiosCall.caption).toBeUndefined();
      });

      it('sends document message', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });

        await EvolutionApiService.sendMedia(BUSINESS_ID, TO_NUMBER, MEDIA_URL, 'document');

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.mediatype).toBe('document');
      });

      it('sends audio message', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });

        await EvolutionApiService.sendMedia(BUSINESS_ID, TO_NUMBER, MEDIA_URL, 'audio');

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.mediatype).toBe('audio');
      });
    });

    describe('sendTemplate', () => {
      it('sends button template message', async () => {
        mockedAxios.post.mockResolvedValue({
          data: { key: { id: 'template-msg-1' } },
        });

        const templateData = {
          text: 'Would you like to proceed?',
          footer: 'BizzAuto Team',
          buttons: [
            { type: 'reply' as const, title: 'Yes' },
            { type: 'url' as const, title: 'Learn More', url: 'https://example.com' },
            { type: 'call' as const, title: 'Call Us', phone: '+919876543210' },
          ],
        };

        const result = await EvolutionApiService.sendTemplate(
          BUSINESS_ID, '+91 98765 43210', templateData
        );

        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/message/sendButtons/${INSTANCE_NAME}`,
          expect.objectContaining({
            text: templateData.text,
            footer: templateData.footer,
            buttons: [
              { index: 1, type: 'replyButton', title: 'Yes' },
              { index: 2, type: 'urlButton', title: 'Learn More', url: 'https://example.com' },
              { index: 3, type: 'callButton', title: 'Call Us', phone: '+919876543210' },
            ],
          }),
          expect.any(Object)
        );

        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'template',
              interactiveType: 'button',
            }),
          })
        );

        expect(result).toEqual({ key: { id: 'template-msg-1' } });
      });
    });

    describe('bulkSend', () => {
      it('queues messages and returns estimated time', async () => {
        mockedPrisma.$transaction.mockImplementation(async (items: any) => items);

        const messages = [
          { to: '+91 98765 43210', type: 'text' as const, content: 'Msg 1' },
          { to: '+91 87654 32109', type: 'text' as const, content: 'Msg 2' },
          { to: '+91 76543 21098', type: 'text' as const, content: 'Msg 3' },
        ];

        const result = await EvolutionApiService.bulkSend(BUSINESS_ID, messages);

        expect(result.queued).toBe(3);
        expect(result.estimatedTime).toBeDefined();
        expect(mockedPrisma.$transaction).toHaveBeenCalled();
      });

      it('estimates time correctly based on delay', async () => {
        mockedPrisma.$transaction.mockImplementation(async (items: any) => items);
        mockedPrisma.campaign.update.mockResolvedValue({});

        const messages = [
          { to: '+91 98765 43210', type: 'text' as const, content: 'Msg 1' },
        ];

        const result = await EvolutionApiService.bulkSend(BUSINESS_ID, messages, {
          delayBetween: 2000,
          campaignId: 'camp-1',
        });

        expect(result.estimatedTime).toBe('2s');
      });

      it('updates campaign when campaignId is provided', async () => {
        mockedPrisma.$transaction.mockImplementation(async (items: any) => items);
        mockedPrisma.campaign.update.mockResolvedValue({});

        const messages = [
          { to: '+91 98765 43210', type: 'text' as const, content: 'Msg 1' },
        ];

        await EvolutionApiService.bulkSend(BUSINESS_ID, messages, { campaignId: 'camp-1' });

        expect(mockedPrisma.campaign.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'camp-1' },
            data: expect.objectContaining({
              totalSent: { increment: 1 },
              targetContacts: { increment: 1 },
            }),
          })
        );
      });
    });
  });

  // ==================== CHATS & CONTACTS ====================

  describe('Chats & Contacts', () => {
    beforeEach(() => {
      mockedPrisma.integration.findFirst.mockResolvedValue({
        config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME },
      });
    });

    describe('fetchChats', () => {
      it('fetches and returns chats', async () => {
        mockedAxios.post.mockResolvedValue({
          data: [
            { id: 'chat-1', name: 'John Doe' },
            { id: 'chat-2', name: 'Jane Smith' },
          ],
        });

        const chats = await EvolutionApiService.fetchChats(BUSINESS_ID);

        expect(chats).toHaveLength(2);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/chat/findChats/${INSTANCE_NAME}`,
          {},
          expect.any(Object)
        );
      });

      it('returns empty array on error', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Failed to fetch'));

        const chats = await EvolutionApiService.fetchChats(BUSINESS_ID);

        expect(chats).toEqual([]);
      });
    });

    describe('fetchMessages', () => {
      it('fetches messages with limit', async () => {
        mockedAxios.post.mockResolvedValue({
          data: [{ id: 'msg-1' }, { id: 'msg-2' }],
        });

        const messages = await EvolutionApiService.fetchMessages(BUSINESS_ID, '919876543210@s.whatsapp.net', {
          limit: 10,
        });

        expect(messages).toHaveLength(2);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/chat/findMessages/${INSTANCE_NAME}`,
          expect.objectContaining({
            where: { key: { remoteJid: '919876543210@s.whatsapp.net' } },
            limit: 10,
          }),
          expect.any(Object)
        );
      });

      it('uses default limit of 50 when not specified', async () => {
        mockedAxios.post.mockResolvedValue({ data: [] });

        await EvolutionApiService.fetchMessages(BUSINESS_ID, 'test@s.whatsapp.net');

        const axiosCall: any = mockedAxios.post.mock.calls[0][1];
        expect(axiosCall.limit).toBe(50);
      });
    });

    describe('checkNumber', () => {
      it('returns exists=true when number is on WhatsApp', async () => {
        mockedAxios.post.mockResolvedValue({
          data: [{ exists: true, jid: '919876543210@s.whatsapp.net' }],
        });

        const result = await EvolutionApiService.checkNumber(BUSINESS_ID, '+919876543210');

        expect(result.exists).toBe(true);
        expect(result.jid).toBe('919876543210@s.whatsapp.net');
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `${BASE_URL}/chat/whatsappNumbers/${INSTANCE_NAME}`,
          { numbers: ['919876543210'] },
          expect.any(Object)
        );
      });

      it('returns exists=false when number is not found', async () => {
        mockedAxios.post.mockResolvedValue({
          data: [{ exists: false, jid: '' }],
        });

        const result = await EvolutionApiService.checkNumber(BUSINESS_ID, '+9112345');

        expect(result.exists).toBe(false);
      });

      it('returns exists=false on API error', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Check failed'));

        const result = await EvolutionApiService.checkNumber(BUSINESS_ID, '+9112345');

        expect(result.exists).toBe(false);
        expect(result.jid).toBe('');
      });
    });
  });

  // ==================== WEBHOOK ====================

  describe('Webhook Processing', () => {
    beforeEach(() => {
      mockedPrisma.integration.findFirst.mockResolvedValue({
        id: `evo_${BUSINESS_ID}`,
        config: { baseUrl: BASE_URL, apiKey: API_KEY, instanceName: INSTANCE_NAME, status: 'scanning' },
      });
      mockedPrisma.integration.update.mockResolvedValue({});
    });

    describe('CONNECTION_UPDATE', () => {
      it('updates status to connected when state is open', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'CONNECTION_UPDATE',
          data: { status: 'open' },
        });

        expect(mockedPrisma.integration.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: `evo_${BUSINESS_ID}` },
            data: {
              config: expect.objectContaining({ status: 'connected' }),
            },
          })
        );
      });

      it('updates status to disconnected when state is close', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'CONNECTION_UPDATE',
          data: { status: 'close' },
        });

        expect(mockedPrisma.integration.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: `evo_${BUSINESS_ID}` },
            data: {
              config: expect.objectContaining({ status: 'disconnected' }),
            },
          })
        );
      });
    });

    describe('QRCODE_UPDATED', () => {
      it('updates status to scanning', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'QRCODE_UPDATED',
          data: { qrcode: { code: 'new-qr' } },
        });

        expect(mockedPrisma.integration.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: `evo_${BUSINESS_ID}` },
            data: {
              config: expect.objectContaining({ status: 'scanning' }),
            },
          })
        );
      });
    });

    describe('MESSAGES_UPSERT', () => {
      const INCOMING_MSG = {
        event: 'MESSAGES_UPSERT',
        data: {
          key: {
            remoteJid: '919876543210@s.whatsapp.net',
            id: 'wa-incoming-1',
          },
          message: {
            conversation: 'Hello! I am interested in your product.',
          },
        },
      };

      beforeEach(() => {
        mockedPrisma.contact.findFirst.mockResolvedValue(null);
        mockedPrisma.contact.create.mockResolvedValue({
          id: 'new-contact-1',
        });
        mockedPrisma.contact.update.mockResolvedValue({});
        mockedPrisma.message.create.mockResolvedValue({});
      });

      it('creates message and finds-or-creates contact', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, INCOMING_MSG);

        // Should find or create contact
        expect(mockedPrisma.contact.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { businessId: BUSINESS_ID, phone: '919876543210' },
          })
        );
        expect(mockedPrisma.contact.create).toHaveBeenCalled();

        // Should create message
        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              businessId: BUSINESS_ID,
              direction: 'inbound',
              type: 'text',
              content: 'Hello! I am interested in your product.',
              waMessageId: 'wa-incoming-1',
              status: 'received',
            }),
          })
        );

        // Since findFirst returned null, the service should create (not update) the contact
        // No contact.update should be called in this case
        expect(mockedPrisma.contact.update).not.toHaveBeenCalled();
      });

      it('skips messages from self (fromMe=true)', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPSERT',
          data: {
            key: { remoteJid: 'test@s.whatsapp.net', fromMe: true },
            message: { conversation: 'Outgoing message' },
          },
        });

        expect(mockedPrisma.message.create).not.toHaveBeenCalled();
      });

      it('handles extended text messages', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPSERT',
          data: {
            key: { remoteJid: '919876543210@s.whatsapp.net', id: 'wa-2' },
            message: {
              extendedTextMessage: { text: 'This is an extended text message' },
            },
          },
        });

        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: 'This is an extended text message',
            }),
          })
        );
      });

      it('handles image messages with captions', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPSERT',
          data: {
            key: { remoteJid: '919876543210@s.whatsapp.net', id: 'wa-img' },
            message: {
              imageMessage: { caption: 'Look at this photo!' },
            },
          },
        });

        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: 'Look at this photo!',
              type: 'image',
            }),
          })
        );
      });

      it('skips messages with no content and no media', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPSERT',
          data: {
            key: { remoteJid: '919876543210@s.whatsapp.net' },
            message: {},
          },
        });

        expect(mockedPrisma.message.create).not.toHaveBeenCalled();
      });

      it('uses existing contact when found', async () => {
        mockedPrisma.contact.findFirst.mockResolvedValue({
          id: 'existing-contact-1',
        });

        await EvolutionApiService.processWebhook(BUSINESS_ID, INCOMING_MSG);

        expect(mockedPrisma.contact.create).not.toHaveBeenCalled();
        expect(mockedPrisma.message.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              contactId: 'existing-contact-1',
            }),
          })
        );
      });
    });

    describe('MESSAGES_UPDATE', () => {
      it('updates message status to delivered (1)', async () => {
        mockedPrisma.message.updateMany.mockResolvedValue({ count: 1 });

        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPDATE',
          data: {
            key: { id: 'wa-msg-1' },
            status: '1',
          },
        });

        expect(mockedPrisma.message.updateMany).toHaveBeenCalledWith({
          where: { waMessageId: 'wa-msg-1' },
          data: expect.objectContaining({ status: 'delivered' }),
        });
      });

      it('updates message status to read (2)', async () => {
        mockedPrisma.message.updateMany.mockResolvedValue({ count: 1 });

        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPDATE',
          data: {
            key: { id: 'wa-msg-2' },
            status: '2',
          },
        });

        expect(mockedPrisma.message.updateMany).toHaveBeenCalledWith({
          where: { waMessageId: 'wa-msg-2' },
          data: expect.objectContaining({ status: 'read' }),
        });
      });

      it('sets statusTimestamp when updating', async () => {
        mockedPrisma.message.updateMany.mockResolvedValue({ count: 1 });

        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'MESSAGES_UPDATE',
          data: {
            key: { id: 'wa-msg-3' },
            status: '1',
          },
        });

        expect(mockedPrisma.message.updateMany).toHaveBeenCalledWith({
          where: { waMessageId: 'wa-msg-3' },
          data: expect.objectContaining({
            status: 'delivered',
            statusTimestamp: expect.any(Date),
          }),
        });
      });
    });

    describe('Unknown Events', () => {
      it('ignores unknown event types without errors', async () => {
        await EvolutionApiService.processWebhook(BUSINESS_ID, {
          event: 'UNKNOWN_EVENT',
          data: { some: 'data' },
        });

        // No DB operations should occur
        expect(mockedPrisma.integration.update).not.toHaveBeenCalled();
        expect(mockedPrisma.message.create).not.toHaveBeenCalled();
        expect(mockedPrisma.message.updateMany).not.toHaveBeenCalled();
      });
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('throws error when getConfig fails (no integration)', async () => {
      mockedPrisma.integration.findFirst.mockResolvedValue(null);

      await expect(
        EvolutionApiService.connectInstance(BUSINESS_ID)
      ).rejects.toThrow('Evolution API not configured');
    });

    it('throws error when getConfig called with missing businessId', async () => {
      mockedPrisma.integration.findFirst.mockResolvedValue(null);

      await expect(
        EvolutionApiService.connectInstance('')
      ).rejects.toThrow('Evolution API not configured');
    });
  });
});
