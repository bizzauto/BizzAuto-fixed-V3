import React, { useState, useEffect } from 'react';
import { Send, Pause, Play, BarChart3, MessageSquare, Users, CheckCircle2, XCircle, Clock, Loader2, Plus, Eye } from 'lucide-react';
import { outreachAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalLeads: number;
  sent: number;
  delivered: number;
  replied: number;
  template: string;
  createdAt: string;
}

interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  replied: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  replyRate: number;
}

export default function OutreachCampaignPage() {
  const { business } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newContactIds, setNewContactIds] = useState('');
  const [newMaxMessages, setNewMaxMessages] = useState(30);
  const [creating, setCreating] = useState(false);

  const loadCampaigns = async () => {
    try {
      const res = await outreachAPI.listCampaigns();
      if (res.data?.success) setCampaigns(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (campaignId: string) => {
    try {
      const res = await outreachAPI.getCampaign(campaignId);
      if (res.data?.success) setStats(res.data.data.stats);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) loadStats(selectedCampaign.id);
  }, [selectedCampaign]);

  const handleCreate = async () => {
    if (!newName || !newTemplate || !newContactIds) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    setCreating(true);
    try {
      const ids = newContactIds.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await outreachAPI.createCampaign({ name: newName, template: newTemplate, contactIds: ids });
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Campaign created!' });
        setShowCreate(false);
        setNewName('');
        setNewTemplate('');
        setNewContactIds('');
        loadCampaigns();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create campaign' });
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await outreachAPI.activateCampaign(id);
      setMessage({ type: 'success', text: 'Campaign activated' });
      loadCampaigns();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed' });
    }
  };

  const handlePause = async (id: string) => {
    try {
      await outreachAPI.pauseCampaign(id);
      setMessage({ type: 'success', text: 'Campaign paused' });
      loadCampaigns();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed' });
    }
  };

  const handleBulkSend = async (campaignId: string) => {
    try {
      await outreachAPI.bulk({ campaignId, maxMessages: newMaxMessages });
      setMessage({ type: 'success', text: `Bulk send queued (max ${newMaxMessages} per batch)` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed' });
    }
  };

  const handleScheduleFollowUps = async (campaignId: string) => {
    try {
      const res = await outreachAPI.scheduleFollowUps({ campaignId });
      if (res.data?.success) {
        setMessage({ type: 'success', text: `Scheduled ${res.data.data.scheduled} follow-ups` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed' });
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Send className="w-7 h-7 text-blue-600" />
              WhatsApp Outreach
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              AI-powered personalized WhatsApp campaigns with auto follow-up
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto text-sm opacity-70">✕</button>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Create New Campaign</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Mumbai Restaurants Outreach"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact IDs (comma separated)</label>
                <input
                  type="text"
                  value={newContactIds}
                  onChange={(e) => setNewContactIds(e.target.value)}
                  placeholder="e.g. cmx123, cmx456"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Template</label>
                <textarea
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  rows={4}
                  placeholder="Hi {name}, I noticed {business} doesn't have a website yet. We can help you get online..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Messages Per Batch</label>
                <select
                  value={newMaxMessages}
                  onChange={(e) => setNewMaxMessages(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10 messages (Safest)</option>
                  <option value={20}>20 messages (Safe)</option>
                  <option value={30}>30 messages (Recommended)</option>
                  <option value={50}>50 messages (Max)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Each batch has random 2-4s delays between messages</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Create Campaign
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Campaigns</h3>
              </div>
              {loading ? (
                <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" /></div>
              ) : campaigns.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No campaigns yet</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {campaigns.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCampaign(c)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                        selectedCampaign?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {c.sent}/{c.totalLeads} sent · {c.replied} replied
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Campaign Detail */}
          <div className="lg:col-span-2">
            {selectedCampaign ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCampaign.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Created {new Date(selectedCampaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedCampaign.status === 'draft' && (
                      <button
                        onClick={() => handleActivate(selectedCampaign.id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Activate
                      </button>
                    )}
                    {selectedCampaign.status === 'active' && (
                      <button
                        onClick={() => handlePause(selectedCampaign.id)}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}
                    <button
                      onClick={() => handleBulkSend(selectedCampaign.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Now
                    </button>
                    <button
                      onClick={() => handleScheduleFollowUps(selectedCampaign.id)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" /> Schedule Follow-ups
                    </button>
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sent</div>
                      <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivered</div>
                      <div className="text-2xl font-bold text-green-600">{stats.deliveryRate}%</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Replied</div>
                      <div className="text-2xl font-bold text-purple-600">{stats.replyRate}%</div>
                    </div>
                  </div>
                )}

                {/* Message Template */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Template</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedCampaign.template}</p>
                </div>

                {/* Anti-Ban Info */}
                <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Anti-Ban Protection Active</h4>
                  <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                    <li>Each message is AI-generated with unique wording, greeting, and sentence structure</li>
                    <li>Random 2-4 second delay between every message</li>
                    <li>Variation seeds ensure no two messages look identical to WhatsApp</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Select a campaign to view details and stats</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
