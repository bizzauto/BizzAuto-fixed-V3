import speakeasy from 'speakeasy';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../db.js';
import { encrypt, decrypt } from '../utils/auth.js';

/**
 * TOTP 2FA Service
 * Handles 2FA setup, verification, and backup codes
 */
export class TwoFactorService {
  /**
   * Generate 2FA secret and QR code for setup
   */
  static async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `BizzAuto:${email}`,
      length: 32,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Store encrypted secret temporarily (not enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encrypt(secret.base32),
        twoFactorEnabled: false,
      },
    });

    return {
      secret: secret.base32, // Show once to user
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verify setup token and enable 2FA
   */
  static async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      return false;
    }

    const secret = decrypt(user.twoFactorSecret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps of time drift (1 min)
    });

    if (verified) {
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: JSON.stringify(hashedCodes),
        },
      });

      return true;
    }

    return false;
  }

  /**
   * Verify TOTP token during login
   */
  static async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return true; // 2FA not enabled, allow login
    }

    // Check if it's a backup code
    if (token.length === 8) {
      return this.verifyBackupCode(userId, token, user.twoFactorBackupCodes);
    }

    const secret = decrypt(user.twoFactorSecret);

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  /**
   * Verify backup code
   */
  private static async verifyBackupCode(
    userId: string,
    code: string,
    backupCodesJson: string | null
  ): Promise<boolean> {
    if (!backupCodesJson) return false;

    const hashedCodes: string[] = JSON.parse(backupCodesJson);
    const hashedInput = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const index = hashedCodes.indexOf(hashedInput);
    if (index === -1) return false;

    // Remove used backup code
    hashedCodes.splice(index, 1);
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: JSON.stringify(hashedCodes),
      },
    });

    return true;
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Disable 2FA
   */
  static async disable(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
      },
    });
  }

  /**
   * Get 2FA status for user
   */
  static async getStatus(userId: string): Promise<{
    enabled: boolean;
    setupPending: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    return {
      enabled: user?.twoFactorEnabled || false,
      setupPending: !!user?.twoFactorSecret && !user.twoFactorEnabled,
    };
  }
}
