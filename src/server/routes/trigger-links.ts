import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTriggerLinkSchema, updateTriggerLinkSchema } from '../validations/remaining-schemas.js';
import crypto from 'crypto';

const router = Router();

// Simple nanoid-like random string generator
function generateShortCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((byte) => chars[byte % chars.length])
    .join('');
}

// Simple user-agent parser
function parseUserAgent(userAgent: string): {
  device: string;
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();

  // Device detection
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  }

  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  else if (ua.includes('msie') || ua.includes('trident')) browser = 'Internet Explorer';

  // OS detection
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { device, browser, os };
}

// List trigger links (paginated)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).user.businessId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const where: any = { businessId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [links, total] = await Promise.all([
      prisma.triggerLink.findMany({
        where,
        include: {
          _count: { select: { clicks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.triggerLink.count({ where }),
    ]);

    res.json({
      success: true,
      data: links,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error listing trigger links:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get link with stats
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = (req as any).user.businessId;

    const link = await prisma.triggerLink.findFirst({
      where: { id, businessId },
      include: {
        _count: { select: { clicks: true } },
      },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Trigger link not found' });
    }

    // Get device stats
    const clicks = await prisma.triggerLinkClick.findMany({
      where: { linkId: id },
      select: { device: true, browser: true, country: true },
    });

    const deviceStats = clicks.reduce((acc, click) => {
      acc[click.device] = (acc[click.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const browserStats = clicks.reduce((acc, click) => {
      acc[click.browser] = (acc[click.browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countryStats = clicks.reduce((acc, click) => {
      const country = click.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        ...link,
        stats: {
          totalClicks: link._count.clicks,
          deviceStats,
          browserStats,
          countryStats,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting trigger link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create trigger link
router.post('/', authenticate, validate(createTriggerLinkSchema), async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).user.businessId;
    const { name, originalUrl, campaignId, workflowId, tags, customShortCode } = req.body;

    if (!name || !originalUrl) {
      return res.status(400).json({ success: false, error: 'Name and original URL are required' });
    }

    // Generate or validate shortCode
    let shortCode: string;
    if (customShortCode) {
      const existing = await prisma.triggerLink.findUnique({
        where: { shortCode: customShortCode },
      });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Short code already exists' });
      }
      shortCode = customShortCode;
    } else {
      // Auto-generate unique shortCode
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        shortCode = generateShortCode(8);
        const existing = await prisma.triggerLink.findUnique({
          where: { shortCode },
        });
        if (!existing) isUnique = true;
        attempts++;
      }
      if (!isUnique) {
        return res.status(500).json({ success: false, error: 'Failed to generate unique short code' });
      }
    }

    const link = await prisma.triggerLink.create({
      data: {
        businessId,
        name,
        shortCode: shortCode!,
        originalUrl,
        campaignId: campaignId || null,
        workflowId: workflowId || null,
        tags: tags || [],
      },
    });

    res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    console.error('Error creating trigger link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update link
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = (req as any).user.businessId;
    const { name, originalUrl, campaignId, workflowId, tags, shortCode: newShortCode } = req.body;

    const existing = await prisma.triggerLink.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trigger link not found' });
    }

    // If shortCode is being changed, check uniqueness
    if (newShortCode && newShortCode !== existing.shortCode) {
      const duplicate = await prisma.triggerLink.findUnique({
        where: { shortCode: newShortCode },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Short code already exists' });
      }
    }

    const link = await prisma.triggerLink.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(originalUrl !== undefined && { originalUrl }),
        ...(newShortCode !== undefined && { shortCode: newShortCode }),
        ...(campaignId !== undefined && { campaignId: campaignId || null }),
        ...(workflowId !== undefined && { workflowId: workflowId || null }),
        ...(tags !== undefined && { tags }),
      },
    });

    res.json({ success: true, data: link });
  } catch (error: any) {
    console.error('Error updating trigger link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete link
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = (req as any).user.businessId;

    const existing = await prisma.triggerLink.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trigger link not found' });
    }

    // Delete associated clicks first
    await prisma.triggerLinkClick.deleteMany({ where: { linkId: id } });
    await prisma.triggerLink.delete({ where: { id } });

    res.json({ success: true, message: 'Trigger link deleted' });
  } catch (error: any) {
    console.error('Error deleting trigger link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle active
router.patch('/:id/toggle', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = (req as any).user.businessId;

    const existing = await prisma.triggerLink.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trigger link not found' });
    }

    const link = await prisma.triggerLink.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json({ success: true, data: link });
  } catch (error: any) {
    console.error('Error toggling trigger link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get click history (paginated, with device/browser stats)
router.get('/:id/clicks', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessId = (req as any).user.businessId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const link = await prisma.triggerLink.findFirst({
      where: { id, businessId },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Trigger link not found' });
    }

    const [clicks, total] = await Promise.all([
      prisma.triggerLinkClick.findMany({
        where: { linkId: id },
        orderBy: { clickedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.triggerLinkClick.count({ where: { linkId: id } }),
    ]);

    // Aggregate stats for the link
    const allClicks = await prisma.triggerLinkClick.findMany({
      where: { linkId: id },
      select: { device: true, browser: true, country: true, clickedAt: true },
    });

    const deviceStats = allClicks.reduce((acc, click) => {
      acc[click.device] = (acc[click.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const browserStats = allClicks.reduce((acc, click) => {
      acc[click.browser] = (acc[click.browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Clicks over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClicks = allClicks.filter(
      (c) => c.clickedAt >= thirtyDaysAgo
    );

    const clicksByDay: Record<string, number> = {};
    recentClicks.forEach((click) => {
      const day = click.clickedAt.toISOString().split('T')[0];
      clicksByDay[day] = (clicksByDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        clicks,
        stats: {
          deviceStats,
          browserStats,
          clicksByDay,
          totalClicks: total,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting click history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public redirect (no auth required)
router.get('/s/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    const link = await prisma.triggerLink.findUnique({
      where: { shortCode },
    });

    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, error: 'Link not found or inactive' });
    }

    // Parse user-agent
    const userAgent = req.headers['user-agent'] || '';
    const parsed = parseUserAgent(userAgent);

    // Get IP address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] as string ||
      req.socket.remoteAddress ||
      'unknown';

    // Record click asynchronously (don't block redirect)
    prisma.triggerLinkClick
      .create({
        data: {
          linkId: link.id,
          ipAddress,
          userAgent,
          referer: (req.headers['referer'] as string) || null,
          country: null, // Would need GeoIP lookup in production
          city: null,
          device: parsed.device,
          browser: parsed.browser,
        },
      })
      .catch((err) => console.error('Error recording click:', err));

    // Increment clickCount asynchronously
    prisma.triggerLink
      .update({
        where: { id: link.id },
        data: {
          clickCount: { increment: 1 },
          lastClickedAt: new Date(),
        },
      })
      .catch((err) => console.error('Error incrementing click count:', err));

    // Redirect to original URL
    res.redirect(302, link.originalUrl);
  } catch (error: any) {
    console.error('Error handling redirect:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
