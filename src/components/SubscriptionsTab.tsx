import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Search, ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle, XCircle, Clock, Calendar, Building2, DollarSign
} from 'lucide-react';
import { superAdminAPI } from '../lib/api';

interface Subscription {
  id: string;
  businessId: string;
  plan: string;
  status: string;
  amount: number;
  period: string;
  createdAt: string;
  expiresAt: string | null;
  business: {
    id: string;
    name: string;
    type: string;
    plan: string;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  trial: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-purple-100 text-purple-700 border-purple-200',
};

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  GROWTH: 'bg-green-100 text-green-700',
  PRO: 'bg-yellow-100 text-yellow-700',
  AGENCY: 'bg-purple-100 text-purple-700',
};

export default function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter) params.status = statusFilter;

      const res = await superAdminAPI.listSubscriptions(params);
      if (res.data?.success) {
        setSubscriptions(res.data.data.subscriptions);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotal(res.data.data.pagination.total);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, limit, statusFilter]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const formatCurrency = (val: number) => 
    val > 0 ? `₹${val.toLocaleString('en-IN')}` : '₹0';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter by status:</span>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-purple-500">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="trial">Trial</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <span className="text-sm text-gray-400 ml-auto">{total} total subscriptions</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <RefreshCw size={24} className="animate-spin text-purple-500 mx-auto" />
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <CreditCard size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>No subscriptions found</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {sub.business?.name || 'Unknown Business'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[sub.plan] || 'bg-gray-100 text-gray-700'}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[sub.status] || 'bg-gray-100 text-gray-700'}`}>
                        {sub.status === 'active' ? <CheckCircle size={10} /> : 
                         sub.status === 'cancelled' ? <XCircle size={10} /> : 
                         <Clock size={10} />}
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                        <DollarSign size={14} className="text-green-500" />
                        {formatCurrency(sub.amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{sub.period}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {sub.expiresAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(sub.expiresAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-lg hover:bg-gray-100">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700">{page}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-lg hover:bg-gray-100">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
