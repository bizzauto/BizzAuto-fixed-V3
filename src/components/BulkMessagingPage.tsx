import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { campaignsAPI } from '../lib/api';
import { Send, Users, FileText, Clock, CheckCircle2, AlertCircle, Upload, Filter, Loader2 } from 'lucide-react';

interface BulkMessage {
  id: string;
  content: string;
  channel: string;
  totalSent: number;
  delivered: number;
  failed: number;
  scheduledAt: string;
  status: string;
}

export default function BulkMessagingPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [content, setContent] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BulkMessage[]>([]);

  useEffect(() => {
    campaignsAPI.list().then((res) => {
      const items = (res.data?.data || res.data || []).map((c: any) => ({
        id: c.id,
        content: c.message || c.content || '',
        channel: c.channel || 'whatsapp',
        totalSent: c.totalSent || c.sent || 0,
        delivered: c.delivered || 0,
        failed: c.failed || 0,
        scheduledAt: c.scheduledAt || c.createdAt || '',
        status: c.status || 'pending',
      }));
      setHistory(items);
    }).catch(() => {});
  }, []);

  const templates = [
    { name: 'Welcome', text: 'Welcome to {business}! Thank you for joining us. Reply HELP for support.' },
    { name: 'Order Confirm', text: 'Your order #{orderId} is confirmed! Total: ₹{amount}. Delivery by {date}.' },
    { name: 'Payment Reminder', text: 'Hi {name}, friendly reminder: ₹{amount} due on {date}. Pay now to avoid late fees.' },
    { name: 'Promotion', text: '🎉 Special offer for you! {discount} off on {product}. Use code {code}. Valid till {date}!' },
    { name: 'Feedback', text: 'Hi {name}, how was your experience with us? Reply with 1-5 stars. Your feedback matters!' },
  ];

  const handleSend = async () => {
    if (!content.trim()) { toast.error('Enter message content'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel, message: content, filter: recipientFilter }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Bulk ${channel.toUpperCase()} sending initiated!`);
        setContent('');
        const newItem: BulkMessage = {
          id: data.data?.id || Date.now().toString(),
          content,
          channel,
          totalSent: data.data?.totalSent || 0,
          delivered: 0,
          failed: 0,
          scheduledAt: new Date().toISOString(),
          status: 'sending',
        };
        setHistory((prev) => [newItem, ...prev]);
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send bulk message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Send className="text-green-600" /> Bulk SMS / WhatsApp
        </h1>
        <p className="text-gray-600 mt-1">Send mass messages to your contacts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Channel Toggle */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setChannel('whatsapp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
                  channel === 'whatsapp' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Send size={16} /> WhatsApp
              </button>
              <button
                onClick={() => setChannel('sms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
                  channel === 'sms' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <FileText size={16} /> SMS
              </button>
            </div>

            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
              <select
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              >
                <option value="all">All Contacts</option>
                <option value="leads">Leads Only</option>
                <option value="customers">Customers Only</option>
                <option value="active">Active (Last 30 days)</option>
                <option value="inactive">Inactive (30+ days)</option>
                <option value="tagged">Tagged Contacts</option>
              </select>
            </div>

            {/* Templates */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Templates</label>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setContent(t.text)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none"
                placeholder={channel === 'whatsapp' ? 'Type your WhatsApp message... (supports images, buttons)' : 'Type your SMS... (160 char limit per segment)'}
              />
              <div className="text-xs text-gray-400 mt-1">{content.length} characters</div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !content.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {sending ? 'Sending...' : `Send to ${recipientFilter === 'all' ? 'All' : recipientFilter} contacts`}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={18} /> Recent Campaigns
          </h3>
          <div className="space-y-3">
            {history.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Send size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages sent yet</p>
              </div>
            )}
            {history.map((msg) => (
              <div key={msg.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    msg.channel === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{msg.channel.toUpperCase()}</span>
                  <span className="text-xs text-gray-400">{msg.scheduledAt}</span>
                </div>
                <p className="text-sm text-gray-700 truncate">{msg.content}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span className="text-green-600">✓ {msg.delivered}</span>
                  <span className="text-red-500">✗ {msg.failed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}