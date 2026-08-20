import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, Send, Clock, BarChart3, Users, Plus, Play, Pause, Eye, Trash2, Zap,
  MessageSquare, Settings, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Loader2, Copy, Edit3, TrendingUp, Target, Filter, Download, Upload,
  Globe, Lock, Smartphone, ChevronDown, ChevronRight, FileText, PieChart,
  Search
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePie, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { emailAPI, campaignsAPI, analyticsAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview: string;
  category: string;
  variables: string[];
  isDragEnabled: boolean;
  blocks: TemplateBlock[];
  thumbnail?: string;
}

interface TemplateBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'footer' | 'social';
  content: string;
  styles: Record<string, string>;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  recipients: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  unsubscribed?: number;
  complaints?: number;
  scheduledAt?: string;
  sentAt?: string;
  templateId?: string;
  listId?: string;
  abTest?: ABTestConfig;
  stats?: {
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    complaintRate: number;
    deliverability: number;
  };
}

interface ABTestConfig {
  enabled: boolean;
  subjectA: string;
  subjectB: string;
  winnerBy: 'opens' | 'clicks';
  winner?: 'A' | 'B';
  sendingPercentA: number;
  testDuration: number;
}

interface EmailList {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  tags: string[];
  createdAt: string;
}

interface DripSequence {
  id: string;
  name: string;
  trigger: 'signup' | 'tag_added' | 'stage_change' | 'order_placed' | 'custom';
  triggerValue?: string;
  emails: DripEmail[];
  isActive: boolean;
  stats: { sent: number; opened: number; clicked: number };
}

interface DripEmail {
  id: string;
  subject: string;
  delay: number; // hours after trigger
  content: string;
  templateId?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
}

// ─── Color Constants ─────────────────────────────────────────────────────────
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

// ─── Static Data ─────────────────────────────────────────────────────────────
const DEMO_TEMPLATES: EmailTemplate[] = [
  { id: 't1', name: 'Welcome Series', subject: 'Welcome to {{business}}!', preview: 'Beautiful welcome email with brand intro', category: 'Onboarding', variables: ['business', 'name'], isDragEnabled: true, blocks: [] },
  { id: 't2', name: 'Promotional', subject: '🔥 {{discount}}% Off - Limited Time!', preview: 'Eye-catching promotional campaign', category: 'Marketing', variables: ['discount', 'business'], isDragEnabled: true, blocks: [] },
  { id: 't3', name: 'Newsletter', subject: '{{business}} Monthly Update', preview: 'Monthly newsletter with updates and offers', category: 'Content', variables: ['business', 'month'], isDragEnabled: true, blocks: [] },
  { id: 't4', name: 'Re-engagement', subject: 'We Miss You, {{name}}!', preview: 'Win back inactive customers', category: 'Retention', variables: ['name', 'business'], isDragEnabled: true, blocks: [] },
  { id: 't5', name: 'Abandoned Cart', subject: 'Your Cart is Waiting! 🛒', preview: 'Recover abandoned carts with urgency', category: 'E-Commerce', variables: ['name', 'items', 'business'], isDragEnabled: true, blocks: [] },
  { id: 't6', name: 'Invoice/Receipt', subject: 'Receipt for {{business}} Order', preview: 'Professional invoice template', category: 'Transactional', variables: ['business', 'order', 'amount'], isDragEnabled: true, blocks: [] },
];

const DEMO_CAMPAIGNS: EmailCampaign[] = [
  { id: 'c1', name: 'New Year Mega Sale', subject: '🎉 New Year Special - Up to 50% Off!', previewText: 'Start the year with amazing deals', status: 'sent', recipients: 2450, sent: 2450, delivered: 2352, opened: 857, clicked: 284, bounced: 48, unsubscribed: 12, complaints: 2, sentAt: '2025-01-01T10:00:00Z' },
  { id: 'c2', name: 'Product Launch', subject: 'Introducing Our New Feature', previewText: 'Check out what we built', status: 'scheduled', recipients: 3800, scheduledAt: '2025-02-15T09:00:00Z' },
  { id: 'c3', name: 'Monthly Newsletter', subject: 'February Updates Inside', previewText: 'News, tips, and exclusive offers', status: 'draft', recipients: 4200 },
  { id: 'c4', name: 'Re-engagement Campaign', subject: 'We Miss You! Come Back for 20% Off', previewText: 'Exclusive offer for loyal customers', status: 'sending', recipients: 1800, sent: 523, delivered: 510, opened: 89, clicked: 34 },
];

const DEMO_LISTS: EmailList[] = [
  { id: 'l1', name: 'All Contacts', description: 'Master list of all contacts', contactCount: 4500, tags: [], createdAt: '2024-06-01' },
  { id: 'l2', name: 'Hot Leads', description: 'High-intent leads ready for conversion', contactCount: 234, tags: ['hot', 'vip'], createdAt: '2024-08-15' },
  { id: 'l3', name: 'Newsletter Subscribers', description: 'Opted-in newsletter recipients', contactCount: 1200, tags: ['newsletter'], createdAt: '2024-07-01' },
  { id: 'l4', name: 'E-Commerce Customers', description: 'Past purchasers and active shoppers', contactCount: 890, tags: ['customer'], createdAt: '2024-09-01' },
  { id: 'l5', name: 'Inactive (90 days)', description: 'No activity in 90+ days', contactCount: 567, tags: ['inactive'], createdAt: '2024-10-01' },
];

const DEMO_DRIPS: DripSequence[] = [
  { id: 'd1', name: 'New Lead Nurture', trigger: 'signup', emails: [
    { id: 'de1', subject: 'Welcome! Here\'s What to Expect', delay: 0, content: 'Welcome email content...' },
    { id: 'de2', subject: 'Tip: Get the Most Out of Our Platform', delay: 24, content: 'Tip content...' },
    { id: 'de3', subject: 'Special Offer Inside 🎁', delay: 72, content: 'Offer content...' },
  ], isActive: true, stats: { sent: 892, opened: 345, clicked: 123 } },
  { id: 'd2', name: 'Cart Abandonment', trigger: 'order_placed', emails: [
    { id: 'de4', subject: 'You Left Something Behind!', delay: 1, content: 'Reminder content...' },
    { id: 'de5', subject: 'Still Thinking? Here\'s 10% Off', delay: 24, content: 'Discount content...' },
  ], isActive: true, stats: { sent: 445, opened: 178, clicked: 67 } },
  { id: 'd3', name: 'Birthday Wishes', trigger: 'custom', triggerValue: 'birthday', emails: [
    { id: 'de6', subject: 'Happy Birthday from {{business}}! 🎂', delay: 0, content: 'Birthday content...' },
  ], isActive: false, stats: { sent: 0, opened: 0, clicked: 0 } },
];

// ─── Components ──────────────────────────────────────────────────────────────

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800',
  };
  return (
    <div className={`${bgMap[color] || bgMap.blue} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const EmailMarketingPage: React.FC = () => {
  const { isDemoMode } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'lists' | 'automation' | 'analytics' | 'settings'>('campaigns');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [drips, setDrips] = useState<DripSequence[]>([]);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [showABTest, setShowABTest] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '', port: 587, secure: false, username: '', password: '',
    fromName: '', fromEmail: '', provider: 'smtp',
  });

  const showToast = (m: string, t: 'success' | 'error' = 'success') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        setCampaigns(DEMO_CAMPAIGNS);
        setTemplates(DEMO_TEMPLATES);
        setEmailLists(DEMO_LISTS);
        setDrips(DEMO_DRIPS);
        setLoading(false);
        return;
      }
      const [camRes, tmpRes, lstRes, dripRes] = await Promise.allSettled([
        campaignsAPI.list(),
        emailAPI.listTemplates(),
        emailAPI.listLists(),
        emailAPI.listDrips(),
      ]);

      if (camRes.status === 'fulfilled' && camRes.value.data?.data) {
        const data = camRes.value.data.data;
        setCampaigns(Array.isArray(data) ? data : data.campaigns || []);
      } else setCampaigns([]);

      if (tmpRes.status === 'fulfilled' && tmpRes.value.data?.data) {
        const data = tmpRes.value.data.data;
        setTemplates(Array.isArray(data) ? data : data.templates || []);
      } else setTemplates([]);

      if (lstRes.status === 'fulfilled' && lstRes.value.data?.data) {
        const data = lstRes.value.data.data;
        setEmailLists(Array.isArray(data) ? data : data.lists || []);
      } else setEmailLists([]);

      if (dripRes.status === 'fulfilled' && dripRes.value.data?.data) {
        const data = dripRes.value.data.data;
        setDrips(Array.isArray(data) ? data : data.sequences || []);
      } else setDrips([]);
    } catch (err) {
      console.error('Failed to load email data:', err);
      setCampaigns(DEMO_CAMPAIGNS);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed stats ─────────────────────────────────────────────────
  const emailStats = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + (c.sent || 0), 0);
    const totalDelivered = campaigns.reduce((s, c) => s + (c.delivered || 0), 0);
    const totalOpens = campaigns.reduce((s, c) => s + (c.opened || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicked || 0), 0);
    const totalBounces = campaigns.reduce((s, c) => s + (c.bounced || 0), 0);
    const avgOpenRate = totalDelivered > 0 ? ((totalOpens / totalDelivered) * 100).toFixed(1) : '0';
    const avgClickRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : '0';
    const avgBounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : '0';
    const totalRecipients = campaigns.reduce((s, c) => s + c.recipients, 0);
    return { totalSent, totalDelivered, totalOpens, totalClicks, totalBounces, avgOpenRate, avgClickRate, avgBounceRate, totalRecipients };
  }, [campaigns]);

  const { totalSent, totalDelivered, totalOpens, totalClicks, totalBounces, avgOpenRate, avgClickRate, avgBounceRate, totalRecipients } = emailStats;

  const filteredCampaigns = useMemo(() => campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  ), [campaigns, searchQuery]);

  const filteredTemplates = useMemo(() => templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  ), [templates, searchQuery]);

  const filteredLists = useMemo(() => emailLists.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [emailLists, searchQuery]);

  // ── Campaign actions ───────────────────────────────────────────────
  const sendCampaign = async (id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'sending' } : c));
    try {
      await campaignsAPI.send(id);
      setTimeout(() => {
        setCampaigns(prev => prev.map(c => c.id === id ? {
          ...c, status: 'sent', sent: c.recipients,
          delivered: Math.floor(c.recipients * 0.96),
          opened: Math.floor(c.recipients * 0.32),
          clicked: Math.floor(c.recipients * 0.08),
        } : c));
        showToast('Campaign sent successfully!');
      }, 2000);
    } catch {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'draft' } : c));
      showToast('Failed to send campaign', 'error');
    }
  };

  const duplicateCampaign = (campaign: EmailCampaign) => {
    const dup: EmailCampaign = { ...campaign, id: `dup-${Date.now()}`, name: `${campaign.name} (Copy)`, status: 'draft', sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
    setCampaigns(prev => [dup, ...prev]);
    showToast('Campaign duplicated');
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    showToast('Campaign deleted');
  };

  const toggleDrip = (id: string) => {
    setDrips(prev => prev.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
  };

  // ── Formatting ─────────────────────────────────────────────────────
  const formatPct = (v: number) => `${v.toFixed(1)}%`;

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading email marketing...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-4 sm:p-6 md:p-8 animate-fade-in-up">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.t === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}{toast.m}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl md:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Mail className="text-blue-600" size={28} /> Email Marketing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create campaigns, templates, automation sequences & track performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh"><RefreshCw size={18} /></button>
          <button onClick={() => setShowSmtpConfig(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            <Settings size={16} /> SMTP
          </button>
          <button onClick={() => setShowComposeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm">
            <Plus size={18} /> Compose
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={<Send size={18} />} label="Total Sent" value={(totalSent || totalRecipients).toLocaleString()} color="blue" />
        <StatCard icon={<Eye size={18} />} label="Open Rate" value={`${avgOpenRate}%`} color="green" />
        <StatCard icon={<Zap size={18} />} label="Click Rate" value={`${avgClickRate}%`} color="purple" />
        <StatCard icon={<XCircle size={18} />} label="Bounce Rate" value={`${avgBounceRate}%`} color="orange" />
        <StatCard icon={<Users size={18} />} label="Delivered" value={totalDelivered.toLocaleString()} color="blue" />
        <StatCard icon={<TrendingUp size={18} />} label="Campaigns" value={campaigns.length} color="green" />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'campaigns' as const, label: 'Campaigns', count: campaigns.length, icon: <Send size={16} /> },
            { id: 'templates' as const, label: 'Templates', count: templates.length, icon: <FileText size={16} /> },
            { id: 'lists' as const, label: 'Lists', count: emailLists.length, icon: <Users size={16} /> },
            { id: 'automation' as const, label: 'Automation', count: drips.length, icon: <Zap size={16} /> },
            { id: 'analytics' as const, label: 'Analytics', icon: <BarChart3 size={16} /> },
            { id: 'settings' as const, label: 'Settings', icon: <Settings size={16} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {tab.icon}{tab.label}{tab.count !== undefined ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{tab.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'campaigns' ? 'Search campaigns...' : activeTab === 'templates' ? 'Search templates...' : activeTab === 'lists' ? 'Search lists...' : 'Search...'}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
      </div>

      {/* ══════════════════ CAMPAIGNS ══════════════════ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Send size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Campaigns Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first email campaign</p>
              <button onClick={() => setShowComposeModal(true)} className="px-4 sm:px-5 md:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Campaign</button>
            </div>
          ) : filteredCampaigns.map(campaign => {
            const stats = campaign.stats || {
              openRate: campaign.sent ? ((campaign.opened || 0) / (campaign.delivered || campaign.sent)) * 100 : 0,
              clickRate: campaign.opened ? ((campaign.clicked || 0) / campaign.opened) * 100 : 0,
              bounceRate: campaign.sent ? ((campaign.bounced || 0) / campaign.sent) * 100 : 0,
              deliverability: campaign.sent ? ((campaign.delivered || 0) / campaign.sent) * 100 : 0,
            };
            return (
              <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{campaign.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>{campaign.status.toUpperCase()}</span>
                      {campaign.abTest?.enabled && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full font-medium">A/B Test</span>}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.subject}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>{campaign.recipients.toLocaleString()} recipients</span>
                      {campaign.sentAt && <span>Sent: {new Date(campaign.sentAt).toLocaleDateString()}</span>}
                      {campaign.scheduledAt && <span className="flex items-center gap-1"><Clock size={12} /> Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Mini stats */}
                    {campaign.status === 'sent' && (
                      <div className="flex gap-3 text-xs">
                        <div className="text-center"><p className="font-bold text-gray-900 dark:text-white">{(campaign.delivered || 0).toLocaleString()}</p><p className="text-gray-400">Delivered</p></div>
                        <div className="text-center"><p className="font-bold text-green-600">{stats.openRate ? `${stats.openRate.toFixed(1)}%` : '-'}</p><p className="text-gray-400">Opens</p></div>
                        <div className="text-center"><p className="font-bold text-purple-600">{stats.clickRate ? `${stats.clickRate.toFixed(1)}%` : '-'}</p><p className="text-gray-400">Clicks</p></div>
                        <div className="text-center"><p className="font-bold text-red-600">{stats.bounceRate ? `${stats.bounceRate.toFixed(1)}%` : '-'}</p><p className="text-gray-400">Bounce</p></div>
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {campaign.status === 'draft' && (
                        <button onClick={() => sendCampaign(campaign.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1"><Send size={12} /> Send</button>
                      )}
                      {campaign.status === 'scheduled' && (
                        <button onClick={() => { setEditingCampaign(campaign); setShowComposeModal(true); }} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"><Edit3 size={12} /> Edit</button>
                      )}
                      {campaign.status === 'sending' && (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs rounded-lg"><Loader2 size={12} className="animate-spin" /> Sending</span>
                      )}
                      <button onClick={() => duplicateCampaign(campaign)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Duplicate"><Copy size={14} /></button>
                      <button onClick={() => deleteCampaign(campaign.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
                {/* Performance bar for sent campaigns */}
                {campaign.status === 'sent' && campaign.delivered && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div><div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"><div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${(campaign.delivered / campaign.sent!) * 100}%` }} /></div><p className="text-xs text-gray-400 mt-0.5">Deliverability</p></div>
                    <div><div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"><div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${stats.openRate}%` }} /></div><p className="text-xs text-gray-400 mt-0.5">Open Rate</p></div>
                    <div><div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"><div className="h-1.5 bg-purple-500 rounded-full" style={{ width: `${stats.clickRate}%` }} /></div><p className="text-xs text-gray-400 mt-0.5">Click Rate</p></div>
                    <div><div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"><div className="h-1.5 bg-red-500 rounded-full" style={{ width: `${stats.bounceRate}%` }} /></div><p className="text-xs text-gray-400 mt-0.5">Bounce</p></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════ TEMPLATES ══════════════════ */}
      {activeTab === 'templates' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer group">
                <div className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex items-center justify-center">
                    <Mail size={28} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{template.name}</h3>
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{template.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{template.preview}</p>
                  <p className="text-xs text-gray-400 mb-3 truncate">{template.subject}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.variables.map(v => <span key={v} className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded">{`{{${v}}}`}</span>)}
                  </div>
                  <div className="flex items-center justify-between">
                    <button className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"><Edit3 size={12} /> Edit</button>
                    <button onClick={() => setShowComposeModal(true)} className="text-xs text-gray-600 dark:text-gray-400 font-medium hover:text-blue-600 flex items-center gap-1"><Copy size={12} /> Use</button>
                  </div>
                </div>
              </div>
            ))}
            {/* Add template card */}
            <button onClick={() => setShowTemplateEditor(true)} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all h-full min-h-[200px]">
              <Plus size={32} className="mb-2" />
              <span className="text-sm font-medium">Create Template</span>
              <span className="text-xs mt-1">Drag & drop editor</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ LISTS ══════════════════ */}
      {activeTab === 'lists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLists.map(list => (
            <div key={list.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Users size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{list.contactCount.toLocaleString()}</span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{list.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{list.description || 'No description'}</p>
              {list.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {list.tags.map(tag => <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">{tag}</span>)}
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-400">Created {new Date(list.createdAt).toLocaleDateString()}</span>
                <button className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"><Send size={12} /> Send to List</button>
              </div>
            </div>
          ))}
          <button className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all">
            <Plus size={32} className="mb-2" />
            <span className="text-sm font-medium">Create List</span>
          </button>
        </div>
      )}

      {/* ══════════════════ AUTOMATION (Drip Sequences) ══════════════════ */}
      {activeTab === 'automation' && (
        <div className="space-y-4">
          {drips.map(drip => (
            <div key={drip.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${drip.isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-600' : 'bg-gray-50 dark:bg-gray-700 text-gray-400'}`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{drip.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Trigger: {drip.trigger.replace('_', ' ')} {drip.triggerValue ? `(${drip.triggerValue})` : ''} • {drip.emails.length} emails
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-4 text-xs">
                    <div className="text-center"><p className="font-bold text-gray-900 dark:text-white">{drip.stats.sent.toLocaleString()}</p><p className="text-gray-400">Sent</p></div>
                    <div className="text-center"><p className="font-bold text-green-600">{drip.stats.sent > 0 ? `${((drip.stats.opened / drip.stats.sent) * 100).toFixed(0)}%` : '-'}</p><p className="text-gray-400">Opens</p></div>
                    <div className="text-center"><p className="font-bold text-purple-600">{drip.stats.opened > 0 ? `${((drip.stats.clicked / drip.stats.opened) * 100).toFixed(0)}%` : '-'}</p><p className="text-gray-400">CTR</p></div>
                  </div>
                  <button onClick={() => toggleDrip(drip.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${drip.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {drip.isActive ? 'Active' : 'Paused'}
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit3 size={14} /></button>
                  <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
              {/* Email sequence timeline */}
              <div className="ml-9 space-y-2">
                {drip.emails.map((email, idx) => (
                  <div key={email.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{email.subject}</p>
                      <p className="text-xs text-gray-400">Sent {email.delay === 0 ? 'immediately' : `${email.delay}h after trigger`}</p>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-blue-600"><Eye size={14} /></button>
                    <button className="p-1 text-gray-400 hover:text-blue-600"><Edit3 size={14} /></button>
                  </div>
                ))}
                <button className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline ml-9">
                  <Plus size={14} /> Add Email Step
                </button>
              </div>
            </div>
          ))}
          <button className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 sm:p-5 md:p-6 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all">
            <Plus size={20} className="mr-2" /> Create Automation Sequence
          </button>
        </div>
      )}

      {/* ══════════════════ ANALYTICS ══════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date range selector */}
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as const).map(d => (
              <button key={d} onClick={() => setDateRange(d)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === d ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{d}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Delivery Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" /> Campaign Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Delivered', value: totalDelivered || 100, fill: '#10B981' },
                  { name: 'Opened', value: totalOpens || 32, fill: '#3B82F6' },
                  { name: 'Clicked', value: totalClicks || 8, fill: '#8B5CF6' },
                  { name: 'Bounced', value: totalBounces || 2, fill: '#EF4444' },
                  { name: 'Unsub', value: campaigns.reduce((s, c) => s + (c.unsubscribed || 0), 0) || 1, fill: '#F59E0B' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement Over Time */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" /> Engagement Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[
                  { week: 'W1', opens: 245, clicks: 78 },
                  { week: 'W2', opens: 312, clicks: 95 },
                  { week: 'W3', opens: 278, clicks: 84 },
                  { week: 'W4', opens: 356, clicks: 112 },
                  { week: 'W5', opens: 298, clicks: 91 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="opens" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} name="Opens" />
                  <Area type="monotone" dataKey="clicks" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} name="Clicks" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Device breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Smartphone size={18} className="text-purple-600" /> Device Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RePie>
                  <Pie data={[
                    { name: 'Mobile', value: 68, color: '#3B82F6' },
                    { name: 'Desktop', value: 25, color: '#8B5CF6' },
                    { name: 'Tablet', value: 7, color: '#10B981' },
                  ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {[{ name: 'Mobile', value: 68, color: '#3B82F6' }, { name: 'Desktop', value: 25, color: '#8B5CF6' }, { name: 'Tablet', value: 7, color: '#10B981' }].map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </RePie>
              </ResponsiveContainer>
            </div>

            {/* Best Time */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-orange-600" /> Best Time to Send</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Best Day</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">Tuesday</p>
                  <p className="text-xs text-gray-500">+32% open rate</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Best Time</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">10:00 AM</p>
                  <p className="text-xs text-gray-500">+28% click rate</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send Time Optimization</h4>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Auto-optimize send time per recipient</span>
                  <button className="relative w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600">
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ SETTINGS ══════════════════ */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          {/* SMTP Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Settings size={20} className="text-blue-600" /> SMTP Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Provider</label>
                <select value={smtpConfig.provider} onChange={e => setSmtpConfig({ ...smtpConfig, provider: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="smtp">Custom SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="ses">Amazon SES</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Host</label><input type="text" value={smtpConfig.host} onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="smtp.example.com" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label><input type="number" value={smtpConfig.port} onChange={e => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label><input type="text" value={smtpConfig.username} onChange={e => setSmtpConfig({ ...smtpConfig, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label><input type="password" value={smtpConfig.password} onChange={e => setSmtpConfig({ ...smtpConfig, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Name</label><input type="text" value={smtpConfig.fromName} onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Your Business" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Email</label><input type="email" value={smtpConfig.fromEmail} onChange={e => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="noreply@example.com" /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={smtpConfig.secure} onChange={e => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })} className="rounded border-gray-300" id="smtp-secure" />
                <label htmlFor="smtp-secure" className="text-sm text-gray-700 dark:text-gray-300">Use SSL/TLS</label>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"><Globe size={14} /> Test Connection</button>
                <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"><CheckCircle size={14} /> Save Configuration</button>
              </div>
            </div>
          </div>

          {/* Default Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Lock size={20} className="text-purple-600" /> Default Campaign Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">Track Opens</p><p className="text-xs text-gray-500">Embed tracking pixel</p></div>
                <button onClick={() => showToast('Setting updated')} className="relative w-10 h-5 rounded-full bg-blue-600"><span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" /></button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">Track Clicks</p><p className="text-xs text-gray-500">Convert links to tracked URLs</p></div>
                <button onClick={() => showToast('Setting updated')} className="relative w-10 h-5 rounded-full bg-blue-600"><span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" /></button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">Unsubscribe Footer</p><p className="text-xs text-gray-500">Automatically add unsubscribe link</p></div>
                <button onClick={() => showToast('Setting updated')} className="relative w-10 h-5 rounded-full bg-blue-600"><span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" /></button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">Bounce Handling</p><p className="text-xs text-gray-500">Auto-suppress hard bounces</p></div>
                <button onClick={() => showToast('Setting updated')} className="relative w-10 h-5 rounded-full bg-blue-600"><span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" /></button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">Daily Sending Limit</p><p className="text-xs text-gray-500">Cap emails per day</p></div>
                <input type="number" defaultValue={5000} className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center" />
              </div>
            </div>
          </div>

          {/* DMARC/SPF Info */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Ensure High Deliverability</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">Configure SPF, DKIM, and DMARC records in your DNS to improve email deliverability and avoid spam folders.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ COMPOSE MODAL ══════════════════ */}
      {showComposeModal && (
        <ComposeModal
          onClose={() => setShowComposeModal(false)}
          onSend={(data) => {
            const newCampaign: EmailCampaign = {
              id: `c-${Date.now()}`,
              name: data.name,
              subject: data.subject,
              previewText: data.previewText || '',
              status: data.scheduledAt ? 'scheduled' : 'draft',
              recipients: 0,
              ...(data.scheduledAt ? { scheduledAt: data.scheduledAt } : {}),
            };
            setCampaigns(prev => [newCampaign, ...prev]);
            showToast(data.scheduledAt ? 'Campaign scheduled!' : 'Campaign saved as draft');
            setShowComposeModal(false);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// ─── Compose Modal ────────────────────────────────────────────────────────────
const ComposeModal: React.FC<{
  onClose: () => void;
  onSend: (data: any) => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}> = ({ onClose, onSend, showToast }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [enableABTest, setEnableABTest] = useState(false);
  const [subjectB, setSubjectB] = useState('');
  const [abWinnerBy, setAbWinnerBy] = useState<'opens' | 'clicks'>('opens');

  const handleSubmit = () => {
    if (!name || !subject) return;
    onSend({ name, subject, previewText, listId: selectedList, content, scheduledAt: scheduledAt || undefined, abTest: enableABTest ? { subjectB, winnerBy: abWinnerBy } : undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Campaign</h2>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>{s}</div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-4 sm:p-5 md:p-6 space-y-5">
          {step === 1 && (
            <>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. February Newsletter" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Line *</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your subject line" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview Text</label><input type="text" value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Brief preview after subject" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send List</label><select value={selectedList} onChange={e => setSelectedList(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">All Contacts</option>
                <option value="l1">Hot Leads</option>
                <option value="l2">Newsletter Subscribers</option>
                <option value="l3">E-Commerce Customers</option>
              </select></div>

              {/* A/B Testing - Enhanced */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Target size={16} className="text-purple-600" /><span className="text-sm font-medium text-gray-900 dark:text-white">A/B Testing</span></div>
                  <button onClick={() => setEnableABTest(!enableABTest)} className={`relative w-10 h-5 rounded-full transition-colors ${enableABTest ? 'bg-purple-600' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enableABTest ? 'translate-x-5 left-0.5' : 'left-0.5'}`} /></button>
                </div>
                {enableABTest && (
                  <div className="space-y-4 ml-6">
                    {/* Subject Line Preview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Variant A (Original)</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{subject || 'No subject'}</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Variant B (Test)</p>
                        <input type="text" value={subjectB} onChange={e => setSubjectB(e.target.value)} placeholder="Alternative subject line" className="w-full bg-transparent text-sm text-gray-900 dark:text-white font-medium focus:outline-none placeholder-gray-400" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">Winner Based On</label><select value={abWinnerBy} onChange={e => setAbWinnerBy(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"><option value="opens">Open Rate</option><option value="clicks">Click Rate</option></select></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Test Sample Size</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"><option>20% of list</option><option>30% of list</option><option>50% of list</option></select></div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">How it works: Variant A and B are sent to a test sample. After 1 hour, the winning variant (by {abWinnerBy}) is automatically sent to the remaining subscribers.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Content</label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <button onClick={() => showToast('Rich text editor coming soon')} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white dark:hover:bg-gray-600 rounded">B</button>
                    <button onClick={() => showToast('Rich text editor coming soon')} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white dark:hover:bg-gray-600 rounded italic">I</button>
                    <button onClick={() => showToast('Rich text editor coming soon')} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white dark:hover:bg-gray-600 rounded underline">U</button>
                    <span className="text-gray-300 mx-1">|</span>
                    <button onClick={() => showToast('AI writing assistant coming soon')} className="px-2 py-1 text-xs text-gray-600 hover:bg-white dark:hover:bg-gray-600 rounded flex items-center gap-1"><Zap size={12} /> AI Write</button>
                  </div>
                  <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your email content here... Use {{name}}, {{business}} for personalization." rows={8} className="w-full px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none resize-none text-sm" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => showToast('AI content generation coming soon')} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"><Zap size={12} /> ✨ Generate with AI</button>
                  <span className="text-xs text-gray-400">{content.length} chars</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Zap size={16} className="mt-0.5" />
                <span>Use <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">{'{{name}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">{'{{business}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">{'{{phone}}'}</code> for personalization</span>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input type="radio" name="schedule" checked={!scheduledAt} onChange={() => setScheduledAt('')} className="text-blue-600" />
                    <div><span className="text-sm font-medium text-gray-900 dark:text-white">Send Immediately</span><p className="text-xs text-gray-500">Campaign starts as soon as you create it</p></div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input type="radio" name="schedule" checked={!!scheduledAt} onChange={() => setScheduledAt(new Date().toISOString().slice(0, 16))} className="text-blue-600" />
                    <div><span className="text-sm font-medium text-gray-900 dark:text-white">Schedule for Later</span><p className="text-xs text-gray-500">Set a specific date and time</p></div>
                  </label>
                  {scheduledAt && (
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campaign Summary</h4>
                <div className="space-y-1.5 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-medium text-gray-900 dark:text-white">{name || '—'}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Subject:</span><span className="font-medium text-gray-900 dark:text-white">{subject || '—'}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Recipients:</span><span className="font-medium text-gray-900 dark:text-white">{selectedList ? `${selectedList} list` : 'All Contacts'}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Delivery:</span><span className="font-medium text-gray-900 dark:text-white">{scheduledAt ? `Scheduled ${new Date(scheduledAt).toLocaleString()}` : 'Immediate'}</span></p>
                </div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              {step > 1 && <button onClick={() => setStep(step === 2 ? 1 : step === 3 ? 2 : 1 as any)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Back</button>}
            </div>
            <div className="flex items-center gap-3">
              {step < 3 ? (
                <button onClick={() => setStep((step + 1) as 1 | 2 | 3)} disabled={step === 1 && (!name || !subject)} className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">Continue</button>
              ) : (
                <button onClick={handleSubmit} disabled={!name || !subject} className="px-4 sm:px-5 md:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 text-sm">
                  {scheduledAt ? 'Schedule Campaign' : 'Send Campaign'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailMarketingPage;
