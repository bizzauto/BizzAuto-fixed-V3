import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Play, Pause, Trash2, Edit3, Clock,
  MessageSquare, Settings, Bot,
  CheckCircle, XCircle, ArrowRight, RefreshCw, Loader2
} from 'lucide-react';
import { automationAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

const templates = [
  { id: 't1', name: 'WhatsApp Auto-Reply', description: 'Instantly reply to WhatsApp messages with AI-generated responses', icon: '💬', category: 'Messaging', triggerType: 'whatsapp_message' },
  { id: 't2', name: 'Lead Auto-Capture', description: 'Capture leads from IndiaMART, JustDial, Facebook & auto-reply', icon: '👤', category: 'Leads', triggerType: 'new_lead' },
  { id: 't3', name: 'Review Responder', description: 'AI-powered auto-replies to Google reviews', icon: '⭐', category: 'Reviews', triggerType: 'new_review' },
  { id: 't4', name: 'Drip Campaign', description: 'Multi-step follow-up sequence via WhatsApp & Email', icon: '📧', category: 'Marketing', triggerType: 'contact_stage_change' },
  { id: 't5', name: 'Appointment Reminder', description: 'Send WhatsApp reminders before appointments', icon: '📅', category: 'Scheduling', triggerType: 'appointment_scheduled' },
  { id: 't6', name: 'Order Status Update', description: 'Auto-notify customers about order status changes', icon: '📦', category: 'E-Commerce', triggerType: 'order_status_change' },
  { id: 't7', name: 'Payment Reminder', description: 'Send payment reminders via WhatsApp', icon: '💳', category: 'Billing', triggerType: 'payment_due' },
  { id: 't8', name: 'Feedback Collection', description: 'Auto-send feedback forms after service', icon: '📝', category: 'Feedback', triggerType: 'appointment_completed' },
];

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerValue?: string;
  isActive: boolean;
  flowData?: any;
  nodes?: any[];
  edges?: any[];
  createdAt: string;
  updatedAt: string;
}

interface AutomationSettings {
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  businessHours: { enabled: boolean; start: string; end: string };
  aiReplyEnabled: boolean;
  aiProvider: string;
  maxReplyLength: number;
}

const defaultSettings: AutomationSettings = {
  autoReplyEnabled: false,
  autoReplyMessage: 'Thank you for contacting us! We\'ll get back to you shortly. 😊',
  businessHours: { enabled: false, start: '09:00', end: '18:00' },
  aiReplyEnabled: false,
  aiProvider: 'openrouter',
  maxReplyLength: 200,
};

const AutomationPage: React.FC = () => {
  const { isDemoMode } = useAuthStore();
  const [activeView, setActiveView] = useState<'automations' | 'templates' | 'settings'>('automations');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [n8nStatus, setN8nStatus] = useState<{ connected: boolean; url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Demo mode data
  const demoAutomations: AutomationRule[] = [
    {
      id: '1',
      name: 'WhatsApp Auto-Reply',
      description: 'Instantly reply to WhatsApp messages with AI-generated responses',
      triggerType: 'whatsapp_message',
      isActive: true,
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
    },
    {
      id: '2',
      name: 'Lead Auto-Capture',
      description: 'Capture leads from IndiaMART, JustDial, Facebook & auto-reply',
      triggerType: 'new_lead',
      isActive: true,
      createdAt: '2024-01-08T09:00:00Z',
      updatedAt: '2024-01-12T11:00:00Z',
    },
    {
      id: '3',
      name: 'Review Responder',
      description: 'AI-powered auto-replies to Google reviews',
      triggerType: 'new_review',
      isActive: false,
      createdAt: '2024-01-05T16:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z',
    },
  ];

  const demoSettings: AutomationSettings = {
    autoReplyEnabled: true,
    autoReplyMessage: 'Thank you for contacting us! We\'ll get back to you shortly. 😊',
    businessHours: { enabled: true, start: '09:00', end: '18:00' },
    aiReplyEnabled: true,
    aiProvider: 'openrouter',
    maxReplyLength: 200,
  };

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    // If in demo mode, use mock data
    if (isDemoMode) {
      setAutomations(demoAutomations);
      setSettings(demoSettings);
      setN8nStatus({ connected: false });
      setLoading(false);
      return;
    }

    try {
      const [rulesRes, settingsRes, n8nRes] = await Promise.allSettled([
        automationAPI.listRules(),
        automationAPI.getSettings(),
        automationAPI.getN8nStatus(),
      ]);

      if (rulesRes.status === 'fulfilled') {
        const rules = rulesRes.value.data?.data || [];
        setAutomations(Array.isArray(rules) ? rules : []);
      }

      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data?.data;
        if (s) {
          setSettings({
            autoReplyEnabled: s.autoReplyEnabled ?? defaultSettings.autoReplyEnabled,
            autoReplyMessage: s.autoReplyMessage ?? defaultSettings.autoReplyMessage,
            businessHours: s.businessHours ?? defaultSettings.businessHours,
            aiReplyEnabled: s.aiReplyEnabled ?? defaultSettings.aiReplyEnabled,
            aiProvider: s.aiProvider ?? defaultSettings.aiProvider,
            maxReplyLength: s.maxReplyLength ?? defaultSettings.maxReplyLength,
          });
        }
      }

      if (n8nRes.status === 'fulfilled') {
        const n = n8nRes.value.data?.data;
        setN8nStatus(n ? { connected: n.connected ?? false, url: n.url } : { connected: false });
      } else {
        setN8nStatus({ connected: false });
      }
    } catch (err) {
      console.error('Failed to load automation data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAutomation = async (id: string) => {
    const auto = automations.find(a => a.id === id);
    if (!auto) return;
    const newStatus = !auto.isActive;
    // Optimistic update
    setAutomations(automations.map(a => a.id === id ? { ...a, isActive: newStatus } : a));
    try {
      await automationAPI.toggleRule(id, newStatus);
      showToast(`${auto.name} ${newStatus ? 'activated' : 'paused'}`);
    } catch {
      // Revert on error
      setAutomations(automations.map(a => a.id === id ? { ...a, isActive: !newStatus } : a));
      showToast('Failed to toggle automation', 'error');
    }
  };

  const deleteAutomation = async (id: string) => {
    const auto = automations.find(a => a.id === id);
    if (!auto || !confirm(`Delete "${auto.name}"? This cannot be undone.`)) return;
    try {
      await automationAPI.deleteRule(id);
      setAutomations(automations.filter(a => a.id !== id));
      showToast('Automation deleted');
    } catch {
      showToast('Failed to delete automation', 'error');
    }
  };

  const useTemplate = async (template: typeof templates[0]) => {
    try {
      const res = await automationAPI.createRule({
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        triggerValue: '',
        flowData: {},
        nodes: [],
        edges: [],
      });
      const newRule = res.data?.data;
      if (newRule) {
        setAutomations(prev => [newRule, ...prev]);
      }
      setShowTemplateModal(false);
      showToast(`${template.name} created! Configure the trigger to activate.`);
      setActiveView('automations');
    } catch {
      showToast('Failed to create automation', 'error');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await automationAPI.updateSettings(settings);
      showToast('Automation settings saved!');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    const map: Record<string, string> = {
      whatsapp_message: 'New WhatsApp message',
      new_lead: 'New lead captured',
      new_review: 'New Google review',
      contact_stage_change: 'Contact stage changed',
      appointment_scheduled: 'Appointment scheduled',
      order_status_change: 'Order status changed',
      payment_due: 'Payment due',
      appointment_completed: 'Appointment completed',
    };
    return map[triggerType] || triggerType;
  };

  const getCategoryIcon = (triggerType: string) => {
    const map: Record<string, string> = {
      whatsapp_message: '💬',
      new_lead: '👤',
      new_review: '⭐',
      contact_stage_change: '📋',
      appointment_scheduled: '📅',
      order_status_change: '📦',
      payment_due: '💳',
      appointment_completed: '📝',
    };
    return map[triggerType] || '⚡';
  };

  const getStatusColor = (isActive: boolean) =>
    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading automations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Zap className="text-yellow-500" size={32} />
            Automation & n8n
          </h1>
          <p className="text-gray-600">Automate replies, workflows, and business processes</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            New Automation
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Active Automations</p>
          <p className="text-2xl font-bold text-green-600">{automations.filter(a => a.isActive).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Automations</p>
          <p className="text-2xl font-bold text-blue-600">{automations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">n8n Status</p>
          <p className={`text-sm font-medium flex items-center gap-1 ${n8nStatus?.connected ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-2 h-2 rounded-full ${n8nStatus?.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            {n8nStatus?.connected ? 'Connected' : 'Not Connected'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Auto-Reply</p>
          <p className={`text-sm font-medium ${settings.autoReplyEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {settings.autoReplyEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex gap-2 mb-6">
        {[
          { id: 'automations' as const, label: 'My Automations', icon: <Zap size={16} /> },
          { id: 'templates' as const, label: 'Templates', icon: <Plus size={16} /> },
          { id: 'settings' as const, label: 'Settings', icon: <Settings size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === tab.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Automations List */}
      {activeView === 'automations' && (
        <div className="space-y-4">
          {automations.map(auto => (
            <div key={auto.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center text-2xl">
                    {getCategoryIcon(auto.triggerType)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{auto.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock size={14} />
                        {auto.triggerValue || getTriggerLabel(auto.triggerType)}
                      </span>
                      {auto.description && (
                        <span className="text-sm text-gray-400">• {auto.description}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">
                    {new Date(auto.updatedAt).toLocaleDateString()}
                  </span>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(auto.isActive)}`}>
                    {auto.isActive ? 'Active' : 'Paused'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAutomation(auto.id)}
                      className={`p-2 rounded-lg transition-colors ${auto.isActive
                          ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                      title={auto.isActive ? 'Pause' : 'Activate'}
                    >
                      {auto.isActive ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => deleteAutomation(auto.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {automations.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-100">
              <Bot size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Automations Yet</h3>
              <p className="text-gray-500 mb-6">Start by choosing a template or create your own</p>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Browse Templates
              </button>
            </div>
          )}
        </div>
      )}

      {/* Templates Grid */}
      {activeView === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
              onClick={() => useTemplate(template)}
            >
              <div className="text-4xl mb-3">{template.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{template.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{template.category}</span>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {activeView === 'settings' && (
        <div className="max-w-3xl space-y-6">
          {/* Auto-Reply */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-green-600" />
              WhatsApp Auto-Reply
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Enable Auto-Reply</p>
                  <p className="text-sm text-gray-500">Automatically reply to incoming WhatsApp messages</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, autoReplyEnabled: !settings.autoReplyEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoReplyEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.autoReplyEnabled ? 'translate-x-6' : ''
                    }`} />
                </button>
              </div>

              {settings.autoReplyEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Reply Message</label>
                    <textarea
                      value={settings.autoReplyMessage}
                      onChange={(e) => setSettings({ ...settings, autoReplyMessage: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">AI-Powered Replies</p>
                      <p className="text-sm text-gray-500">Use AI to generate contextual replies</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, aiReplyEnabled: !settings.aiReplyEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${settings.aiReplyEnabled ? 'bg-purple-500' : 'bg-gray-300'
                        }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.aiReplyEnabled ? 'translate-x-6' : ''
                        }`} />
                    </button>
                  </div>

                  {settings.aiReplyEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
                        <select
                          value={settings.aiProvider}
                          onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="openrouter">OpenRouter (Recommended)</option>
                          <option value="ollama">Ollama (Local)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Reply Length</label>
                        <input
                          type="number"
                          value={settings.maxReplyLength}
                          onChange={(e) => setSettings({ ...settings, maxReplyLength: parseInt(e.target.value) || 200 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Business Hours
            </h3>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <p className="font-medium text-gray-900">Limit Auto-Replies to Business Hours</p>
                <p className="text-sm text-gray-500">Only send automated replies during working hours</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  businessHours: { ...settings.businessHours, enabled: !settings.businessHours.enabled }
                })}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.businessHours.enabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.businessHours.enabled ? 'translate-x-6' : ''
                  }`} />
              </button>
            </div>

            {settings.businessHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={settings.businessHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      businessHours: { ...settings.businessHours, start: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={settings.businessHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      businessHours: { ...settings.businessHours, end: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* n8n Connection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bot size={20} className="text-purple-600" />
              n8n Integration
            </h3>

            <div className={`flex items-center justify-between p-4 rounded-lg border ${n8nStatus?.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${n8nStatus?.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900">
                    n8n {n8nStatus?.connected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-gray-500">{n8nStatus?.url || 'Configure n8n URL in environment settings'}</p>
                </div>
              </div>
              {n8nStatus?.connected && (
                <a
                  href={n8nStatus.url || 'http://localhost:5678'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  Open n8n Dashboard
                </a>
              )}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">💡 How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create workflows in n8n Dashboard</li>
                <li>Use webhooks to trigger from WhatsApp, leads, reviews</li>
                <li>Connect to AI, Google Sheets, email, and more</li>
                <li>Workflows run automatically in the background</li>
              </ol>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Choose Automation Template</h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => useTemplate(template)}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all text-left"
                >
                  <div className="text-3xl">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded mt-2 inline-block">
                      {template.category}
                    </span>
                  </div>
                  <ArrowRight size={20} className="text-gray-400 mt-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationPage;
