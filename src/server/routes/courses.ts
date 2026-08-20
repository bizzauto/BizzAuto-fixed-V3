import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ==================== COURSES ====================

// List courses for business
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, isPublished, accessType } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId: req.user.businessId };
    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (accessType) where.accessType = accessType;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { modules: true, enrollments: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get courses error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch courses', details: error.message });
  }
});

// Get course with modules and lessons
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error: any) {
    console.error('Get course error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch course', details: error.message });
  }
});

// Create course
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, thumbnail, price, currency, accessType, dripContent, dripInterval, isActive, isPublished } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const validAccessTypes = ['free', 'paid', 'subscription'];
    if (accessType && !validAccessTypes.includes(accessType)) {
      return res.status(400).json({ success: false, error: `Invalid accessType. Must be one of: ${validAccessTypes.join(', ')}` });
    }

    const course = await prisma.course.create({
      data: {
        businessId: req.user.businessId,
        name,
        description,
        thumbnail,
        price: price ?? 0,
        currency: currency || 'INR',
        accessType: accessType || 'free',
        dripContent: dripContent ?? false,
        dripInterval: dripInterval ?? null,
        isActive: isActive ?? true,
        isPublished: isPublished ?? false,
      },
    });

    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, error: 'Failed to create course', details: error.message });
  }
});

// Update course
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.course.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const { name, description, thumbnail, price, currency, accessType, dripContent, dripInterval, isActive, isPublished } = req.body;

    const validAccessTypes = ['free', 'paid', 'subscription'];
    if (accessType && !validAccessTypes.includes(accessType)) {
      return res.status(400).json({ success: false, error: `Invalid accessType. Must be one of: ${validAccessTypes.join(', ')}` });
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { name, description, thumbnail, price, currency, accessType, dripContent, dripInterval, isActive, isPublished },
    });

    res.json({ success: true, data: course });
  } catch (error: any) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, error: 'Failed to update course', details: error.message });
  }
});

// Delete course
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.course.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    await prisma.course.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Course deleted' });
  } catch (error: any) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete course', details: error.message });
  }
});

// ==================== COURSE MODULES ====================

// Add module to course
router.post('/:id/modules', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { modules: true },
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const { name, description, isPublished } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const maxOrder = course.modules.length > 0
      ? Math.max(...course.modules.map((m) => m.order))
      : -1;

    const module = await prisma.courseModule.create({
      data: {
        courseId: course.id,
        name,
        description,
        isPublished: isPublished ?? false,
        order: maxOrder + 1,
      },
    });

    res.status(201).json({ success: true, data: module });
  } catch (error: any) {
    console.error('Create course module error:', error);
    res.status(500).json({ success: false, error: 'Failed to create module', details: error.message });
  }
});

// Update module
router.put('/modules/:moduleId', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courseModule.findFirst({
      where: { id: req.params.moduleId, course: { businessId: req.user.businessId } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    const { name, description, order, isPublished } = req.body;

    const module = await prisma.courseModule.update({
      where: { id: req.params.moduleId },
      data: { name, description, order, isPublished },
    });

    res.json({ success: true, data: module });
  } catch (error: any) {
    console.error('Update course module error:', error);
    res.status(500).json({ success: false, error: 'Failed to update module', details: error.message });
  }
});

// Delete module
router.delete('/modules/:moduleId', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courseModule.findFirst({
      where: { id: req.params.moduleId, course: { businessId: req.user.businessId } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    await prisma.courseModule.delete({ where: { id: req.params.moduleId } });

    res.json({ success: true, message: 'Module deleted' });
  } catch (error: any) {
    console.error('Delete course module error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete module', details: error.message });
  }
});

// ==================== COURSE LESSONS ====================

// Add lesson to module
router.post('/modules/:moduleId/lessons', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existingModule = await prisma.courseModule.findFirst({
      where: { id: req.params.moduleId, course: { businessId: req.user.businessId } },
      include: { lessons: true },
    });

    if (!existingModule) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    const { title, description, type, content, duration, isFree, isPublished } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const validTypes = ['video', 'text', 'quiz', 'assignment', 'download'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const maxOrder = existingModule.lessons.length > 0
      ? Math.max(...existingModule.lessons.map((l) => l.order))
      : -1;

    const lesson = await prisma.courseLesson.create({
      data: {
        moduleId: existingModule.id,
        title,
        description,
        type: type || 'text',
        content: content || {},
        duration: duration ?? null,
        isFree: isFree ?? false,
        isPublished: isPublished ?? false,
        order: maxOrder + 1,
      },
    });

    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Create course lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson', details: error.message });
  }
});

// Update lesson
router.put('/lessons/:lessonId', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courseLesson.findFirst({
      where: { id: req.params.lessonId, module: { course: { businessId: req.user.businessId } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    const { title, description, type, content, duration, order, isFree, isPublished } = req.body;

    const validTypes = ['video', 'text', 'quiz', 'assignment', 'download'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const lesson = await prisma.courseLesson.update({
      where: { id: req.params.lessonId },
      data: { title, description, type, content, duration, order, isFree, isPublished },
    });

    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Update course lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson', details: error.message });
  }
});

// Delete lesson
router.delete('/lessons/:lessonId', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courseLesson.findFirst({
      where: { id: req.params.lessonId, module: { course: { businessId: req.user.businessId } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    await prisma.courseLesson.delete({ where: { id: req.params.lessonId } });

    res.json({ success: true, message: 'Lesson deleted' });
  } catch (error: any) {
    console.error('Delete course lesson error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson', details: error.message });
  }
});

// ==================== ENROLLMENTS ====================

// Enroll contact in course
router.post('/:id/enroll', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const { contactId, userId } = req.body;

    if (!contactId && !userId) {
      return res.status(400).json({ success: false, error: 'contactId or userId is required' });
    }

    // Check for existing enrollment
    const existingEnrollment = await prisma.courseEnrollment.findFirst({
      where: {
        courseId: course.id,
        ...(contactId ? { contactId } : {}),
        ...(userId ? { userId } : {}),
      },
    });

    if (existingEnrollment) {
      return res.status(409).json({ success: false, error: 'Contact is already enrolled in this course' });
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: course.id,
        businessId: req.user.businessId,
        contactId: contactId || null,
        userId: userId || null,
        status: 'active',
        progress: 0,
        enrolledAt: new Date(),
      },
    });

    // Increment enrollment count
    await prisma.course.update({
      where: { id: course.id },
      data: { enrollmentCount: { increment: 1 } },
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Contact is already enrolled in this course' });
    }
    console.error('Enroll in course error:', error);
    res.status(500).json({ success: false, error: 'Failed to enroll', details: error.message });
  }
});

// List enrollments for course
router.get('/:id/enrollments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const { page = '1', limit = '20', status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { courseId: course.id };
    if (status) where.status = status;

    const [enrollments, total] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { enrolledAt: 'desc' },
        include: {} as any,
      }),
      prisma.courseEnrollment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch enrollments', details: error.message });
  }
});

// Update enrollment progress
router.patch('/enrollments/:enrollmentId/progress', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courseEnrollment.findFirst({
      where: {
        id: req.params.enrollmentId,
        businessId: req.user.businessId,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    const { progress, status } = req.body;

    const validStatuses = ['active', 'completed', 'expired', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return res.status(400).json({ success: false, error: 'Progress must be between 0 and 100' });
    }

    const updateData: any = { lastAccessedAt: new Date() };
    if (progress !== undefined) updateData.progress = progress;
    if (status) {
      updateData.status = status;
      if (status === 'completed') updateData.completedAt = new Date();
    }

    const enrollment = await prisma.courseEnrollment.update({
      where: { id: req.params.enrollmentId },
      data: updateData,
    });

    res.json({ success: true, data: enrollment });
  } catch (error: any) {
    console.error('Update enrollment progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to update progress', details: error.message });
  }
});

// ==================== PUBLIC ROUTE (NO AUTH) ====================

// Public course view
router.get('/public/:courseId', async (req: any, res: Response) => {
  try {
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.courseId,
        isPublished: true,
        isActive: true,
      },
      include: {
        modules: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                duration: true,
                isFree: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error: any) {
    console.error('Public course view error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch course', details: error.message });
  }
});

export default router;
