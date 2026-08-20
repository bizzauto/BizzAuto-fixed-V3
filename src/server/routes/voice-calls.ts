import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { dograhService } from '../services/dograh.service.js';
import { qs } from '../utils/query.js';

const router = Router();

// GET /api/voice-calls - Call history
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, direction, status, contactId, search } = req.query;
    const where: any = { businessId: req.user.businessId };
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    if (search) {
      where.OR = [
        { callerNumber: { contains: String(search), mode: 'insensitive' } },
        { calleeNumber: { contains: String(search), mode: 'insensitive' } },
        { workflowName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.callLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        calls,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching voice calls:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calls', details: error.message });
  }
});

// GET /api/voice-calls/stats - Call statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = { businessId: req.user.businessId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const [total, incoming, outgoing, missed, avgResult] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.count({ where: { ...where, direction: 'incoming' } }),
      prisma.callLog.count({ where: { ...where, direction: 'outgoing' } }),
      prisma.callLog.count({ where: { ...where, status: 'missed' } }),
      prisma.callLog.aggregate({ where, _avg: { duration: true } }),
    ]);

    // Daily stats for chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyCalls = await prisma.callLog.groupBy({
      by: ['direction'],
      where: {
        businessId: req.user.businessId,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        total,
        incoming,
        outgoing,
        missed,
        avgDuration: avgResult._avg.duration || 0,
        dailyCalls,
      },
    });
  } catch (error: any) {
    console.error('Error fetching call stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats', details: error.message });
  }
});

// GET /api/voice-calls/agents - List Dograh agents
router.get('/agents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = await dograhService.getConfig(req.user.businessId);
    if (!config) {
      return res.json({ success: true, data: [] });
    }

    const agents = await dograhService.listAgents(config);
    res.json({ success: true, data: agents });
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    res.json({ success: true, data: [] });
  }
});

// GET /api/voice-calls/check - Health check
router.get('/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = await dograhService.getConfig(req.user.businessId);
    if (!config) {
      return res.json({ success: true, data: { connected: false, message: 'Dograh not configured' } });
    }

    const healthy = await dograhService.healthCheck(config);
    res.json({
      success: true,
      data: {
        connected: healthy,
        message: healthy ? 'Connected to Dograh' : 'Dograh unreachable',
        apiUrl: config.apiUrl,
      },
    });
  } catch (error: any) {
    res.json({ success: true, data: { connected: false, message: 'Connection check failed' } });
  }
});

// GET /api/voice-calls/settings - Get Dograh settings
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        dograhApiKey: true,
        dograhApiUrl: true,
        dograhEnabled: true,
        dograhWebhookSecret: true,
        dograhDefaultAgentId: true,
        telephonyProvider: true,
      },
    });

    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/voice-calls/settings - Update Dograh settings
router.put('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dograhApiKey, dograhApiUrl, dograhEnabled, dograhDefaultAgentId, dograhWebhookSecret, telephonyProvider } = req.body;

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: {
        ...(dograhApiKey !== undefined && { dograhApiKey }),
        ...(dograhApiUrl !== undefined && { dograhApiUrl }),
        ...(dograhEnabled !== undefined && { dograhEnabled }),
        ...(dograhDefaultAgentId !== undefined && { dograhDefaultAgentId: dograhDefaultAgentId ? Number(dograhDefaultAgentId) : null }),
        ...(dograhWebhookSecret !== undefined && { dograhWebhookSecret }),
        ...(telephonyProvider !== undefined && { telephonyProvider }),
      },
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/voice-calls/dial - Trigger outbound call
router.post('/dial', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, contactId, workflowId, callType = 'phone', context } = req.body;

    if (!phoneNumber && callType === 'phone') {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    // Check wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { businessId: req.user.businessId },
    });

    if (wallet && wallet.balance < 5) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient wallet balance. Please recharge to make calls.',
      });
    }

    // Get business config
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: {
        dograhApiKey: true,
        dograhApiUrl: true,
        dograhEnabled: true,
        dograhDefaultAgentId: true,
      },
    });

    if (!business?.dograhEnabled || !business.dograhApiKey) {
      return res.status(400).json({ success: false, error: 'Voice AI not configured' });
    }

    const effectiveWorkflowId = workflowId || business.dograhDefaultAgentId;
    if (!effectiveWorkflowId) {
      return res.status(400).json({ success: false, error: 'No agent selected' });
    }

    // Get agent name
    const config = { apiUrl: business.dograhApiUrl!, apiKey: business.dograhApiKey };
    const agent = await dograhService.getAgent(config, Number(effectiveWorkflowId));

    // Create call log
    const callLog = await prisma.callLog.create({
      data: {
        businessId: req.user.businessId,
        contactId: contactId || null,
        workflowId: Number(effectiveWorkflowId),
        workflowName: agent?.name || 'Voice Agent',
        direction: 'outgoing',
        status: 'ringing',
        callType,
        callerNumber: business.dograhApiKey!,
        calleeNumber: phoneNumber || null,
        startedAt: new Date(),
      },
    });

    if (callType === 'phone') {
      const result = await dograhService.triggerPhoneCall(config, {
        workflowId: Number(effectiveWorkflowId),
        phoneNumber,
        context: { ...context, callLogId: callLog.id, contactId },
      });

      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { dograhRunId: result.runId || null, status: 'active' },
      });

      res.json({
        success: true,
        data: {
          callLogId: callLog.id,
          runId: result.runId,
          status: 'active',
          workflowName: agent?.name,
        },
      });
    } else {
      // Browser call
      res.json({
        success: true,
        data: {
          callLogId: callLog.id,
          callType: 'browser',
          status: 'connecting',
          workflowName: agent?.name,
        },
      });
    }
  } catch (error: any) {
    console.error('Error dialing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/voice-calls/:id - Single call details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const call = await prisma.callLog.findFirst({
      where: { id: qs(req.params.id), businessId: req.user.businessId },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    res.json({ success: true, data: call });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
