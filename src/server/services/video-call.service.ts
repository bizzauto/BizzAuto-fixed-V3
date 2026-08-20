import { Request, Response } from 'express';
import { qs } from './utils/query.js';

interface VideoCallSession {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  participantId?: string;
  participantName?: string;
  participantEmail?: string;
  scheduledAt: Date;
  duration: number; // minutes
  status: 'scheduled' | 'waiting' | 'active' | 'completed' | 'cancelled';
  meetingUrl?: string;
  recordingUrl?: string;
  notes?: string;
}

interface VideoProvider {
  type: 'zoom' | 'google_meet' | 'jitsi' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  meetingId?: string;
  password?: string;
}

class VideoCallService {
  private sessions: VideoCallSession[] = [];
  private provider: VideoProvider = {
    type: 'jitsi', // Free option by default
  };

  // Configure video provider
  configureProvider(config: Partial<VideoProvider>) {
    this.provider = { ...this.provider, ...config };
  }

  // Create meeting
  async createMeeting(data: {
    title: string;
    hostId: string;
    hostName: string;
    participantName?: string;
    participantEmail?: string;
    scheduledAt?: string;
    duration: number;
  }): Promise<VideoCallSession> {
    let meetingUrl: string;
    
    switch (this.provider.type) {
      case 'zoom':
        meetingUrl = await this.createZoomMeeting(data.title, data.duration);
        break;
      case 'google_meet':
        meetingUrl = await this.createGoogleMeet();
        break;
      case 'jitsi':
      default:
        meetingUrl = this.createJitsiMeeting(data.title);
        break;
    }

    const session: VideoCallSession = {
      id: `call-${Date.now()}`,
      title: data.title,
      hostId: data.hostId,
      hostName: data.hostName,
      participantName: data.participantName,
      participantEmail: data.participantEmail,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
      duration: data.duration,
      status: 'scheduled',
      meetingUrl,
    };

    this.sessions.push(session);
    return session;
  }

  // Zoom meeting creation (requires API credentials)
  private async createZoomMeeting(title: string, duration: number): Promise<string> {
    if (!this.provider.apiKey || !this.provider.apiSecret) {
      // Fallback to Zoom personal meeting room
      return 'https://zoom.us/my/your-username';
    }
    
    // In production, use Zoom API
    // POST https://api.zoom.us/v2/users/me/meetings
    return `https://zoom.us/j/${Date.now()}`;
  }

  // Google Meet creation (requires OAuth)
  private async createGoogleMeet(): Promise<string> {
    if (!this.provider.apiKey) {
      return 'https://meet.google.com/new';
    }
    
    // Use Google Calendar API to create meet
    return `https://meet.google.com/abc-defg-hij`;
  }

  // Jitsi (free, no auth needed)
  private createJitsiMeeting(title: string): string {
    const roomName = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
    return `https://meet.jit.si/bizzauto-${roomName}-${Date.now()}`;
  }

  // Get session by ID
  getSession(id: string): VideoCallSession | undefined {
    return this.sessions.find(s => s.id === id);
  }

  // List all sessions
  listSessions(filters?: { hostId?: string; status?: string }): VideoCallSession[] {
    let filtered = this.sessions;
    
    if (filters?.hostId) {
      filtered = filtered.filter(s => s.hostId === filters.hostId);
    }
    if (filters?.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    
    return filtered.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  // Update session status
  updateStatus(id: string, status: VideoCallSession['status']): VideoCallSession | null {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      session.status = status;
      return session;
    }
    return null;
  }

  // Add notes to session
  addNotes(id: string, notes: string): VideoCallSession | null {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      session.notes = notes;
      return session;
    }
    return null;
  }

  // Start call (mark as active)
  startCall(id: string): VideoCallSession | null {
    return this.updateStatus(id, 'active');
  }

  // End call
  endCall(id: string): VideoCallSession | null {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      session.status = 'completed';
      return session;
    }
    return null;
  }

  // Cancel call
  cancelCall(id: string): VideoCallSession | null {
    return this.updateStatus(id, 'cancelled');
  }

  // Generate embed URL for iframe
  getEmbedUrl(meetingUrl: string): string {
    // Jitsi embed
    if (meetingUrl.includes('jit.si')) {
      const roomName = meetingUrl.split('jit.si/')[1];
      return `https://meet.jit.si/${roomName}#config.preJoinPageEnabled=false`;
    }
    return meetingUrl;
  }

  // Get upcoming sessions
  getUpcoming(hostId: string): VideoCallSession[] {
    const now = new Date();
    return this.sessions
      .filter(s => s.hostId === hostId && s.scheduledAt > now && s.status === 'scheduled')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  // Get stats
  getStats() {
    const total = this.sessions.length;
    const completed = this.sessions.filter(s => s.status === 'completed').length;
    const totalDuration = this.sessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.duration, 0);

    return {
      total,
      completed,
      cancelled: this.sessions.filter(s => s.status === 'cancelled').length,
      avgDuration: completed > 0 ? Math.round(totalDuration / completed) : 0,
    };
  }
}

export const videoCallService = new VideoCallService();

// Route handlers
export const createVideoCall = async (req: Request, res: Response) => {
  const session = await videoCallService.createMeeting(req.body);
  res.json({ success: true, data: session });
};

export const getVideoCall = (req: Request, res: Response) => {
  const session = videoCallService.getSession(qs(req.params.id));
  if (session) {
    res.json({ success: true, data: session });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
};

export const listVideoCalls = (req: Request, res: Response) => {
  const filters = {
    hostId: req.query.hostId as string,
    status: req.query.status as string,
  };
  res.json({ success: true, data: videoCallService.listSessions(filters) });
};

export const updateVideoCallStatus = (req: Request, res: Response) => {
  const { status } = req.body;
  const session = videoCallService.updateStatus(qs(req.params.id), status);
  if (session) {
    res.json({ success: true, data: session });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
};

export const addVideoCallNotes = (req: Request, res: Response) => {
  const { notes } = req.body;
  const session = videoCallService.addNotes(qs(req.params.id), notes);
  if (session) {
    res.json({ success: true, data: session });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
};

export const getVideoCallStats = (_req: Request, res: Response) => {
  res.json({ success: true, data: videoCallService.getStats() });
};

export const configureVideoProvider = (req: Request, res: Response) => {
  videoCallService.configureProvider(req.body);
  res.json({ success: true, message: 'Provider configured' });
};