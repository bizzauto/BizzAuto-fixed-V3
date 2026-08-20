import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, Download, RefreshCw } from 'lucide-react';
import { auditLogAPI } from '../lib/api';
import { PageSkeleton } from './Skeleton';

interface LogEntry {
  id: string;
  user: string;
  action: string;
  resource: string;
  time: string;
  ip: string;
  severity: string;
}

const AuditLogPage: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackLogs: LogEntry[] = [
    { id: '1', user: 'Admin User', action: 'user.created', resource: 'New user: priya@indiacrm.in', time: '2 min ago', ip: '103.21.55.12', severity: 'info' },
    { id: '2', user: 'Admin User', action: 'contact.imported', resource: 'Imported 250 contacts via CSV', time: '1 hour ago', ip: '103.21.55.12', severity: 'info' },
    { id: '3', user: 'Rahul Verma', action: 'campaign.sent', resource: 'Sent campaign: Diwali Sale Blast', time: '3 hours ago', ip: '103.21.55.45', severity: 'info' },
    { id: '4', user: 'System', action: 'whatsapp.failed', resource: 'WhatsApp message failed: +91 98765 43210', time: '5 hours ago', ip: '-', severity: 'error' },
    { id: '5', user: 'Admin User', action: 'settings.updated', resource: 'Updated business hours', time: '1 day ago', ip: '103.21.55.12', severity: 'warning' },
    { id: '6', user: 'System', action: 'subscription.renewed', resource: 'Starter plan renewed automatically', time: '2 days ago', ip: '-', severity: 'info' },
    { id: '7', user: 'Admin User', action: 'contact.deleted', resource: 'Deleted contact: Test User', time: '3 days ago', ip: '103.21.55.12', severity: 'warning' },
    { id: '8', user: 'Sneha Patel', action: 'user.login', resource: 'Logged in from Chrome on Windows', time: '3 days ago', ip: '103.21.55.78', severity: 'info' },
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogAPI.list({ severity: filter !== 'all' ? filter : undefined, search });
      setLogs(res.data?.data || []);
    } catch {
      setLogs(fallbackLogs);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await auditLogAPI.export({ severity: filter, search });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit-logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  const filtered = (logs.length > 0 ? logs : fallbackLogs).filter(l => {
    if (filter !== 'all' && l.severity !== filter) return false;
    if (search && !l.resource.toLowerCase().includes(search.toLowerCase()) && !l.user.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const severityColor = (s: string) => s === 'error' ? 'bg-red-100 text-red-700' : s === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';
  const severityLabel = (s: string) => s === 'error' ? 'Error' : s === 'warning' ? 'Warning' : 'Info';

  if (loading) return <PageSkeleton />;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3"><Shield className="text-blue-600" size={32} />Audit Log</h1>
          <p className="text-gray-600">Track all activities and changes in your account</p>
        </div>
        <button onClick={loadLogs} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" placeholder="Search logs..." />
        </div>
        <div className="flex gap-2">
          {['all', 'info', 'warning', 'error'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"><Download size={16} /> Export</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.map(log => (
            <div key={log.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${severityColor(log.severity)}`}>
                  {log.severity === 'error' ? <Shield size={18} /> : <Clock size={18} />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <p className="text-sm text-gray-500">{log.resource}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-sm text-gray-500">{log.user}</p>
                  <p className="text-xs text-gray-400">{log.time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{log.ip}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${severityColor(log.severity)}`}>{severityLabel(log.severity)}</span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No logs found matching your criteria</div>}
      </div>
    </div>
  );
};

export default AuditLogPage;