import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { businessAPI } from '../lib/api';
import {
  PhoneOff, PhoneMissed, MessageSquare, Clock, Building2,
  BarChart3, Activity, Save, Loader2, CheckCircle2, XCircle,
  Zap, Bell, ChevronDown, ChevronUp, RotateCcw, Send,
  Calendar, Smartphone, MessageCircle, ArrowRight,
} from 'lucide-react';

type ResponseDelay = 'immediate' | '1min' | '5min' | '15min' | '1hour';
type ResponseChannel = 'sms' | 'whatsapp';

interface MissedCallSettingsData {
  enabled: boolean;
  messageTemplate: string;
  responseDelay: ResponseDelay;
  responseChannel: ResponseChannel;
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
}

interface MissedCallStats {
  totalMissedCalls: number;
  autoRepliesSent: number;
  responseRate: number;
}

interface ActivityLogEntry {
  id: string;
  contactName: string;
  contactPhone: string;
  timestamp: string;
  channel: ResponseChannel;
  status: 'sent' | 'failed' | 'pending';
  messagePreview: string;
}

const DELAY_OPTIONS: { value: ResponseDelay; label: string; seconds: number }[] = [
  { value: 'immediate', label: 'Immediate', seconds: 0 },
  { value: '1min', label: '1 minute', seconds: 60 },
  { value: '5min', label: '5 minutes', seconds: 300 },
  { value: '15min', label: '15 minutes', seconds: 900 },
  { value: '1hour', label: '1 hour', seconds: 3600 },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SETTINGS: MissedCallSettingsData = {
  enabled: false,
  messageTemplate:
    "Hi {{name}}, we missed your call! Sorry we couldn't answer. We'll call you back shortly. If it's urgent, feel free to call us back. - {{business_name}}",
  responseDelay: 'immediate',
  responseChannel: 'sms',
  businessHoursOnly: true,
  businessHoursStart: '09:00',
  businessHoursEnd: '18:00',
  businessDays: [1, 2, 3, 4, 5],
};

const PLACEHOLDERS = [
  { key: '{{name}}', desc: 'Contact name' },
  { key: '{{business_name}}', desc: 'Your business name' },
  { key: '{{phone}}', desc: 'Contact phone' },
  { key: '{{time}}', desc: 'Time of missed call' },
];

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function replacePlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val);
  }
  return result;
}

export default function MissedCallSettings() {
  const { business } = useAuthStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState<MissedCallSettingsData>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<MissedCallStats>({ totalMissedCalls: 0, autoRepliesSent: 0, responseRate: 0 });
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await businessAPI.getSettings();
      const data = res.data?.data || res.data;
      if (data?.missedCallSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.missedCallSettings });
      }
    } catch {
      // use defaults
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/missed-calls/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch {
      // use defaults
    }
  }, []);

  const fetchActivityLog = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/missed-calls/activity?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setActivityLog(data.data);
      }
    } catch {
      // use empty
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchStats(), fetchActivityLog()]).finally(() => setFetching(false));
  }, [fetchSettings, fetchStats, fetchActivityLog]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await businessAPI.updateSettings({ missedCallSettings: settings });
      setSaved(true);
      toast.success('Missed call text-back settings saved');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSettings((s) => ({
      ...s,
      businessDays: s.businessDays.includes(day)
        ? s.businessDays.filter((d) => d !== day)
        : [...s.businessDays, day],
    }));
  };

  const previewMessage = replacePlaceholders(settings.messageTemplate, {
    '{{name}}': 'John Doe',
    '{{business_name}}': business?.name || 'Your Business',
    '{{phone}}': '+1 555-123-4567',
    '{{time}}': new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  });

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <PhoneMissed className="text-red-500" size={32} />
          Missed Call Text-Back
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Automatically send a text message when you miss an incoming call.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <PhoneOff className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Missed</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMissedCalls.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Send className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Auto-Replies Sent</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.autoRepliesSent.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BarChart3 className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Response Rate</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.responseRate}%</p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enable Missed Call Text-Back
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                When enabled, callers who are missed will receive an automatic text reply.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              settings.enabled
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                settings.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {settings.enabled && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Active — missed calls will receive an auto-reply via{' '}
              <strong>{settings.responseChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Message Template */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MessageSquare className="text-blue-600" size={20} />
          Auto-Reply Message
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message Template
          </label>
          <textarea
            value={settings.messageTemplate}
            onChange={(e) => setSettings((s) => ({ ...s, messageTemplate: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
            placeholder="Type your auto-reply message..."
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                onClick={() => setSettings((s) => ({ ...s, messageTemplate: s.messageTemplate + p.key }))}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                title={p.desc}
              >
                {p.key}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Click placeholders to insert them. Character count: {settings.messageTemplate.length}/320
          </p>
        </div>

        {/* Live Preview */}
        <div className="mt-5">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Live Preview
          </button>
          {showPreview && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="max-w-sm mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Smartphone size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {settings.responseChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Auto-Reply
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {previewMessage}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-right">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Response Delay & Channel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Response Delay */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="text-purple-600" size={20} />
            Response Delay
          </h3>
          <div className="space-y-2">
            {DELAY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  settings.responseDelay === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="delay"
                  value={opt.value}
                  checked={settings.responseDelay === opt.value}
                  onChange={() => setSettings((s) => ({ ...s, responseDelay: opt.value }))}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Response Channel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Send className="text-emerald-600" size={20} />
            Response Channel
          </h3>
          <div className="space-y-3">
            <label
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                settings.responseChannel === 'sms'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <input
                type="radio"
                name="channel"
                value="sms"
                checked={settings.responseChannel === 'sms'}
                onChange={() => setSettings((s) => ({ ...s, responseChannel: 'sms' }))}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageCircle className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">SMS</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Standard text message</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                settings.responseChannel === 'whatsapp'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <input
                type="radio"
                name="channel"
                value="whatsapp"
                checked={settings.responseChannel === 'whatsapp'}
                onChange={() => setSettings((s) => ({ ...s, responseChannel: 'whatsapp' }))}
                className="w-4 h-4 text-green-600 focus:ring-green-500"
              />
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <MessageSquare className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">WhatsApp</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">WhatsApp message</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Business Hours Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar className="text-orange-600" size={20} />
          Business Hours Filter
        </h3>

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Only respond during business hours
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Calls outside these hours will not receive an auto-reply.
            </p>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, businessHoursOnly: !s.businessHoursOnly }))}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              settings.businessHoursOnly
                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                settings.businessHoursOnly ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.businessHoursOnly && (
          <div className="space-y-5">
            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.businessHoursStart}
                  onChange={(e) => setSettings((s) => ({ ...s, businessHoursStart: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.businessHoursEnd}
                  onChange={(e) => setSettings((s) => ({ ...s, businessHoursEnd: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Day Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Active Days
              </label>
              <div className="flex gap-2">
                {DAY_NAMES.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      settings.businessDays.includes(i)
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                        : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-cyan-600" size={20} />
            Recent Activity
            <span className="ml-2 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs rounded-full font-medium">
              {activityLog.length}
            </span>
          </h3>
          {showActivity ? (
            <ChevronUp className="text-gray-400" size={20} />
          ) : (
            <ChevronDown className="text-gray-400" size={20} />
          )}
        </button>

        {showActivity && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {activityLog.length === 0 ? (
              <div className="p-4 sm:p-6 md:p-8 text-center">
                <PhoneMissed className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No auto-replies sent yet. Activity will appear here once enabled.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[400px] overflow-y-auto">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="px-4 sm:px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.status === 'sent'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : entry.status === 'failed'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      {entry.status === 'sent' ? (
                        <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                      ) : entry.status === 'failed' ? (
                        <XCircle size={16} className="text-red-600 dark:text-red-400" />
                      ) : (
                        <RotateCcw size={16} className="text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {entry.contactName || entry.contactPhone}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          entry.channel === 'whatsapp'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {entry.channel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {entry.messagePreview}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Bar */}
      <div className="flex justify-end gap-4 pt-2">
        <button
          type="button"
          onClick={() => setSettings(DEFAULT_SETTINGS)}
          className="px-4 sm:px-5 md:px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 sm:px-5 md:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={18} />
          ) : (
            <Save size={18} />
          )}
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
