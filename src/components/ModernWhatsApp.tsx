import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, Sparkles, Bot, Brain, Zap, Users, Phone, Globe,
  TrendingUp, Clock, CheckCircle2, AlertCircle, Eye, Crown, Flame,
  Megaphone, ListChecks, Settings2, BarChart3, Calendar, Rocket, Wand2,
  DollarSign, Target, Activity, ChevronRight, RefreshCw, Shield, Star,
  ArrowUpRight, Lightbulb, Tag, Filter, Search, Plus, Layers, Image as ImageIcon,
  Mic, MicOff, Camera, Video, Paperclip, Smile, MoreVertical, CheckCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import AnimatedCounter from './AnimatedCounter';

type Tab = 'broadcast' | 'inbox' | 'templates' | 'campaigns' | 'settings' | 'analytics';

const ModernWhatsApp: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('broadcast');
  const [message, setMessage] = useState('');

  // Demo state for chat/inbox
  const [conversations, setConversations] = useState([
    { id: '1', name: 'Priya Sharma', lastMsg: 'Hi, is this available?', time: '2m', unread: 2, online: true, intent: 'hot', avatar: 'PS' },
    { id: '2', name: 'Amit Kumar', lastMsg: 'Thanks! I will check and revert.', time: '15m', unread: 0, online: false, intent: 'warm', avatar: 'AK' },
    { id: '3', name: 'Sneha Patel', lastMsg: 'Can you share the pricing?', time: '1h', unread: 1, online: true, intent: 'hot', avatar: 'SP' },
    { id: '4', name: 'Ravi Verma', lastMsg: 'Got it. Will pay tomorrow.', time: '3h', unread: 0, online: false, intent: 'warm', avatar: 'RV' },
    { id: '5', name: 'Anjali Singh', lastMsg: 'Need more details please', time: '5h', unread: 0, online: false, intent: 'cold', avatar: 'AS' },
  ]);
  const [activeChat, setActiveChat] = useState(conversations[0]);
  const [chatHistory, setChatHistory] = useState<{ from: 'me' | 'them'; text: string; time: string }[]>([
    { from: 'them', text: 'Hi! I saw your ad for the course. Can you share details?', time: '10:23 AM' },
    { from: 'me', text: 'Hello Priya! 👋 Sure! Our Pro Plan includes 1-on-1 coaching + AI tools + 200+ templates.', time: '10:24 AM' },
    { from: 'them', text: 'That sounds great. What is the price?', time: '10:25 AM' },
    { from: 'me', text: 'It is ₹4,999/month with 7-day free trial. Want me to set it up?', time: '10:26 AM' },
    { from: 'them', text: 'Hi, is this available?', time: '10:30 AM' },
  ]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'broadcast', label: 'AI Broadcast', icon: <Megaphone size={16} /> },
    { id: 'inbox', label: 'Inbox', icon: <MessageSquare size={16} /> },
    { id: 'templates', label: 'Templates', icon: <Layers size={16} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Rocket size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 size={16} /> },
  ];

  const sendMessage = () => {
    if (!message.trim()) return;
    setChatHistory([...chatHistory, { from: 'me', text: message, time: 'now' }]);
    setMessage('');
    // Simulate reply
    setTimeout(() => {
      setChatHistory(prev => [...prev, { from: 'them', text: 'Got it, thanks!', time: 'now' }]);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-5">
      {/* HERO HEADER */}
      <div className="ai-fade-in-up relative overflow-hidden rounded-3xl p-5 sm:p-6 md:p-7 ai-aurora">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-semibold mb-2 text-white">
              <Bot size={10} /> AI-POWERED WHATSAPP
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              WhatsApp Studio
            </h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base mt-1 max-w-2xl">
              AI-crafted messages, smart targeting, and conversion-focused campaigns that actually convert.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="ai-glass rounded-xl p-2.5 sm:p-3 text-center ai-lift">
              <p className="text-[9px] sm:text-[10px] text-slate-300 font-medium">Sent</p>
              <p className="text-base sm:text-xl font-black text-white"><AnimatedCounter value={1829} /></p>
            </div>
            <div className="ai-glass rounded-xl p-2.5 sm:p-3 text-center ai-lift">
              <p className="text-[9px] sm:text-[10px] text-slate-300 font-medium">Delivered</p>
              <p className="text-base sm:text-xl font-black text-white"><AnimatedCounter value={1742} /></p>
            </div>
            <div className="ai-glass rounded-xl p-2.5 sm:p-3 text-center ai-lift">
              <p className="text-[9px] sm:text-[10px] text-slate-300 font-medium">Replied</p>
              <p className="text-base sm:text-xl font-black text-white"><AnimatedCounter value={523} /></p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto ai-glass rounded-2xl p-1.5 gap-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'ai-aurora text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'broadcast' && <BroadcastView />}
      {activeTab === 'inbox' && <InboxView conversations={conversations} activeChat={activeChat} setActiveChat={setActiveChat} chatHistory={chatHistory} message={message} setMessage={setMessage} sendMessage={sendMessage} />}
      {activeTab === 'templates' && <TemplatesView />}
      {activeTab === 'campaigns' && <CampaignsView />}
      {activeTab === 'analytics' && <AnalyticsView />}
      {activeTab === 'settings' && <SettingsView />}
    </div>
  );
};

// BROADCAST TAB
const BroadcastView: React.FC = () => {
  const [audience, setAudience] = useState('hot');
  const [tone, setTone] = useState('friendly');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateAI = () => {
    setGenerating(true);
    setTimeout(() => {
      setGeneratedMsg(`Hi {{name}}! 👋\n\nWe noticed you've been exploring our Pro plan. As a thank you, here's an exclusive 30% off — valid for the next 24 hours only.\n\n🎁 Use code: WELCOME30\n\nReady to upgrade? Reply YES! 🚀`);
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
      <div className="lg:col-span-2 space-y-3 sm:space-y-4">
        {/* AI Generator */}
        <div className="ai-glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ai-aurora flex items-center justify-center ai-glow-pulse">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">AI Message Generator</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Describe your goal, get a high-converting message</p>
            </div>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="E.g., Send 30% off offer to hot leads who viewed pricing page this week"
            rows={2}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs">
              <option value="friendly">Friendly</option>
              <option value="urgent">Urgent</option>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
            </select>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs">
              <option value="hot">Hot Leads</option>
              <option value="warm">Warm Leads</option>
              <option value="all">All Contacts</option>
            </select>
          </div>
          <button onClick={generateAI} disabled={generating} className="mt-3 w-full ai-btn-primary text-sm flex items-center justify-center gap-1.5">
            {generating ? <><RefreshCw size={14} className="animate-spin" /> Generating...</> : <><Wand2 size={14} /> Generate with AI</>}
          </button>
        </div>

        {/* Generated Message */}
        {generatedMsg && (
          <div className="ai-glass rounded-2xl p-4 sm:p-5 ai-fade-in-up">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">AI-Generated Message</h3>
              </div>
              <div className="flex gap-1.5">
                <button className="text-[10px] px-2 py-1 ai-glass rounded-md text-slate-200">Edit</button>
                <button className="text-[10px] px-2 py-1 ai-glass rounded-md text-slate-200">Copy</button>
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {generatedMsg}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="ai-glass rounded-lg p-2">
                <p className="text-[9px] text-slate-400">Predicted Open</p>
                <p className="text-sm font-bold text-emerald-300">94%</p>
              </div>
              <div className="ai-glass rounded-lg p-2">
                <p className="text-[9px] text-slate-400">Predicted Reply</p>
                <p className="text-sm font-bold text-indigo-300">38%</p>
              </div>
              <div className="ai-glass rounded-lg p-2">
                <p className="text-[9px] text-slate-400">Sentiment</p>
                <p className="text-sm font-bold text-amber-300">Positive</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="ai-glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-2.5">Smart Audience</h3>
          <div className="space-y-2">
            {[
              { label: 'Hot Leads (viewed pricing)', count: 42, gradient: 'from-orange-500 to-red-500', icon: <Flame size={14} /> },
              { label: 'Trial Users (active)', count: 128, gradient: 'from-emerald-500 to-teal-500', icon: <Star size={14} /> },
              { label: 'Repeat Customers', count: 86, gradient: 'from-indigo-500 to-purple-500', icon: <Crown size={14} /> },
              { label: 'All (247 total)', count: 247, gradient: 'from-cyan-500 to-blue-500', icon: <Users size={14} /> },
            ].map((a, i) => (
              <button key={i} className="w-full flex items-center justify-between p-2.5 ai-glass rounded-xl ai-lift">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center text-white`}>
                    {a.icon}
                  </div>
                  <span className="text-xs sm:text-sm text-slate-200 font-medium text-left">{a.label}</span>
                </div>
                <span className="text-xs font-bold text-white">{a.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ai-glass rounded-2xl p-4 sm:p-5 ai-glow-pulse">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield size={14} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Anti-Block Drip</h3>
            <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">ON</span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed">
            Messages are sent with human-like timing: 30-120s random delays, batched sends, typing simulation. <span className="text-emerald-300 font-semibold">98% delivery rate.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// INBOX TAB
interface Conversation { id: string; name: string; lastMsg: string; time: string; unread: number; online: boolean; intent: string; avatar: string; }
interface InboxViewProps { conversations: Conversation[]; activeChat: Conversation; setActiveChat: (c: Conversation) => void; chatHistory: { from: 'me' | 'them'; text: string; time: string }[]; message: string; setMessage: (s: string) => void; sendMessage: () => void; }

const InboxView: React.FC<InboxViewProps> = ({ conversations, activeChat, setActiveChat, chatHistory, message, setMessage, sendMessage }) => {
  const [showAISuggestions, setShowAISuggestions] = useState(true);

  const aiSuggestions = [
    "Yes, the offer is valid till Friday!",
    "I'll send you the link right away 🚀",
    "Let me check and get back to you in 5 minutes.",
  ];

  return (
    <div className="grid md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr] gap-3 sm:gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Conversations List */}
      <div className="ai-glass rounded-2xl p-2 overflow-y-auto">
        <div className="p-2 mb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="space-y-1">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveChat(c)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
                activeChat.id === c.id ? 'ai-aurora text-white' : 'hover:bg-white/5 text-slate-200'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full ai-glass flex items-center justify-center font-bold text-sm text-white">{c.avatar}</div>
                {c.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold truncate">{c.name}</p>
                  <span className="text-[9px] opacity-70 ml-1">{c.time}</span>
                </div>
                <p className="text-[10px] sm:text-xs opacity-70 truncate">{c.lastMsg}</p>
              </div>
              {c.intent === 'hot' && <Flame size={12} className="text-orange-400 flex-shrink-0" />}
              {c.unread > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-pink-500 text-white rounded-full">{c.unread}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Active Chat */}
      <div className="ai-glass rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 p-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-full ai-aurora flex items-center justify-center font-bold text-sm text-white">{activeChat.avatar}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{activeChat.name}</p>
            <p className="text-[10px] text-emerald-300 flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> {activeChat.online ? 'Online' : 'Last seen 2h ago'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeChat.intent === 'hot' ? 'bg-orange-500/20 text-orange-300' :
              activeChat.intent === 'warm' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-300'
            }`}>
              {activeChat.intent.toUpperCase()}
            </span>
            <button className="p-1.5 hover:bg-white/10 rounded-lg"><Phone size={14} className="text-slate-300" /></button>
            <button className="p-1.5 hover:bg-white/10 rounded-lg"><Video size={14} className="text-slate-300" /></button>
            <button className="p-1.5 hover:bg-white/10 rounded-lg"><MoreVertical size={14} className="text-slate-300" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs sm:text-sm ${
                msg.from === 'me' ? 'ai-aurora text-white rounded-br-sm' : 'ai-glass text-slate-100 rounded-bl-sm'
              }`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <p className="text-[9px] opacity-60 mt-0.5 flex items-center gap-0.5 justify-end">
                  {msg.time}
                  {msg.from === 'me' && <CheckCheck size={10} />}
                </p>
              </div>
            </div>
          ))}
        </div>

        {showAISuggestions && (
          <div className="px-3 py-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={11} className="text-indigo-300" />
              <span className="text-[10px] font-semibold text-slate-300">AI Quick Replies</span>
              <button onClick={() => setShowAISuggestions(false)} className="ml-auto text-[10px] text-slate-400 hover:text-slate-200">Hide</button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {aiSuggestions.map((s, i) => (
                <button key={i} onClick={() => setMessage(s)} className="flex-shrink-0 px-2.5 py-1.5 ai-glass rounded-full text-[10px] sm:text-xs text-slate-200 hover:bg-white/10">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-2.5 sm:p-3 border-t border-white/10 flex items-center gap-1.5 sm:gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0"><Paperclip size={16} className="text-slate-300" /></button>
          <button className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0"><Smile size={16} className="text-slate-300" /></button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={sendMessage} className="p-2 ai-btn-primary flex-shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// TEMPLATES TAB
const TemplatesView: React.FC = () => {
  const templates = [
    { name: 'Welcome Message', category: 'Onboarding', icon: <Sparkles size={16} />, gradient: 'from-indigo-500 to-purple-500', uses: 142, conversion: 38 },
    { name: 'Cart Recovery', category: 'Sales', icon: <Target size={16} />, gradient: 'from-pink-500 to-rose-500', uses: 89, conversion: 27 },
    { name: 'Appointment Reminder', category: 'Service', icon: <Calendar size={16} />, gradient: 'from-amber-500 to-orange-500', uses: 234, conversion: 91 },
    { name: 'Win-back', category: 'Retention', icon: <RefreshCw size={16} />, gradient: 'from-cyan-500 to-blue-500', uses: 67, conversion: 18 },
    { name: 'Birthday Wish', category: 'Engagement', icon: <Star size={16} />, gradient: 'from-fuchsia-500 to-pink-500', uses: 56, conversion: 78 },
    { name: 'Feedback Request', category: 'Reviews', icon: <MessageSquare size={16} />, gradient: 'from-emerald-500 to-teal-500', uses: 123, conversion: 42 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white">Template Library</h2>
          <span className="text-[10px] px-1.5 py-0.5 ai-glass rounded-full text-slate-300">{templates.length} templates</span>
        </div>
        <button className="ai-btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
          <Plus size={12} /> New Template
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 ai-stagger">
        {templates.map((t, i) => (
          <div key={i} className="ai-glass rounded-2xl p-4 ai-lift cursor-pointer group">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-110 transition-transform`}>
              {t.icon}
            </div>
            <h3 className="text-sm font-bold text-white">{t.name}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{t.category}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <div>
                <p className="text-[9px] text-slate-500">Used</p>
                <p className="text-xs font-bold text-white">{t.uses}x</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500">Conversion</p>
                <p className="text-xs font-bold text-emerald-300">{t.conversion}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// CAMPAIGNS TAB
const CampaignsView: React.FC = () => {
  const campaigns = [
    { name: 'Diwali Mega Sale', status: 'Active', sent: 1842, replies: 612, rate: 33, gradient: 'from-orange-500 to-pink-500' },
    { name: 'New Year Welcome', status: 'Scheduled', sent: 0, replies: 0, rate: 0, gradient: 'from-indigo-500 to-purple-500' },
    { name: 'Course Launch 2026', status: 'Completed', sent: 4200, replies: 1580, rate: 37, gradient: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="space-y-3">
      {campaigns.map((c, i) => (
        <div key={i} className="ai-glass rounded-2xl p-4 sm:p-5 ai-lift">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-lg`}>
              <Megaphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">{c.name}</h3>
                <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' :
                  c.status === 'Scheduled' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-300'
                }`}>{c.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <p className="text-[9px] text-slate-500">Sent</p>
                  <p className="text-sm font-bold text-white">{c.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500">Replied</p>
                  <p className="text-sm font-bold text-indigo-300">{c.replies.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500">Rate</p>
                  <p className="text-sm font-bold text-emerald-300">{c.rate}%</p>
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
};

// ANALYTICS TAB
const AnalyticsView: React.FC = () => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Sent', value: 1829, icon: <Send size={18} />, gradient: 'from-indigo-500 to-purple-500' },
          { label: 'Delivery Rate', value: 95, suffix: '%', icon: <CheckCircle2 size={18} />, gradient: 'from-emerald-500 to-teal-500' },
          { label: 'Reply Rate', value: 29, suffix: '%', icon: <MessageSquare size={18} />, gradient: 'from-pink-500 to-rose-500' },
          { label: 'Cost Saved', value: 3247, prefix: '₹', icon: <DollarSign size={18} />, gradient: 'from-amber-500 to-orange-500' },
        ].map((s, i) => (
          <div key={i} className="ai-glass rounded-2xl p-3.5 sm:p-4 ai-lift">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-2`}>
              {s.icon}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
            <p className="text-lg sm:text-xl font-black text-white mt-0.5">
              <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} />
            </p>
          </div>
        ))}
      </div>

      <div className="ai-glass rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <TrendingUp size={16} className="text-emerald-400" /> 7-Day Performance
        </h3>
        <div className="grid grid-cols-7 gap-2 h-32 items-end">
          {[65, 80, 55, 90, 75, 95, 88].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-full ai-aurora rounded-t-lg transition-all" style={{ height: `${h}%`, minHeight: '8px' }} />
              <span className="text-[9px] text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// SETTINGS TAB
const SettingsView: React.FC = () => {
  return (
    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
      {[
        { title: 'WhatsApp API', desc: 'Connect Meta Cloud API or Evolution', icon: <Phone size={18} />, gradient: 'from-emerald-500 to-teal-500', status: 'Connected' },
        { title: 'AI Provider', desc: 'Claude AI for smart messaging', icon: <Brain size={18} />, gradient: 'from-violet-500 to-fuchsia-500', status: 'Active' },
        { title: 'SMS Fallback', desc: 'Auto-send SMS if WhatsApp fails', icon: <MessageSquare size={18} />, gradient: 'from-amber-500 to-orange-500', status: 'Ready' },
        { title: 'Anti-Block Drip', desc: 'Human-like sending patterns', icon: <Shield size={18} />, gradient: 'from-cyan-500 to-blue-500', status: 'Enabled' },
      ].map((s, i) => (
        <div key={i} className="ai-glass rounded-2xl p-4 sm:p-5 ai-lift cursor-pointer">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">{s.status}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{s.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModernWhatsApp;
