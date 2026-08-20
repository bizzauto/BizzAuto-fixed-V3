import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Link2, Plus, BarChart3, MousePointerClick, Globe, Smartphone,
  Monitor, Tablet, Copy, CheckCircle, XCircle, Trash2, Edit3,
  ToggleLeft, ToggleRight, QrCode, ExternalLink, Download,
  Loader2, Search, Filter, RefreshCw, AlertCircle, Eye,
  Tag, Zap, Clock, ChevronDown, ChevronRight, X, ArrowUpRight,
  TrendingUp, Users, Target, PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip, Legend
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { triggerLinksAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TriggerLink {
  id: string;
  name: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  tags: string[];
  isActive: boolean;
  clickCount: number;
  automationTrigger?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClickAnalytics {
  timeline: Array<{ date: string; clicks: number }>;
  devices: Array<{ name: string; value: number }>;
  browsers: Array<{ name: string; value: number }>;
  countries: Array<{ name: string; value: number }>;
  referrers: Array<{ name: string; value: number }>;
  totalClicks: number;
  uniqueVisitors: number;
  avgClicksPerDay: number;
  topCountry: string;
  topDevice: string;
  topBrowser: string;
}

interface CreateLinkForm {
  name: string;
  originalUrl: string;
  shortCode: string;
  tags: string;
  automationTrigger: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const TRIGGER_OPTIONS = [
  { value: '', label: 'No Trigger' },
  { value: 'form_submission', label: 'Form Submission' },
  { value: 'qr_scan', label: 'QR Code Scan' },
  { value: 'email_click', label: 'Email Click' },
  { value: 'sms_click', label: 'SMS Click' },
  { value: 'whatsapp_click', label: 'WhatsApp Click' },
  { value: 'ad_campaign', label: 'Ad Campaign' },
  { value: 'social_post', label: 'Social Media Post' },
  { value: 'lead_capture', label: 'Lead Capture' },
  { value: 'order_placed', label: 'Order Placed' },
];

const DEMO_LINKS: TriggerLink[] = [
  { id: '1', name: 'Summer Sale Landing', originalUrl: 'https://example.com/summer-sale-2026?utm_source=trigger&utm_medium=sms', shortCode: 'summer26', shortUrl: 'https://trig.ly/summer26', tags: ['sale', 'sms', 'summer'], isActive: true, clickCount: 3842, automationTrigger: 'sms_click', createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-05-28T14:30:00Z' },
  { id: '2', name: 'Product Demo Booking', originalUrl: 'https://example.com/book-demo?ref=trigger', shortCode: 'demo', shortUrl: 'https://trig.ly/demo', tags: ['demo', 'sales'], isActive: true, clickCount: 1256, automationTrigger: 'form_submission', createdAt: '2026-03-15T08:00:00Z', updatedAt: '2026-05-27T11:20:00Z' },
  { id: '3', name: 'Instagram Bio Link', originalUrl: 'https://example.com/linktree', shortCode: 'ig-bio', shortUrl: 'https://trig.ly/ig-bio', tags: ['instagram', 'social'], isActive: true, clickCount: 8921, automationTrigger: 'social_post', createdAt: '2026-02-20T12:00:00Z', updatedAt: '2026-05-29T09:15:00Z' },
  { id: '4', name: 'Webinar Registration', originalUrl: 'https://example.com/webinar-ai-tools?utm_source=email', shortCode: 'webinar', shortUrl: 'https://trig.ly/webinar', tags: ['webinar', 'email', 'leads'], isActive: true, clickCount: 734, automationTrigger: 'email_click', createdAt: '2026-05-01T16:00:00Z', updatedAt: '2026-05-26T18:45:00Z' },
  { id: '5', name: 'WhatsApp Promo', originalUrl: 'https://example.com/whatsapp-offer', shortCode: 'waofer', shortUrl: 'https://trig.ly/waofer', tags: ['whatsapp', 'promo'], isActive: false, clickCount: 215, automationTrigger: 'whatsapp_click', createdAt: '2026-05-10T09:00:00Z', updatedAt: '2026-05-25T13:00:00Z' },
  { id: '6', name: 'QR Code - Store Counter', originalUrl: 'https://example.com/store/feedback', shortCode: 'store-qr', shortUrl: 'https://trig.ly/store-qr', tags: ['qr', 'feedback', 'store'], isActive: true, clickCount: 4523, automationTrigger: 'qr_scan', createdAt: '2026-01-05T11:00:00Z', updatedAt: '2026-05-29T07:30:00Z' },
  { id: '7', name: 'Facebook Ad - Lead Magnet', originalUrl: 'https://example.com/free-ebook-download', shortCode: 'ebook', shortUrl: 'https://trig.ly/ebook', tags: ['facebook', 'leads', 'ebook'], isActive: true, clickCount: 612, automationTrigger: 'ad_campaign', createdAt: '2026-05-15T14:00:00Z', updatedAt: '2026-05-28T22:00:00Z' },
  { id: '8', name: 'Old Campaign Link', originalUrl: 'https://example.com/spring-sale-2025', shortCode: 'spring25', shortUrl: 'https://trig.ly/spring25', tags: ['sale', 'old'], isActive: false, clickCount: 12847, createdAt: '2025-03-01T10:00:00Z', updatedAt: '2025-12-01T00:00:00Z' },
];

const DEMO_ANALYTICS: ClickAnalytics = {
  timeline: [
    { date: 'May 23', clicks: 142 }, { date: 'May 24', clicks: 198 },
    { date: 'May 25', clicks: 167 }, { date: 'May 26', clicks: 223 },
    { date: 'May 27', clicks: 289 }, { date: 'May 28', clicks: 312 },
    { date: 'May 29', clicks: 187 },
  ],
  devices: [
    { name: 'Mobile', value: 5847 }, { name: 'Desktop', value: 3921 },
    { name: 'Tablet', value: 1230 },
  ],
  browsers: [
    { name: 'Chrome', value: 6234 }, { name: 'Safari', value: 2841 },
    { name: 'Firefox', value: 1102 }, { name: 'Edge', value: 678 },
    { name: 'Other', value: 143 },
  ],
  countries: [
    { name: 'India', value: 4523 }, { name: 'United States', value: 2341 },
    { name: 'United Kingdom', value: 1202 }, { name: 'Germany', value: 876 },
    { name: 'Canada', value: 654 }, { name: 'Other', value: 1342 },
  ],
  referrers: [
    { name: 'Direct', value: 4231 }, { name: 'WhatsApp', value: 2876 },
    { name: 'Email', value: 1943 }, { name: 'Instagram', value: 1234 },
    { name: 'Facebook', value: 876 }, { name: 'Google', value: 432 },
  ],
  totalClicks: 22142,
  uniqueVisitors: 16783,
  avgClicksPerDay: 316,
  topCountry: 'India',
  topDevice: 'Mobile',
  topBrowser: 'Chrome',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}> = ({ icon, label, value, sub, color }) => {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800',
  };
  return (
    <div className={`${map[color] || map.indigo} border rounded-xl p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <p className="text-2xl sm:text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
};

const QRCodeModal: React.FC<{
  link: TriggerLink;
  onClose: () => void;
}> = ({ link, onClose }) => {
  const handleDownload = () => {
    const svg = document.getElementById(`qr-${link.id}`)?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = `${link.shortCode}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-4 sm:p-5 md:p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode size={20} /> QR Code
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div id={`qr-${link.id}`} className="bg-white p-4 rounded-xl shadow-inner">
            <QRCodeSVG
              value={link.shortUrl}
              size={220}
              level="H"
              includeMargin
              fgColor="#1e293b"
              bgColor="#ffffff"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center break-all">{link.shortUrl}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{link.name}</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Download size={16} /> Download PNG
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(link.shortUrl); }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <Copy size={16} /> Copy URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateLinkModal: React.FC<{
  form: CreateLinkForm;
  setForm: React.Dispatch<React.SetStateAction<CreateLinkForm>>;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  editMode?: boolean;
}> = ({ form, setForm, onSubmit, onClose, saving, editMode }) => {
  const isValid = form.name.trim() && form.originalUrl.trim() && (form.originalUrl.startsWith('http://') || form.originalUrl.startsWith('https://'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {editMode ? <Edit3 size={20} /> : <Plus size={20} />}
            {editMode ? 'Edit Trigger Link' : 'Create Trigger Link'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Summer Sale Campaign"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination URL *</label>
            <input
              type="url"
              value={form.originalUrl}
              onChange={e => setForm(p => ({ ...p, originalUrl: e.target.value }))}
              placeholder="https://example.com/your-page"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Short Code</label>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-0">trig.ly/</span>
              <input
                type="text"
                value={form.shortCode}
                onChange={e => setForm(p => ({ ...p, shortCode: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') }))}
                placeholder="auto-generated"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Letters, numbers, hyphens, and underscores only. Leave blank for auto-generate.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="sale, sms, campaign (comma-separated)"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Automation Trigger</label>
            <select
              value={form.automationTrigger}
              onChange={e => setForm(p => ({ ...p, automationTrigger: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              {TRIGGER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!isValid || saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editMode ? 'Save Changes' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const TriggerLinks: React.FC = () => {
  const { isDemoMode } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<TriggerLink[]>([]);
  const [analytics, setAnalytics] = useState<ClickAnalytics>({
    timeline: [], devices: [], browsers: [], countries: [], referrers: [],
    totalClicks: 0, uniqueVisitors: 0, avgClicksPerDay: 0,
    topCountry: '', topDevice: '', topBrowser: '',
  });
  const [selectedLink, setSelectedLink] = useState<TriggerLink | null>(null);
  const [showQR, setShowQR] = useState<TriggerLink | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLink, setEditingLink] = useState<TriggerLink | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLinkForm>({
    name: '', originalUrl: '', shortCode: '', tags: '', automationTrigger: '',
  });

  const showToast = (m: string, t: 'success' | 'error' = 'success') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        setLinks(DEMO_LINKS);
        setLoading(false);
        return;
      }
      const res = await triggerLinksAPI.list();
      const data = res.data?.data;
      setLinks(Array.isArray(data) ? data : data?.links || []);
    } catch {
      setLinks(DEMO_LINKS);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load analytics when a link is selected ──
  useEffect(() => {
    if (!selectedLink || isDemoMode) return;
    triggerLinksAPI.analytics(selectedLink.id)
      .then(res => {
        const d = res.data?.data;
        if (d) setAnalytics(d);
      })
      .catch(() => {});
  }, [selectedLink, isDemoMode]);

  // ── Filtered links ──
  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      if (filterStatus === 'active' && !l.isActive) return false;
      if (filterStatus === 'inactive' && l.isActive) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.shortCode.toLowerCase().includes(q) ||
          l.originalUrl.toLowerCase().includes(q) ||
          l.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [links, searchQuery, filterStatus]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const total = links.length;
    const active = links.filter(l => l.isActive).length;
    const totalClicks = links.reduce((s, l) => s + l.clickCount, 0);
    const topLink = [...links].sort((a, b) => b.clickCount - a.clickCount)[0];
    return { total, active, inactive: total - active, totalClicks, topLink };
  }, [links]);

  // ── Actions ──
  const resetForm = () => {
    setForm({ name: '', originalUrl: '', shortCode: '', tags: '', automationTrigger: '' });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      if (!isDemoMode) {
        const payload = {
          name: form.name.trim(),
          originalUrl: form.originalUrl.trim(),
          shortCode: form.shortCode.trim() || undefined,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          automationTrigger: form.automationTrigger || undefined,
        };
        const res = await triggerLinksAPI.create(payload);
        const newLink = res.data?.data;
        if (newLink) setLinks(prev => [newLink, ...prev]);
      } else {
        const newLink: TriggerLink = {
          id: `new-${Date.now()}`,
          name: form.name.trim(),
          originalUrl: form.originalUrl.trim(),
          shortCode: form.shortCode.trim() || `lnk-${Math.random().toString(36).slice(2, 8)}`,
          shortUrl: `https://trig.ly/${form.shortCode.trim() || `lnk-${Math.random().toString(36).slice(2, 8)}`}`,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          isActive: true,
          clickCount: 0,
          automationTrigger: form.automationTrigger || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setLinks(prev => [newLink, ...prev]);
      }
      showToast('Link created successfully!');
      setShowCreateModal(false);
      resetForm();
    } catch {
      showToast('Failed to create link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingLink) return;
    setSaving(true);
    try {
      if (!isDemoMode) {
        await triggerLinksAPI.update(editingLink.id, {
          name: form.name.trim(),
          originalUrl: form.originalUrl.trim(),
          shortCode: form.shortCode.trim() || undefined,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          automationTrigger: form.automationTrigger || undefined,
        });
      }
      const updated: TriggerLink = {
        ...editingLink,
        name: form.name.trim(),
        originalUrl: form.originalUrl.trim(),
        shortCode: form.shortCode.trim() || editingLink.shortCode,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        automationTrigger: form.automationTrigger || undefined,
        updatedAt: new Date().toISOString(),
      };
      setLinks(prev => prev.map(l => l.id === editingLink.id ? updated : l));
      if (selectedLink?.id === editingLink.id) setSelectedLink(updated);
      showToast('Link updated!');
      setEditingLink(null);
      resetForm();
    } catch {
      showToast('Failed to update link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this link? This cannot be undone.')) return;
    try {
      if (!isDemoMode) await triggerLinksAPI.delete(id);
      setLinks(prev => prev.filter(l => l.id !== id));
      if (selectedLink?.id === id) setSelectedLink(null);
      showToast('Link deleted');
    } catch {
      showToast('Failed to delete link', 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      if (!isDemoMode) await triggerLinksAPI.toggle(id);
      setLinks(prev => prev.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
      if (selectedLink?.id === id) setSelectedLink(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
    } catch {
      showToast('Failed to toggle link', 'error');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copied to clipboard!');
  };

  const openEditModal = (link: TriggerLink) => {
    setForm({
      name: link.name,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      tags: link.tags.join(', '),
      automationTrigger: link.automationTrigger || '',
    });
    setEditingLink(link);
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading trigger links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-4 sm:p-6 md:p-8 animate-fade-in-up">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.t === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}{toast.m}
        </div>
      )}

      {showQR && <QRCodeModal link={showQR} onClose={() => setShowQR(null)} />}

      {(showCreateModal || editingLink) && (
        <CreateLinkModal
          form={form}
          setForm={setForm}
          onSubmit={editingLink ? handleEdit : handleCreate}
          onClose={() => { setShowCreateModal(false); setEditingLink(null); resetForm(); }}
          saving={saving}
          editMode={!!editingLink}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl md:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Link2 className="text-indigo-600" size={28} /> Trigger Links
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Track, shorten, and manage smart links with analytics</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} /> New Link
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={<Link2 size={20} />}
          label="Total Links"
          value={stats.total}
          sub={`${stats.active} active`}
          color="indigo"
        />
        <StatCard
          icon={<MousePointerClick size={20} />}
          label="Total Clicks"
          value={formatNumber(stats.totalClicks)}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Avg. Click Rate"
          value={stats.total > 0 ? formatNumber(Math.round(stats.totalClicks / stats.total)) : '0'}
          sub="per link"
          color="blue"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Active Links"
          value={stats.active}
          sub={`${stats.inactive} paused`}
          color="purple"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Link List ── */}
        <div className={`${selectedLink ? 'xl:col-span-1' : 'xl:col-span-3'}`}>
          {/* ── Filters ── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search links..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    filterStatus === f
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ── Links Table/Cards ── */}
          {filteredLinks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Link2 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No links found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'Try a different search' : 'Create your first trigger link to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => { resetForm(); setShowCreateModal(true); }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium"
                >
                  Create Link
                </button>
              )}
            </div>
          ) : selectedLink ? (
            /* ── Compact list when analytics panel is open ── */
            <div className="space-y-2">
              {filteredLinks.map(link => (
                <div
                  key={link.id}
                  onClick={() => setSelectedLink(link)}
                  className={`bg-white dark:bg-gray-800 rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md ${
                    selectedLink.id === link.id
                      ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${link.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{link.name}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">{link.shortCode}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-2">{formatNumber(link.clickCount)} clicks</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Full table view ── */
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Link</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Destination</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Clicks</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map(link => (
                      <tr
                        key={link.id}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedLink(link)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${link.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{link.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-indigo-600 dark:text-indigo-400">{link.shortUrl}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); copyToClipboard(link.shortUrl, link.id); }}
                                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                                >
                                  {copiedId === link.id ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{link.originalUrl}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {link.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(link.clickCount)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            link.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {link.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => copyToClipboard(link.shortUrl, link.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Copy URL"
                            >
                              {copiedId === link.id ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => setShowQR(link)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="QR Code"
                            >
                              <QrCode size={14} />
                            </button>
                            <button
                              onClick={() => handleToggle(link.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title={link.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {link.isActive
                                ? <ToggleRight size={14} className="text-green-500" />
                                : <ToggleLeft size={14} className="text-gray-400" />
                              }
                            </button>
                            <button
                              onClick={() => openEditModal(link)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Analytics Panel ── */}
        {selectedLink && (
          <div className="xl:col-span-2 space-y-4">
            {/* ── Analytics Header ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedLink.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedLink.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {selectedLink.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">{selectedLink.shortUrl}</span>
                    <button
                      onClick={() => copyToClipboard(selectedLink.shortUrl, `detail-${selectedLink.id}`)}
                      className="text-gray-400 hover:text-indigo-600"
                    >
                      {copiedId === `detail-${selectedLink.id}` ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">{selectedLink.originalUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQR(selectedLink)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 transition-colors"
                    title="Show QR Code"
                  >
                    <QrCode size={18} />
                  </button>
                  <a
                    href={selectedLink.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 transition-colors"
                    title="Open destination"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => setSelectedLink(null)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    title="Close panel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              {selectedLink.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedLink.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-md">
                      <Tag size={10} />{tag}
                    </span>
                  ))}
                </div>
              )}
              {selectedLink.automationTrigger && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Zap size={12} className="text-yellow-500" />
                  Trigger: {selectedLink.automationTrigger.replace(/_/g, ' ')}
                  <span className="mx-1">·</span>
                  <Clock size={12} />
                  Created {formatDate(selectedLink.createdAt)}
                </div>
              )}
            </div>

            {/* ── Analytics Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                <MousePointerClick size={18} className="mx-auto text-indigo-500 mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(analytics.totalClicks)}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Total Clicks</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                <Users size={18} className="mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(analytics.uniqueVisitors)}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Unique Visitors</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                <TrendingUp size={18} className="mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.avgClicksPerDay}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Avg. Clicks/Day</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                <Globe size={18} className="mx-auto text-purple-500 mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.topCountry}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Top Country</p>
              </div>
            </div>

            {/* ── Timeline Chart ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Click Timeline (7 Days)</h3>
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.timeline}>
                    <defs>
                      <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <ReTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fill="url(#clickGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Breakdown Charts ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Device Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-500" /> Devices
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.devices}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {analytics.devices.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip formatter={(value: number) => formatNumber(value)} />
                      <Legend
                        formatter={(value: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Browser Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-green-500" /> Browsers
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.browsers} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={55} stroke="#9ca3af" />
                      <ReTooltip formatter={(value: number) => formatNumber(value)} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {analytics.browsers.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Country Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" /> Countries
                </h3>
                <div className="space-y-2">
                  {analytics.countries.map((c, i) => {
                    const pct = analytics.totalClicks > 0 ? (c.value / analytics.totalClicks * 100) : 0;
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{c.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">{formatNumber(c.value)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Referrer Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ArrowUpRight size={16} className="text-purple-500" /> Referrers
                </h3>
                <div className="space-y-2">
                  {analytics.referrers.map((r, i) => {
                    const pct = analytics.totalClicks > 0 ? (r.value / analytics.totalClicks * 100) : 0;
                    return (
                      <div key={r.name}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{r.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">{formatNumber(r.value)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriggerLinks;
