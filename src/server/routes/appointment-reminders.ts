import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { qs } from '../utils/query.js';

const router = Router();

// GET /api/appointment-reminders/stats - Must be before /:id routes
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [sent, pending, failed, byChannel, byReminderType] = await Promise.all([
      prisma.appointmentReminder.count({
        where: { businessId, status: 'sent' },
      }),
      prisma.appointmentReminder.count({
        where: { businessId, status: 'pending' },
      }),
      prisma.appointmentReminder.count({
        where: { businessId, status: 'failed' },
      }),
      prisma.appointmentReminder.groupBy({
        by: ['channel'],
        where: { businessId },
        _count: { id: true },
      }),
      prisma.appointmentReminder.groupBy({
        by: ['reminderType'],
        where: { businessId },
        _count: { id: true },
      }),
    ]);

    const total = sent + pending + failed;

    res.json({
      success: true,
      data: {
        total,
        sent,
        pending,
        failed,
        sendRate: total > 0 ? Math.round((sent / total) * 10000) / 100 : 0,
        byChannel: byChannel.reduce((acc, item) => {
          acc[item.channel] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byReminderType: byReminderType.reduce((acc, item) => {
          acc[item.reminderType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    console.error('Get appointment reminder stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch reminder stats',
    });
  }
});

// GET /api/appointment-reminders - List reminders
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, channel, reminderType, limit = 50, offset = 0 } = req.query;

    const where: any = {
      businessId: req.user.businessId,
    };

    if (status) {
      where.status = status;
    }
    if (channel) {
      where.channel = channel;
    }
    if (reminderType) {
      where.reminderType = reminderType;
    }

    const [reminders, total] = await Promise.all([
      prisma.appointmentReminder.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
      prisma.appointmentReminder.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        reminders,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      },
    });
  } catch (error: any) {
    console.error('Get appointment reminders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch appointment reminders',
    });
  }
});

// POST /api/appointment-reminders - Create reminder
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId, contactId, channel, message, scheduledAt, reminderType } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'appointmentId is required',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required',
      });
    }

    if (channel && !['whatsapp', 'email', 'sms'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'channel must be whatsapp, email, or sms',
      });
    }

    if (reminderType && !['before', 'after', 'followup'].includes(reminderType)) {
      return res.status(400).json({
        success: false,
        error: 'reminderType must be before, after, or followup',
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt must be in the future',
      });
    }

    // Verify contact belongs to this business if provided
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      if (!contact || contact.businessId !== req.user.businessId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid contact ID',
        });
      }
    }

    const reminder = await prisma.appointmentReminder.create({
      data: {
        business: { connect: { id: req.user.businessId } },
        appointmentId,
        contactId: contactId || null,
        channel: channel || 'whatsapp',
        message,
        scheduledAt: scheduledDate,
        reminderType: reminderType || 'before',
      } as any,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: reminder,
    });
  } catch (error: any) {
    console.error('Create appointment reminder error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create appointment reminder',
    });
  }
});

// POST /api/appointment-reminders/:id/send - Send reminder now
router.post('/:id/send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const reminder = await prisma.appointmentReminder.findFirst({
      where: {
        id: qs(req.params.id),
        businessId: req.user.businessId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found',
      });
    }

    if (reminder.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Reminder has already been sent',
      });
    }

    // Mark as sent immediately
    const updated = await prisma.appointmentReminder.update({
      where: { id: qs(req.params.id) },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `Reminder sent via ${reminder.channel}`,
    });
  } catch (error: any) {
    console.error('Send appointment reminder error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send appointment reminder',
    });
  }
});

// DELETE /api/appointment-reminders/:id - Delete reminder
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const reminder = await prisma.appointmentReminder.findFirst({
      where: {
        id: qs(req.params.id),
        businessId: req.user.businessId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found',
      });
    }

    await prisma.appointmentReminder.delete({
      where: { id: qs(req.params.id) },
    });

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete appointment reminder error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete appointment reminder',
    });
  }
});

// POST /api/appointment-reminders/auto-schedule - Auto-schedule reminders for upcoming appointments
router.post('/auto-schedule', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const now = new Date();

    // Find upcoming appointments in the next 7 days that don't have pending reminders
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: now,
          lte: sevenDaysFromNow,
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const appointment of upcomingAppointments) {
      // Check if reminders already exist for this appointment
      const existingReminders = await prisma.appointmentReminder.findMany({
        where: {
          businessId,
          appointmentId: appointment.id,
          status: 'pending',
        },
      });

      if (existingReminders.length > 0) {
        skippedCount++;
        continue;
      }

      const appointmentStart = new Date(appointment.startTime);

      // 1 day before reminder
      const oneDayBefore = new Date(appointmentStart);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);

      if (oneDayBefore > now) {
        await prisma.appointmentReminder.create({
          data: {
            business: { connect: { id: businessId } },
            appointmentId: appointment.id,
            contactId: appointment.contactId,
            channel: 'whatsapp',
            message: `Hi${appointment.contact?.name ? ' ' + appointment.contact.name : ''}, this is a reminder that your appointment is tomorrow at ${appointmentStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Please let us know if you need to reschedule.`,
            scheduledAt: oneDayBefore,
            reminderType: 'before',
          } as any,
        });
        createdCount++;
      }

      // 1 hour before reminder
      const oneHourBefore = new Date(appointmentStart);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);

      if (oneHourBefore > now) {
        await prisma.appointmentReminder.create({
          data: {
            business: { connect: { id: businessId } },
            appointmentId: appointment.id,
            contactId: appointment.contactId,
            channel: 'whatsapp',
            message: `Hi${appointment.contact?.name ? ' ' + appointment.contact.name : ''}, your appointment starts in 1 hour at ${appointmentStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. We look forward to seeing you!`,
            scheduledAt: oneHourBefore,
            reminderType: 'before',
          } as any,
        });
        createdCount++;
      }
    }

    res.json({
      success: true,
      data: {
        appointmentsProcessed: upcomingAppointments.length,
        remindersCreated: createdCount,
        appointmentsSkipped: skippedCount,
      },
      message: `Auto-scheduled ${createdCount} reminders for ${upcomingAppointments.length} upcoming appointments`,
    });
  } catch (error: any) {
    console.error('Auto-schedule appointment reminders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to auto-schedule appointment reminders',
    });
  }
});

export default router;
