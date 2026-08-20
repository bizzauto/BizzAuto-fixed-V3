import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/notifications
 * List notifications for the current user's business.
 * Supports query params: ?isRead=true&limit=20&type=lead_captured
 *
 * Prisma Notification model fields:
 * - id, businessId, userId, type, title, message, icon, link, data (Json)
 * - isRead, isArchived, priority (low|normal|high|critical)
 * - deliveredVia (String[]), emailSent, pushSent, whatsappSent
 * - createdAt
 */
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { isRead, type, priority, limit = 50, offset = 0 } = req.query;

    const where: any = {
      businessId: req.user.businessId,
      isArchived: false,
    };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }
    if (type) {
      where.type = type;
    }
    if (priority) {
      where.priority = priority;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.notification.count({
        where: {
          businessId: req.user.businessId,
          isRead: false,
          isArchived: false,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications',
    });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read.
 * Verifies the notification belongs to the user's business.
 */
router.post('/:id/read', authenticate, async (req: any, res: any) => {
	try {
		const { id } = req.params;

		const notification = await prisma.notification.findUnique({
			where: { id },
		});

		if (!notification) {
			return res.status(404).json({
				success: false,
				error: 'Notification not found',
			});
		}

		if (notification.businessId !== req.user.businessId) {
			return res.status(403).json({
				success: false,
				error: 'Access denied',
			});
		}

		const updated = await prisma.notification.update({
			where: { id },
			data: { isRead: true },
		});

		res.json({
			success: true,
			data: updated,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to mark notification as read',
		});
	}
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the current user's business.
 */
router.post('/read-all', authenticate, async (req: any, res: any) => {
	try {
		await prisma.notification.updateMany({
			where: {
				businessId: req.user.businessId,
				isRead: false,
			},
			data: { isRead: true },
		});

		res.json({ success: true, message: 'All notifications marked as read' });
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to mark all notifications as read',
		});
	}
});

/**
 * DELETE /api/notifications/:id
 * Delete (archive) a notification.
 * Soft-deletes by setting isArchived to true instead of hard delete.
 */
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    if (notification.businessId !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Soft delete via archival
    const updated = await prisma.notification.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete notification',
    });
  }
});

export default router;
