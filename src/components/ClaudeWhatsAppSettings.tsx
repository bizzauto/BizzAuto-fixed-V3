import React, { useEffect, useState } from 'react';
import {
  Brain, Save, Loader2, Send, Check, X, Sparkles, TrendingDown, Zap,
  Phone, MessageSquare, ChevronDown, ChevronUp, Settings as SettingsIcon,
  DollarSign, Activity, AlertCircle, TestTube2, ArrowUpDown, Globe,
} from 'lucide-react';
import { claudeWhatsAppAPI } from '../lib/api';
import { useToast } from './Toast';

interface ChannelInfo {
  channel: string;
  name: string;
  description: string;
  icon: string;
  costRange: string;
  available: boolean;
  reason?: string;
}

interface Config {
  enabled: boolean;
  channelPriority: string[];
  aiOptimize: boolean;
  aiTone: 'professional' | 'friendly' | 'casual' | 'urgent' | 'persuasive';
  aiMaxLength: number;
  aiLanguage: string;
  autoFallback: boolean;
  maxCostPerMessage: number;
  businessHoursOnly: boolean;
  businessHours: { start: string; end: string; timezone: string };
  dailySendLimit: number;
  credentials: Record<string, any>;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', emoji: '👔' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'casual', label: 'Casual', emoji: '✌️' },
  { value: 'urgent', label: 'Urgent', emoji: '⚡' },
  { value: 'persuasive', label: 'Persuasive', emoji: '🎯' },
];

const LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

const ClaudeWhatsAppSettings: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('+91');
  const [costStats, setCostStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [optimizeBody, setOptimizeBody] = useState(
    'Hi! I wanted to let you know about our new product launch happening this weekend. We have some amazing early-bird discounts lined up just for our most valued customers like you. Let me know if you would like to hear more!'
  );
  const [optimizeChannel, setOptimizeChannel] = useState('whatsapp_meta');
  const [optimizeResult, setOptimizeResult] = useState<{ text: string; saved: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, statusRes] = await Promise.all([
        claudeWhatsAppAPI.getConfig(),
        claudeWhatsAppAPI.getStatus(),
      ]);
      if (cfgRes.data.success) {
        setConfig(cfgRes.data.data);
      }
      if (statusRes.data.success) {
        setChannels(statusRes.data.data.channels || []);
      }
      // Load cost stats
      loadCostStats();
    } catch (err: any) {
      toastError('Failed to load Claude WhatsApp settings: ' + (err.message || 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  const loadCostStats = async () => {
    setStatsLoading(true);
    try {
      const res = await claudeWhatsAppAPI.getCostStats();
      if (res.data.success) setCostStats(res.data.data);
    } catch {
      // Silent fail - cost stats is optional
    } finally {
      setStatsLoading(false);
    }
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await claudeWhatsAppAPI.saveConfig(config);
      if (res.data.success) {
        success('Claude WhatsApp settings saved! 🎉');
      } else {
        toastError('Save failed: ' + (res.data.error || 'unknown'));
      }
    } catch (err: any) {
      toastError('Save failed: ' + (err.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  const testChannel = async (channel: string) => {
    if (!testPhone || testPhone.length < 10) {
      toastError('Please enter a valid phone number (with country code)');
      return;
    }
    setTestingChannel(channel);
    try {
      const res = await claudeWhatsAppAPI.testChannel(channel, testPhone);
      if (res.data.success && res.data.data.success) {
        success(`Test message sent via ${channel}! ✅ Cost: ₹${res.data.data.cost?.toFixed(2) || '0'}`);
      } else {
        toastError(`Test failed: ${res.data.data?.error || res.data.error || 'unknown'}`);
      }
    } catch (err: any) {
      toastError('Test failed: ' + (err.message || 'unknown'));
    } finally {
      setTestingChannel(null);
    }
  };

  const optimizePreview = async () => {
    if (!optimizeBody) return;
    setOptimizing(true);
    try {
      const res = await claudeWhatsAppAPI.optimize(optimizeBody, optimizeChannel);
      if (res.data.success) setOptimizeResult(res.data.data);
    } catch (err: any) {
      toastError('Optimize failed: ' + (err.message || 'unknown'));
    } finally {
      setOptimizing(false);
    }
  };

  const moveChannel = (channel: string, direction: 'up' | 'down') => {
    if (!config) return;
    const idx = config.channelPriority.indexOf(channel);
    if (idx < 0) return;
    const newList = [...config.channelPriority];
    if (direction === 'up' && idx > 0) {
      [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
    } else if (direction === 'down' && idx < newList.length - 1) {
      [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
    }
    setConfig({ ...config, channelPriority: newList });
  };

  const updateCredential = (channel: string, key: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      credentials: {
        ...config.credentials,
        [channel]: { ...(config.credentials?.[channel] || {}), [key]: value },
      },
    });
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-5 sm:p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Claude WhatsApp Provider</h1>
              <p className="text-emerald-100 text-xs sm:text-sm">AI-powered smart messaging • Auto WhatsApp → SMS fallback • Save up to 65% on messaging costs</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2.5 transition-colors">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded text-emerald-600 focus:ring-2 focus:ring-white"
              />
              <span className="text-sm sm:text-base font-medium">
                {config.enabled ? '✅ Claude Provider ACTIVE' : '⚪ Claude Provider DISABLED'}
              </span>
            </label>
            <span className="text-xs sm:text-sm text-emerald-100">
              {config.enabled
                ? 'All outbound messages route through Claude smart router'
                : 'Enable to start saving on messaging costs (uses default WhatsApp when off)'}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Stats */}
      {costStats && costStats.totalSent > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-500 mb-1.5">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium">Messages Sent</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{costStats.totalSent.toLocaleString('en-IN')}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Last 30 days</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-500 mb-1.5">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Spend</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{costStats.totalCost.toLocaleString('en-IN')}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Across all channels</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-500 mb-1.5">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">You Saved</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">₹{costStats.savedCost.toLocaleString('en-IN')}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">vs. always-Meta baseline</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-orange-500 mb-1.5">
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-xs font-medium">Fallbacks</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{costStats.fallbackCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Auto-routed to SMS</p>
          </div>
        </div>
      )}

      {/* Channel Priority */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Channel Priority</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">Smart router tries channels in this order. First available & cheapest is used. Auto-fallback to SMS if WhatsApp fails.</p>

        <div className="space-y-2">
          {config.channelPriority.map((channel, idx) => {
            const info = channels.find((c) => c.channel === channel);
            const isExpanded = expandedChannel === channel;
            return (
              <div key={channel} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex flex-col">
                    <button onClick={() => moveChannel(channel, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveChannel(channel, 'down')} disabled={idx === config.channelPriority.length - 1} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-400 w-5 sm:w-6 text-center">#{idx + 1}</span>
                  <span className="text-lg sm:text-xl">{info?.icon || '📡'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{info?.name || channel}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{info?.costRange || ''}</p>
                  </div>
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                    info?.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {info?.available ? <><Check className="w-3 h-3" /> Ready</> : <><X className="w-3 h-3" /> Setup needed</>}
                  </span>
                  <button
                    onClick={() => setExpandedChannel(isExpanded ? null : channel)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                  >
                    <SettingsIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 space-y-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{info?.description}</p>

                    {/* Credentials */}
                    {channel.startsWith('sms_') && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">API Key</label>
                        <input
                          type="password"
                          placeholder="Your API key (encrypted at rest)"
                          value={config.credentials?.[channel]?.apiKey || ''}
                          onChange={(e) => updateCredential(channel, 'apiKey', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Sender ID (DLT registered for India)</label>
                        <input
                          type="text"
                          placeholder="BIZZAU"
                          value={config.credentials?.[channel]?.senderId || ''}
                          onChange={(e) => updateCredential(channel, 'senderId', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                    {channel === 'sms_twilio' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Account SID</label>
                        <input
                          type="text"
                          placeholder="ACxxxxxx..."
                          value={config.credentials?.[channel]?.accountSid || ''}
                          onChange={(e) => updateCredential(channel, 'accountSid', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Auth Token</label>
                        <input
                          type="password"
                          placeholder="Your Twilio auth token"
                          value={config.credentials?.[channel]?.authToken || ''}
                          onChange={(e) => updateCredential(channel, 'authToken', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Twilio Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+1234567890"
                          value={config.credentials?.[channel]?.phoneNumber || ''}
                          onChange={(e) => updateCredential(channel, 'phoneNumber', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {!info?.available && (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">{info?.reason}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => testChannel(channel)}
                        disabled={testingChannel === channel || !info?.available}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {testingChannel === channel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                        Test
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">AI Optimization</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">Claude AI rewrites your messages for the target channel, adjusts tone, and fits character limits.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tone</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setConfig({ ...config, aiTone: t.value as any })}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    config.aiTone === t.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-base">{t.emoji}</span>
                  <span className="text-[10px] sm:text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Language</label>
            <select
              value={config.aiLanguage}
              onChange={(e) => setConfig({ ...config, aiLanguage: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max length (chars)</label>
            <input
              type="number"
              min="50"
              max="5000"
              value={config.aiMaxLength}
              onChange={(e) => setConfig({ ...config, aiMaxLength: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700 w-full">
              <input
                type="checkbox"
                checked={config.aiOptimize}
                onChange={(e) => setConfig({ ...config, aiOptimize: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Enable AI optimization</span>
            </label>
          </div>
        </div>

        {/* AI Preview */}
        {config.aiOptimize && (
          <div className="mt-4 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300">🧪 Test AI optimization</h3>
              <button
                onClick={optimizePreview}
                disabled={optimizing}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Optimize
              </button>
            </div>
            <textarea
              value={optimizeBody}
              onChange={(e) => setOptimizeBody(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg mb-2"
            />
            <select
              value={optimizeChannel}
              onChange={(e) => setOptimizeChannel(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg mb-2"
            >
              {channels.map((c) => <option key={c.channel} value={c.channel}>{c.icon} {c.name}</option>)}
            </select>
            {optimizeResult && (
              <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium">✨ Optimized ({optimizeResult.saved} chars saved)</p>
                <p className="text-sm text-gray-900 dark:text-white">{optimizeResult.text}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fallback & Cost Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Smart Fallback & Cost Control</h2>
        </div>

        <div className="space-y-3 mt-4">
          <label className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Auto-fallback WhatsApp → SMS</p>
              <p className="text-xs text-gray-500">If WhatsApp delivery fails, automatically send via SMS</p>
            </div>
            <input
              type="checkbox"
              checked={config.autoFallback}
              onChange={(e) => setConfig({ ...config, autoFallback: e.target.checked })}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-2 focus:ring-emerald-500 flex-shrink-0"
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Business hours only</p>
              <p className="text-xs text-gray-500">Queue messages outside business hours</p>
            </div>
            <input
              type="checkbox"
              checked={config.businessHoursOnly}
              onChange={(e) => setConfig({ ...config, businessHoursOnly: e.target.checked })}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-2 focus:ring-emerald-500 flex-shrink-0"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max cost per message (₹)</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={config.maxCostPerMessage}
                onChange={(e) => setConfig({ ...config, maxCostPerMessage: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Daily send limit</label>
              <input
                type="number"
                min="100"
                value={config.dailySendLimit}
                onChange={(e) => setConfig({ ...config, dailySendLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 p-3 sm:p-4 -mx-4 sm:-mx-5 md:-mx-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default ClaudeWhatsAppSettings;
