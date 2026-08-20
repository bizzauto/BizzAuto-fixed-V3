import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTicketSchema, updateTicketSchema, replyTicketSchema } from '../validations/remaining-schemas.js';

const router = Router();

// Generate ticket number
function generateTicketNumber(): string {
  const num = Date.now().toString(36).toUpperCase().slice(-6);
  return `#TICKET-${num}`;
}

// ==================== ADMIN ROUTES ====================

// List tickets
router.get('/', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { status, priority, assignedTo, search, page = 1, limit = 20 } = req.query;

    const where: any = { businessId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { contact: { select: { id: true, name: true, phone: true, email: true } }, replies: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single ticket with replies
router.get('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: {
        contact: true,
        replies: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create ticket (admin)
router.post('/', authenticate, validate(createTicketSchema), async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactId, name, email, phone, subject, description, category, priority, tags } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'Subject and description are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        businessId,
        ticketNumber: generateTicketNumber(),
        contactId,
        name: name || 'Customer',
        email,
        phone,
        subject,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        tags: tags || [],
      },
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update ticket status/priority/assignment
router.put('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { status, priority, assignedTo, internalNotes, tags } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (tags) updateData.tags = tags;
    if (status === 'resolved') updateData.resolvedAt = new Date();
    if (status === 'closed') updateData.closedAt = new Date();

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add reply to ticket
router.post('/:id/reply', authenticate, async (req: any, res: Response) => {
  try {
    const { message, isInternal } = req.body;

    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: req.params.id,
        senderType: 'agent',
        senderId: req.user.id,
        senderName: req.user.name || 'Agent',
        message,
        isInternal: isInternal || false,
      },
    });

    // Update ticket status to in_progress if it was open
    await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status: 'in_progress', updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: reply });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ticket stats
router.get('/stats/overview', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [open, inProgress, waiting, resolved, closed, total] = await Promise.all([
      prisma.supportTicket.count({ where: { businessId, status: 'open' } }),
      prisma.supportTicket.count({ where: { businessId, status: 'in_progress' } }),
      prisma.supportTicket.count({ where: { businessId, status: 'waiting' } }),
      prisma.supportTicket.count({ where: { businessId, status: 'resolved' } }),
      prisma.supportTicket.count({ where: { businessId, status: 'closed' } }),
      prisma.supportTicket.count({ where: { businessId } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.supportTicket.count({
      where: { businessId, createdAt: { gte: today } },
    });

    res.json({
      success: true,
      data: { open, inProgress, waiting, resolved, closed, total, todayCount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PUBLIC ROUTES (for end users) ====================

// Submit ticket (no auth - public endpoint)
router.post('/submit', async (req: any, res: Response) => {
  try {
    const { businessId, name, email, phone, subject, description, category } = req.body;

    if (!businessId || !name || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'businessId, name, subject, and description are required',
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        businessId,
        ticketNumber: generateTicketNumber(),
        name,
        email,
        phone,
        subject,
        description,
        category: category || 'general',
        priority: 'medium',
        tags: ['customer-submitted'],
      },
    });

    res.status(201).json({
      success: true,
      message: 'Ticket submitted successfully',
      data: { ticketNumber: ticket.ticketNumber, id: ticket.id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check ticket status (public - by ticket number)
router.get('/track/:ticketNumber', async (req: any, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber: req.params.ticketNumber },
      include: {
        replies: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add reply to ticket (public - by ticket number)
router.post('/track/:ticketNumber/reply', async (req: any, res: Response) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ success: false, error: 'Name and message are required' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber: req.params.ticketNumber },
    });

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        senderType: 'customer',
        senderName: name,
        message,
      },
    });

    res.status(201).json({ success: true, data: reply });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
