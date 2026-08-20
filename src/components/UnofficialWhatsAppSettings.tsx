import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server, Wifi, WifiOff, QrCode, Loader2, CheckCircle, AlertCircle, RefreshCw,
  Send, Phone, Eye, EyeOff, Save, Settings, Power, Zap, Link2, Copy, TestTube2,
  ChevronDown, ChevronRight, Hash, FileText, Play, Square, Shield, AlertTriangle, HelpCircle, ExternalLink, Smartphone, Battery, Signal, Activity,
} from 'lucide-react';
import { unofficialWhatsAppAPI } from '../lib/api';
import { useToast } from './Toast';

type GatewayProvider = 'wppconnect' | 'smsgatehub' | 'venom' | 'baileys' | 'custom';

interface Config {
  enabled: boolean;
  provider: GatewayProvider;
  displayName: string;
  baseUrl: string;
  session: string;
  apiKey?: string;
  hmacSecret?: string;
  paths?: Record<string, string>;
  dailySendLimit: number;
  costPerMessage: number;
  autoReconnect: boolean;
  healthCheckIntervalSec: number;
  lastStatus?: { connected: boolean; phone?: string; battery?: number; updatedAt: string; error?: string };
}

const DEFAULT_CONFIG: Config = {
  enabled: false,
  provider: 'wppconnect',
  displayName: 'My Gateway',
  baseUrl: '',
  session: 'bizzauto',
  apiKey: '',
  hmacSecret: '',
  paths: {},
  dailySendLimit: 1000,
  costPerMessage: 0,
  autoReconnect: true,
  healthCheckIntervalSec: 60,
};

const PROVIDER_OPTIONS: Array<{ value: GatewayProvider; label: string; description: string; url: string; defaultBaseUrl: string }> = [
  { value: 'wppconnect', label: 'WPPConnect / WA-Automate', description: 'Node.js Baileys gateway (most common)', url: 'https://github.com/wppconnect-team/wppconnect-server', defaultBaseUrl: 'http://localhost:21465' },
  { value: 'smsgatehub', label: 'SMS Gate Hub', description: 'Hosted unofficial WhatsApp API', url: 'https://smsgatehub.com', defaultBaseUrl: 'https://api.smsgatehub.com' },
  { value: 'venom', label: 'Venom Bot', description: 'Self-hosted venom-bot wrapper', url: 'https://github.com/orkestral/venom', defaultBaseUrl: 'http://localhost:3333' },
  { value: 'baileys', label: 'Baileys REST', description: 'Direct Baileys over HTTP', url: 'https://github.com/WhiskeySockets/Baileys', defaultBaseUrl: 'http://localhost:3000' },
  { value: 'custom', label: 'Custom / Other', description: 'Bring your own REST gateway', url: '', defaultBaseUrl: '' },
];

const UnofficialWhatsAppSettings: React.FC = () => {
  const { toast: showToast } = useToast();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; phone?: string; battery?: number; qrCode?: string; error?: string } | null>(null);
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from BizzAuto! This is a test message from your unofficial WhatsApp gateway. 🎉');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showHmac, setShowHmac] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [providerDocs, setProviderDocs] = useState<Record<string, { label: string; description: string; docs?: string }>>({});
  const pollRef = useRef<any>(null);

  // Load config + provider list
  useEffect(() => {
    (async () => {
      try {
        const [cfgRes, provRes] = await Promise.all([
          unofficialWhatsAppAPI.getConfig(),
          unofficialWhatsAppAPI.getProviders().catch(() => ({ data: { data: {} } })),
        ]);
        const cfg = cfgRes.data?.data || DEFAULT_CONFIG;
        setConfig({ ...DEFAULT_CONFIG, ...cfg });
        setProviderDocs(provRes.data?.data || {});
      } catch (e: any) {
        showToast('Failed to load config: ' + e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Poll session status periodically when enabled
  const refreshStatus = useCallback(async () => {
    try {
      setCheckingStatus(true);
      const res = await unofficialWhatsAppAPI.getStatus();
      setStatus(res.data?.data || null);
    } catch (e: any) {
      setStatus({ connected: false, error: e.message });
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (config.enabled) {
      refreshStatus();
      pollRef.current = setInterval(refreshStatus, Math.max(15, config.healthCheckIntervalSec || 60) * 1000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [config.enabled, config.healthCheckIntervalSec, refreshStatus]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await unofficialWhatsAppAPI.saveConfig(config);
      setConfig({ ...config, ...(res.data?.data || {}) });
      showToast('Configuration saved', 'success');
      refreshStatus();
    } catch (e: any) {
      showToast('Failed to save: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    try {
      setTesting(true);
      const res = await unofficialWhatsAppAPI.test();
      const data = res.data?.data;
      if (data?.ok) {
        showToast(`Connected! Latency: ${data.latencyMs}ms`, 'success');
      } else {
        showToast(`Test failed: ${data?.error || 'Unknown'}`, 'error');
      }
    } catch (e: any) {
      showToast('Test failed: ' + e.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const connect = async () => {
    try {
      setConnecting(true);
      const res = await unofficialWhatsAppAPI.connect();
      setStatus(res.data?.data || null);
      showToast(res.data?.data?.connected ? 'Already connected' : 'Scan QR code to pair', 'success');
    } catch (e: any) {
      showToast('Connect failed: ' + e.message, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const logout = async () => {
    if (!confirm('Disconnect this session? You will need to re-scan QR to reconnect.')) return;
    try {
      const res = await unofficialWhatsAppAPI.logout();
      if (res.data?.success) {
        showToast('Disconnected', 'success');
        setStatus({ connected: false });
      } else {
        showToast('Logout failed: ' + (res.data?.data?.error || 'Unknown'), 'error');
      }
    } catch (e: any) {
      showToast('Logout failed: ' + e.message, 'error');
    }
  };

  const sendTest = async () => {
    if (!testNumber.trim()) { showToast('Enter a phone number first', 'error'); return; }
    try {
      const res = await unofficialWhatsAppAPI.send({ to: testNumber, body: testMessage });
      const r = res.data?.data;
      if (r?.success) {
        showToast('Test message sent!', 'success');
      } else {
        showToast('Send failed: ' + (r?.error || 'Unknown'), 'error');
      }
    } catch (e: any) {
      showToast('Send failed: ' + e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading unofficial WhatsApp settings…</span>
      </div>
    );
  }

  const currentProvider = PROVIDER_OPTIONS.find(p => p.value === config.provider);
  const isConnected = status?.connected;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5">
      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-2xl p-4 sm:p-5 md:p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Unofficial WhatsApp API</h1>
              <p className="text-sm text-white/80">Connect via SMS Gate Hub, WPPConnect, Venom, or any Baileys-based gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isConnected ? 'bg-emerald-500/30 text-emerald-50' : 'bg-white/20 text-white/80'
            }`}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? `Online${status?.phone ? ' · ' + status.phone : ''}` : 'Offline'}
            </span>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-emerald-500' : 'bg-white/30'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/80">
          <span className="flex items-center gap-1"><Zap size={12} /> No Meta approval needed</span>
          <span className="flex items-center gap-1"><Activity size={12} /> Use at your own risk</span>
          <span className="flex items-center gap-1"><Shield size={12} /> Encrypted credentials</span>
        </div>
      </div>

      {/* STATUS + QR PANEL */}
      <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={16} /> Session Status
            </h2>
            <button onClick={refreshStatus} disabled={checkingStatus} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh status">
              <RefreshCw size={14} className={checkingStatus ? 'animate-spin text-blue-600' : 'text-gray-500'} />
            </button>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-xs text-gray-600 dark:text-gray-400">Connection</span>
              <span className={`text-xs font-semibold flex items-center gap-1 ${isConnected ? 'text-emerald-600' : 'text-gray-500'}`}>
                {isConnected ? <><Wifi size={12} /> Connected</> : <><WifiOff size={12} /> Disconnected</>}
              </span>
            </div>
            {status?.phone && (
              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-xs text-gray-600 dark:text-gray-400">Phone</span>
                <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white">{status.phone}</span>
              </div>
            )}
            {typeof status?.battery === 'number' && (
              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-xs text-gray-600 dark:text-gray-400">Battery</span>
                <span className="text-xs font-semibold flex items-center gap-1 text-gray-900 dark:text-white">
                  <Battery size={12} /> {status.battery}%
                </span>
              </div>
            )}
            {status?.error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{status.error}</span>
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {!isConnected ? (
                <button onClick={connect} disabled={connecting || !config.baseUrl} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold">
                  {connecting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Connect
                </button>
              ) : (
                <button onClick={logout} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold">
                  <Square size={12} /> Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QR Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <QrCode size={16} /> QR Pairing
          </h2>
          {isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Session Active</h3>
              <p className="text-sm text-gray-500 mt-1">Your device is paired and ready to send messages.</p>
              {status?.phone && <p className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-300 mt-2">{status.phone}</p>}
            </div>
          ) : status?.qrCode ? (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                <img src={status.qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Scan to connect</h3>
                <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal pl-4">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Point your phone camera at this QR code</li>
                </ol>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                  <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                  <span>Keep this page open until the QR is scanned. The code refreshes every 60s.</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
              <QrCode size={48} className="text-gray-300 mb-2" />
              <p className="text-sm">QR code will appear here</p>
              <p className="text-xs mt-1">Click "Connect" to start a session</p>
            </div>
          )}
        </div>
      </div>

      {/* CONFIGURATION */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={16} /> Gateway Configuration
          </h2>
          <div className="flex gap-2">
            <button onClick={test} disabled={testing || !config.baseUrl} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg text-xs font-semibold disabled:opacity-50">
              {testing ? <Loader2 size={12} className="animate-spin" /> : <TestTube2 size={12} />}
              Test Connection
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
          </div>
        </div>

        {/* Provider picker */}
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Gateway Provider</label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {PROVIDER_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setConfig({ ...config, provider: p.value, baseUrl: config.baseUrl || p.defaultBaseUrl, paths: {} })}
                className={`p-3 text-left rounded-xl border-2 transition-all ${
                  config.provider === p.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-xs text-gray-900 dark:text-white">{p.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Core fields */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Display Name</label>
            <input type="text" value={config.displayName} onChange={(e) => setConfig({ ...config, displayName: e.target.value })} placeholder="My Gateway" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Session ID</label>
            <input type="text" value={config.session} onChange={(e) => setConfig({ ...config, session: e.target.value })} placeholder="bizzauto" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-mono" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Base URL</label>
            <input type="url" value={config.baseUrl} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} placeholder={currentProvider?.defaultBaseUrl || 'http://localhost:21465'} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-mono" />
            {currentProvider?.url && (
              <a href={currentProvider.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline mt-1 inline-flex items-center gap-0.5">
                Setup guide <ExternalLink size={9} />
              </a>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">API Key (optional)</label>
            <div className="relative">
              <input type={showApiKey ? 'text' : 'password'} value={config.apiKey || ''} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} placeholder="Bearer token if your gateway requires one" className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-mono" />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">HMAC Secret (optional)</label>
            <div className="relative">
              <input type={showHmac ? 'text' : 'password'} value={config.hmacSecret || ''} onChange={(e) => setConfig({ ...config, hmacSecret: e.target.value })} placeholder="For X-Signature HMAC-SHA256" className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-mono" />
              <button type="button" onClick={() => setShowHmac(!showHmac)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                {showHmac ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600">
          {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Advanced settings (rate limits, custom paths)
        </button>

        {showAdvanced && (
          <div className="grid sm:grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Daily Send Limit</label>
              <input type="number" value={config.dailySendLimit} onChange={(e) => setConfig({ ...config, dailySendLimit: Number(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Cost per message (INR)</label>
              <input type="number" step="0.01" value={config.costPerMessage} onChange={(e) => setConfig({ ...config, costPerMessage: Number(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Health Check Interval (sec)</label>
              <input type="number" value={config.healthCheckIntervalSec} onChange={(e) => setConfig({ ...config, healthCheckIntervalSec: Number(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={config.autoReconnect} onChange={(e) => setConfig({ ...config, autoReconnect: e.target.checked })} className="w-4 h-4 rounded" />
                Auto-reconnect on disconnect
              </label>
            </div>
            {config.provider === 'custom' && (
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Custom Endpoint Paths (use {'{session}'} and {'{phone}'} placeholders)</label>
                {['sendText', 'sendImage', 'sendVideo', 'sendDocument', 'status', 'qrcode', 'connect', 'logout', 'checkNumber'].map((k) => (
                  <input key={k} type="text" placeholder={`${k} (e.g. /api/{session}/${k})`} value={config.paths?.[k] || ''} onChange={(e) => setConfig({ ...config, paths: { ...(config.paths || {}), [k]: e.target.value } })} className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded font-mono" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEND TEST MESSAGE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Send size={16} /> Send Test Message
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Phone (E.164 with country code)</label>
            <input type="tel" value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="+917972888023" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-mono" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Message</label>
            <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={sendTest} disabled={!isConnected} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            <Send size={14} /> Send Test
          </button>
          <span className="text-xs text-gray-500">Only works when session is connected.</span>
        </div>
      </div>

      {/* USAGE TIPS */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5">
        <h2 className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
          <HelpCircle size={16} /> Setup Tips
        </h2>
        <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1.5 list-disc pl-5">
          <li><strong>SMS Gate Hub:</strong> Sign up at smsgatehub.com, get an API key, then enter their base URL and bearer token.</li>
          <li><strong>Self-hosted WPPConnect:</strong> Run <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">npm i wppconnect-server</code>, start it, then point Base URL to your server (default port 21465).</li>
          <li><strong>Self-hosted Venom:</strong> Use any venom REST wrapper, default port 3333.</li>
          <li>Keep your phone connected to the internet — the session disconnects if the phone is offline for 14 days.</li>
          <li>This provider violates Meta's ToS. Use a secondary number, not your personal one.</li>
        </ul>
      </div>
    </div>
  );
};

export default UnofficialWhatsAppSettings;
