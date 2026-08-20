import { useState } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { Database, Download, Upload, Clock, CheckCircle2, AlertTriangle, HardDrive, RefreshCw, Trash2 } from 'lucide-react';

interface Backup {
  id: string;
  type: 'full' | 'incremental';
  size: string;
  createdAt: string;
  status: 'completed' | 'in-progress' | 'failed';
  tables: number;
}

export default function DataBackupPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [backups] = useState<Backup[]>([
    { id: '1', type: 'full', size: '24.5 MB', createdAt: '2026-06-06T02:00:00', status: 'completed', tables: 45 },
    { id: '2', type: 'incremental', size: '3.2 MB', createdAt: '2026-06-05T02:00:00', status: 'completed', tables: 45 },
    { id: '3', type: 'incremental', size: '2.8 MB', createdAt: '2026-06-04T02:00:00', status: 'completed', tables: 45 },
    { id: '4', type: 'full', size: '23.1 MB', createdAt: '2026-06-01T02:00:00', status: 'completed', tables: 44 },
  ]);

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Backup created!');
      } else {
        toast.error(data.error || 'Backup failed');
      }
    } catch {
      toast.error('Backup failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="text-teal-600" /> Data Backup & Restore
        </h1>
        <p className="text-gray-600 mt-1">Automated backups with one-click restore</p>
      </div>

      {/* Status Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <CheckCircle2 className="text-green-600 shrink-0" size={20} />
        <div>
          <div className="text-sm font-medium text-green-800">Last backup: Today at 2:00 AM (auto)</div>
          <div className="text-xs text-green-600">Daily backups enabled • 7-day retention</div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center justify-center gap-2 p-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50"
        >
          {creating ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
          {creating ? 'Creating...' : 'Create Backup Now'}
        </button>
        <button className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50">
          <Upload size={20} /> Restore from Backup
        </button>
        <button className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50">
          <HardDrive size={20} /> Export to Local
        </button>
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} /> Backup History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Type</th>
                <th className="text-left p-3 font-medium text-gray-600">Size</th>
                <th className="text-left p-3 font-medium text-gray-600">Tables</th>
                <th className="text-left p-3 font-medium text-gray-600">Date</th>
                <th className="text-center p-3 font-medium text-gray-600">Status</th>
                <th className="text-center p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      backup.type === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>{backup.type}</span>
                  </td>
                  <td className="p-3">{backup.size}</td>
                  <td className="p-3">{backup.tables}</td>
                  <td className="p-3 text-gray-500">{new Date(backup.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 size={14} /> {backup.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="text-blue-600 hover:underline text-xs mr-3">Download</button>
                    <button className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}