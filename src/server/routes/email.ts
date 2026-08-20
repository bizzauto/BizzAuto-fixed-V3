import { Router, Request, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { EmailService } from '../services/email.service.js';
import { prisma } from '../db.js';
import { qs } from '../utils/query.js';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/email/test
 * Test SMTP connection (alias for frontend compatibility)
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await EmailService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: 'SMTP connection successful',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Email test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/test-connection
 * Test SMTP connection with provided config
 */
router.post('/test-connection', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = req.body;
    const result = await EmailService.testEmailConfig(config);

    if (result.success) {
      res.json({
        success: true,
        message: 'SMTP connection successful',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Email test connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/config
 * Save SMTP configuration
 */
router.post('/config', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromName, fromEmail } = req.body;

    const result = await EmailService.configureEmail(req.user.businessId, {
      host: smtpHost || 'smtp.gmail.com',
      port: smtpPort ? Number(smtpPort) : 587,
      secure: false,
      user: smtpUser || '',
      pass: smtpPass || '',
      fromName: fromName || undefined,
      fromEmail: fromEmail || undefined,
    });

    if (result.success) {
      res.json({ success: true, message: 'SMTP configuration saved' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EMAIL TEMPLATES ====================

/**
 * GET /api/email/templates
 * List all email templates for business
 */
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', category } = req.query as { page?: string; limit?: string; category?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (category) where.category = category;

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({ where, skip, take: parseInt(limit), orderBy: { updatedAt: 'desc' } }),
      prisma.emailTemplate.count({ where }),
    ]);

    res.json({ success: true, data: { templates, pagination: { page: parseInt(page), limit: parseInt(limit), total } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/templates/:id
 * Get single email template
 */
router.get('/templates/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/templates
 * Create email template
 */
router.post('/templates', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, subject, htmlContent, textContent, category, variables } = req.body;

    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ success: false, error: 'Name, subject, and htmlContent are required' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        businessId: req.user.businessId,
        name,
        subject,
        htmlContent,
        textContent: textContent || '',
        category: category || 'general',
        variables: variables || [],
      },
    });

    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/email/templates/:id
 * Update email template
 */
router.put('/templates/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Template not found' });

    const { id, businessId, createdAt, ...updateData } = req.body;
    const updated = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/email/templates/:id
 * Delete email template
 */
router.delete('/templates/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Template not found' });

    await prisma.emailTemplate.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DRIP CAMPAIGNS ====================

/**
 * GET /api/email/drips
 * List drip campaigns
 */
router.get('/drips', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const drips = await prisma.dripCampaign.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: drips });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/drips
 * Create drip campaign
 */
router.post('/drips', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, trigger, steps } = req.body;

    if (!name || !trigger) {
      return res.status(400).json({ success: false, error: 'Name and trigger are required' });
    }

    const drip = await prisma.dripCampaign.create({
      data: {
        businessId: req.user.businessId,
        name,
        trigger,
        steps: steps || [],
      },
    });

    res.status(201).json({ success: true, data: drip });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/email/drips/:id
 * Update drip campaign
 */
router.put('/drips/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.dripCampaign.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Drip not found' });

    const { id, businessId, createdAt, ...updateData } = req.body;
    const updated = await prisma.dripCampaign.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/email/drips/:id/toggle
 * Toggle drip campaign active status
 */
router.patch('/drips/:id/toggle', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.dripCampaign.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Drip not found' });

    const updated = await prisma.dripCampaign.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    res.json({ success: true, data: updated, message: `Drip ${updated.isActive ? 'activated' : 'paused'}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/email/drips/:id
 * Delete drip campaign
 */
router.delete('/drips/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.dripCampaign.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Drip not found' });

    await prisma.dripCampaign.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Drip deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EMAIL LISTS ====================

/**
 * GET /api/email/lists
 * List email subscriber lists
 */
router.get('/lists', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lists = await prisma.emailList.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: lists });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/lists
 * Create subscriber list
 */
router.post('/lists', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const list = await prisma.emailList.create({
      data: {
        businessId: req.user.businessId,
        name,
        description: description || '',
      },
    });

    res.status(201).json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/email/lists/:id
 * Delete subscriber list
 */
router.delete('/lists/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.emailList.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'List not found' });

    await prisma.emailList.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'List deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTH (legacy — kept for backward compat) ====================

/**
 * POST /api/email/password-reset
 * Request password reset
 */
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a reset email has been sent',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store reset token in database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
        resetTokenExpiresAt,
      },
    });

    try {
      await EmailService.sendPasswordResetEmail(
        user.email,
        user.name || 'User',
        resetToken
      );
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    res.json({
      success: true,
      message: 'If an account exists, a reset email has been sent',
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/password-reset/confirm
 * Confirm password reset
 */
router.post('/password-reset/confirm', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // Hash the token and find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiresAt: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Hash new password and clear reset token
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    res.json({
      success: true,
      message: 'Password has been reset',
    });
  } catch (error: any) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
