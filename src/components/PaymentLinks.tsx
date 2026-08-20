import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Link as LinkIcon, DollarSign, Clock, Eye, Trash2, X,
  Copy, Check, Send, RefreshCw, Loader2, ChevronDown, ChevronUp,
  ExternalLink, ToggleLeft, ToggleRight, CreditCard, Users, TrendingUp,
  ArrowLeft, Download, QrCode, MessageSquare, Calendar, Hash, Filter
} from 'lucide-react';
import { paymentLinksAPI } from '../lib/api';
import { useToast } from './Toast';

interface PaymentLink {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  type: 'fixed' | 'flexible' | 'subscription';
  minAmount?: number;
  shortCode: string;
  isActive: boolean;
  expiresAt?: string;
  maxPayments?: number;
  paymentCount: number;
  totalCollected: number;
  contactId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  linkId: string;
  contactId?: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'captured' | 'failed' | 'refunded';
  metadata?: any;
  paidAt: string;
}

const typeConfig: Record<string, { label: string; color: string }> = {
  fixed: { label: 'Fixed Amount', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  flexible: { label: 'Flexible', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  subscription: { label: 'Subscription', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const txStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  captured: { label: 'Captured', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
};

const PaymentLinks: React.FC = () => {
  const { success, error: showError } = useToast();

  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [showPreview, setShowPreview] = useState<PaymentLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [showQrLink, setShowQrLink] = useState<string | null>(null);
  const [verifyingTxs, setVerifyingTxs] = useState<Record<string, boolean>>({});
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [newLink, setNewLink] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'INR',
    type: 'fixed' as 'fixed' | 'flexible' | 'subscription',
    minAmount: '',
    maxPayments: '',
    expiresAt: '',
  });

  const getPaymentUrl = useCallback((shortCode: string) => {
    return `${window.location.origin}/pay/${shortCode}`;
  }, []);

  const fetchLinks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter !== 'all') params.type = typeFilter;
      const res = await paymentLinksAPI.list(params);
      const data = res.data?.data;
      if (data) {
        setLinks(data.links || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err: any) {
      console.error('Failed to fetch payment links:', err);
      showError('Failed to load payment links');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreate = async () => {
    if (!newLink.name.trim()) { showError('Name is required'); return; }
    if (!newLink.amount || parseFloat(newLink.amount) <= 0) { showError('Valid amount is required'); return; }

    setCreating(true);
    try {
      const payload: any = {
        name: newLink.name.trim(),
        amount: parseFloat(newLink.amount),
        currency: newLink.currency,
        type: newLink.type,
      };
      if (newLink.description.trim()) payload.description = newLink.description.trim();
      if (newLink.type === 'flexible' && newLink.minAmount) payload.minAmount = parseFloat(newLink.minAmount);
      if (newLink.maxPayments) payload.maxPayments = parseInt(newLink.maxPayments);
      if (newLink.expiresAt) payload.expiresAt = newLink.expiresAt;

      const res = await paymentLinksAPI.create(payload);
      if (res.data?.data) {
        success('Payment link created');
        setShowCreateForm(false);
        setNewLink({ name: '', description: '', amount: '', currency: 'INR', type: 'fixed', minAmount: '', maxPayments: '', expiresAt: '' });
        fetchLinks();
      }
    } catch (err: any) {
      console.error('Create failed:', err);
      showError(err.response?.data?.error || 'Failed to create payment link');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    setDeactivating(id);
    try {
      await paymentLinksAPI.delete(id);
      success('Payment link deactivated');
      setLinks(prev => prev.map(l => l.id === id ? { ...l, isActive: false } : l));
    } catch (err: any) {
      showError('Failed to deactivate link');
    } finally {
      setDeactivating(null);
    }
  };

  const handleToggleActive = async (link: PaymentLink) => {
    try {
      await paymentLinksAPI.update(link.id, { isActive: !link.isActive });
      success(link.isActive ? 'Link deactivated' : 'Link activated');
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, isActive: !l.isActive } : l));
    } catch (err: any) {
      showError('Failed to update link');
    }
  };

  const handleVerifyTransaction = async (tx: Transaction) => {
    setVerifyingTxs(prev => ({ ...prev, [tx.id]: true }));
    try {
      const res = await paymentLinksAPI.verifyTransaction(tx.id);
      const result = res.data;
      if (result?.success) {
        success(`Payment verified — status: ${result.status}`);
        // Refresh transactions to show updated status
        if (selectedLink) loadTransactions(selectedLink.id);
      } else {
        showError(`Verification returned: ${result?.status || 'unknown'}`);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to verify payment');
    } finally {
      setVerifyingTxs(prev => ({ ...prev, [tx.id]: false }));
    }
  };

  const loadTransactions = async (linkId: string) => {
    setTxLoading(true);
    try {
      const res = await paymentLinksAPI.getTransactions(linkId);
      const data = res.data?.data;
      setTransactions(data?.transactions || []);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const handleViewDetail = async (link: PaymentLink) => {
    setSelectedLink(link);
    setExpandedLink(link.id);
    await loadTransactions(link.id);
  };

  const handleCopyLink = (link: PaymentLink) => {
    const url = getPaymentUrl(link.shortCode);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(link.id);
      success('Link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSendWhatsApp = async (link: PaymentLink) => {
    setSendingWhatsApp(link.id);
    try {
      const res = await paymentLinksAPI.send(link.id);
      success(res.data?.data?.message || 'Payment link sent via WhatsApp');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to send via WhatsApp');
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const generateQrCode = useCallback((text: string, canvas: HTMLCanvasElement) => {
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Simple QR-like pattern for demo (real app would use a QR library)
    ctx.fillStyle = '#000000';
    const moduleSize = 4;
    const modules = Math.floor(size / moduleSize);
    const padding = 2;

    // Generate deterministic pattern from URL
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    // Position detection patterns
    const drawFinderPattern = (x: number, y: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            ctx.fillRect((x + r) * moduleSize, (y + c) * moduleSize, moduleSize, moduleSize);
          }
        }
      }
    };

    drawFinderPattern(padding, padding);
    drawFinderPattern(modules - 7 - padding, padding);
    drawFinderPattern(padding, modules - 7 - padding);

    // Data pattern
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if ((r < 9 && c < 9) || (r < 9 && c >= modules - 8) || (r >= modules - 8 && c < 9)) continue;
        const val = ((hash * (r + 1) * (c + 1) + r * 31 + c * 17) & 0xff);
        if (val > 128) {
          ctx.fillRect(r * moduleSize, c * moduleSize, moduleSize, moduleSize);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (showQrLink && qrCanvasRef.current) {
      const url = getPaymentUrl(showQrLink);
      generateQrCode(url, qrCanvasRef.current);
    }
  }, [showQrLink, generateQrCode]);

  const formatCurrency = (amount: number, currency = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency + ' ';
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const stats = {
    totalLinks: links.length,
    activeLinks: links.filter(l => l.isActive).length,
    totalCollected: links.reduce((sum, l) => sum + l.totalCollected, 0),
    totalPayments: links.reduce((sum, l) => sum + l.paymentCount, 0),
  };

  if (selectedLink && expandedLink) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8 min-h-screen bg-gray-50 dark:bg-gray-900">
        <button
          onClick={() => { setSelectedLink(null); setExpandedLink(null); setTransactions([]); }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} /> Back to Payment Links
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{selectedLink.name}</h2>
                {selectedLink.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{selectedLink.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeConfig[selectedLink.type]?.color || ''}`}>
                  {typeConfig[selectedLink.type]?.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedLink.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                  {selectedLink.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-5 md:p-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <DollarSign size={20} className="text-blue-600 dark:text-blue-400 mb-1" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedLink.amount, selectedLink.currency)}</p>
              {selectedLink.type === 'flexible' && selectedLink.minAmount && (
                <p className="text-xs text-gray-400 mt-0.5">Min: {formatCurrency(selectedLink.minAmount, selectedLink.currency)}</p>
              )}
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <TrendingUp size={20} className="text-green-600 dark:text-green-400 mb-1" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Collected</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedLink.totalCollected, selectedLink.currency)}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <Users size={20} className="text-purple-600 dark:text-purple-400 mb-1" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Payments</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedLink.paymentCount}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <Calendar size={20} className="text-orange-600 dark:text-orange-400 mb-1" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{new Date(selectedLink.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="px-4 sm:px-5 md:px-6 pb-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 flex-1 min-w-0">
              <LinkIcon size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{getPaymentUrl(selectedLink.shortCode)}</span>
              <button onClick={() => handleCopyLink(selectedLink)} className="ml-auto flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                {copiedId === selectedLink.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-400" />}
              </button>
            </div>
            <button
              onClick={() => setShowQrLink(selectedLink.shortCode)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
            >
              <QrCode size={16} /> QR Code
            </button>
            <button
              onClick={() => handleSendWhatsApp(selectedLink)}
              disabled={!selectedLink.isActive || sendingWhatsApp === selectedLink.id}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {sendingWhatsApp === selectedLink.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send via WhatsApp
            </button>
            <button
              onClick={() => setShowPreview(selectedLink)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink size={16} /> Preview
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard size={20} /> Transaction History
            </h3>
          </div>
          {txLoading ? (
            <div className="p-4 sm:p-6 md:p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Payment ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {new Date(tx.paidAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{formatCurrency(tx.amount, tx.currency)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${txStatusConfig[tx.status]?.color || ''}`}>
                          {txStatusConfig[tx.status]?.label || tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {tx.razorpayPaymentId || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {tx.status === 'pending' && tx.razorpayPaymentId && (
                          <button
                            onClick={() => handleVerifyTransaction(tx)}
                            disabled={verifyingTxs[tx.id]}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
                            title="Check with Razorpay to confirm payment status"
                          >
                            {verifyingTxs[tx.id] ? (
                              <><Loader2 size={12} className="animate-spin" /> Verifying...</>
                            ) : (
                              <><RefreshCw size={12} /> Verify</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6 md:p-8 text-center text-gray-400">
              <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
              <p>No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* QR Modal */}
      {showQrLink && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowQrLink(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><QrCode size={20} /> QR Code</h3>
              <button onClick={() => setShowQrLink(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X size={18} /></button>
            </div>
            <div className="flex justify-center mb-4">
              <canvas ref={qrCanvasRef} className="border border-gray-200 dark:border-gray-600 rounded-lg" />
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 break-all mb-4">{getPaymentUrl(showQrLink)}</p>
            <button
              onClick={() => {
                if (qrCanvasRef.current) {
                  const link = document.createElement('a');
                  link.download = `qr-${showQrLink}.png`;
                  link.href = qrCanvasRef.current.toDataURL();
                  link.click();
                }
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download QR
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPreview(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-5 md:p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Payment Page Preview</h3>
                <button onClick={() => setShowPreview(null)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <p className="text-blue-100 text-xs mb-1">Pay to</p>
                <p className="text-xl font-bold">{showPreview.name}</p>
                {showPreview.description && <p className="text-blue-200 text-sm mt-1">{showPreview.description}</p>}
              </div>
            </div>
            <div className="p-4 sm:p-5 md:p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-1">Amount</p>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {formatCurrency(showPreview.amount, showPreview.currency)}
                </p>
                {showPreview.type === 'flexible' && showPreview.minAmount && (
                  <p className="text-xs text-gray-400 mt-1">Minimum: {formatCurrency(showPreview.minAmount, showPreview.currency)}</p>
                )}
                {showPreview.type === 'subscription' && (
                  <p className="text-xs text-gray-400 mt-1">per month</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <input type="text" placeholder="Full Name" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                <input type="email" placeholder="Email Address" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                <input type="tel" placeholder="Phone Number" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>

              {showPreview.type === 'flexible' && (
                <div className="mb-6">
                  <label className="text-sm text-gray-600 mb-1 block">Enter Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">₹</span>
                    <input type="number" placeholder="0" defaultValue={showPreview.amount} className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                </div>
              )}

              <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all">
                Pay Now
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Powered by Razorpay • Secure Payment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Payment Link</h3>
              <button onClick={() => setShowCreateForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={newLink.name}
                  onChange={e => setNewLink(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Website Design Service"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newLink.description}
                  onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description for the payment page"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fixed', 'flexible', 'subscription'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewLink(p => ({ ...p, type: t }))}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                        newLink.type === t
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {typeConfig[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={newLink.amount}
                    onChange={e => setNewLink(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select
                    value={newLink.currency}
                    onChange={e => setNewLink(p => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
              {newLink.type === 'flexible' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Amount</label>
                  <input
                    type="number"
                    value={newLink.minAmount}
                    onChange={e => setNewLink(p => ({ ...p, minAmount: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Payments</label>
                  <input
                    type="number"
                    value={newLink.maxPayments}
                    onChange={e => setNewLink(p => ({ ...p, maxPayments: e.target.value }))}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires At</label>
                  <input
                    type="datetime-local"
                    value={newLink.expiresAt}
                    onChange={e => setNewLink(p => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 md:p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !newLink.name.trim() || !newLink.amount}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <LinkIcon className="text-blue-600" size={32} /> Payment Links
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create and share payment links to collect money from customers</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Create Payment Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <LinkIcon size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Links</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalLinks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Collected</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Payments</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Hash size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Links</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeLinks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search payment links..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="pl-8 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option value="all">All Types</option>
                <option value="fixed">Fixed</option>
                <option value="flexible">Flexible</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <button onClick={() => fetchLinks()} className="p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Links List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">Loading payment links...</p>
            </div>
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center">
            <LinkIcon size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No payment links</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first payment link to start collecting payments</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              <Plus size={16} /> Create Payment Link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {links.map(link => (
              <div key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="p-4 sm:p-5 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${link.isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <LinkIcon size={20} className={link.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{link.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig[link.type]?.color || ''}`}>
                        {typeConfig[link.type]?.label}
                      </span>
                      {!link.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    {link.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{link.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><DollarSign size={12} />{formatCurrency(link.amount, link.currency)}</span>
                      <span className="flex items-center gap-1"><CreditCard size={12} />{link.paymentCount} payments</span>
                      <span className="flex items-center gap-1"><TrendingUp size={12} />{formatCurrency(link.totalCollected, link.currency)} collected</span>
                      {link.expiresAt && (
                        <span className={`flex items-center gap-1 ${new Date(link.expiresAt) < new Date() ? 'text-red-500' : ''}`}>
                          <Calendar size={12} />Expires {new Date(link.expiresAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(link)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={link.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {link.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      {copiedId === link.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleViewDetail(link)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(link)}
                      disabled={!link.isActive || sendingWhatsApp === link.id}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Send via WhatsApp"
                    >
                      {sendingWhatsApp === link.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                    <button
                      onClick={() => handleDeactivate(link.id)}
                      disabled={deactivating === link.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      {deactivating === link.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLinks(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => fetchLinks(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentLinks;
