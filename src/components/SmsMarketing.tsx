import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Send, Loader2, Trash2, Search, Filter, Calendar, Users,
  MessageSquare, DollarSign, TrendingUp, TrendingDown, CheckCircle2,
  XCircle, Clock, AlertCircle, Phone, BarChart3, Zap, Sparkles,
  ChevronRight, X, ArrowLeft, Eye, FileText, Hash,
} from 'lucide-react';
import { smsMarketingAPI } from '../lib/api';
import { useToast } from './Toast';

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'failed';
  recipientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  senderId?: string;
}

interface SMSMessage {
  id: string;
  phone: string;
  body: string;
  status: string;
  cost?: number;
  sentAt?: string;
  deliveredAt?: string;
}

interface Stats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalCost: number;
  activeCampaigns: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  delivered: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  queued: 'bg-gray-100 text-gray-700',
};

const SmsMarketing: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { success, error: toastError, info } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create form state
  const [form, setForm] = useState({
    name: '',
    message: '',
    senderId: 'BIZZAU',
    recipients: '',
    scheduledAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, msgRes, statsRes] = await Promise.allSettled([
        smsMarketingAPI.listCampaigns(),
        smsMarketingAPI.listMessages({ limit: 50 }),
        smsMarketingAPI.getStats(),
      ]);
      if (campRes.status === 'fulfilled') {
        const data = campRes.value.data?.data?.campaigns || campRes.value.data?.data || [];
        setCampaigns(Array.isArray(data) ? data : []);
      }
      if (msgRes.status === 'fulfilled') {
        const data = msgRes.value.data?.data?.messages || msgRes.value.data?.data || [];
        setMessages(Array.isArray(data) ? data.slice(0, 50) : []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || null);
      }
    } catch (err: any) {
      // Silent fail on demo / no backend
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!form.name || !form.message) {
      toastError('Name and message are required');
      return;
    }
    if (form.message.length > 1600) {
      toastError('Message too long (max 1600 chars = 10 SMS segments)');
      return;
    }
    setSaving(true);
    try {
      const recipientList = form.recipients
        .split(/[\n,;]/)
        .map(s => s.trim())
        .filter(Boolean);
      const payload = {
        name: form.name,
        message: form.message,
        senderId: form.senderId,
        recipientPhones: recipientList,
        scheduledAt: form.scheduledAt || undefined,
      };
      const res = await smsMarketingAPI.createCampaign(payload);
      if (res.data?.success) {
        success('Campaign created! 🎉');
        setView('list');
        setForm({ name: '', message: '', senderId: 'BIZZAU', recipients: '', scheduledAt: '' });
        loadData();
      } else {
        toastError('Create failed: ' + (res.data?.error || 'unknown'));
      }
    } catch (err: any) {
      toastError('Create failed: ' + (err.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Send this campaign now? This cannot be undone.')) return;
    setSending(true);
    try {
      const res = await smsMarketingAPI.sendCampaign(id);
      if (res.data?.success) {
        success('Campaign sent! ✅');
        loadData();
      } else {
        toastError('Send failed: ' + (res.data?.error || 'unknown'));
      }
    } catch (err: any) {
      toastError('Send failed: ' + (err.message || 'unknown'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await smsMarketingAPI.deleteCampaign(id);
      success('Campaign deleted');
      loadData();
    } catch (err: any) {
      toastError('Delete failed: ' + (err.message || 'unknown'));
    }
  };

  const viewDetail = async (campaign: Campaign) => {
    setSelected(campaign);
    setView('detail');
    try {
      const res = await smsMarketingAPI.getCampaign(campaign.id);
      if (res.data?.success) {
        setSelected(res.data.data);
      }
    } catch {/* keep basic data */}
  };

  if (loading && view === 'list') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl p-5 sm:p-6 md:p-8 text-white relative overflow-hidden mb-5 sm:mb-6">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm">
                <ArrowLeft size={18} />
              </button>
            )}
            {onBack && view === 'list' && (
              <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">SMS Marketing</h1>
              <p className="text-orange-100 text-xs sm:text-sm">Send bulk SMS • DLT-compliant • 100% delivery • 98% open rate</p>
            </div>
          </div>
          {view === 'list' && (
            <button
              onClick={() => setView('create')}
              className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-white text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-colors shadow-lg"
            >
              <Plus size={16} />
              New Campaign
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {view === 'list' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-500 mb-1.5">
              <Send className="w-4 h-4" />
              <span className="text-xs font-medium">Total Sent</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{(stats.totalSent || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-500 mb-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Delivered</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{(stats.totalDelivered || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-500 mb-1.5">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Failed</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{(stats.totalFailed || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-500 mb-1.5">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Spend</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">₹{(stats.totalCost || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-orange-500 mb-1.5">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Active</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.activeCampaigns || 0}</p>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Campaign list */}
          {filteredCampaigns.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-12 text-center border border-gray-200 dark:border-gray-700">
              <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">No campaigns yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first SMS campaign to get started</p>
              <button
                onClick={() => setView('create')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600"
              >
                <Plus size={16} />
                Create Campaign
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recipients</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Delivered</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => viewDetail(c)}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                        <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>{c.status}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.recipientCount || '—'}</td>
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{c.deliveredCount || 0}/{c.sentCount || 0}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {(c.status === 'draft' || c.status === 'scheduled') && (
                              <button onClick={() => handleSend(c.id)} disabled={sending} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Send">
                                <Send size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredCampaigns.map(c => (
                  <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700" onClick={() => viewDetail(c)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 min-w-0 truncate">{c.name}</h3>
                      <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{c.message}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span><Users size={11} className="inline" /> {c.recipientCount || 0}</span>
                      <span><CheckCircle2 size={11} className="inline text-green-500" /> {c.deliveredCount || 0}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* CREATE VIEW */}
      {view === 'create' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">New SMS Campaign</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Campaign name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Diwali Sale Announcement"
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Message <span className="text-xs text-gray-500 font-normal">({form.message.length} / 160 chars = 1 SMS segment)</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
                maxLength={1600}
                placeholder="Type your SMS message here..."
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${form.message.length > 160 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (form.message.length / 160) * 100)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Sender ID (DLT registered)</label>
                <input
                  type="text"
                  value={form.senderId}
                  onChange={(e) => setForm({ ...form, senderId: e.target.value })}
                  maxLength={6}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Recipients (one per line, or comma-separated)</label>
              <textarea
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                rows={4}
                placeholder="+91 98765 43210&#10;+91 87654 32109&#10;..."
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">{form.recipients.split(/[\n,;]/).filter(s => s.trim()).length} recipients</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setView('list')} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selected && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{selected.name}</h2>
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
            </div>
            <div className="flex items-center gap-1">
              {(selected.status === 'draft' || selected.status === 'scheduled') && (
                <button onClick={() => handleSend(selected.id)} disabled={sending} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600">
                  <Send size={12} />
                  Send Now
                </button>
              )}
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
            <p className="text-xs text-gray-500 mb-1 font-medium">Message</p>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selected.message}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Recipients</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selected.recipientCount || 0}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">Delivered</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{selected.deliveredCount || 0}</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Sent</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{selected.sentCount || 0}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">Failed</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{selected.failedCount || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsMarketing;
