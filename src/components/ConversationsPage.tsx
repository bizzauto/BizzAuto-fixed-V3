import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Filter, MessageSquare, Mail, Star, Phone, Tag, Clock,
  Send, Paperclip, Smile, ArrowLeft, RefreshCw, Archive, MoreVertical,
  ChevronDown, Check, CheckCheck, AlertCircle, Inbox, Wifi, WifiOff,
  X, Loader, User, MapPin, Globe, Building2, ExternalLink, StarHalf,
  Star as StarIcon, MessageCircle, Bell, Settings, Menu, ChevronRight,
  Hash, AtSign, Image as ImageIcon, FileText, Video, CheckCircle
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { conversationsAPI } from '../lib/api';
import { useToast } from './Toast';

// ============================================================
// TYPES
// ============================================================

interface Conversation {
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAvatar: string | null;
  channel: 'whatsapp' | 'email' | 'reviews';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'unread' | 'read';
}

interface ConversationMessage {
  id: string;
  channel: 'whatsapp' | 'email' | 'reviews';
  direction: 'incoming' | 'outbound';
  type: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  status?: string;
  platform?: string;
  rating?: number;
  reviewerName?: string;
  createdAt: string;
  replyText?: string;
  repliedAt?: string;
}

interface ConversationDetail {
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAvatar: string | null;
  channel: string;
  messages: ConversationMessage[];
  pagination: { total: number; page: number; limit: number };
}

interface InboxStats {
  totalConversations: number;
  unreadCount: number;
  byChannel: { whatsapp: number; email: number; reviews: number };
}

type ChannelFilter = 'all' | 'whatsapp' | 'email' | 'reviews';

// ============================================================
// HELPERS
// ============================================================

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return then.toLocaleDateString();
};

const formatFullTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const CHANNEL_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  email: {
    label: 'Email',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
    icon: <Mail className="w-3.5 h-3.5" />,
  },
  reviews: {
    label: 'Reviews',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    icon: <Star className="w-3.5 h-3.5" />,
  },
};

const getInitials = (name: string): string =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ConversationsPage() {
  const { business } = useAuthStore();
  const { success, error: toastError } = useToast();

  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Fetch conversations list ---
  const fetchConversations = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const params: any = { page: currentPage, limit: 50 };
      if (channelFilter !== 'all') params.channel = channelFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await conversationsAPI.list(params);
      if (res.data.success) {
        setConversations(res.data.data.conversations);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, searchQuery, page]);

  // --- Fetch stats ---
  const fetchStats = useCallback(async () => {
    try {
      const res = await conversationsAPI.getStats();
      if (res.data.success) setStats(res.data.data);
    } catch { /* ignore */ }
  }, []);

  // --- Fetch conversation detail ---
  const fetchDetail = useCallback(async (conv: Conversation) => {
    setLoadingDetail(true);
    try {
      const res = await conversationsAPI.get(conv.contactId, { limit: 100 });
      if (res.data.success) {
        setDetail(res.data.data);
        setReplyChannel(conv.channel === 'email' ? 'email' : 'whatsapp');
      }
      // Mark as read
      if (conv.unreadCount > 0) {
        conversationsAPI.markRead(conv.contactId).catch(() => {});
        setConversations(prev =>
          prev.map(c => c.contactId === conv.contactId ? { ...c, unreadCount: 0, status: 'read' } : c)
        );
        setStats(prev => prev ? { ...prev, unreadCount: Math.max(0, prev.unreadCount - conv.unreadCount) } : prev);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // --- Select conversation ---
  const selectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    setDetail(null);
    setReplyText('');
    setMobileView('chat');
    fetchDetail(conv);
  }, [fetchDetail]);

  // --- Send reply ---
  const sendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      await conversationsAPI.reply(selectedConversation.contactId, {
        content: replyText.trim(),
        channel: replyChannel,
      });
      setReplyText('');
      success('Reply sent');
      fetchDetail(selectedConversation);
      fetchConversations(true);
      fetchStats();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSending(false);
      replyInputRef.current?.focus();
    }
  }, [replyText, selectedConversation, sending, replyChannel, success, toastError, fetchDetail, fetchConversations, fetchStats]);

  // --- Archive ---
  const archiveConversation = useCallback(async (conv: Conversation) => {
    try {
      await conversationsAPI.archive([conv.contactId]);
      success('Conversation archived');
      setSelectedConversation(null);
      setDetail(null);
      setMobileView('list');
      fetchConversations(true);
      fetchStats();
    } catch {
      toastError('Failed to archive');
    }
  }, [success, toastError, fetchConversations, fetchStats]);

  // --- Effects ---
  useEffect(() => {
    fetchConversations(true);
    fetchStats();
  }, [channelFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchConversations(true);
    }, 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

  // --- Keyboard shortcut: Enter to send ---
  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // ============================================================
  // RENDER: Conversation List (left panel)
  // ============================================================
  const renderConversationList = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Inbox</h1>
          </div>
          <button
            onClick={() => { fetchConversations(true); fetchStats(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['all', 'whatsapp', 'email', 'reviews'] as ChannelFilter[]).map(ch => (
          <button
            key={ch}
            onClick={() => { setChannelFilter(ch); setPage(1); }}
            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors border-b-2 ${
              channelFilter === ch
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {ch === 'all' ? 'All' : ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'Reviews'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500">
          <span>{stats.totalConversations} conversations</span>
          {stats.unreadCount > 0 && (
            <span className="text-red-500 font-medium">{stats.unreadCount} unread</span>
          )}
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Inbox className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          conversations.map(conv => {
            const chConf = CHANNEL_CONFIG[conv.channel] || CHANNEL_CONFIG.whatsapp;
            const isSelected = selectedConversation?.contactId === conv.contactId;
            return (
              <button
                key={conv.contactId}
                onClick={() => selectConversation(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-800 ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.contactAvatar ? (
                    <img src={conv.contactAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {getInitials(conv.contactName)}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white ${chConf.bgColor}`}>
                    {chConf.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {conv.contactName}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatTimeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    {conv.lastMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${chConf.color} bg-opacity-10`}
                      style={{ backgroundColor: `${chConf.bgColor}15` }}>
                      {chConf.icon}
                      {chConf.label}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>{pagination.total} total</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1">{page}/{pagination.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDER: Message Thread (center panel)
  // ============================================================
  const renderMessageThread = () => {
    if (!selectedConversation) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900/50 text-gray-400">
          <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm mt-1">Choose from the inbox to start chatting</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={() => { setMobileView('list'); }}
            className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="relative">
            {selectedConversation.contactAvatar ? (
              <img src={selectedConversation.contactAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                {getInitials(selectedConversation.contactName)}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white ${(CHANNEL_CONFIG[selectedConversation.channel] || CHANNEL_CONFIG.whatsapp).bgColor}`}>
              {(CHANNEL_CONFIG[selectedConversation.channel] || CHANNEL_CONFIG.whatsapp).icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {selectedConversation.contactName}
            </h2>
            <p className="text-[11px] text-gray-500">
              {(CHANNEL_CONFIG[selectedConversation.channel] || CHANNEL_CONFIG.whatsapp).label}
              {selectedConversation.contactPhone && ` · ${selectedConversation.contactPhone}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowContactPanel(!showContactPanel)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Contact details"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={() => archiveConversation(selectedConversation)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : !detail?.messages.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            detail.messages.map((msg, idx) => {
              const isOutbound = msg.direction === 'outbound';
              const chConf = CHANNEL_CONFIG[msg.channel] || CHANNEL_CONFIG.whatsapp;
              const showDateDivider = idx === 0 ||
                new Date(msg.createdAt).toDateString() !== new Date(detail.messages[idx - 1].createdAt).toDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDateDivider && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      <span className="text-[10px] text-gray-400 font-medium px-2">
                        {new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                  )}
                  <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isOutbound ? 'order-2' : 'order-1'}`}>
                      {/* Channel badge */}
                      {!isOutbound && (
                        <div className={`flex items-center gap-1 mb-1 text-[10px] ${chConf.color}`}>
                          {chConf.icon}
                          <span className="font-medium">{chConf.label}</span>
                          {msg.platform && <span className="text-gray-400">via {msg.platform}</span>}
                        </div>
                      )}
                      {/* Bubble */}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isOutbound
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : msg.channel === 'reviews'
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 border border-amber-200 dark:border-amber-800 rounded-bl-md'
                            : msg.channel === 'email'
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-800 rounded-bl-md'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }`}>
                        {/* Review rating */}
                        {msg.channel === 'reviews' && msg.rating && (
                          <div className="flex items-center gap-0.5 mb-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < msg.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.replyText && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs font-medium text-gray-500 mb-1">Your reply:</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{msg.replyText}</p>
                          </div>
                        )}
                      </div>
                      {/* Timestamp + status */}
                      <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 ${isOutbound ? 'justify-end' : ''}`}>
                        <span>{formatFullTime(msg.createdAt)}</span>
                        {isOutbound && msg.status && (
                          <span className="text-blue-500">
                            {msg.status === 'read' ? <CheckCheck className="w-3 h-3" /> :
                             msg.status === 'delivered' ? <CheckCheck className="w-3 h-3" /> :
                             msg.status === 'sent' ? <Check className="w-3 h-3" /> :
                             msg.status === 'failed' ? <AlertCircle className="w-3 h-3 text-red-500" /> :
                             <Clock className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply box */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
          {/* Reply channel selector */}
          {selectedConversation.channel !== 'reviews' && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-gray-500">Reply via:</span>
              <button
                onClick={() => setReplyChannel('whatsapp')}
                className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium transition-colors ${
                  replyChannel === 'whatsapp'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <MessageSquare className="w-3 h-3" /> WhatsApp
              </button>
              <button
                onClick={() => setReplyChannel('email')}
                disabled={!selectedConversation.contactEmail}
                className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium transition-colors ${
                  replyChannel === 'email'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Mail className="w-3 h-3" /> Email
              </button>
            </div>
          )}
          {selectedConversation.channel === 'reviews' && detail?.messages[0]?.replyText ? (
            <div className="text-center text-xs text-gray-400 py-2">
              <CheckCircle className="w-4 h-4 inline mr-1" /> Already replied to this review
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={replyInputRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder={`Reply via ${selectedConversation.channel === 'reviews' ? 'review' : replyChannel}...`}
                  rows={1}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                  style={{ minHeight: '42px' }}
                />
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
              >
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: Contact Details (right panel)
  // ============================================================
  const renderContactPanel = () => {
    if (!selectedConversation || !detail) return null;

    const conv = selectedConversation;
    const chConf = CHANNEL_CONFIG[conv.channel] || CHANNEL_CONFIG.whatsapp;

    return (
      <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-full overflow-y-auto flex-shrink-0 hidden lg:block">
        {/* Avatar section */}
        <div className="p-4 sm:p-5 md:p-6 text-center border-b border-gray-200 dark:border-gray-700">
          {conv.contactAvatar ? (
            <img src={conv.contactAvatar} alt="" className="w-16 h-16 rounded-full mx-auto object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold mx-auto">
              {getInitials(conv.contactName)}
            </div>
          )}
          <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{conv.contactName}</h3>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${chConf.color}`}
              style={{ backgroundColor: `${chConf.bgColor}15` }}>
              {chConf.icon} {chConf.label}
            </span>
          </div>
        </div>

        {/* Contact info */}
        <div className="p-4 space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Info</h4>

          {conv.contactPhone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate">{conv.contactPhone}</span>
              <a href={`tel:${conv.contactPhone}`} className="ml-auto text-blue-500 hover:text-blue-600">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {conv.contactEmail && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate">{conv.contactEmail}</span>
              <a href={`mailto:${conv.contactEmail}`} className="ml-auto text-blue-500 hover:text-blue-600">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">
              Last active {formatTimeAgo(conv.lastMessageAt)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">
              {detail.pagination.total} messages
            </span>
          </div>
        </div>

        {/* Channel activity */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Channel Activity</h4>
          <div className="space-y-2">
            {Object.entries(CHANNEL_CONFIG).map(([key, conf]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${conv.channel === key ? conf.color : 'text-gray-400'}`}>
                  {conf.icon}
                  <span>{conf.label}</span>
                </div>
                {conv.channel === key && (
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</h4>
          <div className="space-y-2">
            <button
              onClick={() => archiveConversation(conv)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Archive className="w-4 h-4" />
              Archive conversation
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      {/* Top bar - mobile */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <Inbox className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        <span className="font-bold text-gray-900 dark:text-white">Inbox</span>
        {stats && stats.unreadCount > 0 && (
          <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
            {stats.unreadCount}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - conversation list */}
        <div className={`w-full lg:w-80 xl:w-96 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${
          mobileView === 'list' ? 'block' : 'hidden lg:block'
        }`}>
          {renderConversationList()}
        </div>

        {/* Center panel - message thread */}
        <div className={`flex-1 min-w-0 ${
          mobileView === 'chat' ? 'block' : 'hidden lg:block'
        }`}>
          {renderMessageThread()}
        </div>

        {/* Right panel - contact details */}
        {showContactPanel && renderContactPanel()}
      </div>
    </div>
  );
}
