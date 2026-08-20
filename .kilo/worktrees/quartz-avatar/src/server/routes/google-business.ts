import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get Google Business connection status
router.get('/status', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        gbpAccessToken: true,
        gbpAccountId: true,
        gbpLocationId: true,
        name: true,
      },
    });

    const isConnected = !!(business?.gbpAccessToken && business?.gbpAccountId);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        accountId: business?.gbpAccountId || null,
        locationId: business?.gbpLocationId || null,
        businessName: business?.name || null,
      },
    });
  } catch (error: any) {
    console.error('GBP status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get status', details: error.message });
  }
});

// Connect Google Business Profile
router.post('/connect', authenticate, async (req: any, res: any) => {
  try {
    const { accessToken, accountId, locationId } = req.body;

    if (!accessToken || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'accessToken and accountId are required',
      });
    }

    const { encrypt } = await import('../utils/auth.js');

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        gbpAccessToken: encrypt(accessToken),
        gbpAccountId: accountId,
        gbpLocationId: locationId || null,
      },
    });

    res.json({
      success: true,
      message: 'Google Business Profile connected successfully',
    });
  } catch (error: any) {
    console.error('GBP connect error:', error);
    res.status(500).json({ success: false, error: 'Failed to connect', details: error.message });
  }
});

// Disconnect Google Business Profile
router.post('/disconnect', authenticate, async (req: any, res: any) => {
  try {
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        gbpAccessToken: null,
        gbpAccountId: null,
        gbpLocationId: null,
      },
    });

    res.json({
      success: true,
      message: 'Google Business Profile disconnected successfully',
    });
  } catch (error: any) {
    console.error('GBP disconnect error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect', details: error.message });
  }
});

// Get Google Business Profile locations
router.get('/locations', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpAccountId: true },
    });

    if (!business?.gbpAccessToken) {
      return res.status(400).json({ success: false, error: 'Google Business not connected' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    // Fetch locations from Google My Business API
    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, data: response.data.locations || [] });
  } catch (error: any) {
    console.error('GBP locations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations', details: error.message });
  }
});

// Get Google Business reviews
router.get('/reviews', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpLocationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, data: response.data.reviews || [] });
  } catch (error: any) {
    console.error('GBP reviews fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews', details: error.message });
  }
});

// Reply to Google Business review
router.post('/reviews/:reviewId/reply', authenticate, async (req: any, res: any) => {
  try {
    const { reply } = req.body;
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    await axios.default.put(
      `https://mybusiness.googleapis.com/v4/${req.params.reviewId}/reply`,
      { comment: reply },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true, message: 'Reply posted' });
  } catch (error: any) {
    console.error('GBP review reply error:', error);
    res.status(500).json({ success: false, error: 'Failed to post reply', details: error.message });
  }
});

// Create Google Business post
router.post('/posts', authenticate, async (req: any, res: any) => {
  try {
    const { content, mediaUrl, callToAction } = req.body;
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const postData: any = {
      languageCode: 'en',
      summary: content.substring(0, 200),
      state: 'LIVE',
    };

    if (mediaUrl) {
      postData.media = [{ mediaFormat: 'PHOTO', sourceUrl: mediaUrl }];
    }

    if (callToAction) {
      postData.action = {
        actionType: callToAction.type, // CALL_NOW, LEARN_MORE, etc.
        url: callToAction.url,
      };
    }

    const response = await axios.default.post(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpLocationId}/localPosts`,
      postData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('GBP post creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post', details: error.message });
  }
});

// Get Google Business posts
router.get('/posts', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpLocationId}/localPosts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, data: response.data.localPosts || [] });
  } catch (error: any) {
    console.error('GBP posts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts', details: error.message });
  }
});

// Delete Google Business post
router.delete('/posts/:id', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    await axios.default.delete(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpLocationId}/localPosts/${req.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('GBP post delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post', details: error.message });
  }
});

// Get Google Business statistics
router.get('/stats', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { gbpAccessToken: true, gbpLocationId: true },
    });

    if (!business?.gbpAccessToken || !business?.gbpLocationId) {
      return res.status(400).json({ success: false, error: 'Google Business not configured' });
    }

    const axios = await import('axios');
    const { decrypt } = await import('../utils/auth.js');
    const accessToken = decrypt(business.gbpAccessToken);

    // Fetch insights from Google My Business API
    const response = await axios.default.get(
      `https://mybusiness.googleapis.com/v4/accounts/${business.gbpLocationId}/insights`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      success: true,
      data: response.data || {}
    });
  } catch (error: any) {
    console.error('GBP stats fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', details: error.message });
  }
});

export default router;
