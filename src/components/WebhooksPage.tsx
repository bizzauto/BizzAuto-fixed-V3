import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import {
  Webhook, Plus, Trash2, Edit, TestTube, CheckCircle,
  XCircle, Loader2, X, Copy, Check, Globe
} from 'lucide-react';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  lastTriggeredAt?: string;
  createdAt: string;
}

const availableEvents = [
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'campaign.sent',
  'campaign.completed',
  'appointment.created',
  'appointment.cancelled',
  'message.sent',
  'message.received',
  'lead.captured',
  'lead.converted',
  'ticket.created',
  'ticket.replied',
  'payment.received',
  'subscription.changed',
];

export default function WebhooksPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.data);
      }
    } catch {
      toast.error('Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.url) {
      toast.error('URL is required');
      return;
    }
    if (formData.events.length === 0) {
      toast.error('Select at least one event');
      return;
    }

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Webhook created');
        setShowCreateModal(false);
        setFormData({ url: '', events: [] });
        fetchWebhooks();
      } else {
        toast.error(data.error || 'Failed to create webhook');
      }
    } catch {
      toast.error('Failed to create webhook');
    }
  };

  const handleUpdate = async () => {
    if (!editingWebhook) return;

    try {
      const res = await fetch(`/api/webhooks/${editingWebhook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Webhook updated');
        setEditingWebhook(null);
        setFormData({ url: '', events: [] });
        fetchWebhooks();
      } else {
        toast.error(data.error || 'Failed to update webhook');
      }
    } catch {
      toast.error('Failed to update webhook');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;

    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Webhook deleted');
        fetchWebhooks();
      } else {
        toast.error(data.error || 'Failed to delete webhook');
      }
    } catch {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Test webhook sent successfully');
      } else {
        toast.error(data.error || 'Test failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(secret);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Webhook className="text-blue-600" /> Webhooks
          </h1>
          <p className="text-gray-600 mt-1">Manage webhook endpoints for real-time event notifications</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setFormData({ url: '', events: [] }); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
        >
          <Plus size={18} /> Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Webhook className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No webhooks configured</p>
          <p className="text-sm text-gray-400">Add a webhook to receive real-time event notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${webhook.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <code className="font-mono text-sm text-gray-800 break-all">{webhook.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {webhook.events.map((event) => (
                      <span key={event} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {event}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Globe size={12} /> Secret:
                      <button onClick={() => copySecret(webhook.secret)} className="font-mono hover:text-gray-600">
                        {copiedId === webhook.secret ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </span>
                    {webhook.lastTriggeredAt && (
                      <span>Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testingId === webhook.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Test webhook"
                  >
                    {testingId === webhook.id ? <Loader2 className="animate-spin" size={16} /> : <TestTube size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingWebhook(webhook);
                      setFormData({ url: webhook.url, events: webhook.events });
                      setShowCreateModal(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="Edit webhook"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete webhook"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">
                {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setEditingWebhook(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://your-server.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Events *</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded text-blue-600"
                      />
                      <code className="text-xs text-gray-700">{event}</code>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Selected: {formData.events.length} events</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowCreateModal(false); setEditingWebhook(null); }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingWebhook ? handleUpdate : handleCreate}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingWebhook ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}