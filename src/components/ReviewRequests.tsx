import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Mail, MessageSquare, Smartphone, BarChart3, Users, Plus, Play, Pause,
  Trash2, CheckCircle, XCircle, AlertCircle, RefreshCw, Copy, Edit3, Filter,
  Search, Star, ExternalLink, Eye, Clock, Target, Link2, ArrowRight, ChevronDown,
  X, Loader2, Globe, FileText, Zap, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import apiClient from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReviewRequest {
  id: string;
  contactId: string;
  appointmentId?: string | null;
  orderId?: string | null;
  channel: 'whatsapp' | 'email' | 'sms';
  message: string;
  reviewUrl: string;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'failed';
  sentAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  contact?: { id: string; name: string; phone: string; email: string } | null;
}

interface ReviewCampaign {
  id: string;
  name: string;
  triggerType: 'appointment_completed' | 'order_delivered' | 'manual';
  triggerConfig: Record<string, any>;
  channel: 'whatsapp' | 'email' | 'sms';
  messageTemplate: string;
  reviewUrl: string;
  isActive: boolean;
  sentCount: number;
  completedCount: number;
  createdAt: string;
}

interface ReviewStats {
  totalSent: number;
  totalCompleted: number;
  totalFailed: number;
  conversionRate: number;
  channelBreakdown: Record<string, number>;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

type Tab = 'dashboard' | 'send' | 'bulk' | 'campaigns' | 'history';

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: <MessageSquare size={16} />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  email: { label: 'Email', icon: <Mail size={16} />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  sms: { label: 'SMS', icon: <Smartphone size={16} />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock size={14} /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Send size={14} /> },
  opened: { label: 'Opened', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <Eye size={14} /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle size={14} /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={14} /> },
};

const TRIGGER_TYPES: Record<string, { label: string; desc: string }> = {
  appointment_completed: { label: 'Appointment Completed', desc: 'Triggered when an appointment is marked complete' },
  order_delivered: { label: 'Order Delivered', desc: 'Triggered when an order is marked as delivered' },
  manual: { label: 'Manual', desc: 'Manually triggered per contact' },
};

const MESSAGE_PLACEHOLDERS = [
  { key: '{{contact_name}}', desc: 'Contact name' },
  { key: '{{business_name}}', desc: 'Business name' },
  { key: '{{review_url}}', desc: 'Review link' },
  { key: '{{appointment_date}}', desc: 'Appointment date' },
];

// ─── API Helpers ─────────────────────────────────────────────────────────────
async function apiGet<T>(url: string, params?: Record<string, any>): Promise<T> {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
  ).toString() : '';
  const res = await apiClient.get(url + query);
  return res.data;
}

async function apiPost<T>(url: string, body?: any): Promise<T> {
  const res = await apiClient.post(url, body);
  return res.data;
}

async function apiPut<T>(url: string, body?: any): Promise<T> {
  const res = await apiClient.put(url, body);
  return res.data;
}

async function apiPatch<T>(url: string, body?: any): Promise<T> {
  const res = await apiClient.patch(url, body);
  return res.data;
}

async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiClient.delete(url);
  return res.data;
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatTimeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

function generateGoogleReviewLink(businessName: string, placeId?: string) {
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
  }
  const encoded = encodeURIComponent(businessName);
  return `https://search.google.com/local/writereview?placeid=`;
}

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const w = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ReviewRequests() {
  const { business } = useAuthStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [stats, setStats] = useState<ReviewStats>({ totalSent: 0, totalCompleted: 0, totalFailed: 0, conversionRate: 0, channelBreakdown: {} });

  // Single send
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sendForm, setSendForm] = useState({ contactId: '', channel: 'whatsapp' as const, message: '', reviewUrl: '' });
  const [sending, setSending] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Bulk send
  const [bulkForm, setBulkForm] = useState({ contactIds: [] as string[], channel: 'whatsapp' as const, message: '', reviewUrl: '' });
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ total: number; sent: number; failed: number } | null>(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState<ReviewCampaign[]>([]);
  const [campaignModal, setCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ReviewCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState<{
    name: string;
    triggerType: 'appointment_completed' | 'order_delivered' | 'manual';
    channel: 'whatsapp' | 'email' | 'sms';
    messageTemplate: string;
    reviewUrl: string;
  }>({
    name: '', triggerType: 'manual', channel: 'whatsapp', messageTemplate: '', reviewUrl: ''
  });
  const [campaignSaving, setCampaignSaving] = useState(false);

  // History
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFilter, setHistoryFilter] = useState({ status: '', channel: '' });
  const [historySearch, setHistorySearch] = useState('');

  // Google Review Link Generator
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ businessName: '', placeId: '' });
  const [generatedLink, setGeneratedLink] = useState('');

  // ─── Fetch Data ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await apiGet('/review-requests/stats');
      if (res.success) setStats(res.data);
    } catch {}
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const res: any = await apiGet('/contacts', { limit: 200 });
      if (res.success) setContacts(res.data?.contacts || []);
    } catch {}
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res: any = await apiGet('/review-requests/campaigns');
      if (res.success) setCampaigns(res.data?.campaigns || []);
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: historyPage, limit: 20 };
      if (historyFilter.status) params.status = historyFilter.status;
      if (historyFilter.channel) params.channel = historyFilter.channel;
      const res: any = await apiGet('/review-requests', params);
      if (res.success) {
        setRequests(res.data?.requests || []);
        setHistoryTotal(res.data?.pagination?.total || 0);
      }
    } catch {
      showToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [historyPage, historyFilter]);

  useEffect(() => {
    fetchStats();
    fetchContacts();
    fetchCampaigns();
  }, [fetchStats, fetchContacts, fetchCampaigns]);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  const showToast = (m: string, t: 'success' | 'error') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Send Single ──────────────────────────────────────────────────────
  const handleSendSingle = async () => {
    if (!sendForm.contactId || !sendForm.reviewUrl) {
      showToast('Select a contact and enter review URL', 'error');
      return;
    }
    setSending(true);
    try {
      const res: any = await apiPost('/review-requests', sendForm);
      if (res.success) {
        showToast('Review request sent!', 'success');
        setSendForm({ contactId: '', channel: 'whatsapp', message: '', reviewUrl: '' });
        fetchStats();
        fetchHistory();
      } else {
        showToast(res.error || 'Failed to send', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  // ─── Send Bulk ────────────────────────────────────────────────────────
  const handleSendBulk = async () => {
    if (bulkForm.contactIds.length === 0 || !bulkForm.reviewUrl) {
      showToast('Select contacts and enter review URL', 'error');
      return;
    }
    setBulkSending(true);
    setBulkResult(null);
    try {
      const res: any = await apiPost('/review-requests/bulk', bulkForm);
      if (res.success) {
        setBulkResult(res.data);
        showToast(`Bulk send complete: ${res.data.sent} sent, ${res.data.failed} failed`, 'success');
        fetchStats();
        fetchHistory();
      } else {
        showToast(res.error || 'Failed to send', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to send', 'error');
    } finally {
      setBulkSending(false);
    }
  };

  // ─── Campaign CRUD ────────────────────────────────────────────────────
  const openCampaignModal = (campaign?: ReviewCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignForm({
        name: campaign.name,
        triggerType: campaign.triggerType as 'appointment_completed' | 'order_delivered' | 'manual',
        channel: campaign.channel as 'whatsapp' | 'email' | 'sms',
        messageTemplate: campaign.messageTemplate,
        reviewUrl: campaign.reviewUrl,
      });
    } else {
      setEditingCampaign(null);
      setCampaignForm({ name: '', triggerType: 'manual', channel: 'whatsapp', messageTemplate: '', reviewUrl: '' });
    }
    setCampaignModal(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.reviewUrl) {
      showToast('Name and review URL are required', 'error');
      return;
    }
    setCampaignSaving(true);
    try {
      if (editingCampaign) {
        const res: any = await apiPut(`/review-requests/campaigns/${editingCampaign.id}`, campaignForm);
        if (res.success) {
          showToast('Campaign updated', 'success');
          setCampaignModal(false);
          fetchCampaigns();
        }
      } else {
        const res: any = await apiPost('/review-requests/campaigns', campaignForm);
        if (res.success) {
          showToast('Campaign created', 'success');
          setCampaignModal(false);
          fetchCampaigns();
        }
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to save campaign', 'error');
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleToggleCampaign = async (id: string) => {
    try {
      const res: any = await apiPatch(`/review-requests/campaigns/${id}/toggle`);
      if (res.success) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
        showToast('Campaign toggled', 'success');
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to toggle', 'error');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      const res: any = await apiDelete(`/review-requests/campaigns/${id}`);
      if (res.success) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        showToast('Campaign deleted', 'success');
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  // ─── Google Review Link Generator ─────────────────────────────────────
  const handleGenerateLink = () => {
    const link = generateGoogleReviewLink(genForm.businessName, genForm.placeId);
    setGeneratedLink(link);
  };

  // ─── Filtered contacts ────────────────────────────────────────────────
  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  // ─── Channel counts ───────────────────────────────────────────────────
  const channelCounts = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.channel] = (acc[c.channel] || 0) + 1;
    return acc;
  }, {});

  // ─── History filtered ─────────────────────────────────────────────────
  const filteredHistory = requests.filter(r => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return r.contact?.name?.toLowerCase().includes(q) || r.contact?.email?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q);
  });

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { key: 'send', label: 'Send Request', icon: <Send size={16} /> },
    { key: 'bulk', label: 'Bulk Send', icon: <Users size={16} /> },
    { key: 'campaigns', label: 'Campaigns', icon: <Zap size={16} /> },
    { key: 'history', label: 'History', icon: <Clock size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Review Requests</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{business?.name || 'Your Business'} — Send & manage review requests</p>
          </div>
          <button
            onClick={() => setGenModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
          >
            <Link2 size={16} /> Google Review Link
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ═══ DASHBOARD ═══════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Sent" value={stats.totalSent} icon={<Send size={18} className="text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/30" sub="All time" />
              <StatCard label="Completed" value={stats.totalCompleted} icon={<CheckCircle size={18} className="text-green-600" />} color="bg-green-100 dark:bg-green-900/30" sub="Reviews received" />
              <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={<Target size={18} className="text-purple-600" />} color="bg-purple-100 dark:bg-purple-900/30" sub="Completed / Sent" />
              <StatCard label="Failed" value={stats.totalFailed} icon={<XCircle size={18} className="text-red-600" />} color="bg-red-100 dark:bg-red-900/30" sub="Delivery failures" />
            </div>

            {/* Channel Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Channel Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(CHANNEL_CONFIG).map(([ch, cfg]) => (
                  <div key={ch} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.color}`}>{cfg.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{cfg.label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.channelBreakdown[ch] || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Campaigns Quick View */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Campaigns</h3>
                <button onClick={() => setTab('campaigns')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
              </div>
              {campaigns.filter(c => c.isActive).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No active campaigns</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.filter(c => c.isActive).slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-750">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${CHANNEL_CONFIG[c.channel]?.color}`}>
                          {CHANNEL_CONFIG[c.channel]?.icon} {CHANNEL_CONFIG[c.channel]?.label}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{c.sentCount} sent</span>
                        <span>{c.completedCount} completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Requests */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Requests</h3>
                <button onClick={() => setTab('history')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
              </div>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No requests yet. Send your first review request!</p>
              ) : (
                <div className="space-y-2">
                  {requests.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_CONFIG[r.status]?.color}`}>
                          {STATUS_CONFIG[r.status]?.icon} {STATUS_CONFIG[r.status]?.label}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white">{r.contact?.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">via {CHANNEL_CONFIG[r.channel]?.label}</span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ SEND SINGLE ════════════════════════════════════════════════ */}
        {tab === 'send' && (
          <div className="max-w-2xl animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Send Review Request</h2>

              {/* Contact Select */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact *</label>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2"
                />
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl max-h-48 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No contacts found</p>
                  ) : (
                    filteredContacts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSendForm(prev => ({ ...prev, contactId: c.id })); setContactSearch(c.name || c.email || c.phone); }}
                        className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                          sendForm.contactId === c.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        <span className="font-medium">{c.name || 'Unnamed'}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">{c.email || c.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Channel */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel *</label>
                <div className="flex gap-2">
                  {Object.entries(CHANNEL_CONFIG).map(([ch, cfg]) => (
                    <button
                      key={ch}
                      onClick={() => setSendForm(prev => ({ ...prev, channel: ch as any }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        sendForm.channel === ch
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review URL */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Review URL *</label>
                <input
                  type="url"
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={sendForm.reviewUrl}
                  onChange={e => setSendForm(prev => ({ ...prev, reviewUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message (optional)</label>
                <textarea
                  rows={4}
                  placeholder={`Hi {{contact_name}}! We'd love your feedback. Please leave us a review: ${sendForm.reviewUrl || '{{review_url}}'}`}
                  value={sendForm.message}
                  onChange={e => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {MESSAGE_PLACEHOLDERS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setSendForm(prev => ({ ...prev, message: prev.message + p.key }))}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={p.desc}
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSendSingle}
                disabled={sending || !sendForm.contactId || !sendForm.reviewUrl}
                className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {sending ? 'Sending...' : 'Send Review Request'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ BULK SEND ══════════════════════════════════════════════════ */}
        {tab === 'bulk' && (
          <div className="max-w-3xl animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Bulk Send Review Requests</h2>

              {/* Contact Multi-Select */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Contacts * <span className="text-gray-500">({bulkForm.contactIds.length} selected)</span>
                </label>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2"
                />
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl max-h-64 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No contacts found</p>
                  ) : (
                    filteredContacts.map(c => {
                      const selected = bulkForm.contactIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setBulkForm(prev => ({
                              ...prev,
                              contactIds: selected ? prev.contactIds.filter(id => id !== c.id) : [...prev.contactIds, c.id]
                            }));
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                            selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selected && <CheckCircle size={12} className="text-white" />}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{c.name || 'Unnamed'}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{c.email || c.phone}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Channel */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel *</label>
                <div className="flex gap-2">
                  {Object.entries(CHANNEL_CONFIG).map(([ch, cfg]) => (
                    <button
                      key={ch}
                      onClick={() => setBulkForm(prev => ({ ...prev, channel: ch as any }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        bulkForm.channel === ch
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review URL */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Review URL *</label>
                <input
                  type="url"
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={bulkForm.reviewUrl}
                  onChange={e => setBulkForm(prev => ({ ...prev, reviewUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message (optional — personalized per contact)</label>
                <textarea
                  rows={4}
                  placeholder="Hi {{contact_name}}! We'd love your feedback. Please leave us a review: {{review_url}}"
                  value={bulkForm.message}
                  onChange={e => setBulkForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {MESSAGE_PLACEHOLDERS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setBulkForm(prev => ({ ...prev, message: prev.message + p.key }))}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={p.desc}
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSendBulk}
                disabled={bulkSending || bulkForm.contactIds.length === 0 || !bulkForm.reviewUrl}
                className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
              >
                {bulkSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {bulkSending ? 'Sending...' : `Send to ${bulkForm.contactIds.length} Contact${bulkForm.contactIds.length !== 1 ? 's' : ''}`}
              </button>

              {/* Bulk Result */}
              {bulkResult && (
                <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm mb-1">
                    <CheckCircle size={16} /> Bulk Send Complete
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    {bulkResult.total} total — {bulkResult.sent} sent, {bulkResult.failed} failed
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ CAMPAIGNS ══════════════════════════════════════════════════ */}
        {tab === 'campaigns' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Campaigns</h2>
              <button
                onClick={() => openCampaignModal()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
              >
                <Plus size={16} /> New Campaign
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Zap size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No campaigns yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create automated review request campaigns</p>
                <button onClick={() => openCampaignModal()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  Create First Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(c => (
                  <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${CHANNEL_CONFIG[c.channel]?.color}`}>
                            {CHANNEL_CONFIG[c.channel]?.icon} {CHANNEL_CONFIG[c.channel]?.label}
                          </span>
                          {c.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Inactive</span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <p>Trigger: {TRIGGER_TYPES[c.triggerType]?.label || c.triggerType}</p>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{c.messageTemplate}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <span className="flex items-center gap-1"><Send size={12} /> {c.sentCount} sent</span>
                      <span className="flex items-center gap-1"><CheckCircle size={12} /> {c.completedCount} completed</span>
                      <span>{c.sentCount > 0 ? Math.round((c.completedCount / c.sentCount) * 100) : 0}% conv.</span>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => handleToggleCampaign(c.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          c.isActive
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                        }`}
                      >
                        {c.isActive ? <Pause size={12} /> : <Play size={12} />}
                        {c.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => openCampaignModal(c)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteCampaign(c.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Campaign Modal */}
            <Modal
              open={campaignModal}
              onClose={() => setCampaignModal(false)}
              title={editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              size="lg"
            >
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campaign Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Post-Appointment Review Request"
                    value={campaignForm.name}
                    onChange={e => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trigger Type *</label>
                  <div className="space-y-2">
                    {Object.entries(TRIGGER_TYPES).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setCampaignForm(prev => ({ ...prev, triggerType: key as any }))}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          campaignForm.triggerType === key
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{cfg.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{cfg.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel *</label>
                  <div className="flex gap-2">
                    {Object.entries(CHANNEL_CONFIG).map(([ch, cfg]) => (
                      <button
                        key={ch}
                        onClick={() => setCampaignForm(prev => ({ ...prev, channel: ch as any }))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          campaignForm.channel === ch
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {cfg.icon} {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Review URL *</label>
                  <input
                    type="url"
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                    value={campaignForm.reviewUrl}
                    onChange={e => setCampaignForm(prev => ({ ...prev, reviewUrl: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Message Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Template</label>
                  <textarea
                    rows={5}
                    placeholder={`Hi {{contact_name}}! Thank you for choosing {{business_name}}. We'd love your feedback!\n\nPlease leave us a review: {{review_url}}\n\nYour review means the world to us!`}
                    value={campaignForm.messageTemplate}
                    onChange={e => setCampaignForm(prev => ({ ...prev, messageTemplate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {MESSAGE_PLACEHOLDERS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setCampaignForm(prev => ({ ...prev, messageTemplate: prev.messageTemplate + p.key }))}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title={p.desc}
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveCampaign}
                  disabled={campaignSaving || !campaignForm.name || !campaignForm.reviewUrl}
                  className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                >
                  {campaignSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {campaignSaving ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </Modal>
          </div>
        )}

        {/* ═══ HISTORY ═════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request History</h2>
              <button onClick={fetchHistory} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, message..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <select
                value={historyFilter.status}
                onChange={e => setHistoryFilter(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={historyFilter.channel}
                onChange={e => setHistoryFilter(prev => ({ ...prev, channel: e.target.value }))}
                className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Channels</option>
                {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No requests found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Send your first review request to see history here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Channel</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sent</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Completed</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map(r => (
                        <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{r.contact?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{r.contact?.email || r.contact?.phone || '-'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${CHANNEL_CONFIG[r.channel]?.color}`}>
                              {CHANNEL_CONFIG[r.channel]?.icon} {CHANNEL_CONFIG[r.channel]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_CONFIG[r.status]?.color}`}>
                              {STATUS_CONFIG[r.status]?.icon} {STATUS_CONFIG[r.status]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {r.sentAt ? formatDateTime(r.sentAt) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {r.completedAt ? formatDateTime(r.completedAt) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(r.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {historyTotal > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing {((historyPage - 1) * 20) + 1}–{Math.min(historyPage * 20, historyTotal)} of {historyTotal}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage <= 1}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setHistoryPage(p => p + 1)}
                      disabled={historyPage * 20 >= historyTotal}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ GOOGLE REVIEW LINK MODAL ═══════════════════════════════════ */}
      <Modal open={genModal} onClose={() => { setGenModal(false); setGeneratedLink(''); }} title="Google Review Link Generator" size="md">
        <div className="space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate a direct link that takes customers straight to the Google review form for your business.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Name *</label>
            <input
              type="text"
              placeholder="Your Business Name"
              value={genForm.businessName}
              onChange={e => setGenForm(prev => ({ ...prev, businessName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Google Place ID (optional)</label>
            <input
              type="text"
              placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
              value={genForm.placeId}
              onChange={e => setGenForm(prev => ({ ...prev, placeId: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Find your Place ID at{' '}
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id-finder" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Google Place ID Finder
              </a>
            </p>
          </div>

          <button
            onClick={handleGenerateLink}
            disabled={!genForm.businessName}
            className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
          >
            <Link2 size={16} /> Generate Link
          </button>

          {generatedLink && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Generated Review Link</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg text-sm text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedLink); showToast('Link copied!', 'success'); }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
              <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-500 hover:underline">
                Open in Google <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
