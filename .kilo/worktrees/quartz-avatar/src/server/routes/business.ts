import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireBusinessOwner } from '../middleware/auth.js';

const router = Router();

// Get business settings
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch business', details: error.message });
  }
});

// Update business settings
router.put('/', authenticate, async (req: any, res: any) => {
  try {
    const { name, type, city, phone, email, brandColors, timezone } = req.body;

    const business = await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(brandColors && { brandColors }),
        ...(timezone && { timezone }),
      },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update business', details: error.message });
  }
});

// Get business settings (alias for frontend compatibility)
router.get('/settings', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch business settings', details: error.message });
  }
});

// Update business settings (alias for frontend compatibility)
router.put('/settings', authenticate, async (req: any, res: any) => {
  try {
    const { name, type, city, phone, email, brandColors, timezone } = req.body;

    const business = await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(brandColors && { brandColors }),
        ...(timezone && { timezone }),
      },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update business settings', details: error.message });
  }
});

// Update WhatsApp configuration
router.put('/whatsapp', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { wabaId, waPhoneNumberId, waAccessToken, waWebhookSecret, waPhoneNumber } = req.body;

    const business = await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        wabaId,
        waPhoneNumberId,
        waAccessToken,
        waWebhookSecret,
        waPhoneNumber,
      },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update WhatsApp config', details: error.message });
  }
});

// Update social media tokens
router.put('/social-media', authenticate, requireBusinessOwner, async (req: any, res: any) => {
  try {
    const { fbPageId, fbAccessToken, igUserId, igAccessToken } = req.body;

    const business = await prisma.business.update({
      where: { id: req.user.businessId },
      data: { fbPageId, fbAccessToken, igUserId, igAccessToken },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update social media config', details: error.message });
  }
});

// Get pipelines
router.get('/pipelines', authenticate, async (req: any, res: any) => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: pipelines });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch pipelines', details: error.message });
  }
});

// Create pipeline
router.post('/pipelines', authenticate, async (req: any, res: any) => {
  try {
    const { name, stages } = req.body;

    const pipeline = await prisma.pipeline.create({
      data: { businessId: req.user.businessId, name, stages: stages || [] },
    });

    res.status(201).json({ success: true, data: pipeline });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create pipeline', details: error.message });
  }
});

export default router;
