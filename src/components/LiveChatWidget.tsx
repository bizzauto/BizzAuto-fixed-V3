import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, X, Send, Star, Minimize2, Maximize2, Phone, Mail,
  User, ChevronLeft, Wifi, WifiOff, Loader, Smile, Paperclip, Image as ImageIcon,
} from 'lucide-react';
import { liveChatAPI } from '../lib/api';

// ============================================================
// TYPES
// ============================================================

interface WidgetConfig {
  id: string;
  businessId: string;
  name: string;
  position: string;
  primaryColor: string;
  greetingMessage: string;
  offlineMessage: string;
  workingHours: { start: string; end: string; days: number[] } | null;
  autoResponses: Record<string, string> | null;
  isActive: boolean;
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

interface ChatSession {
  id: string;
  businessId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
  status: 'active' | 'waiting' | 'closed';
  assignedTo: string | null;
  satisfaction: number | null;
  startedAt: string;
  endedAt: string | null;
  messages: ChatMessage[];
}

interface VisitorInfo {
  name: string;
  email: string;
  phone: string;
}

interface LiveChatWidgetProps {
  businessId: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
}

// ============================================================
// HELPERS
// ============================================================

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getInitials = (name: string): string =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// ============================================================
// MAIN COMPONENT
// ============================================================

const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  businessId,
  position = 'bottom-right',
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPreChatForm, setShowPreChatForm] = useState(true);
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({ name: '', email: '', phone: '' });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [typingAgent, setTypingAgent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const widgetColor = theme?.primaryColor || widgetConfig?.primaryColor || '#3B82F6';

  const positionClasses = position === 'bottom-left'
    ? 'bottom-4 left-4 sm:bottom-5 sm:left-5'
    : 'bottom-4 right-4 sm:bottom-5 sm:right-5';

  const widgetWindowPosition = position === 'bottom-left'
    ? 'bottom-20 left-2 sm:left-5 right-2 sm:right-auto'
    : 'bottom-20 right-2 sm:right-5 left-2 sm:left-auto';

  // ============================================================
  // WIDGET CONFIG
  // ============================================================

  useEffect(() => {
    const fetchWidget = async () => {
      try {
        const res = await liveChatAPI.getWidget(businessId);
        if (res.data.success) {
          setWidgetConfig(res.data.data);
        }
      } catch {
        setWidgetConfig({
          id: 'default',
          businessId,
          name: 'Live Chat',
          position,
          primaryColor: '#3B82F6',
          greetingMessage: 'Hello! How can we help you today?',
          offlineMessage: 'We are currently offline. Leave a message.',
          workingHours: null,
          autoResponses: null,
          isActive: true,
        });
      }
    };
    fetchWidget();
  }, [businessId, position]);

  // ============================================================
  // RESTORE SESSION
  // ============================================================

  useEffect(() => {
    const savedSession = localStorage.getItem(`livechat_session_${businessId}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed.session);
        setShowPreChatForm(false);
        setVisitorInfo({
          name: parsed.session.visitorName || '',
          email: parsed.session.visitorEmail || '',
          phone: parsed.session.visitorPhone || '',
        });
      } catch {
        localStorage.removeItem(`livechat_session_${businessId}`);
      }
    }
  }, [businessId]);

  // ============================================================
  // POLLING FOR NEW MESSAGES
  // ============================================================

  const fetchMessages = useCallback(async () => {
    if (!session) return;
    try {
      const res = await liveChatAPI.getSession(session.id);
      if (res.data.success) {
        const data = res.data.data;
        const newMsgs = data.messages || [];
        setMessages(prev => {
          if (newMsgs.length !== prev.length) {
            const newFromAgent = newMsgs.filter(
              (m: ChatMessage) => m.senderType !== 'visitor' && !prev.find(p => p.id === m.id)
            );
            if (newFromAgent.length > 0 && !isOpen) {
              setUnreadCount(c => c + newFromAgent.length);
            }
            return newMsgs;
          }
          return prev;
        });

        if (data.status === 'closed' && session.status !== 'closed') {
          setSession(prev => prev ? { ...prev, status: 'closed' } : prev);
          setShowRating(true);
        }
      }
    } catch {
      // ignore
    }
  }, [session, isOpen]);

  useEffect(() => {
    if (session && session.status !== 'closed') {
      pollRef.current = setInterval(fetchMessages, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session, fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      fetchMessages();
    }
  }, [isOpen, fetchMessages]);

  // ============================================================
  // SCROLL TO BOTTOM
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================
  // START SESSION
  // ============================================================

  const startSession = async () => {
    if (!visitorInfo.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await liveChatAPI.createSession({
        businessId,
        visitorName: visitorInfo.name.trim(),
        visitorEmail: visitorInfo.email.trim() || undefined,
        visitorPhone: visitorInfo.phone.trim() || undefined,
        metadata: { userAgent: navigator.userAgent, url: window.location.href },
      });
      if (res.data.success) {
        const newSession = res.data.data;
        setSession(newSession);
        setShowPreChatForm(false);
        localStorage.setItem(`livechat_session_${businessId}`, JSON.stringify({ session: newSession }));

        // Send greeting message
        const greeting = widgetConfig?.greetingMessage || 'Hello! How can we help you today?';
        await liveChatAPI.addMessage(newSession.id, {
          senderType: 'bot',
          content: greeting,
        });
        fetchMessages();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async () => {
    if (!newMessage.trim() || !session || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic add
    const optimistic: ChatMessage = {
      id: `temp_${Date.now()}`,
      sessionId: session.id,
      senderType: 'visitor',
      senderId: null,
      content: text,
      contentType: 'text',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await liveChatAPI.addMessage(session.id, {
        senderType: 'visitor',
        content: text,
      });
      // Fetch real messages
      setTimeout(fetchMessages, 500);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ============================================================
  // SUBMIT RATING
  // ============================================================

  const submitRating = async () => {
    if (!session || rating === 0) return;
    try {
      await liveChatAPI.rateSession(session.id, rating);
      setRatingSubmitted(true);
    } catch {
      // ignore
    }
  };

  // ============================================================
  // HANDLE KEY PRESS
  // ============================================================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============================================================
  // RESET CHAT
  // ============================================================

  const resetChat = () => {
    setSession(null);
    setMessages([]);
    setShowPreChatForm(true);
    setVisitorInfo({ name: '', email: '', phone: '' });
    setShowRating(false);
    setRating(0);
    setRatingSubmitted(false);
    setNewMessage('');
    localStorage.removeItem(`livechat_session_${businessId}`);
  };

  // ============================================================
  // QUICK REPLIES
  // ============================================================

  const quickReplies = [
    'Hello!',
    'I need help',
    'What are your prices?',
    'Thank you!',
  ];

  // ============================================================
  // RENDER
  // ============================================================

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '59, 130, 246';
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed ${widgetWindowPosition} z-[9999] w-[380px] max-w-[calc(100vw-1rem)] sm:max-w-[380px] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}
          style={{
            height: isMinimized ? '56px' : 'min(560px, calc(100vh - 100px))',
            maxHeight: 'calc(100vh - 100px)',
            fontFamily: theme?.fontFamily || 'inherit',
          }}
        >
          {/* Header */}
          <div
            className="relative px-4 py-3 flex items-center justify-between shrink-0"
            style={{ backgroundColor: widgetColor }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm backdrop-blur-sm">
                {session ? getInitials(visitorInfo.name || 'V') : '💬'}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm leading-tight">
                  {widgetConfig?.name || 'Live Chat'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isOnline ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-white/80 text-xs">Online</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-white/80 text-xs">Offline</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900">
              {/* Pre-Chat Form */}
              {showPreChatForm ? (
                <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                  <div className="text-center mb-6">
                    <div
                      className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: widgetColor }}
                    >
                      {widgetConfig?.name?.[0] || '💬'}
                    </div>
                    <h4 className="text-gray-900 dark:text-white font-semibold text-lg">
                      {widgetConfig?.name || 'Start a Conversation'}
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      {widgetConfig?.greetingMessage || 'How can we help you today?'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1">
                        Your Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={visitorInfo.name}
                          onChange={e => setVisitorInfo(p => ({ ...p, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && startSession()}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-400"
                          style={{ '--tw-ring-color': widgetColor } as React.CSSProperties}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          placeholder="john@example.com"
                          value={visitorInfo.email}
                          onChange={e => setVisitorInfo(p => ({ ...p, email: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && startSession()}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={visitorInfo.phone}
                          onChange={e => setVisitorInfo(p => ({ ...p, phone: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && startSession()}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs text-center">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={startSession}
                    disabled={!visitorInfo.name.trim() || loading}
                    className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ backgroundColor: widgetColor }}
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        Start Chat
                      </>
                    )}
                  </button>
                </div>
              ) : showRating ? (
                /* Rating Screen */
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  {!ratingSubmitted ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
                          <Star className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h4 className="text-gray-900 dark:text-white font-semibold text-lg">
                          How was your experience?
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          Your feedback helps us improve
                        </p>
                      </div>

                      <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-110 active:scale-95"
                          >
                            <Star
                              className={`w-10 h-10 ${
                                star <= rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={submitRating}
                        disabled={rating === 0}
                        className="w-full py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        style={{ backgroundColor: widgetColor }}
                      >
                        Submit Rating
                      </button>

                      <button
                        onClick={resetChat}
                        className="mt-3 text-gray-500 dark:text-gray-400 text-sm hover:underline"
                      >
                        Start a new chat
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-green-500 fill-green-500" />
                      </div>
                      <h4 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
                        Thank you!
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
                        We appreciate your feedback
                      </p>
                      <button
                        onClick={resetChat}
                        className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
                        style={{ backgroundColor: widgetColor }}
                      >
                        Start New Chat
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Chat Messages */
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => {
                      const isVisitor = msg.senderType === 'visitor';
                      const isBot = msg.senderType === 'bot';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isVisitor ? 'justify-end' : 'justify-start'} gap-2`}
                        >
                          {!isVisitor && (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1"
                              style={{ backgroundColor: isBot ? '#6B7280' : widgetColor }}
                            >
                              {isBot ? '🤖' : '👤'}
                            </div>
                          )}
                          <div
                            className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isVisitor
                                ? 'text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-md shadow-sm'
                            }`}
                            style={isVisitor ? { backgroundColor: widgetColor } : {}}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isVisitor ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {typingAgent && (
                      <div className="flex justify-start gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: widgetColor }}
                        >
                          👤
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Replies */}
                  {messages.length <= 2 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                      {quickReplies.map(text => (
                        <button
                          key={text}
                          onClick={() => { setNewMessage(text); inputRef.current?.focus(); }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:shadow-sm"
                          style={{
                            borderColor: widgetColor + '40',
                            color: widgetColor,
                          }}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-3 pb-3 pt-1 shrink-0">
                    <div className="flex items-end gap-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-sm">
                      <button
                        onClick={() => setShowEmoji(!showEmoji)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      <textarea
                        ref={inputRef}
                        rows={1}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none max-h-20 leading-relaxed py-1"
                        style={{ minHeight: '24px' }}
                      />
                      <button
                        onClick={() => {}}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="p-2 rounded-full text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-md active:scale-95 shrink-0"
                        style={{ backgroundColor: widgetColor }}
                      >
                        {sending ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {session?.status === 'closed' && (
                      <div className="mt-2 text-center">
                        <button
                          onClick={() => setShowRating(true)}
                          className="text-xs font-medium hover:underline"
                          style={{ color: widgetColor }}
                        >
                          Rate this chat
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) {
            setUnreadCount(0);
          }
        }}
        className={`fixed ${positionClasses} z-[9998] w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:shadow-xl hover:scale-105 active:scale-95`}
        style={{ backgroundColor: widgetColor }}
        title="Chat with us"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}

        {/* Pulse ring */}
        {!isOpen && unreadCount === 0 && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: widgetColor }}
          />
        )}
      </button>
    </>
  );
};

export default LiveChatWidget;

