import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MessageCircle, Search, Filter, Send, X, User, Users, Clock, CheckCircle,
  AlertCircle, Star, RefreshCw, ChevronDown, Loader, Phone, Mail, Globe,
  MapPin, Monitor, Smartphone, ArrowUpRight, MoreVertical, Settings,
  ChevronRight, Wifi, WifiOff, Archive, Tag, Paperclip, Smile, ExternalLink,
  BarChart3, TrendingUp, Eye, RotateCw, ArrowLeft, Zap,
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { liveChatAPI, teamAPI } from '../lib/api';
import { useToast } from './Toast';

// ============================================================
// TYPES
// ============================================================

interface ChatSession {
  id: string;
  businessId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
  visitorIP: string | null;
  visitorUserAgent: string | null;
  status: 'active' | 'waiting' | 'closed';
  priority: string;
  assignedTo: string | null;
  startedAt: string;
  endedAt: string | null;
  satisfaction: number | null;
  tags: string[];
  metadata?: any;
  lastMessage?: ChatMessage | null;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'visitor' | 'agent' | 'bot';
  senderId: string | null;
  content: string;
  contentType: string;
  metadata?: any;
  createdAt: string;
}

interface SessionDetail extends ChatSession {
  messages: ChatMessage[];
}

interface ChatStats {
  active: number;
  waiting: number;
  resolvedToday: number;
  totalMessages: number;
  averageSatisfaction: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

type StatusFilter = 'all' | 'active' | 'waiting' | 'closed';

interface CannedReply {
  id: string;
  title: string;
  message: string;
  shortcut: string;
}

// ============================================================
// HELPERS
// ============================================================

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return then.toLocaleDateString();
};

const formatFullTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const getInitials = (name: string): string =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const parseUserAgent = (ua: string | null): { browser: string; os: string; device: string } => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile';
  else if (ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  waiting: {
    label: 'Waiting',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  active: {
    label: 'Active',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
  },
  closed: {
    label: 'Closed',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
};

const DEFAULT_CANNED_REPLIES: CannedReply[] = [
  { id: '1', title: 'Greeting', message: 'Hello! How can I help you today?', shortcut: '/hello' },
  { id: '2', title: 'Thanks', message: 'Thank you for reaching out! Is there anything else I can help you with?', shortcut: '/thanks' },
  { id: '3', title: 'Pricing', message: 'Thanks for your interest! Could you share your email so we can send you a detailed pricing breakdown?', shortcut: '/pricing' },
  { id: '4', title: 'Hold', message: 'Let me look into that for you. One moment please.', shortcut: '/hold' },
  { id: '5', title: 'Closing', message: 'Thank you for chatting with us! Have a wonderful day. Feel free to reach out anytime.', shortcut: '/closing' },
  { id: '6', title: 'Transfer', message: 'I\'m transferring you to a specialist who can better assist you with this.', shortcut: '/transfer' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LiveChatManager() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  // --- State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCannedReplies, setShowCannedReplies] = useState(false);
  const [cannedReplies] = useState<CannedReply[]>(DEFAULT_CANNED_REPLIES);
  const [showVisitorPanel, setShowVisitorPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Fetch sessions ---
  const fetchSessions = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const params: any = { page: currentPage, limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await liveChatAPI.listSessions(params);
      if (res.data.success) {
        setSessions(res.data.data.sessions);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  // --- Fetch stats ---
  const fetchStats = useCallback(async () => {
    try {
      const res = await liveChatAPI.getStats();
      if (res.data.success) setStats(res.data.data);
    } catch { /* ignore */ }
  }, []);

  // --- Fetch team members ---
  const fetchTeam = useCallback(async () => {
    try {
      const res = await teamAPI.listMembers();
      if (res.data.success) {
        setTeamMembers(res.data.data?.users || res.data.data?.members || []);
      }
    } catch { /* ignore */ }
  }, []);

  // --- Fetch session detail ---
  const fetchDetail = useCallback(async (session: ChatSession) => {
    setLoadingDetail(true);
    try {
      const res = await liveChatAPI.getSession(session.id);
      if (res.data.success) {
        setDetail(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch session:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // --- Select session ---
  const selectSession = useCallback((session: ChatSession) => {
    setSelectedSession(session);
    setDetail(null);
    setReplyText('');
    setMobileView('chat');
    setShowVisitorPanel(false);
    fetchDetail(session);
  }, [fetchDetail]);

  // --- Send reply ---
  const sendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedSession || sending) return;
    setSending(true);
    try {
      await liveChatAPI.addMessage(selectedSession.id, {
        senderType: 'agent',
        senderId: user?.id,
        content: replyText.trim(),
      });
      setReplyText('');
      success('Reply sent');
      fetchDetail(selectedSession);
      fetchSessions(true);
      fetchStats();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSending(false);
      replyInputRef.current?.focus();
    }
  }, [replyText, selectedSession, sending, user, success, toastError, fetchDetail, fetchSessions, fetchStats]);

  // --- Close session ---
  const closeSession = useCallback(async (session: ChatSession) => {
    try {
      await liveChatAPI.closeSession(session.id);
      success('Session closed');
      setSelectedSession(null);
      setDetail(null);
      setMobileView('list');
      fetchSessions(true);
      fetchStats();
    } catch {
      toastError('Failed to close session');
    }
  }, [success, toastError, fetchSessions, fetchStats]);

  // --- Assign session ---
  const assignSession = useCallback(async (agentId: string) => {
    if (!selectedSession) return;
    try {
      await liveChatAPI.assignSession(selectedSession.id, agentId);
      const member = teamMembers.find(m => m.id === agentId);
      success(`Assigned to ${member?.name || 'agent'}`);
      setShowAssignModal(false);
      fetchSessions(true);
      fetchDetail(selectedSession);
    } catch {
      toastError('Failed to assign session');
    }
  }, [selectedSession, teamMembers, success, toastError, fetchSessions, fetchDetail]);

  // --- Refresh ---
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSessions(true), fetchStats()]);
    setRefreshing(false);
  }, [fetchSessions, fetchStats]);

  // --- Effects ---
  useEffect(() => {
    fetchSessions(true);
    fetchStats();
    fetchTeam();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchSessions(true);
    }, 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions(true);
      fetchStats();
      if (selectedSession) fetchDetail(selectedSession);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedSession, fetchSessions, fetchStats, fetchDetail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

  // --- Filtered sessions ---
  const filteredSessions = useMemo(() => sessions, [sessions]);

  const waitingCount = useMemo(() => sessions.filter(s => s.status === 'waiting').length, [sessions]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* ==========================================
          LEFT: SESSIONS LIST
      ========================================== */}
      <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] lg:w-[420px] border-r border-gray-200 dark:border-gray-700`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Live Chat</h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                <p className="text-[10px] text-green-600/70 dark:text-green-400/70 font-medium">Active</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.waiting}</p>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-medium">Waiting</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.resolvedToday}</p>
                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-medium">Today</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {stats.averageSatisfaction ? stats.averageSatisfaction.toFixed(1) : '–'}
                </p>
                <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 font-medium">Rating</p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search visitors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1">
            {(['all', 'waiting', 'active', 'closed'] as StatusFilter[]).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {status === 'waiting' && <Clock className="w-3 h-3" />}
                {status === 'active' && <MessageCircle className="w-3 h-3" />}
                {status === 'closed' && <CheckCircle className="w-3 h-3" />}
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status === 'waiting' && waitingCount > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                    {waitingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No sessions found</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {searchQuery ? 'Try a different search' : 'No chat sessions yet'}
              </p>
            </div>
          ) : (
            filteredSessions.map(session => {
              const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.active;
              const visitorName = session.visitorName || 'Anonymous';
              return (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    selectedSession?.id === session.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                        {getInitials(visitorName)}
                      </div>
                      {session.status === 'waiting' && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {visitorName}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                          {session.lastMessage ? formatTimeAgo(session.lastMessage.createdAt) : formatTimeAgo(session.startedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                        {session.satisfaction && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {session.satisfaction}
                          </span>
                        )}
                        {session.assignedTo && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            #{session.assignedTo.slice(-4)}
                          </span>
                        )}
                      </div>
                      {session.lastMessage && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {session.lastMessage.senderType === 'visitor' ? '' : '🤖 '}
                          {session.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ==========================================
          RIGHT: CHAT WINDOW
      ========================================== */}
      <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
        {!selectedSession ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-5 md:px-6">
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Live Chat Manager
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Select a conversation from the list to start responding to visitors
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMobileView('list'); setSelectedSession(null); }}
                  className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  {getInitials(selectedSession.visitorName || 'Anonymous')}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedSession.visitorName || 'Anonymous'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {selectedSession.visitorEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedSession.visitorEmail}
                      </span>
                    )}
                    {selectedSession.visitorPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedSession.visitorPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowVisitorPanel(!showVisitorPanel)}
                  className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showVisitorPanel ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                  title="Visitor Info"
                >
                  <User className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Assign Agent"
                >
                  <Users className="w-4 h-4" />
                </button>
                {selectedSession.status !== 'closed' && (
                  <button
                    onClick={() => closeSession(selectedSession)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Close Session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                {loadingDetail ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                    {/* Session Info Banner */}
                    <div className="text-center py-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        Session started {formatFullTime(selectedSession.startedAt)}
                      </span>
                    </div>

                    {detail?.messages.map(msg => {
                      const isAgent = msg.senderType === 'agent';
                      const isVisitor = msg.senderType === 'visitor';
                      const isBot = msg.senderType === 'bot';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isAgent ? 'justify-end' : 'justify-start'} gap-2`}
                        >
                          {!isAgent && (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1"
                              style={{ backgroundColor: isBot ? '#6B7280' : '#6366F1' }}
                            >
                              {isBot ? '🤖' : getInitials(selectedSession.visitorName || 'V')}
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                              isAgent
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md shadow-sm'
                            }`}
                          >
                            {isAgent && (
                              <p className="text-[10px] text-indigo-200 mb-0.5 font-medium">You</p>
                            )}
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isAgent ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {formatFullTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Reply Input */}
                {selectedSession.status !== 'closed' && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {/* Canned Replies Dropdown */}
                    {showCannedReplies && (
                      <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 mb-1">Quick Replies</p>
                        {cannedReplies.map(reply => (
                          <button
                            key={reply.id}
                            onClick={() => {
                              setReplyText(reply.message);
                              setShowCannedReplies(false);
                              replyInputRef.current?.focus();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{reply.title}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{reply.shortcut}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{reply.message}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => setShowCannedReplies(!showCannedReplies)}
                        className={`p-2 rounded-lg transition-colors shrink-0 ${
                          showCannedReplies
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title="Quick replies"
                      >
                        <Zap className="w-5 h-5" />
                      </button>
                      <div className="flex-1 relative">
                        <textarea
                          ref={replyInputRef}
                          rows={1}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendReply();
                            }
                          }}
                          placeholder="Type your reply..."
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-24"
                        />
                      </div>
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim() || sending}
                        className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shrink-0"
                      >
                        {sending ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {selectedSession.status === 'closed' && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This conversation has been closed
                    </p>
                  </div>
                )}
              </div>

              {/* Visitor Info Panel */}
              {showVisitorPanel && (
                <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto shrink-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Visitor Info</h4>
                      <button
                        onClick={() => setShowVisitorPanel(false)}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Avatar & Name */}
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                          {getInitials(selectedSession.visitorName || 'Anonymous')}
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {selectedSession.visitorName || 'Anonymous'}
                        </p>
                        {selectedSession.status === 'waiting' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium mt-1">
                            <Clock className="w-3 h-3" />
                            Waiting
                          </span>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2.5">
                        {selectedSession.visitorEmail && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 truncate">
                              {selectedSession.visitorEmail}
                            </span>
                          </div>
                        )}
                        {selectedSession.visitorPhone && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {selectedSession.visitorPhone}
                            </span>
                          </div>
                        )}
                        {selectedSession.visitorIP && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                              {selectedSession.visitorIP}
                            </span>
                          </div>
                        )}
                      </div>

                      <hr className="border-gray-200 dark:border-gray-700" />

                      {/* Device Info */}
                      {selectedSession.visitorUserAgent && (
                        <>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                              Device Info
                            </p>
                            <div className="space-y-1.5">
                              {(() => {
                                const info = parseUserAgent(selectedSession.visitorUserAgent);
                                return (
                                  <>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5" />
                                        Browser
                                      </span>
                                      <span className="text-gray-900 dark:text-white font-medium">{info.browser}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <Monitor className="w-3.5 h-3.5" />
                                        OS
                                      </span>
                                      <span className="text-gray-900 dark:text-white font-medium">{info.os}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        {info.device === 'Mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                                        Device
                                      </span>
                                      <span className="text-gray-900 dark:text-white font-medium">{info.device}</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <hr className="border-gray-200 dark:border-gray-700" />
                        </>
                      )}

                      {/* Session Info */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                          Session Details
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Started</span>
                            <span className="text-gray-900 dark:text-white text-xs">
                              {formatFullTime(selectedSession.startedAt)}
                            </span>
                          </div>
                          {selectedSession.endedAt && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Ended</span>
                              <span className="text-gray-900 dark:text-white text-xs">
                                {formatFullTime(selectedSession.endedAt)}
                              </span>
                            </div>
                          )}
                          {selectedSession.satisfaction && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Rating</span>
                              <span className="flex items-center gap-1 text-amber-500 font-medium">
                                {Array.from({ length: selectedSession.satisfaction }, (_, i) => (
                                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                                ))}
                              </span>
                            </div>
                          )}
                          {selectedSession.metadata?.url && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className="text-gray-500 dark:text-gray-400 shrink-0">Page</span>
                              <a
                                href={selectedSession.metadata.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 text-xs truncate hover:underline flex items-center gap-1"
                              >
                                {selectedSession.metadata.url.replace(/^https?:\/\//, '').slice(0, 30)}...
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <hr className="border-gray-200 dark:border-gray-700" />

                      {/* Actions */}
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Assign Agent
                        </button>
                        {selectedSession.status !== 'closed' && (
                          <button
                            onClick={() => closeSession(selectedSession)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Close Session
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ==========================================
          ASSIGN AGENT MODAL
      ========================================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Assign Agent</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No team members found
                </p>
              ) : (
                <div className="space-y-1.5">
                  {teamMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => assignSession(member.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        selectedSession?.assignedTo === member.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getInitials(member.name)
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                      </div>
                      {selectedSession?.assignedTo === member.id && (
                        <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
