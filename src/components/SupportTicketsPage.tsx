import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import {
  Headphones, Plus, Search, Filter, MessageSquare,
  Clock, CheckCircle, AlertCircle, Loader2, Send, X
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  message: string;
  sender: string;
  createdAt: string;
}

export default function SupportTicketsPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, searchQuery]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/support-tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setTickets(data.data.tickets);
      }
    } catch {
      toast.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      toast.error('Subject and description are required');
      return;
    }

    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Ticket created successfully');
        setShowCreateModal(false);
        setNewTicket({ subject: '', description: '', category: 'general', priority: 'medium', name: '', email: '', phone: '' });
        fetchTickets();
      } else {
        toast.error(data.error || 'Failed to create ticket');
      }
    } catch {
      toast.error('Failed to create ticket');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Reply sent');
        setReplyMessage('');
        // Refresh ticket
        const ticketRes = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ticketData = await ticketRes.json();
        if (ticketData.success) {
          setSelectedTicket(ticketData.data);
        }
        fetchTickets();
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Headphones className="text-blue-600" /> Support Tickets
          </h1>
          <p className="text-gray-600 mt-1">Manage and respond to customer support requests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
        >
          <Plus size={18} /> New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Headphones className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ticket.description}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <span className="text-xs font-mono text-gray-500">{selectedTicket.ticketNumber}</span>
                <h2 className="font-semibold text-gray-900">{selectedTicket.subject}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{selectedTicket.description}</p>
              </div>

              {selectedTicket.replies?.map((reply) => (
                <div key={reply.id} className={`p-3 rounded-lg ${reply.sender === 'admin' ? 'bg-blue-50 ml-8' : 'bg-gray-100 mr-8'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600">{reply.sender}</span>
                    <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{reply.message}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || sendingReply}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingReply ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Create Support Ticket</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description of your issue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="bug">Bug Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}