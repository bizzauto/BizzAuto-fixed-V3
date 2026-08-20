import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAppointmentSchema, updateAppointmentSchema } from '../validations/crm-schemas.js';

const router = Router();

/**
 * GET /api/appointments
 * List appointments with filtering.
 * Query params: ?status=scheduled&date=2026-04-14&limit=50&offset=0
 *
 * Prisma Appointment model fields:
 * - id, businessId, contactId, title, description, service
 * - startTime, endTime, timezone
 * - status (pending|confirmed|completed|cancelled|no_show)
 * - reminderSent, reminderTime, customerNotified
 * - location, meetingUrl
 * - notes, internalNotes
 * - createdAt, updatedAt
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, date, limit = 50, offset = 0 } = req.query;

    const where: any = {
      businessId: req.user.businessId,
    };

    if (status) {
      where.status = status;
    }

    // Filter by specific date (match startTime within that day)
    if (date) {
      const startOfDay = new Date(date as string);
      const endOfDay = new Date(date as string);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.startTime = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'asc' },
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
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch appointments',
    });
  }
});

/**
 * POST /api/appointments
 * Create a new appointment.
 * Required fields: title, startTime, endTime
 * Optional: description, service, contactId, location, meetingUrl
 */
router.post('/', authenticate, validate(createAppointmentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, startTime, endTime, description, service, contactId, location, meetingUrl } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }
    if (!startTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time is required',
      });
    }
    if (!endTime) {
      return res.status(400).json({
        success: false,
        error: 'End time is required',
      });
    }
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID is required',
      });
    }

    // Validate time ordering
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time',
      });
    }

    // If contactId provided, verify it belongs to this business
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

    const appointment = await prisma.appointment.create({
      data: {
        business: { connect: { id: req.user.businessId as string } },
        createdBy: req.user.id,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        description: description || null,
        service: service || null,
        contact: { connect: { id: contactId } },
        location: location || null,
        meetingUrl: meetingUrl || null,
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

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create appointment',
    });
  }
});

/**
 * PUT /api/appointments/:id
 * Update an existing appointment.
 * Only updates fields that are provided in the request body.
 */
router.put('/:id', authenticate, validate(updateAppointmentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};

    // Build update data from provided fields
    const allowedFields = [
      'title', 'description', 'service', 'startTime', 'endTime',
      'status', 'location', 'meetingUrl',
      'reminderSent', 'reminderTime',
      'customerNotified',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'startTime' || field === 'endTime') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    // Validate time ordering if both are being updated
    if (updateData.startTime && updateData.endTime) {
      if (updateData.startTime >= updateData.endTime) {
        return res.status(400).json({
          success: false,
          error: 'End time must be after start time',
        });
      }
    }

    // Verify appointment belongs to user's business
    const existing = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
    }

    if (existing.businessId !== req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
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

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update appointment',
    });
  }
});

/**
 * DELETE /api/appointments/:id
 * Delete an appointment permanently.
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.appointment.delete({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    res.json({ success: true, message: 'Appointment deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm appointment
router.patch('/:id/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!appointment) return res.status(404).json({ success: false, error: 'Not found' });
    
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'confirmed' },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel appointment
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!appointment) return res.status(404).json({ success: false, error: 'Not found' });
    
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete appointment
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!appointment) return res.status(404).json({ success: false, error: 'Not found' });
    
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
