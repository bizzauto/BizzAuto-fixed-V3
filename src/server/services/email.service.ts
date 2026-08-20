import nodemailer from 'nodemailer';
import { prisma } from '../db.js';

/**
 * Transactional Email Service
 * Handles password reset, welcome, and other transactional emails
 */
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize SMTP transporter
   */
  static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const transporter = this.getTransporter();
    const appName = process.env.APP_NAME || 'BizzAuto';
    const appUrl = process.env.APP_URL || 'https://bizzauto.com';

    await transporter.sendMail({
      from: `"${appName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Welcome to ${appName}!`,
      html: this.getWelcomeTemplate(name, appName, appUrl),
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    const transporter = this.getTransporter();
    const appName = process.env.APP_NAME || 'BizzAuto';
    const appUrl = process.env.APP_URL || 'https://bizzauto.com';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"${appName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: 'Password Reset Request',
      html: this.getPasswordResetTemplate(name, resetUrl, appName, appUrl),
    });
  }

  /**
   * Send password changed confirmation email
   */
  static async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const transporter = this.getTransporter();
    const appName = process.env.APP_NAME || 'BizzAuto';
    const appUrl = process.env.APP_URL || 'https://bizzauto.com';

    await transporter.sendMail({
      from: `"${appName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: 'Your password has been changed',
      html: this.getPasswordChangedTemplate(name, appName, appUrl),
    });
  }

  /**
   * Send 2FA backup codes email
   */
  static async sendBackupCodesEmail(
    to: string,
    name: string,
    backupCodes: string[]
  ): Promise<void> {
    const transporter = this.getTransporter();
    const appName = process.env.APP_NAME || 'BizzAuto';
    const appUrl = process.env.APP_URL || 'https://bizzauto.com';

    await transporter.sendMail({
      from: `"${appName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: 'Your 2FA Backup Codes',
      html: this.getBackupCodesTemplate(name, backupCodes, appName, appUrl),
    });
  }

  /**
   * Send email verification link
   */
  static async sendVerificationEmail(
    to: string,
    name: string,
    verificationToken: string
  ): Promise<void> {
    const transporter = this.getTransporter();
    const appName = process.env.APP_NAME || 'BizzAuto';
    const appUrl = process.env.APP_URL || 'https://bizzauto.com';
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: `"${appName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Verify your email - ${appName}`,
      html: this.getVerificationTemplate(name, verifyUrl, appName, appUrl),
    });
  }

  /**
   * Test SMTP connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Configure email settings for a business
   */
  static async configureEmail(businessId: string, config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail?: string;
    fromName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.integration.upsert({
        where: { businessId_type: { businessId, type: 'email_smtp' } },
        create: {
          businessId,
          type: 'email_smtp',
          name: 'Email SMTP',
          config: config as any,
          isActive: true,
        },
        update: {
          config: config as any,
          isActive: true,
        },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email configuration
   */
  static async testEmailConfig(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const testTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: { rejectUnauthorized: false },
      });
      await testTransporter.verify();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send generic email with automatic retry on failure.
   * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
   */
  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string,
    retries: number = 3
  ): Promise<{ success: boolean; error?: string }> {
    let lastError: string = '';
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const transporter = this.getTransporter();
        const appName = process.env.APP_NAME || 'BizzAuto';
        await transporter.sendMail({
          from: from || `"${appName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });
        return { success: true };
      } catch (error: any) {
        lastError = error.message;
        console.warn(`[EmailService] Attempt ${attempt}/${retries} failed for ${to}: ${error.message}`);
        // Reset transporter on connection errors (e.g., ECONNRESET, ETIMEDOUT)
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
          this.transporter = null;
        }
        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }
    return { success: false, error: `Failed after ${retries} attempts: ${lastError}` };
  }

  // Email Templates
  private static getWelcomeTemplate(name: string, appName: string, appUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${appName}!</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Welcome aboard! We're thrilled to have you join ${appName}.</p>
      <p>With ${appName}, you can:</p>
      <ul>
        <li>Manage your customer relationships</li>
        <li>Automate WhatsApp messaging</li>
        <li>Create stunning marketing materials</li>
        <li>Generate AI-powered captions</li>
        <li>Schedule social media posts</li>
      </ul>
      <center>
        <a href="${appUrl}" class="button">Get Started</a>
      </center>
      <p>If you have any questions, our support team is here to help.</p>
      <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
      <p>You're receiving this email because you signed up for ${appName}.</p>
      <p>${appUrl}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private static getPasswordResetTemplate(
    name: string,
    resetUrl: string,
    appName: string,
    appUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff6b6b; padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>We received a request to reset your password for your ${appName} account.</p>
      <p>Click the button below to reset your password:</p>
      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>
      <div class="warning">
        <strong>Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
      </div>
      <p>Or copy and paste this link:</p>
      <code>${resetUrl}</code>
      <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
      <p>${appUrl}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private static getPasswordChangedTemplate(name: string, appName: string, appUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #51cf66; padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .alert { background: #d3f9d8; border: 1px solid #51cf66; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Updated</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Your password has been successfully changed.</p>
      <div class="alert">
        <strong>Security Alert:</strong> If you did not make this change, please contact support immediately.
      </div>
      <p>If you have any concerns about your account security, please contact us.</p>
      <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
      <p>${appUrl}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private static getBackupCodesTemplate(
    name: string,
    backupCodes: string[],
    appName: string,
    appUrl: string
  ): string {
    const codesHtml = backupCodes
      .map(code => `<code style="background:#f0f0f0;padding:5px 10px;margin:5px;display:inline-block;border-radius:3px;">${code}</code>`)
      .join(' ');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4267B2; padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .codes { background: #fff; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin: 20px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your 2FA Backup Codes</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Here are your backup codes for two-factor authentication. Keep these in a safe place!</p>
      <div class="codes">
        <h3>Backup Codes:</h3>
        ${codesHtml}
      </div>
      <div class="warning">
        <strong>Important:</strong> Each code can only be used once. Save these securely and never share them with anyone.
      </div>
      <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
      <p>${appUrl}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private static getVerificationTemplate(
    name: string,
    verifyUrl: string,
    appName: string,
    appUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Thank you for signing up for ${appName}! Please verify your email address to activate your account.</p>
      <center>
        <a href="${verifyUrl}" class="button">Verify Email Address</a>
      </center>
      <div class="warning">
        <strong>Important:</strong> This verification link will expire in 24 hours.
      </div>
      <p>Or copy and paste this link:</p>
      <code>${verifyUrl}</code>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>Best regards,<br>The ${appName} Team</p>
    </div>
    <div class="footer">
      <p>${appUrl}</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
