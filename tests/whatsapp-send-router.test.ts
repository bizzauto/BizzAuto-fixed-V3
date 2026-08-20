/**
 * @jest-environment node
 * 
 * Tests for WhatsAppSendRouter - the centralized channel resolver
 * that routes all outbound WhatsApp messages via Meta Cloud API 
 * (preferred) or Evolution API (fallback).
 */
/// <reference types="jest" />

import { WhatsAppSendRouter } from '../src/server/services/whatsapp-send-router.service.js';

// Mock all dependencies using inline factories (jest.mock is hoisted)
jest.mock('../src/server/db.js', () => {
  const mockBusiness = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const mockIntegration = {
    findFirst: jest.fn(),
  };
  const mockMessage = {
    create: jest.fn(),
  };
  return {
    prisma: {
      business: mockBusiness,
      integration: mockIntegration,
      message: mockMessage,
    },
    __mockBusiness: mockBusiness,
    __mockIntegration: mockIntegration,
    __mockMessage: mockMessage,
  };
});

jest.mock('../src/server/utils/auth.js', () => ({
  decrypt: (val: string) => val + '_decrypted',
  encrypt: (val: string) => val + '_encrypted',
}));

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
}));

// Mock EvolutionApiService
jest.mock('../src/server/services/evolution.service.js', () => ({
  EvolutionApiService: {
    sendText: jest.fn(),
    sendMedia: jest.fn(),
    formatPhone: jest.fn((phone: string) => phone.replace(/\D/g, '')),
    getConfig: jest.fn(),
  },
}));

// Get references to mocks after hoisting
const dbModule = require('../src/server/db.js');
const mockPrisma = dbModule.prisma;
const axios = require('axios');
const { EvolutionApiService } = require('../src/server/services/evolution.service.js');

describe('WhatsAppSendRouter', () => {
  const BUSINESS_ID = 'biz_test_123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the internal cache
    (WhatsAppSendRouter as any).channelCache.clear();
  });

  describe('resolveChannel', () => {
    it('should return meta channel when waPhoneNumberId and waAccessToken are set', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: '123456789',
        waAccessToken: 'encrypted_token',
        waPhoneNumber: '+15551234567',
      });

      const result = await WhatsAppSendRouter.resolveChannel(BUSINESS_ID);
      
      expect(result.channel).toBe('meta');
      expect(result.reason).toBe('meta_configured');
    });

    it('should return evolution channel when integration is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: null,
        waAccessToken: null,
      });
      mockPrisma.integration.findFirst.mockResolvedValue({
        id: 'int_123',
        type: 'evolution_api',
        isActive: true,
        config: {
          baseUrl: 'http://evolution:8080',
          apiKey: 'evo_key_123',
          instanceName: 'biz_instance',
        },
      });

      const result = await WhatsAppSendRouter.resolveChannel(BUSINESS_ID);
      
      expect(result.channel).toBe('evolution');
    });

    it('should return evolution channel from env fallback', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: null,
        waAccessToken: null,
      });
      mockPrisma.integration.findFirst.mockResolvedValue(null);
      
      process.env.EVOLUTION_API_URL = 'http://evolution:8080';
      process.env.EVOLUTION_API_KEY = 'env_key_123';

      const result = await WhatsAppSendRouter.resolveChannel(BUSINESS_ID);
      
      expect(result.channel).toBe('evolution');
      
      delete process.env.EVOLUTION_API_URL;
      delete process.env.EVOLUTION_API_KEY;
    });

    it('should return null channel when no channel is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: null,
        waAccessToken: null,
      });
      mockPrisma.integration.findFirst.mockResolvedValue(null);

      const result = await WhatsAppSendRouter.resolveChannel(BUSINESS_ID);
      
      expect(result.channel).toBe(null);
      expect(result.reason).toBe('no_channel_configured');
    });
  });

  describe('sendTextMessage', () => {
    it('should send via Meta when meta channel is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: '123456789',
        waAccessToken: 'token_abc',
      });
      mockPrisma.message.create.mockResolvedValue({});
      mockPrisma.business.update.mockResolvedValue({});

      axios.post.mockResolvedValue({
        data: { messages: [{ id: 'msg_999' }] },
      });

      const result = await WhatsAppSendRouter.sendTextMessage(
        BUSINESS_ID,
        '919999999999',
        'Test message'
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('meta');
      expect(result.messageId).toBe('msg_999');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('123456789/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '919999999999',
          type: 'text',
        }),
        expect.any(Object)
      );
    });

    it('should send via Evolution when evolution channel is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: null,
        waAccessToken: null,
      });
      mockPrisma.integration.findFirst.mockResolvedValue({
        config: {
          baseUrl: 'http://evolution:8080',
          apiKey: 'evo_key_123',
          instanceName: 'biz_instance',
        },
      });

      EvolutionApiService.sendText.mockResolvedValue({
        data: { key: { id: 'evo_msg_999' } },
      });
      mockPrisma.message.create.mockResolvedValue({});

      const result = await WhatsAppSendRouter.sendTextMessage(
        BUSINESS_ID,
        '919999999999',
        'Test via Evolution'
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('evolution');
      expect(EvolutionApiService.sendText).toHaveBeenCalledWith(
        BUSINESS_ID,
        '919999999999',
        'Test via Evolution'
      );
    });

    it('should return error when no channel is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: null,
        waAccessToken: null,
      });
      mockPrisma.integration.findFirst.mockResolvedValue(null);

      const result = await WhatsAppSendRouter.sendTextMessage(
        BUSINESS_ID,
        '919999999999',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.channel).toBe('none');
      expect(result.error).toContain('No WhatsApp channel configured');
    });

    it('should save message to database on success', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: '123456789',
        waAccessToken: 'token_abc',
      });
      mockPrisma.message.create.mockResolvedValue({});
      mockPrisma.business.update.mockResolvedValue({});
      axios.post.mockResolvedValue({ data: { messages: [{ id: 'msg_123' }] } });

      await WhatsAppSendRouter.sendTextMessage(
        BUSINESS_ID,
        '919999999999',
        'Test message',
        { messageId: 'contact_123' }
      );

      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            contactId: 'contact_123',
            direction: 'outbound',
            type: 'text',
            status: 'sent',
            waMessageId: 'msg_123',
          }),
        })
      );
    });

    it('should increment business message count on success', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: '123456789',
        waAccessToken: 'token_abc',
      });
      mockPrisma.message.create.mockResolvedValue({});
      mockPrisma.business.update.mockResolvedValue({});
      axios.post.mockResolvedValue({ data: { messages: [{ id: 'msg_1' }] } });

      await WhatsAppSendRouter.sendTextMessage(BUSINESS_ID, '919999999999', 'Hi');

      expect(mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { totalMessages: { increment: 1 } },
        })
      );
    });
  });

  describe('clearCache', () => {
    it('should clear the channel cache for a business', async () => {
      // Set up cache
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: '123456789',
        waAccessToken: 'token_abc',
      });

      await WhatsAppSendRouter.resolveChannel(BUSINESS_ID);
      
      // Verify cached
      const cached = (WhatsAppSendRouter as any).channelCache.get(BUSINESS_ID);
      expect(cached).toBeDefined();

      // Clear
      WhatsAppSendRouter.clearCache(BUSINESS_ID);
      const cleared = (WhatsAppSendRouter as any).channelCache.get(BUSINESS_ID);
      expect(cleared).toBeUndefined();
    });
  });

  describe('hasChannel', () => {
    it('should return true when meta channel is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: '123456789',
        waAccessToken: 'token_abc',
      });

      const result = await WhatsAppSendRouter.hasChannel(BUSINESS_ID);
      expect(result).toBe(true);
    });

    it('should return false when no channel is configured', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        waPhoneNumberId: null,
        waAccessToken: null,
      });
      mockPrisma.integration.findFirst.mockResolvedValue(null);

      const result = await WhatsAppSendRouter.hasChannel(BUSINESS_ID);
      expect(result).toBe(false);
    });
  });
});