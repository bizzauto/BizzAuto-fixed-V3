import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { razorpay } from './razorpay.service.js';
import { prisma } from '../db.js';

interface UpiPaymentRequest {
  phone: string;
  amount: number;
  description: string;
  orderId?: string;
  customerName?: string;
}

interface UpiPaymentResponse {
  success: boolean;
  transactionId?: string;
  amount?: number;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  upiLink?: string;
  qrCode?: string;
}

const UPI_VPA = process.env.UPI_VPA || 'bizzauto@upi';
const UPI_MERCHANT_NAME = 'BizzAuto CRM';

export class WhatsAppPaymentService {
  private razorpayClient: typeof razorpay | null;

  constructor(razorpayClient?: typeof razorpay | null) {
    this.razorpayClient = razorpayClient !== undefined ? razorpayClient : razorpay;
  }

  // Create UPI payment link for WhatsApp
  async createUpiPayment(data: UpiPaymentRequest): Promise<UpiPaymentResponse> {
    try {
      const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Create UPI deep link
      const upiLink = this.generateUpiLink({
        vpa: UPI_VPA,
        amount: data.amount.toString(),
        transactionId,
        note: data.description.substring(0, 50),
        name: data.customerName || UPI_MERCHANT_NAME,
      });

      // Generate QR code for payment
      const qrCode = await this.generateQrCode(upiLink);

      return {
        success: true,
        transactionId,
        amount: data.amount,
        status: 'pending',
        upiLink,
        qrCode,
        message: `Payment link created for ₹${data.amount}`,
      };
    } catch (error) {
      console.error('UPI Payment error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Failed to create payment link',
      };
    }
  }

  // Generate UPI deep link
  private generateUpiLink(params: { vpa: string; amount: string; transactionId: string; note: string; name: string }): string {
    const { vpa, amount, transactionId, note, name } = params;
    
    // UPI deep link format
    const upiLink = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${transactionId}`;
    
    // Also create a web payment URL as fallback
    const webUrl = `https://pay.google.com/pay/v1/widget/sandbox/pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    return upiLink;
  }

  // Generate QR code
  private async generateQrCode(data: string): Promise<string> {
    // Using QR Server API (free, no key required)
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  }

  // Verify payment status by checking DB + Razorpay API
  async verifyPayment(transactionId: string): Promise<{ verified: boolean; status: string }> {
    try {
      // 1. Look up transaction in DB by ID
      let transaction = await prisma.paymentLinkTransaction.findUnique({
        where: { id: transactionId },
      });

      // 2. If not found by ID, try as razorpayPaymentId
      if (!transaction) {
        transaction = await prisma.paymentLinkTransaction.findFirst({
          where: { razorpayPaymentId: transactionId },
        });
      }

      if (transaction) {
        // Already captured/confirmed in DB
        if (transaction.status === 'captured' || transaction.status === 'completed') {
          return { verified: true, status: 'completed' };
        }

        if (transaction.status === 'failed') {
          return { verified: false, status: 'failed' };
        }

        // Pending with Razorpay payment ID — verify live with Razorpay API
        if (transaction.razorpayPaymentId && this.razorpayClient) {
          try {
            const payment = await (this.razorpayClient.payments.fetch as any)(transaction.razorpayPaymentId);
            if (payment && payment.status === 'captured') {
              // Update DB to reflect captured status
              await prisma.paymentLinkTransaction.update({
                where: { id: transaction.id },
                data: { status: 'captured' },
              });
              return { verified: true, status: 'captured' };
            }
            return { verified: false, status: payment?.status || 'pending' };
          } catch (razorpayErr) {
            console.warn('[WhatsAppPayment] Razorpay fetch failed:', razorpayErr);
            return { verified: false, status: transaction.status };
          }
        }

        // UPI or non-Razorpay — can't auto-verify, return DB status
        return { verified: false, status: transaction.status };
      }

      // 3. Not found in our DB — try direct Razorpay payment lookup
      if (this.razorpayClient) {
        try {
          const payment = await (this.razorpayClient.payments.fetch as any)(transactionId);
          if (payment && payment.status === 'captured') {
            return { verified: true, status: 'captured' };
          }
          return { verified: false, status: payment?.status || 'unknown' };
        } catch {
          // Not a valid Razorpay payment ID either
        }
      }

      return { verified: false, status: 'not_found' };
    } catch (error) {
      console.error('[WhatsAppPayment] verifyPayment error:', error);
      return { verified: false, status: 'error' };
    }
  }

  // Send payment link via WhatsApp
  async sendPaymentLink(phone: string, amount: number, description: string, customerName?: string): Promise<{ success: boolean; messageId?: string }> {
    const paymentData: UpiPaymentRequest = {
      phone,
      amount,
      description,
      customerName,
    };

    const payment = await this.createUpiPayment(paymentData);

    if (!payment.success) {
      return { success: false };
    }

    // Create WhatsApp message with payment link
    const message = `💰 *Payment Request*\n\n` +
      `*Dear ${customerName || 'Customer'}*,\n\n` +
      `Amount: *₹${amount}*\n` +
      `Description: ${description}\n\n` +
      `Click to pay: ${payment.upiLink}\n\n` +
      `Or scan QR code: ${payment.qrCode}\n\n` +
      `Transaction ID: ${payment.transactionId}\n\n` +
      `Powered by BizzAuto CRM`;

    return {
      success: true,
      messageId: payment.transactionId,
    };
  }

  // Handle Razorpay webhook events (payment.captured, payment.failed)
  async handleRazorpayWebhook(event: string, payload: any): Promise<{ success: boolean }> {
    try {
      switch (event) {
        case 'payment.captured': {
          const payment = payload?.payment?.entity;
          if (!payment?.id) {
            console.warn('[WhatsAppPayment] Webhook missing payment entity');
            return { success: false };
          }

          console.log(`[WhatsAppPayment] Payment captured: ${payment.id}, order: ${payment.order_id}, amount: ${payment.amount}`);

          // Find and update the PaymentLinkTransaction
          const transaction = await prisma.paymentLinkTransaction.findFirst({
            where: { razorpayPaymentId: payment.id },
          });

          if (transaction) {
            await prisma.paymentLinkTransaction.update({
              where: { id: transaction.id },
              data: { status: 'captured' },
            });

            // Also update the parent PaymentLink stats
            await prisma.paymentLink.update({
              where: { id: transaction.linkId },
              data: {
                paymentCount: { increment: 1 },
                totalCollected: { increment: (payment.amount || 0) / 100 },
              },
            });

            console.log(`[WhatsAppPayment] Transaction ${transaction.id} marked as captured`);
          } else {
            // Not found by razorpayPaymentId — try matching by order_id
            const orderId = payment.order_id;
            if (orderId) {
              // Check if transaction already exists for this payment (prevents duplicates on webhook retry)
              const existingByOrder = await prisma.paymentLinkTransaction.findFirst({
                where: {
                  metadata: { path: ['orderId'], equals: orderId },
                } as any,
              });

              if (existingByOrder) {
                console.log(`[WhatsAppPayment] Duplicate webhook — transaction already exists for order ${orderId}`);
                break;
              }

              // Look up the PaymentLink by razorpayOrderId
              const link = await prisma.paymentLink.findFirst({
                where: { razorpayOrderId: orderId },
              });

              if (link) {
                // Create a transaction record for this captured payment
                await prisma.paymentLinkTransaction.create({
                  data: {
                    linkId: link.id,
                    razorpayPaymentId: payment.id,
                    amount: (payment.amount || 0) / 100,
                    currency: payment.currency || 'INR',
                    status: 'captured',
                    paidAt: new Date(),
                    metadata: {
                      webhookEvent: 'payment.captured',
                      orderId,
                      method: payment.method,
                      bank: payment.bank,
                      vpa: payment.vpa,
                    },
                  },
                });

                await prisma.paymentLink.update({
                  where: { id: link.id },
                  data: {
                    paymentCount: { increment: 1 },
                    totalCollected: { increment: (payment.amount || 0) / 100 },
                  },
                });

                console.log(`[WhatsAppPayment] Created transaction for payment ${payment.id} on link ${link.id}`);
              }
            }
          }
          break;
        }

        case 'payment.failed': {
          const payment = payload?.payment?.entity;
          if (!payment?.id) break;

          console.warn(`[WhatsAppPayment] Payment failed: ${payment.id}, error: ${payment.error_description}`);

          const transaction = await prisma.paymentLinkTransaction.findFirst({
            where: { razorpayPaymentId: payment.id },
          });

          if (transaction) {
            await prisma.paymentLinkTransaction.update({
              where: { id: transaction.id },
              data: { status: 'failed', metadata: { error: payment.error_description } },
            });
            console.log(`[WhatsAppPayment] Transaction ${transaction.id} marked as failed`);
          }
          break;
        }

        default:
          console.log(`[WhatsAppPayment] Unhandled webhook event: ${event}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[WhatsAppPayment] Webhook handler error:', error);
      return { success: false };
    }
  }

  // Create Razorpay Order for larger payments
  async createRazorpayOrder(amount: number, currency: string = 'INR', receipt: string): Promise<{ id: string; amount: number; currency: string } | null> {
    if (!this.razorpayClient) {
      console.log('Razorpay not configured');
      return null;
    }

    try {

      const order = await (this.razorpayClient.orders.create as any)({
        amount: amount * 100, // Convert to paise
        currency,
        receipt,
        payment_capture: 1,
      });

      return {
        id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      return null;
    }
  }
}

export const whatsappPaymentService = new WhatsAppPaymentService();

// Express route handlers
export const createPaymentLink = async (req: Request, res: Response) => {
  const { phone, amount, description, customerName } = req.body;

  if (!phone || !amount || !description) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: phone, amount, description',
    });
  }

  const payment = await whatsappPaymentService.sendPaymentLink(phone, amount, description, customerName);

  res.json({
    success: payment.success,
    message: payment.success ? 'Payment link sent' : 'Failed to create payment link',
  });
};

export const verifyPayment = async (req: Request, res: Response) => {
  const { transactionId } = req.body;

  const result = await whatsappPaymentService.verifyPayment(transactionId);

  res.json({
    success: result.verified,
    status: result.status,
  });
};

// Razorpay webhook handler — receives payment.captured / payment.failed events
// This route must be mounted with express.raw({ type: 'application/json' }) to get the raw body for signature verification.
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    if (webhookSecret && signature) {
      // Verify webhook signature using raw body
      const rawBody = (req as any).rawBody;
      if (rawBody) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        if (expectedSignature !== signature) {
          console.warn('[WhatsAppPayment] Webhook signature mismatch');
          return res.status(401).json({ success: false, error: 'Invalid signature' });
        }
      }
    } else {
      // In production, reject webhooks without a configured secret to prevent spoofing
      if (process.env.NODE_ENV === 'production') {
        console.warn('[WhatsAppPayment] Rejected webhook — RAZORPAY_WEBHOOK_SECRET not configured in production');
        return res.status(401).json({ success: false, error: 'Webhook secret not configured' });
      }
      console.log('[WhatsAppPayment] Webhook secret not configured — skipping signature verification (dev mode only)');
    }

    const { event, payload } = req.body;

    if (!event) {
      return res.status(400).json({ success: false, error: 'Missing event field' });
    }

    const result = await whatsappPaymentService.handleRazorpayWebhook(event, payload);

    res.json(result);
  } catch (error: any) {
    console.error('[WhatsAppPayment] Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};