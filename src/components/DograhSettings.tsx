import React, { useState, useEffect } from 'react';
import {
  Bot, Settings, CheckCircle, XCircle, Loader2, Save, RefreshCw,
  Phone, Globe, Key, Link, AlertTriangle, Signal
} from 'lucide-react';
import { voiceCallsAPI } from '../lib/api';
import WalletWidget from './WalletWidget';

interface DograhSettingsData {
  dograhApiKey: string;
  dograhApiUrl: string;
  dograhEnabled: boolean;
  dograhWebhookSecret: string;
  dograhDefaultAgentId: number | null;
  telephonyProvider: string;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  apiUrl?: string;
}

interface Agent {
  id: number;
  name: string;
  status?: string;
}

const PROVIDER_INFO: Record<string, { name: string; rate: string; color: string; description: string }> = {
  twilio: { name: 'Twilio', rate: '~₹1.00-1.50/min', color: 'red', description: 'Industry leader, global reach, reliable' },
  plivo: { name: 'Plivo', rate: '~₹0.50-1.00/min', color: 'green', description: '50% cheaper than Twilio, great quality' },
  browser_only: { name: 'Browser Only', rate: 'FREE', color: 'blue', description: 'No phone number needed, WebRTC calls' },
};

const DograhSettings: React.FC = () => {
  const [settings, setSettings] = useState<DograhSettingsData>({
    dograhApiKey: '',
    dograhApiUrl: 'http://localhost:8000',
    dograhEnabled: false,
    dograhWebhookSecret: '',
    dograhDefaultAgentId: null,
    telephonyProvider: 'twilio',
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, statusRes] = await Promise.allSettled([
        voiceCallsAPI.getSettings(),
        voiceCallsAPI.checkConnection(),
      ]);

      if (settingsRes.status === 'fulfilled') {
        const data = settingsRes.value.data?.data || settingsRes.value.data;
        if (data) {
          setSettings({
            dograhApiKey: data.dograhApiKey || '',
            dograhApiUrl: data.dograhApiUrl || 'http://localhost:8000',
            dograhEnabled: data.dograhEnabled || false,
            dograhWebhookSecret: data.dograhWebhookSecret || '',
            dograhDefaultAgentId: data.dograhDefaultAgentId || null,
            telephonyProvider: data.telephonyProvider || 'twilio',
          });
        }
      }

      if (statusRes.status === 'fulfilled') {
        setConnectionStatus(statusRes.value.data?.data || statusRes.value.data);
      }

      // Load agents if connected
      if (statusRes.status === 'fulfilled' && statusRes.value.data?.data?.connected) {
        const agentsRes = await voiceCallsAPI.getAgents();
        setAgents(agentsRes.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await voiceCallsAPI.updateSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckConnection = async () => {
    setChecking(true);
    try {
      const res = await voiceCallsAPI.checkConnection();
      setConnectionStatus(res.data?.data || res.data);
      if (res.data?.data?.connected) {
        const agentsRes = await voiceCallsAPI.getAgents();
        setAgents(agentsRes.data?.data || []);
      }
    } catch {
      setConnectionStatus({ connected: false, message: 'Connection check failed' });
    } finally {
      setChecking(false);
    }
  };

  const generateWebhookSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    setSettings(s => ({ ...s, dograhWebhookSecret: secret }));
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
          <Bot size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Voice AI Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure Dograh voice AI integration</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Connection Status */}
      <div className={`p-4 rounded-2xl flex items-center justify-between ${
        connectionStatus?.connected
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center gap-3">
          {connectionStatus?.connected ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : (
            <AlertTriangle size={20} className="text-yellow-500" />
          )}
          <div>
            <p className={`font-medium ${
              connectionStatus?.connected ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {connectionStatus?.connected ? 'Connected to Dograh' : 'Not Connected'}
            </p>
            <p className="text-sm text-gray-500">{connectionStatus?.message || 'Configure your Dograh instance below'}</p>
          </div>
        </div>
        <button
          onClick={handleCheckConnection}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Check
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Configuration Card - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dograh Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dograh Configuration</h2>
            </div>

            <div className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Voice AI</p>
                  <p className="text-sm text-gray-500">Turn on voice call features</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, dograhEnabled: !s.dograhEnabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.dograhEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    settings.dograhEnabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              {/* Telephony Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Signal size={14} className="inline mr-1" /> Telephony Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setSettings(s => ({ ...s, telephonyProvider: key }))}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        settings.telephonyProvider === key
                          ? key === 'twilio' ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : key === 'plivo' ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${
                        settings.telephonyProvider === key
                          ? key === 'twilio' ? 'text-red-700 dark:text-red-400'
                            : key === 'plivo' ? 'text-green-700 dark:text-green-400'
                            : 'text-blue-700 dark:text-blue-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>{info.name}</p>
                      <p className={`text-xs mt-1 ${
                        settings.telephonyProvider === key
                          ? key === 'twilio' ? 'text-red-600 dark:text-red-300'
                            : key === 'plivo' ? 'text-green-600 dark:text-green-300'
                            : 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-500'
                      }`}>{info.rate}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{info.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* API URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Link size={14} className="inline mr-1" /> Dograh API URL
                </label>
                <input
                  type="text"
                  value={settings.dograhApiUrl}
                  onChange={e => setSettings(s => ({ ...s, dograhApiUrl: e.target.value }))}
                  placeholder="https://voice-api.yourdomain.com"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Key size={14} className="inline mr-1" /> API Key
                </label>
                <input
                  type="password"
                  value={settings.dograhApiKey}
                  onChange={e => setSettings(s => ({ ...s, dograhApiKey: e.target.value }))}
                  placeholder="dg_xxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Webhook Secret
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.dograhWebhookSecret}
                    onChange={e => setSettings(s => ({ ...s, dograhWebhookSecret: e.target.value }))}
                    placeholder="Random secret for webhook verification"
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-sm"
                  />
                  <button
                    onClick={generateWebhookSecret}
                    className="px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Default Agent */}
              {agents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Agent (for inbound calls)
                  </label>
                  <select
                    value={settings.dograhDefaultAgentId || ''}
                    onChange={e => setSettings(s => ({
                      ...s,
                      dograhDefaultAgentId: e.target.value ? Number(e.target.value) : null,
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Select an agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Settings
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Webhook URL</h3>
            <p className="text-sm text-gray-500 mb-3">Configure this URL in your Dograh agent's webhook node:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                {window.location.origin}/api/dograh/webhook/YOUR_BUSINESS_ID
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/dograh/webhook/`)}
                className="px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Wallet */}
        <div className="space-y-6">
          <WalletWidget />
        </div>
      </div>
    </div>
  );
};

export default DograhSettings;
