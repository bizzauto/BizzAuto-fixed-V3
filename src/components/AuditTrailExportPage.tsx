import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { Download, FileText, Calendar, Filter, Loader2, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  userId: string;
  user?: { name: string; email: string };
  createdAt: string;
}

export default function AuditTrailExportPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState({ action: '', entityType: '', search: '' });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-log?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs || data.data || []);
      }
    } catch {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const filtered = logs.filter(log => {
        if (filter.action && log.action !== filter.action) return false;
        if (filter.entityType && log.entityType !== filter.entityType) return false;
        if (filter.search && !log.action.includes(filter.search) && !log.entityType.includes(filter.search)) return false;
        return true;
      });

      const headers = ['Date', 'Action', 'Entity Type', 'Entity ID', 'Details', 'User'];
      const rows = filtered.map(log => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.entityType,
        log.entityId || '',
        log.details || '',
        log.user?.name || log.user?.email || log.userId,
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit trail exported!');
    } catch {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter.action && log.action !== filter.action) return false;
    if (filter.entityType && log.entityType !== filter.entityType) return false;
    if (filter.search && !JSON.stringify(log).toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntityTypes = [...new Set(logs.map(l => l.entityType))];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> Audit Trail
          </h1>
          <p className="text-gray-600 mt-1">Track all system activities and export logs</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search logs..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            {uniqueEntityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.entityType}</td>
                    <td className="px-4 py-3 text-gray-500">{log.user?.name || log.userId}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length > 50 && (
            <div className="p-3 text-center text-sm text-gray-500 border-t">
              Showing 50 of {filteredLogs.length} logs. Export CSV for full data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}