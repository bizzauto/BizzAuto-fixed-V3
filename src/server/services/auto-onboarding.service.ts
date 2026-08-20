import { prisma } from '../db.js';
import { WhatsAppSendRouter } from './whatsapp-send-router.service.js';
import { EmailService } from './email.service.js';

/**
 * Auto-Onboarding Service
 * Automatically handles new customer onboarding when payment is received
 * 
 * Flow:
 * 1. Payment detected (Razorpay webhook)
 * 2. Contact created/updated with payment info
 * 3. Welcome message sent via WhatsApp + Email
 * 4. Onboarding tasks created for team
 * 5. Deal moved to "Paid" stage
 * 6. Invoice generated
 */
export class AutoOnboardingService {
  /**
   * Process new payment - full auto-onboarding
   */
  static async processPayment(paymentData: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    contactEmail?: string;
    contactPhone?: string;
    contactName?: string;
    planName?: string;
    metadata?: any;
  }): Promise<{
    success: boolean;
    contactId?: string;
    dealId?: string;
    invoiceId?: string;
    message: string;
  }> {
    try {
      console.log(`[AutoOnboarding] Processing payment: ${paymentData.razorpayPaymentId}`);

      // Step 1: Find or create contact
      const contact = await this.findOrCreateContact(paymentData);
      console.log(`[AutoOnboarding] Contact: ${contact.id} - ${contact.name}`);

      // Step 2: Update deal stage to "Paid"
      const deal = await this.createOrUpdateDeal(contact.id, paymentData);
      console.log(`[AutoOnboarding] Deal: ${deal.id}`);

      // Step 3: Generate invoice
      const invoice = await this.generateInvoice(contact.id, paymentData);
      console.log(`[AutoOnboarding] Invoice: ${invoice.id}`);

      // Step 4: Send welcome message via WhatsApp
      if (contact.phone) {
        await this.sendWhatsAppWelcome(contact, paymentData);
        console.log(`[AutoOnboarding] WhatsApp welcome sent`);
      }

      // Step 5: Send welcome email
      if (contact.email) {
        await this.sendEmailWelcome(contact, paymentData);
        console.log(`[AutoOnboarding] Email welcome sent`);
      }

      // Step 6: Create onboarding tasks
      await this.createOnboardingTasks(contact.id, paymentData);
      console.log(`[AutoOnboarding] Tasks created`);

      // Step 7: Create activity log
      await this.logActivity(contact.id, paymentData);

      return {
        success: true,
        contactId: contact.id,
        dealId: deal.id,
        invoiceId: invoice.id,
        message: `Onboarding complete for ${contact.name}`,
      };
    } catch (error: any) {
      console.error(`[AutoOnboarding] Error:`, error);
      return {
        success: false,
        message: `Onboarding failed: ${error.message}`,
      };
    }
  }

  /**
   * Find or create contact from payment data
   */
  static async findOrCreateContact(paymentData: any) {
    const { contactEmail, contactPhone, contactName, metadata } = paymentData;

    // Try to find existing contact
    let contact = null;
    if (contactPhone) {
      contact = await prisma.contact.findFirst({
        where: { phone: contactPhone },
      });
    }
    if (!contact && contactEmail) {
      contact = await prisma.contact.findFirst({
        where: { email: contactEmail },
      });
    }

    if (contact) {
      // Update existing contact
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          tags: [...(contact.tags || []), 'Paid Customer'],
          dealValue: (contact.dealValue || 0) + paymentData.amount / 100,
          lastActivity: new Date(),
        },
      });
    } else {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          businessId: metadata?.businessId || 'default',
          name: contactName || 'New Customer',
          phone: contactPhone || '',
          email: contactEmail || '',
          source: 'payment',
          tags: ['Paid Customer', 'Auto-Onboarded'],
          dealValue: paymentData.amount / 100,
          stageName: 'Paid',
          metadata: {
            razorpayPaymentId: paymentData.razorpayPaymentId,
            razorpayOrderId: paymentData.razorpayOrderId,
            planName: paymentData.planName,
          },
        },
      });
    }

    return contact;
  }

  /**
   * Create or update deal for the payment
   */
  static async createOrUpdateDeal(contactId: string, paymentData: any) {
    // Find existing open deal
    const existingDeal = await prisma.contact.findFirst({
      where: {
        id: contactId,
        stageName: { not: 'Closed Won' },
      },
    });

    if (existingDeal) {
      // Update deal stage
      return await prisma.contact.update({
        where: { id: contactId },
        data: {
          stageName: 'Closed Won',
          dealValue: paymentData.amount / 100,
          lastActivity: new Date(),
        },
      });
    }

    // Create new deal record
    return await prisma.contact.update({
      where: { id: contactId },
      data: {
        stageName: 'Closed Won',
        dealValue: paymentData.amount / 100,
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Generate invoice for the payment
   */
  static async generateInvoice(contactId: string, paymentData: any) {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    return await prisma.document.create({
      data: {
        businessId: 'default',
        contactId,
        type: 'invoice',
        name: `Invoice for ${paymentData.planName || 'Payment'}`,
        documentNumber: invoiceNumber,
        amount: paymentData.amount / 100,
        status: 'paid',
        content: {
          items: [{
            description: paymentData.planName || 'Service Payment',
            quantity: 1,
            rate: paymentData.amount / 100,
            total: paymentData.amount / 100,
          }],
          subtotal: paymentData.amount / 100,
          tax: 0,
          total: paymentData.amount / 100,
        },
        html: this.generateInvoiceHTML(paymentData),
        clientName: paymentData.contactName,
        clientEmail: paymentData.contactEmail,
        sentVia: 'auto',
      } as any,
    });
  }

  /**
   * Send WhatsApp welcome message
   */
  static async sendWhatsAppWelcome(contact: any, paymentData: any) {
    const planName = paymentData.planName || 'Premium Plan';
    const amount = (paymentData.amount / 100).toLocaleString('en-IN');

    const message = `🎉 *Welcome to BizzAuto!*

Hi ${contact.name}! 

Your payment of ₹${amount} for *${planName}* has been received successfully!

Payment ID: ${paymentData.razorpayPaymentId}

*What's next?*
✅ Your account is now active
✅ Our team will contact you within 24 hours
✅ You can start using all features immediately

Need help? Reply to this message or call us.

Thank you for choosing BizzAuto! 🙏`;

    try {
      await WhatsAppSendRouter.sendTextMessage(contact.businessId || 'default', contact.phone, message);
    } catch (error: any) {
      console.error(`[AutoOnboarding] WhatsApp error:`, error.message);
    }
  }

  /**
   * Send welcome email
   */
  static async sendEmailWelcome(contact: any, paymentData: any) {
    const planName = paymentData.planName || 'Premium Plan';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 Welcome to BizzAuto!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>Hi ${contact.name},</p>
          <p>Your payment has been received successfully!</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Amount:</strong> ₹${(paymentData.amount / 100).toLocaleString('en-IN')}</p>
            <p><strong>Payment ID:</strong> ${paymentData.razorpayPaymentId}</p>
          </div>
          <h3>What's next?</h3>
          <ul>
            <li>✅ Your account is now active</li>
            <li>✅ Our team will contact you within 24 hours</li>
            <li>✅ You can start using all features immediately</li>
          </ul>
          <p>Need help? Reply to this email or call us.</p>
          <p>Thank you for choosing BizzAuto! 🙏</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>© 2026 BizzAuto. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await EmailService.sendEmail(
        contact.email,
        '🎉 Welcome to BizzAuto - Payment Confirmed!',
        html
      );
    } catch (error: any) {
      console.error(`[AutoOnboarding] Email error:`, error.message);
    }
  }

  /**
   * Create onboarding tasks for team
   */
  static async createOnboardingTasks(contactId: string, paymentData: any) {
    const tasks = [
      { title: 'Welcome call to customer', priority: 'high', dueIn: 1 },
      { title: 'Setup account credentials', priority: 'high', dueIn: 2 },
      { title: 'Send onboarding documentation', priority: 'medium', dueIn: 3 },
      { title: 'Schedule training session', priority: 'medium', dueIn: 5 },
      { title: 'Follow up after 7 days', priority: 'low', dueIn: 7 },
    ];

    for (const task of tasks) {
      await prisma.activity.create({
        data: {
          businessId: 'default',
          contactId,
          type: 'task',
          title: task.title,
          priority: task.priority,
          dueDate: new Date(Date.now() + task.dueIn * 24 * 60 * 60 * 1000),
          completed: false,
          createdBy: 'auto-onboarding',
        },
      });
    }
  }

  /**
   * Log onboarding activity
   */
  static async logActivity(contactId: string, paymentData: any) {
    await prisma.activity.create({
      data: {
        businessId: 'default',
        contactId,
        type: 'lead_captured',
        title: 'Auto-Onboarding Completed',
        content: `Payment received: ₹${paymentData.amount / 100}. Welcome message sent. Tasks created.`,
        metadata: {
          razorpayPaymentId: paymentData.razorpayPaymentId,
          razorpayOrderId: paymentData.razorpayOrderId,
          amount: paymentData.amount,
          planName: paymentData.planName,
        },
        createdBy: 'auto-onboarding',
      },
    });
  }

  /**
   * Generate invoice HTML
   */
  static generateInvoiceHTML(paymentData: any): string {
    return `
      <div style="font-family: Arial; padding: 20px;">
        <h1>Invoice</h1>
        <p><strong>Payment ID:</strong> ${paymentData.razorpayPaymentId}</p>
        <p><strong>Plan:</strong> ${paymentData.planName || 'Service'}</p>
        <p><strong>Amount:</strong> ₹${(paymentData.amount / 100).toLocaleString('en-IN')}</p>
        <p><strong>Status:</strong> Paid</p>
      </div>
    `;
  }

  /**
   * Process subscription renewal
   */
  static async processRenewal(subscriptionData: {
    subscriptionId: string;
    amount: number;
    contactId: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Update subscription
      await prisma.subscription.update({
        where: { id: subscriptionData.subscriptionId },
        data: {
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Send renewal confirmation
      const contact = await prisma.contact.findUnique({
        where: { id: subscriptionData.contactId },
      });

      if (contact?.phone) {
        await WhatsAppSendRouter.sendTextMessage(
          contact.businessId || 'default',
          contact.phone,
          `✅ Your subscription has been renewed!\n\nAmount: ₹${subscriptionData.amount / 100}\nValid until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n\nThank you for continuing with BizzAuto!`
        );
      }

      return { success: true, message: 'Renewal processed' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Process refund
   */
  static async processRefund(refundData: {
    paymentId: string;
    amount: number;
    reason: string;
    contactId: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Update contact
      await prisma.contact.update({
        where: { id: refundData.contactId },
        data: {
          tags: ['Refunded'],
          lastActivity: new Date(),
        },
      });

      // Create activity
      await prisma.activity.create({
        data: {
          businessId: 'default',
          contactId: refundData.contactId,
          type: 'note',
          title: 'Refund Processed',
          content: `Refund of ₹${refundData.amount / 100} processed. Reason: ${refundData.reason}`,
          metadata: { paymentId: refundData.paymentId, amount: refundData.amount },
          createdBy: 'auto-onboarding',
        },
      });

      return { success: true, message: 'Refund processed' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
