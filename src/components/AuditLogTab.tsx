import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Loader2, ChevronLeft, ChevronRight,
  Filter, Calendar, Clock, RefreshCw, Activity
} from 'lucide-react';
import { adminAnalyticsAPI } from '../lib/api';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  businessId: string | null;
  userId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  EXPORT: 'bg-yellow-100 text-yellow-700',
  VIEW: 'bg-indigo-100 text-indigo-700',
};

export default function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [limit] = useState(50);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (actionFilter) params.action = actionFilter;
      if (search.trim()) params.search = search.trim();

      const res = await adminAnalyticsAPI.getAuditLog(params);
      if (res.data?.success) {
        setLogs(res.data.data.logs);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotal(res.data.data.pagination.total);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, limit, actionFilter, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, entity, or IP..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </form>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="EXPORT">EXPORT</option>
          <option value="VIEW">VIEW</option>
        </select>
        <button onClick={() => { setPage(1); fetchLogs(); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-sm font-medium transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Metadata</th>
                <th className="px-4 py-3">Date/Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-purple-500 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-[120px] truncate">{log.entityId}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ipAddress || '-'}</td>
                    <td className="px-4 py-3">
                      {log.metadata ? (
                        <span className="text-xs text-gray-400 max-w-[150px] truncate block">
                          {typeof log.metadata === 'object'
                            ? Object.entries(log.metadata).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : String(log.metadata).slice(0, 50)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        {new Date(log.createdAt).toLocaleDateString()}
                        <Clock size={12} className="ml-1" />
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
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
            <span className="text-xs text-gray-500">
              {total} total entries · Page {page} of {totalPages}
            </span>
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
