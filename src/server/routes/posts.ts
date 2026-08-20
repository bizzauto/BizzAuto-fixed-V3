import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();

// Get all posts
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, status, platforms } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { businessId: req.user.businessId };
    if (status) where.status = status;
    if (platforms) where.platforms = { has: platforms as string };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.post.count({ where }),
    ]);

    res.json({ success: true, data: { posts, pagination: { total, page: Number(page), limit: Number(limit) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch posts', details: error.message });
  }
});

// Get single post
router.get('/:id', authenticate, async (req: any, res: any) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, data: post });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch post', details: error.message });
  }
});

// Create post
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const { content, platforms, scheduledAt } = req.body;

    const post = await prisma.post.create({
      data: {
        businessId: req.user.businessId,
        content,
        mediaUrls: [],
        platforms: platforms || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft',
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create post', details: error.message });
  }
});

// Update post
router.put('/:id', authenticate, async (req: any, res: any) => {
  try {
    const post = await prisma.post.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    if (post.status !== 'draft' && post.status !== 'scheduled') {
      return res.status(400).json({ success: false, error: 'Cannot publish post' });
    }

    const { content, mediaUrls, link, platforms, scheduledAt } = req.body;
    const updated = await prisma.post.update({ where: { id: req.params.id, businessId: req.user.businessId }, data: { content, mediaUrls, link, platforms, scheduledAt } });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update post', details: error.message });
  }
});

// Delete post
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    const post = await prisma.post.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    await prisma.post.delete({ where: { id: req.params.id, businessId: req.user.businessId } });
    res.json({ success: true, message: 'Post deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete post', details: error.message });
  }
});

// Schedule post
router.post('/:id/schedule', authenticate, async (req: any, res: any) => {
  try {
    const { scheduledAt } = req.body;
    const post = await prisma.post.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const updated = await prisma.post.update({
      where: { id: req.params.id, businessId: req.user.businessId },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled',
      },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to schedule post', details: error.message });
  }
});

// Publish post
router.post('/:id/publish', authenticate, async (req: any, res: any) => {
  try {
    const post = await prisma.post.findFirst({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const updated = await prisma.post.update({
      where: { id: req.params.id, businessId: req.user.businessId },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to publish post', details: error.message });
  }
});

export default router;
