import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { InstagramService } from '../services/instagram.service.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Multer config for Instagram media uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (Instagram limit for videos)
    files: 10, // Max 10 files at once (carousel limit)
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and MP4, MOV, AVI, WebM videos are allowed.'));
    }
  },
});

// ==================== CONNECTION ====================

/**
 * POST /api/instagram/connect
 * Save Instagram Business Account credentials
 */
router.post('/connect', authenticate, async (req: any, res: Response) => {
  try {
    const { igUserId, igAccessToken } = req.body;

    if (!igUserId || !igAccessToken) {
      return res.status(400).json({ success: false, error: 'igUserId and igAccessToken are required' });
    }

    // Encrypt and store the access token
    const { encrypt } = await import('../utils/auth.js');

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        igUserId,
        igAccessToken: encrypt(igAccessToken),
      },
    });

    // Test the connection
    const testResult = await InstagramService.testConnection(req.user.businessId);

    res.json({
      success: true,
      message: testResult.connected
        ? 'Instagram account connected successfully!'
        : 'Credentials saved but connection test failed. Check your access token.',
      connected: testResult.connected,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to connect Instagram account', details: error.message });
  }
});

/**
 * DELETE /api/instagram/disconnect
 * Remove Instagram credentials
 */
router.delete('/disconnect', authenticate, async (req: any, res: Response) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        igUserId: null,
        igAccessToken: null,
      },
    });

    res.json({ success: true, message: 'Instagram account disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to disconnect Instagram account', details: error.message });
  }
});

/**
 * GET /api/instagram/status
 * Check Instagram connection status and account info
 */
router.get('/status', authenticate, async (req: any, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { igUserId: true, igAccessToken: true },
    });

    if (!business?.igUserId || !business?.igAccessToken) {
      return res.json({ success: true, data: { connected: false } });
    }

    const testResult = await InstagramService.testConnection(req.user.businessId);

    let accountInfo = null;
    if (testResult.connected) {
      accountInfo = await InstagramService.getAccountInfo(req.user.businessId);
    }

    res.json({
      success: true,
      data: {
        connected: testResult.connected,
        igUserId: business.igUserId,
        accountInfo,
        error: testResult.error || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to check Instagram status', details: error.message });
  }
});

/**
 * GET /api/instagram/account
 * Get Instagram Business Account info
 */
router.get('/account', authenticate, async (req: any, res: Response) => {
  try {
    const accountInfo = await InstagramService.getAccountInfo(req.user.businessId);
    res.json({ success: true, data: accountInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch Instagram account info', details: error.message });
  }
});

// ==================== MEDIA UPLOAD ====================

/**
 * POST /api/instagram/media/upload
 * Upload media files to the server for Instagram publishing
 */
router.post('/media/upload', authenticate, upload.array('media', 10), async (req: any, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No media files uploaded' });
    }

    const uploadedUrls: Array<{ url: string; type: string; name: string; size: number }> = [];

    for (const file of files) {
      const url = await InstagramService.uploadMediaFile(req.user.businessId, file);
      const isVideo = file.mimetype.startsWith('video/');
      uploadedUrls.push({
        url,
        type: isVideo ? 'VIDEO' : 'IMAGE',
        name: file.originalname,
        size: file.size,
      });
    }

    res.json({
      success: true,
      data: {
        media: uploadedUrls,
        count: uploadedUrls.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to upload media', details: error.message });
  }
});

// ==================== CONTAINER OPERATIONS ====================

/**
 * POST /api/instagram/media/container
 * Create an Instagram media container (pre-publish step)
 */
router.post('/media/container', authenticate, async (req: any, res: Response) => {
  try {
    const { mediaUrl, caption, mediaType } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({ success: false, error: 'mediaUrl is required' });
    }

    const container = await InstagramService.createMediaContainer(req.user.businessId, {
      mediaUrl,
      caption: caption || '',
      mediaType: mediaType || 'IMAGE',
    });

    res.json({ success: true, data: container });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create media container', details: error.message });
  }
});

/**
 * POST /api/instagram/media/container/carousel
 * Create a carousel media container
 */
router.post('/media/container/carousel', authenticate, async (req: any, res: Response) => {
  try {
    const { children, caption } = req.body;

    if (!children || !Array.isArray(children) || children.length < 2) {
      return res.status(400).json({ success: false, error: 'Carousel requires at least 2 media items' });
    }

    const carousel = await InstagramService.createCarouselContainer(req.user.businessId, {
      children: children.map((c: any) => ({
        mediaUrl: c.mediaUrl,
        mediaType: c.mediaType || 'IMAGE',
      })),
      caption: caption || '',
    });

    res.json({ success: true, data: carousel });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create carousel container', details: error.message });
  }
});

/**
 * GET /api/instagram/media/container/:creationId/status
 * Check the status of a media container
 */
router.get('/media/container/:creationId/status', authenticate, async (req: any, res: Response) => {
  try {
    const status = await InstagramService.checkContainerStatus(req.user.businessId, req.params.creationId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to check container status', details: error.message });
  }
});

// ==================== PUBLISH ====================

/**
 * POST /api/instagram/media/publish
 * Publish a media container
 */
router.post('/media/publish', authenticate, async (req: any, res: Response) => {
  try {
    const { creationId } = req.body;

    if (!creationId) {
      return res.status(400).json({ success: false, error: 'creationId is required' });
    }

    const result = await InstagramService.publishContainer(req.user.businessId, creationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to publish media', details: error.message });
  }
});

/**
 * POST /api/instagram/publish
 * Full single-media publish flow (create container → wait → publish)
 */
router.post('/publish', authenticate, async (req: any, res: Response) => {
  try {
    const { mediaUrl, caption, mediaType } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({ success: false, error: 'mediaUrl is required' });
    }

    const result = await InstagramService.publishMedia(req.user.businessId, {
      mediaUrl,
      caption: caption || '',
      mediaType: mediaType || 'IMAGE',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to publish to Instagram', details: error.message });
  }
});

/**
 * POST /api/instagram/carousel
 * Full carousel publish flow
 */
router.post('/carousel', authenticate, async (req: any, res: Response) => {
  try {
    const { children, caption } = req.body;

    if (!children || !Array.isArray(children) || children.length < 2) {
      return res.status(400).json({ success: false, error: 'Carousel requires at least 2 media items' });
    }

    const result = await InstagramService.publishCarousel(req.user.businessId, {
      children: children.map((c: any) => ({
        mediaUrl: c.mediaUrl,
        mediaType: c.mediaType || 'IMAGE',
      })),
      caption: caption || '',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to publish carousel to Instagram', details: error.message });
  }
});

/**
 * POST /api/instagram/post/:postId/publish
 * Publish an existing Post to Instagram (uses the Post's content + mediaUrls)
 */
router.post('/post/:postId/publish', authenticate, async (req: any, res: Response) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.postId, businessId: req.user.businessId },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.status === 'published') {
      return res.status(400).json({ success: false, error: 'Post already published' });
    }

    const result = await InstagramService.publishPost(req.user.businessId, {
      id: post.id,
      content: post.content,
      mediaUrls: post.mediaUrls,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to publish post to Instagram', details: error.message });
  }
});

// ==================== MEDIA & INSIGHTS ====================

/**
 * GET /api/instagram/media
 * Get recent media from Instagram account
 */
router.get('/media', authenticate, async (req: any, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const media = await InstagramService.getRecentMedia(req.user.businessId, limit);
    res.json({ success: true, data: media });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch Instagram media', details: error.message });
  }
});

/**
 * GET /api/instagram/media/:mediaId/insights
 * Get insights for a specific media post
 */
router.get('/media/:mediaId/insights', authenticate, async (req: any, res: Response) => {
  try {
    const insights = await InstagramService.getMediaInsights(req.user.businessId, req.params.mediaId);
    res.json({ success: true, data: insights });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch media insights', details: error.message });
  }
});

export default router;
