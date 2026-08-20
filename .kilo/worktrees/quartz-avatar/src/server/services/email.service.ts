import nodemailer from 'nodemailer';
import { prisma } from '../index.js';
import { decrypt } from '../utils/auth.js';

/**
 * Email Service with SMTP integration
 * Supports sending, receiving, and auto-replies
 */
export class EmailService {
  /**
   * Create Nodemailer transporter from business config
   */
  private static async createTransporter(businessId: string) {
    const integration = await prisma.integration.findFirst({
      where: {
        businessId,
        type: 'email',
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error('Email not configured for this business');
    }

    const config = integration.config as any;

    return nodemailer.createTransport({
      host: config.smtpHost || 'smtp.gmail.com',
      port: config.smtpPort || 587,
      secure: config.smtpSecure || false,
      auth: {
        user: config.smtpUser,
        pass: decrypt(config.smtpPass),
      },
    });
  }

  /**
   * Send email
   */
  static async sendEmail(
    businessId: string,
    options: {
      to: string;
      subject: string;
      text?: string;
      html?: string;
      attachments?: Array<{
        filename: string;
        path?: string;
        content?: Buffer;
      }>;
    }
  ): Promise<boolean> {
    const transporter = await this.createTransporter(businessId);

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'email', isActive: true },
    });

    const config = (integration?.config as any) || {};

    const mailOptions = {
      from: `"${config.fromName || config.smtpUser}" <${config.smtpUser}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    try {
      const result = await transporter.sendMail(mailOptions);

      // Log activity
      await prisma.activity.create({
        data: {
          businessId,
          type: 'email_sent',
          title: `Email sent to ${options.to}`,
          content: options.subject,
          metadata: {
            messageId: result.messageId,
            accepted: result.accepted,
          },
        },
      });

      return true;
    } catch (error: any) {
      console.error('Email send error:', error.message);
      throw error;
    }
  }

  /**
   * Send auto-reply email
   */
  static async sendAutoReply(
    businessId: string,
    to: string,
    subject: string,
    body: string
  ): Promise<boolean> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { autoReplyEnabled: true, autoReplyMessage: true },
    });

    if (!business?.autoReplyEnabled) {
      return false;
    }

    const message = business.autoReplyMessage || body;

    return this.sendEmail(businessId, {
      to,
      subject: `Re: ${subject}`,
      text: message,
    });
  }

  /**
   * Configure email integration
   */
  static async configureEmail(
    businessId: string,
    config: {
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      smtpPass: string;
      fromName: string;
      enableAutoReply: boolean;
      autoReplyMessage?: string;
    }
  ): Promise<any> {
    const encryptedPass = encrypt(config.smtpPass);

    // Delete existing email integration if any
    await prisma.integration.deleteMany({
      where: { businessId, type: 'email' },
    });

    // Create new integration
    const integration = await prisma.integration.create({
      data: {
        businessId,
        type: 'email',
        name: 'Email (SMTP)',
        config: {
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpSecure: config.smtpSecure,
          smtpUser: config.smtpUser,
          smtpPass: encryptedPass,
          fromName: config.fromName,
        } as any,
        isActive: true,
      },
    });

    // Update business auto-reply settings
    await prisma.business.update({
      where: { id: businessId },
      data: {
        autoReplyEnabled: config.enableAutoReply,
        autoReplyMessage: config.autoReplyMessage,
      },
    });

    return integration;
  }

  /**
   * Test email configuration
   */
  static async testEmailConfig(
    businessId: string,
    config: {
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      smtpPass: string;
    }
  ): Promise<boolean> {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    try {
      await transporter.verify();
      return true;
    } catch (error: any) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  /**
   * Import email contacts from CSV
   */
  static async importEmailContacts(
    businessId: string,
    emails: string[],
    source = 'import'
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const email of emails) {
      try {
        await prisma.contact.create({
          data: {
            businessId,
            email: email.toLowerCase(),
            phone: '', // Temporary, will be updated later
            source,
            emailOptIn: true,
          },
        });
        created++;
      } catch (error: any) {
        // Likely duplicate
        skipped++;
      }
    }

    return { created, skipped };
  }
}

export default EmailService;
