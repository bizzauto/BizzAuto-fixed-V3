import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ==================== ADMIN: POSTS ====================

// List posts (paginated, filterable by status/category)
router.get('/posts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, categoryId, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId: req.user.businessId };
    if (status) where.status = status as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { excerpt: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts', details: error.message });
  }
});

// Get post
router.get('/posts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const post = await prisma.blogPost.findFirst({
      where: { id: postId, businessId: req.user.businessId },
      include: {
        category: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, data: post });
  } catch (error: any) {
    console.error('Get blog post error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post', details: error.message });
  }
});

// Create post
router.post('/posts', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, excerpt, content, featuredImage, author,
      categoryId, tags, seoTitle, seoDescription, seoKeywords,
      status, publishedAt, readingTime,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    let slug = slugify(title);

    const existing = await prisma.blogPost.findFirst({
      where: { businessId: req.user.businessId, slug },
    });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        businessId: req.user.businessId,
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        featuredImage: featuredImage || null,
        author: author || null,
        categoryId: categoryId || null,
        tags: tags || [],
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
        status: status || 'draft',
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        viewCount: 0,
        readingTime: readingTime || null,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (error: any) {
    console.error('Create blog post error:', error);
    res.status(500).json({ success: false, error: 'Failed to create post', details: error.message });
  }
});

// Update post
router.put('/posts/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;

    const existing = await prisma.blogPost.findFirst({
      where: { id: postId, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const {
      title, excerpt, content, featuredImage, author,
      categoryId, tags, seoTitle, seoDescription, seoKeywords,
      status, publishedAt, readingTime,
    } = req.body;

    let slug = existing.slug;
    if (title && title !== existing.title) {
      slug = slugify(title);
      const duplicate = await prisma.blogPost.findFirst({
        where: { businessId: req.user.businessId, slug, id: { not: postId } },
      });
      if (duplicate) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const post = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        title: title ?? existing.title,
        slug,
        excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
        content: content !== undefined ? content : existing.content,
        featuredImage: featuredImage !== undefined ? featuredImage : existing.featuredImage,
        author: author !== undefined ? author : existing.author,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        tags: tags !== undefined ? tags : existing.tags,
        seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
        seoKeywords: seoKeywords !== undefined ? seoKeywords : existing.seoKeywords,
        status: status ?? existing.status,
        publishedAt: publishedAt !== undefined ? (publishedAt ? new Date(publishedAt) : null) : existing.publishedAt,
        readingTime: readingTime !== undefined ? readingTime : existing.readingTime,
      },
      include: { category: true },
    });

    res.json({ success: true, data: post });
  } catch (error: any) {
    console.error('Update blog post error:', error);
    res.status(500).json({ success: false, error: 'Failed to update post', details: error.message });
  }
});

// Delete post
router.delete('/posts/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;

    const existing = await prisma.blogPost.findFirst({
      where: { id: postId, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await prisma.blogComment.deleteMany({ where: { postId } });
    await prisma.blogPost.delete({ where: { id: postId } });

    res.json({ success: true, message: 'Post deleted' });
  } catch (error: any) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post', details: error.message });
  }
});

// Toggle publish status
router.patch('/posts/:id/publish', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;

    const existing = await prisma.blogPost.findFirst({
      where: { id: postId, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const newStatus = existing.status === 'published' ? 'draft' : 'published';
    const post = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'published' ? new Date() : existing.publishedAt,
      },
    });

    res.json({ success: true, data: post });
  } catch (error: any) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle publish status', details: error.message });
  }
});

// ==================== ADMIN: CATEGORIES ====================

// List categories
router.get('/categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.blogCategory.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });

    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('Get blog categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories', details: error.message });
  }
});

// Create category
router.post('/categories', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const slug = slugify(name);

    const existing = await prisma.blogCategory.findFirst({
      where: { businessId: req.user.businessId, slug },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A category with this name already exists' });
    }

    const category = await prisma.blogCategory.create({
      data: {
        businessId: req.user.businessId,
        name,
        slug,
        description: description || null,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    console.error('Create blog category error:', error);
    res.status(500).json({ success: false, error: 'Failed to create category', details: error.message });
  }
});

// Update category
router.put('/categories/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const categoryIdParam = req.params.id as string;

    const existing = await prisma.blogCategory.findFirst({
      where: { id: categoryIdParam, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const { name, description } = req.body;

    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = slugify(name);
      const duplicate = await prisma.blogCategory.findFirst({
        where: { businessId: req.user.businessId, slug, id: { not: categoryIdParam } },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'A category with this name already exists' });
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id: categoryIdParam },
      data: {
        name: name ?? existing.name,
        slug,
        description: description !== undefined ? description : existing.description,
      },
    });

    res.json({ success: true, data: category });
  } catch (error: any) {
    console.error('Update blog category error:', error);
    res.status(500).json({ success: false, error: 'Failed to update category', details: error.message });
  }
});

// Delete category
router.delete('/categories/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const categoryIdParam = req.params.id as string;

    const existing = await prisma.blogCategory.findFirst({
      where: { id: categoryIdParam, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    await prisma.blogPost.updateMany({
      where: { categoryId: categoryIdParam },
      data: { categoryId: null },
    });

    await prisma.blogCategory.delete({ where: { id: categoryIdParam } });

    res.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    console.error('Delete blog category error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category', details: error.message });
  }
});

// ==================== ADMIN: COMMENTS ====================

// List comments (admin sees all)
router.get('/posts/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const post = await prisma.blogPost.findFirst({
      where: { id: postId, businessId: req.user.businessId },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const where = { postId };

    const [comments, total] = await Promise.all([
      prisma.blogComment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogComment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get blog comments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments', details: error.message });
  }
});

// Approve comment
router.patch('/comments/:id/approve', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.id as string;

    const comment = await prisma.blogComment.findFirst({
      where: { id: commentId, businessId: req.user.businessId },
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const updated = await prisma.blogComment.update({
      where: { id: commentId },
      data: { isApproved: !comment.isApproved },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Approve blog comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve comment', details: error.message });
  }
});

// ==================== PUBLIC ROUTES ====================

// List published posts (paginated, by category/tag)
router.get('/p', async (req: any, res: Response) => {
  try {
    const { page = '1', limit = '20', category, tag, businessId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId is required' });
    }

    const where: any = {
      businessId: businessId as string,
      status: 'published',
    };

    if (category) {
      const cat = await prisma.blogCategory.findFirst({
        where: { businessId: businessId as string, slug: category as string },
      });
      if (cat) where.categoryId = cat.id;
    }

    if (tag) {
      where.tags = { has: tag as string };
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          author: true,
          tags: true,
          publishedAt: true,
          readingTime: true,
          viewCount: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Public list posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts', details: error.message });
  }
});

// Get published post by slug (increment viewCount)
router.get('/p/:slug', async (req: any, res: Response) => {
  try {
    const { businessId } = req.query;
    const slug = req.params.slug as string;

    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId is required' });
    }

    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        businessId: businessId as string,
        status: 'published',
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ success: true, data: { ...post, viewCount: post.viewCount + 1 } });
  } catch (error: any) {
    console.error('Public get post error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post', details: error.message });
  }
});

// Submit comment (public, no auth)
router.post('/p/:postId/comments', async (req: any, res: Response) => {
  try {
    const { name, email, content } = req.body;
    const postId = req.params.postId as string;

    if (!name || !email || !content) {
      return res.status(400).json({ success: false, error: 'Name, email, and content are required' });
    }

    const post = await prisma.blogPost.findFirst({
      where: { id: postId, status: 'published' },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = await prisma.blogComment.create({
      data: {
        postId,
        businessId: post.businessId,
        contactId: null,
        name,
        email,
        content,
        isApproved: false,
      },
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    console.error('Submit comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit comment', details: error.message });
  }
});

export default router;
