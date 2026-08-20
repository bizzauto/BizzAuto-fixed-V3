import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { comparePassword } from '../utils/auth.js';

const router = Router();

// POST /api/user/delete-account - Delete user account (GDPR)
router.post('/delete-account', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { password, confirmText } = req.body;

    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ success: false, error: 'Confirmation text does not match' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, businessId: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify password
    if (user.password) {
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
    }

    // Delete all user-related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete user's notifications
      await tx.notification.deleteMany({ where: { userId } });

      // Delete user's theme preference
      await tx.themePreference.deleteMany({ where: { userId } });

      // Delete user's AI content
      await tx.aIContent.deleteMany({ where: { userId } });

      // Delete user's API keys
      await tx.apiKey.deleteMany({ where: { userId } as any });

      // Delete audit logs
      await tx.auditLog.deleteMany({ where: { userId } });

      // Delete user's sessions/tokens
      await (tx as any).refreshToken.deleteMany({ where: { userId } });

      // Delete the user
      await tx.user.delete({ where: { id: userId } });

      // If user was the owner, delete the entire business
      if (user.role === 'OWNER' && user.businessId) {
        // Delete all business data
        await tx.contact.deleteMany({ where: { businessId: user.businessId } });
        await (tx as any).conversation.deleteMany({ where: { businessId: user.businessId } });
        await tx.campaign.deleteMany({ where: { businessId: user.businessId } });
        await tx.appointment.deleteMany({ where: { businessId: user.businessId } });
        await tx.aIContent.deleteMany({ where: { businessId: user.businessId } as any });
        await tx.workflow.deleteMany({ where: { businessId: user.businessId } });
        await tx.integration.deleteMany({ where: { businessId: user.businessId } });
        await tx.subscription.deleteMany({ where: { businessId: user.businessId } });
        await tx.business.delete({ where: { id: user.businessId } });
      }
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

export default router;