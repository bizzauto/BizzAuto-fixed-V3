import { randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '../db.js';

/**
 * CSRF Token Service
 * Manages CSRF tokens for session security
 */
export class CSRFService {
  /**
   * Generate a new CSRF token for a user
   */
  static async generateToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        csrfToken: token,
        csrfTokenExpiresAt: expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate CSRF token
   */
  static async validateToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { csrfToken: true, csrfTokenExpiresAt: true },
    });

    if (!user?.csrfToken || !user.csrfTokenExpiresAt) {
      return false;
    }

    // Check expiration
    if (new Date() > user.csrfTokenExpiresAt) {
      return false;
    }

    // Constant time comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(user.csrfToken),
      Buffer.from(token)
    );
  }

  /**
   * Clear CSRF token on logout
   */
  static async clearToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        csrfToken: null,
        csrfTokenExpiresAt: null,
      },
    });
  }

  /**
   * Get CSRF token for user (if valid)
   */
  static async getToken(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { csrfToken: true, csrfTokenExpiresAt: true },
    });

    if (!user?.csrfToken || !user.csrfTokenExpiresAt) {
      return null;
    }

    // Check if expired
    if (new Date() > user.csrfTokenExpiresAt) {
      return null;
    }

    return user.csrfToken;
  }
}
