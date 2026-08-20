/**
 * @jest-environment node
 *
 * Unit tests for WhatsAppPaymentService.verifyPayment
 * Covers all code paths: DB lookup, Razorpay API verification, UPI fallback, not found, and error cases.
 */

// ======== Mocks — must be before any imports ========
const mockPrisma = {
  paymentLinkTransaction: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  paymentLink: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

const mockPaymentsFetch = jest.fn();
const mockOrdersCreate = jest.fn();

jest.mock('../src/server/db.js', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/server/services/razorpay.service.js', () => ({
  razorpay: {
    payments: { fetch: mockPaymentsFetch },
    orders: { create: mockOrdersCreate },
  },
}));

// ======== Import after mocks ========
import { WhatsAppPaymentService } from '../src/server/services/whatsapp-payment.service.js';

describe('WhatsAppPaymentService.verifyPayment', () => {
  let service: WhatsAppPaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsAppPaymentService();
  });

  // Shared mock transaction shapes
  const capturedTx = {
    id: 'tx-captured-1',
    status: 'captured',
    razorpayPaymentId: 'rp_pay_captured',
    linkId: 'link-1',
    amount: 50000,
  };

  const completedTx = {
    id: 'tx-completed-1',
    status: 'completed',
    razorpayPaymentId: 'rp_pay_completed',
    linkId: 'link-1',
  };

  const failedTx = {
    id: 'tx-failed-1',
    status: 'failed',
    razorpayPaymentId: 'rp_pay_failed',
    linkId: 'link-1',
  };

  const pendingRazorpayTx = {
    id: 'tx-pending-rp-1',
    status: 'pending',
    razorpayPaymentId: 'rp_pay_pending',
    linkId: 'link-1',
  };

  const pendingUpiTx = {
    id: 'tx-pending-upi-1',
    status: 'pending',
    razorpayPaymentId: null,
    linkId: 'link-1',
  };

  // ==================== 1. FOUND BY ID — STATUS ALREADY CAPTURED ====================

  describe('Found by ID — captured/completed status', () => {
    it('returns verified=true when status is captured', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(capturedTx);

      const result = await service.verifyPayment('tx-captured-1');

      expect(result).toEqual({ verified: true, status: 'completed' });
      expect(mockPrisma.paymentLinkTransaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx-captured-1' },
      });
      expect(mockPrisma.paymentLinkTransaction.findFirst).not.toHaveBeenCalled();
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });

    it('returns verified=true when status is completed', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(completedTx);

      const result = await service.verifyPayment('tx-completed-1');

      expect(result).toEqual({ verified: true, status: 'completed' });
    });
  });

  // ==================== 2. FOUND BY ID — STATUS FAILED ====================

  describe('Found by ID — failed status', () => {
    it('returns verified=false when status is failed', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(failedTx);

      const result = await service.verifyPayment('tx-failed-1');

      expect(result).toEqual({ verified: false, status: 'failed' });
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });
  });

  // ==================== 3. FOUND BY RAZORPAY_PAYMENT_ID — PENDING — RAZORPAY VERIFICATION ====================

  describe('Found by razorpayPaymentId — pending — Razorpay API verification', () => {
    it('returns verified=true when Razorpay confirms captured status and updates DB', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(pendingRazorpayTx);
      mockPaymentsFetch.mockResolvedValue({ status: 'captured' });
      mockPrisma.paymentLinkTransaction.update.mockResolvedValue({});

      const result = await service.verifyPayment('rp_pay_pending');

      expect(result).toEqual({ verified: true, status: 'captured' });
      expect(mockPrisma.paymentLinkTransaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'rp_pay_pending' },
      });
      expect(mockPrisma.paymentLinkTransaction.findFirst).toHaveBeenCalledWith({
        where: { razorpayPaymentId: 'rp_pay_pending' },
      });
      expect(mockPaymentsFetch).toHaveBeenCalledWith('rp_pay_pending');
      expect(mockPrisma.paymentLinkTransaction.update).toHaveBeenCalledWith({
        where: { id: pendingRazorpayTx.id },
        data: { status: 'captured' },
      });
    });

    it('returns verified=false when Razorpay returns non-captured status', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(pendingRazorpayTx);
      mockPaymentsFetch.mockResolvedValue({ status: 'failed' });

      const result = await service.verifyPayment('rp_pay_pending');

      expect(result).toEqual({ verified: false, status: 'failed' });
      expect(mockPrisma.paymentLinkTransaction.update).not.toHaveBeenCalled();
    });

    it('returns verified=false with DB status when Razorpay API call fails', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(pendingRazorpayTx);
      mockPaymentsFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.verifyPayment('rp_pay_pending');

      expect(result).toEqual({ verified: false, status: 'pending' });
      expect(mockPrisma.paymentLinkTransaction.update).not.toHaveBeenCalled();
    });
  });

  // ==================== 4. PENDING — RAZORPAY CLIENT NULL (INJECTED) ====================

  describe('Pending — razorpay client is null (injected via constructor)', () => {
    it('returns verified=false when razorpayClient is null even with razorpayPaymentId', async () => {
      const svc = new WhatsAppPaymentService(null);

      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(pendingRazorpayTx);

      const result = await svc.verifyPayment('rp_pay_pending');

      expect(result).toEqual({ verified: false, status: 'pending' });
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });

    it('returns verified=false with not_found when razorpayClient is null and no DB transaction', async () => {
      const svc = new WhatsAppPaymentService(null);

      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(null);

      const result = await svc.verifyPayment('nonexistent-id');

      expect(result).toEqual({ verified: false, status: 'not_found' });
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });
  });

  // ==================== 5. FOUND — PENDING — UPI (NO RAZORPAY PAYMENT ID) ====================

  describe('Found — pending — UPI (no razorpayPaymentId)', () => {
    it('returns verified=false for pending UPI transactions', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(pendingUpiTx);

      const result = await service.verifyPayment('tx-pending-upi-1');

      expect(result).toEqual({ verified: false, status: 'pending' });
      expect(mockPaymentsFetch).not.toHaveBeenCalled();
    });
  });

  // ==================== 6. NOT FOUND IN DB — DIRECT RAZORPAY LOOKUP ====================

  describe('Not found in DB — direct Razorpay lookup', () => {
    it('returns verified=true when Razorpay confirms a raw payment ID', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(null);
      mockPaymentsFetch.mockResolvedValue({ status: 'captured' });

      const result = await service.verifyPayment('rp_pay_raw_captured');

      expect(result).toEqual({ verified: true, status: 'captured' });
      expect(mockPaymentsFetch).toHaveBeenCalledWith('rp_pay_raw_captured');
    });

    it('returns verified=false when Razorpay returns non-captured status', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(null);
      mockPaymentsFetch.mockResolvedValue({ status: 'created' });

      const result = await service.verifyPayment('rp_pay_raw_created');

      expect(result).toEqual({ verified: false, status: 'created' });
    });

    it('returns verified=false when Razorpay fetch throws (not a valid payment ID)', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(null);
      mockPaymentsFetch.mockRejectedValue(new Error('Payment not found'));

      const result = await service.verifyPayment('invalid-id');

      expect(result).toEqual({ verified: false, status: 'not_found' });
    });

    it('returns verified=false when Razorpay returns null payment', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(null);
      mockPaymentsFetch.mockResolvedValue(null);

      const result = await service.verifyPayment('rp_pay_null');

      expect(result).toEqual({ verified: false, status: 'unknown' });
    });
  });

  // ==================== 7. UNEXPECTED ERROR ====================

  describe('Unexpected error', () => {
    it('returns verified=false with error status when Prisma throws', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const result = await service.verifyPayment('tx-1');

      expect(result).toEqual({ verified: false, status: 'error' });
    });
  });

  // ==================== 8. FOUND BY RAZORPAYPAYMENTID FALLBACK ====================

  describe('Found by razorpayPaymentId fallback', () => {
    it('searches by razorpayPaymentId when findUnique returns null', async () => {
      mockPrisma.paymentLinkTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.paymentLinkTransaction.findFirst.mockResolvedValue(capturedTx);

      const result = await service.verifyPayment('rp_pay_captured');

      expect(result).toEqual({ verified: true, status: 'completed' });
      expect(mockPrisma.paymentLinkTransaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'rp_pay_captured' },
      });
      expect(mockPrisma.paymentLinkTransaction.findFirst).toHaveBeenCalledWith({
        where: { razorpayPaymentId: 'rp_pay_captured' },
      });
    });
  });
});
