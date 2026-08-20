import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { TwoFactorService } from '../services/twoFactor.service.js';

const router = Router();

/**
 * POST /api/2fa/setup
 * Generate QR code for 2FA setup
 */
router.post('/setup', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    const result = await TwoFactorService.generateSecret(userId, email);

    res.json({
      success: true,
      data: {
        qrCode: result.qrCode,
        manualEntryKey: result.manualEntryKey,
        secret: result.secret,
      },
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/2fa/verify
 * Verify token and enable 2FA
 */
router.post('/verify', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token || token.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Valid token is required',
      });
    }

    const verified = await TwoFactorService.verifyAndEnable(userId, token);

    if (verified) {
      res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid token. Please try again.',
      });
    }
  } catch (error: any) {
    console.error('2FA verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/2fa/verify-login
 * Verify 2FA token during login (before JWT is issued)
 */
router.post('/verify-login', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'User ID and token are required',
      });
    }

    const verified = await TwoFactorService.verifyToken(userId, token);

    if (verified) {
      res.json({ success: true });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  } catch (error: any) {
    console.error('2FA login verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/2fa/status
 * Get 2FA status for current user
 */
router.get('/status', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const status = await TwoFactorService.getStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('2FA status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/2fa/disable
 * Disable 2FA (requires password verification)
 */
router.delete('/disable', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to disable 2FA',
      });
    }

    // Verify password first
    const { prisma } = await import('../db.js');
    const { comparePassword } = await import('../utils/auth.js');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    const isValid = await comparePassword(password, user?.password || '');
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
      });
    }

    await TwoFactorService.disable(userId);

    res.json({
      success: true,
      message: 'Two-factor authentication disabled',
    });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
