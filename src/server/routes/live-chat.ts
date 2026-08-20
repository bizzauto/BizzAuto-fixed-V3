import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ==================== PUBLIC: GET WIDGET CONFIG ====================

router.get('/widget', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId query param is required' });
    }

    const widget = await prisma.liveChatWidget.findFirst({
      where: { businessId: String(businessId), isActive: true },
    });

    if (!widget) {
      return res.status(404).json({ success: false, error: 'No active widget found for this business' });
    }

    res.json({ success: true, data: widget });
  } catch (error: any) {
    console.error('Get widget error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch widget', details: error.message });
  }
});

// ==================== PUBLIC: CREATE SESSION (visitor starts chat, no auth) ====================

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { businessId, visitorName, visitorEmail, visitorPhone, metadata } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId is required' });
    }

    const visitorIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    const session = await prisma.liveChatSession.create({
      data: {
        businessId,
        visitorName: visitorName || 'Anonymous',
        visitorEmail: visitorEmail || null,
        visitorPhone: visitorPhone || null,
        visitorIP: typeof visitorIP === 'string' ? visitorIP : Array.isArray(visitorIP) ? visitorIP[0] : null,
        status: 'waiting',
        priority: 'normal',
        metadata: metadata || undefined,
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session', details: error.message });
  }
});

// ==================== PUBLIC: ADD MESSAGE (visitor sends message) ====================

router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { senderType, senderId, content, contentType, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const session = await prisma.liveChatSession.findUnique({ where: { id } });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ success: false, error: 'Session is closed' });
    }

    const message = await prisma.liveChatMessage.create({
      data: {
        sessionId: id,
        senderType: senderType || 'visitor',
        senderId: senderId || null,
        content,
        contentType: contentType || 'text',
        metadata: metadata || undefined,
      },
    });

    // Update session timestamp
    await prisma.liveChatSession.update({
      where: { id },
      data: {},
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    console.error('Add message error:', error);
    res.status(500).json({ success: false, error: 'Failed to add message', details: error.message });
  }
});

// ==================== AUTHENTICATED ROUTES BELOW ====================

// ==================== LIST SESSIONS ====================

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { status, assignedTo, search, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { businessId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (search) {
      where.OR = [
        { visitorName: { contains: String(search), mode: 'insensitive' } },
        { visitorEmail: { contains: String(search), mode: 'insensitive' } },
        { visitorPhone: { contains: String(search) } },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.liveChatSession.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.liveChatSession.count({ where }),
    ]);

    const sessionsWithLastMessage = sessions.map((s) => ({
      ...s,
      lastMessage: s.messages[0] || null,
      messages: undefined,
    }));

    res.json({
      success: true,
      data: {
        sessions: sessionsWithLastMessage,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('List sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions', details: error.message });
  }
});

// ==================== CHAT STATS ====================

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [active, waiting, resolvedToday, totalMessages] = await Promise.all([
      prisma.liveChatSession.count({
        where: { businessId, status: 'active' },
      }),
      prisma.liveChatSession.count({
        where: { businessId, status: 'waiting' },
      }),
      prisma.liveChatSession.count({
        where: {
          businessId,
          status: 'closed',
          endedAt: { gte: todayStart },
        },
      }),
      prisma.liveChatMessage.count({
        where: {
          session: { businessId },
        },
      }),
    ]);

    const avgSatisfaction = await prisma.liveChatSession.aggregate({
      where: { businessId, satisfaction: { not: null } },
      _avg: { satisfaction: true },
    });

    res.json({
      success: true,
      data: {
        active,
        waiting,
        resolvedToday,
        totalMessages,
        averageSatisfaction: avgSatisfaction._avg.satisfaction || 0,
      },
    });
  } catch (error: any) {
    console.error('Chat stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat stats', details: error.message });
  }
});

// ==================== GET SESSION WITH MESSAGES ====================

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.liveChatSession.findFirst({
      where: { id, businessId: req.user.businessId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session', details: error.message });
  }
});

// ==================== ASSIGN AGENT ====================

router.patch('/:id/assign', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ success: false, error: 'assignedTo is required' });
    }

    const session = await prisma.liveChatSession.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const updated = await prisma.liveChatSession.update({
      where: { id },
      data: {
        assignedTo,
        status: 'active',
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Assign session error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign session', details: error.message });
  }
});

// ==================== CLOSE SESSION ====================

router.patch('/:id/close', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.liveChatSession.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ success: false, error: 'Session is already closed' });
    }

    const updated = await prisma.liveChatSession.update({
      where: { id },
      data: {
        status: 'closed',
        endedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Close session error:', error);
    res.status(500).json({ success: false, error: 'Failed to close session', details: error.message });
  }
});

// ==================== RATE SESSION ====================

router.patch('/:id/rate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { satisfaction } = req.body;

    if (!satisfaction || satisfaction < 1 || satisfaction > 5) {
      return res.status(400).json({ success: false, error: 'satisfaction must be between 1 and 5' });
    }

    const session = await prisma.liveChatSession.findUnique({ where: { id } });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'closed') {
      return res.status(400).json({ success: false, error: 'Can only rate closed sessions' });
    }

    const updated = await prisma.liveChatSession.update({
      where: { id },
      data: { satisfaction },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Rate session error:', error);
    res.status(500).json({ success: false, error: 'Failed to rate session', details: error.message });
  }
});

// ==================== CREATE/UPDATE WIDGET CONFIG ====================

router.post('/widget', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const {
      name,
      position,
      primaryColor,
      greetingMessage,
      offlineMessage,
      workingHours,
      autoResponses,
      isActive,
    } = req.body;

    const existing = await prisma.liveChatWidget.findFirst({
      where: { businessId },
    });

    let widget;

    if (existing) {
      widget = await prisma.liveChatWidget.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name }),
          ...(position !== undefined && { position }),
          ...(primaryColor !== undefined && { primaryColor }),
          ...(greetingMessage !== undefined && { greetingMessage }),
          ...(offlineMessage !== undefined && { offlineMessage }),
          ...(workingHours !== undefined && { workingHours }),
          ...(autoResponses !== undefined && { autoResponses }),
          ...(isActive !== undefined && { isActive }),
        },
      });
    } else {
      widget = await prisma.liveChatWidget.create({
        data: {
          businessId,
          name: name || 'Live Chat',
          position: position || 'bottom-right',
          primaryColor: primaryColor || '#3B82F6',
          greetingMessage: greetingMessage || 'Hello! How can we help you today?',
          offlineMessage: offlineMessage || 'We are currently offline. Please leave a message.',
          workingHours: workingHours || undefined,
          autoResponses: autoResponses || undefined,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
    }

    res.json({ success: true, data: widget });
  } catch (error: any) {
    console.error('Upsert widget error:', error);
    res.status(500).json({ success: false, error: 'Failed to save widget config', details: error.message });
  }
});

// ==================== BOT AUTO-REPLY ====================

router.post('/bot-reply', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const session = await prisma.liveChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ success: false, error: 'Session is closed' });
    }

    if (session.assignedTo) {
      return res.status(200).json({ success: true, data: { skipped: true, reason: 'Agent assigned' } });
    }

    const widget = await prisma.liveChatWidget.findFirst({
      where: { businessId: session.businessId, isActive: true },
    });

    const autoResponses: Record<string, string> = widget?.autoResponses && typeof widget.autoResponses === 'object'
      ? widget.autoResponses as Record<string, string>
      : {};

    const lastVisitorMsg = session.messages.find((m) => m.senderType === 'visitor');
    const lastContent = lastVisitorMsg?.content?.toLowerCase() || '';

    let botResponse = '';

    // Check for keyword matches in auto-responses
    for (const [keyword, response] of Object.entries(autoResponses)) {
      if (lastContent.includes(keyword.toLowerCase())) {
        botResponse = response;
        break;
      }
    }

    // Fallback auto-replies
    if (!botResponse) {
      if (lastContent.includes('pricing') || lastContent.includes('price') || lastContent.includes('cost')) {
        botResponse = 'Thanks for your interest! Our team will share pricing details shortly. In the meantime, could you share your email so we can send you a detailed quote?';
      } else if (lastContent.includes('support') || lastContent.includes('help') || lastContent.includes('issue')) {
        botResponse = 'I understand you need help. Let me connect you with our support team. Could you briefly describe the issue you are facing?';
      } else if (lastContent.includes('demo') || lastContent.includes('trial')) {
        botResponse = 'We would love to show you a demo! Please share your preferred time and we will set it up for you.';
      } else if (lastContent.includes('thank') || lastContent.includes('thanks')) {
        botResponse = 'You are welcome! Is there anything else I can help you with?';
      } else if (lastContent.includes('hi') || lastContent.includes('hello') || lastContent.includes('hey')) {
        botResponse = widget?.greetingMessage || 'Hello! Welcome. How can I help you today?';
      } else if (lastContent.includes('bye') || lastContent.includes('goodbye')) {
        botResponse = 'Thank you for chatting with us! Have a great day. Feel free to reach out anytime.';
      } else {
        botResponse = 'Thanks for reaching out! An agent will be with you shortly. In the meantime, feel free to ask any questions.';
      }
    }

    const message = await prisma.liveChatMessage.create({
      data: {
        sessionId,
        senderType: 'bot',
        senderId: null,
        content: botResponse,
        contentType: 'text',
      },
    });

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Bot reply error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate bot reply', details: error.message });
  }
});

export default router;
