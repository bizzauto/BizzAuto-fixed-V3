import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/auth.js';

const router = Router();

router.use(authenticate);

// ── GET /api/social-accounts — unified status for all platforms ──

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        fbPageId: true,
        fbAccessToken: true,
        igUserId: true,
        igAccessToken: true,
        linkedinPageId: true,
        linkedinAccessToken: true,
        twitterUserId: true,
        twitterAccessToken: true,
        gbpAccessToken: true,
        gbpAccountId: true,
        youtubeChannelId: true,
        youtubeAccessToken: true,
      },
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const accounts = [
      {
        platform: 'facebook',
        connected: !!(business.fbPageId && business.fbAccessToken),
        details: business.fbPageId ? { pageId: business.fbPageId } : null,
      },
      {
        platform: 'instagram',
        connected: !!(business.igUserId && business.igAccessToken),
        details: business.igUserId ? { igUserId: business.igUserId } : null,
      },
      {
        platform: 'linkedin',
        connected: !!(business.linkedinPageId && business.linkedinAccessToken),
        details: business.linkedinPageId ? { pageId: business.linkedinPageId } : null,
      },
      {
        platform: 'twitter',
        connected: !!(business.twitterUserId && business.twitterAccessToken),
        details: business.twitterUserId ? { userId: business.twitterUserId } : null,
      },
      {
        platform: 'google_business',
        connected: !!(business.gbpAccessToken && business.gbpAccountId),
        details: business.gbpAccountId ? { accountId: business.gbpAccountId } : null,
      },
      {
        platform: 'youtube',
        connected: !!(business.youtubeChannelId && business.youtubeAccessToken),
        details: business.youtubeChannelId ? { channelId: business.youtubeChannelId } : null,
      },
    ];

    res.json({ success: true, data: accounts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get social accounts', details: error.message });
  }
});

// ── FACEBOOK ──

/**
 * POST /api/social-accounts/facebook/connect
 * Save Facebook Page credentials
 */
router.post('/facebook/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { fbPageId, fbAccessToken } = req.body;

    if (!fbPageId || !fbAccessToken) {
      return res.status(400).json({ success: false, error: 'fbPageId and fbAccessToken are required' });
    }

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        fbPageId,
        fbAccessToken: encrypt(fbAccessToken),
      },
    });

    res.json({ success: true, message: 'Facebook Page connected successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to connect Facebook', details: error.message });
  }
});

/**
 * DELETE /api/social-accounts/facebook/disconnect
 * Remove Facebook credentials
 */
router.delete('/facebook/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { fbPageId: null, fbAccessToken: null },
    });
    res.json({ success: true, message: 'Facebook disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to disconnect Facebook', details: error.message });
  }
});

// ── LINKEDIN ──

/**
 * POST /api/social-accounts/linkedin/connect
 * Save LinkedIn Page credentials
 */
router.post('/linkedin/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { linkedinPageId, linkedinAccessToken } = req.body;

    if (!linkedinPageId || !linkedinAccessToken) {
      return res.status(400).json({ success: false, error: 'linkedinPageId and linkedinAccessToken are required' });
    }

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        linkedinPageId,
        linkedinAccessToken: encrypt(linkedinAccessToken),
      },
    });

    res.json({ success: true, message: 'LinkedIn Page connected successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to connect LinkedIn', details: error.message });
  }
});

/**
 * DELETE /api/social-accounts/linkedin/disconnect
 * Remove LinkedIn credentials
 */
router.delete('/linkedin/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { linkedinPageId: null, linkedinAccessToken: null },
    });
    res.json({ success: true, message: 'LinkedIn disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to disconnect LinkedIn', details: error.message });
  }
});

// ── TWITTER / X ──

/**
 * POST /api/social-accounts/twitter/connect
 * Save Twitter credentials
 */
router.post('/twitter/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { twitterUserId, twitterAccessToken } = req.body;

    if (!twitterUserId || !twitterAccessToken) {
      return res.status(400).json({ success: false, error: 'twitterUserId and twitterAccessToken are required' });
    }

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        twitterUserId,
        twitterAccessToken: encrypt(twitterAccessToken),
      },
    });

    res.json({ success: true, message: 'Twitter/X account connected successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to connect Twitter/X', details: error.message });
  }
});

/**
 * DELETE /api/social-accounts/twitter/disconnect
 * Remove Twitter credentials
 */
router.delete('/twitter/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { twitterUserId: null, twitterAccessToken: null },
    });
    res.json({ success: true, message: 'Twitter/X disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to disconnect Twitter/X', details: error.message });
  }
});

// ── YOUTUBE ──

/**
 * POST /api/social-accounts/youtube/connect
 * Save YouTube Channel credentials
 */
router.post('/youtube/connect', async (req: AuthRequest, res: Response) => {
  try {
    const { youtubeChannelId, youtubeAccessToken } = req.body;

    if (!youtubeChannelId || !youtubeAccessToken) {
      return res.status(400).json({ success: false, error: 'youtubeChannelId and youtubeAccessToken are required' });
    }

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        youtubeChannelId,
        youtubeAccessToken: encrypt(youtubeAccessToken),
      },
    });

    res.json({ success: true, message: 'YouTube channel connected successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to connect YouTube', details: error.message });
  }
});

/**
 * DELETE /api/social-accounts/youtube/disconnect
 * Remove YouTube credentials
 */
router.delete('/youtube/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { youtubeChannelId: null, youtubeAccessToken: null },
    });
    res.json({ success: true, message: 'YouTube disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to disconnect YouTube', details: error.message });
  }
});

export default router;
