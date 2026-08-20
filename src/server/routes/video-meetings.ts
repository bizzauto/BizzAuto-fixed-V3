import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

function generateJitsiRoomName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${slug}-${suffix}`;
}

function generateMeetingId(platform: string): string {
  if (platform === 'zoom') {
    return crypto.randomBytes(6).toString('hex').replace(/(.{2})/g, '$1').slice(0, 11).replace(/-/g, '');
  }
  if (platform === 'google_meet') {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 10 }, () => chars[crypto.randomInt(chars.length)]).join('');
  }
  return crypto.randomBytes(8).toString('hex');
}

function buildJoinUrl(platform: string, meetingId: string, meetingUrl: string): string {
  if (platform === 'jitsi') return meetingUrl;
  if (platform === 'zoom') return `https://zoom.us/j/${meetingId}`;
  if (platform === 'google_meet') return `https://meet.google.com/${meetingId}`;
  return meetingUrl;
}

/**
 * GET /api/video-meetings/stats
 * Meeting stats for the business.
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const [total, upcoming, completedThisWeek, live] = await Promise.all([
      prisma.videoMeeting.count({ where: { businessId } }),
      prisma.videoMeeting.count({
        where: { businessId, status: 'scheduled', scheduledAt: { gte: now } },
      }),
      prisma.videoMeeting.count({
        where: {
          businessId,
          status: 'completed',
          updatedAt: { gte: startOfWeek, lt: endOfWeek },
        },
      }),
      prisma.videoMeeting.count({ where: { businessId, status: 'live' } }),
    ]);

    res.json({
      success: true,
      data: { total, upcoming, completedThisWeek, live },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch stats' });
  }
});

/**
 * GET /api/video-meetings
 * List meetings filterable by status, date, platform.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, date, platform, limit = 50, offset = 0 } = req.query;

    const where: any = { businessId: req.user.businessId };

    if (status) where.status = status;
    if (platform) where.platform = platform;

    if (date) {
      const startOfDay = new Date(String(date));
      const endOfDay = new Date(String(date));
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.scheduledAt = { gte: startOfDay, lt: endOfDay };
    }

    const [meetings, total] = await Promise.all([
      prisma.videoMeeting.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.videoMeeting.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        meetings,
        pagination: { total, limit: Number(limit), offset: Number(offset) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch meetings' });
  }
});

/**
 * GET /api/video-meetings/:id
 * Get meeting details.
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const meeting = await prisma.videoMeeting.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch meeting' });
  }
});

/**
 * POST /api/video-meetings
 * Create a new meeting. Generates Jitsi URL automatically when platform is jitsi.
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, description, scheduledAt, duration = 30,
      platform = 'jitsi', hostId, participants = [], meetingUrl, recordingUrl,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'scheduledAt is required' });
    }

    const validPlatforms = ['jitsi', 'google_meet', 'zoom'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      });
    }

    const meetingId = generateMeetingId(platform);
    const roomName = generateJitsiRoomName(title);

    let finalMeetingUrl = meetingUrl;
    if (!finalMeetingUrl) {
      if (platform === 'jitsi') {
        finalMeetingUrl = `https://meet.jit.si/${roomName}`;
      } else {
        finalMeetingUrl = buildJoinUrl(platform, meetingId, '');
      }
    }

    const meeting = await prisma.videoMeeting.create({
      data: {
        business: { connect: { id: req.user.businessId as string } },
        title,
        description: description || null,
        meetingUrl: finalMeetingUrl,
        meetingId,
        platform,
        scheduledAt: new Date(scheduledAt),
        duration,
        status: 'scheduled',
        hostId: hostId || req.user.id,
        participants,
        recordingUrl: recordingUrl || null,
      },
    });

    res.status(201).json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create meeting' });
  }
});

/**
 * PUT /api/video-meetings/:id
 * Update meeting fields.
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.videoMeeting.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    const updateData: any = {};
    const allowedFields = [
      'title', 'description', 'meetingUrl', 'meetingId', 'platform',
      'scheduledAt', 'duration', 'status', 'hostId', 'participants', 'recordingUrl',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'scheduledAt') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    const meeting = await prisma.videoMeeting.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update meeting' });
  }
});

/**
 * DELETE /api/video-meetings/:id
 * Cancel a meeting (sets status to cancelled).
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.videoMeeting.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    const meeting = await prisma.videoMeeting.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel meeting' });
  }
});

/**
 * PATCH /api/video-meetings/:id/start
 * Mark meeting as live.
 */
router.patch('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.videoMeeting.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }
    if (existing.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: `Cannot start meeting with status "${existing.status}". Must be "scheduled".`,
      });
    }

    const meeting = await prisma.videoMeeting.update({
      where: { id: req.params.id },
      data: { status: 'live' },
    });

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to start meeting' });
  }
});

/**
 * PATCH /api/video-meetings/:id/end
 * Mark meeting as completed.
 */
router.patch('/:id/end', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.videoMeeting.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }
    if (existing.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: `Cannot end meeting with status "${existing.status}". Must be "live".`,
      });
    }

    const { recordingUrl } = req.body;

    const meeting = await prisma.videoMeeting.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        recordingUrl: recordingUrl || existing.recordingUrl,
      },
    });

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to end meeting' });
  }
});

/**
 * POST /api/video-meetings/:id/join
 * Generate join URL for a participant.
 */
router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { participantEmail } = req.body;

    const meeting = await prisma.videoMeeting.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }
    if (meeting.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cannot join a cancelled meeting' });
    }
    if (meeting.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Cannot join a completed meeting' });
    }

    const joinUrl = buildJoinUrl(meeting.platform, meeting.meetingId, meeting.meetingUrl);

    if (participantEmail && !meeting.participants.includes(participantEmail)) {
      await prisma.videoMeeting.update({
        where: { id },
        data: { participants: { push: participantEmail } },
      });
    }

    res.json({
      success: true,
      data: {
        joinUrl,
        meetingId: meeting.meetingId,
        platform: meeting.platform,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to generate join URL' });
  }
});

export default router;
