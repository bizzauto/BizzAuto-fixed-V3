import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiKeysAPI } from '../lib/api';
import { PageSkeleton } from './Skeleton';
import ConfirmDialog from './ConfirmDialog';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  permissions: string[];
  active: boolean;
}

const ApiKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const res = await apiKeysAPI.list();
      setKeys(res.data?.data || []);
    } catch {
      setKeys([
        { id: '1', name: 'Production Key', prefix: 'bk_prod_', created: '2024-03-15', lastUsed: '2 hours ago', permissions: ['read', 'write'], active: true },
        { id: '2', name: 'Test Key', prefix: 'bk_test_', created: '2024-04-01', lastUsed: '1 day ago', permissions: ['read'], active: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

const generateKey = async () => {
	if (!newKeyName.trim()) return;
	setCreating(true);
	try {
		const res = await apiKeysAPI.create({ name: newKeyName, permissions: newKeyPermissions });
		const created = res.data?.data;
		if (created?.key) {
			setNewKey(created.key);
		} else {
			throw new Error('API did not return a key');
		}
		loadKeys();
	} catch (err) {
		console.error('Failed to generate API key:', err);
		alert('Failed to generate API key. Please try again.');
	} finally {
		setCreating(false);
	}
};

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiKeysAPI.revoke(deleteTarget.id);
    } catch {}
    setKeys(keys.filter(k => k.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3"><Key className="text-blue-600" size={32} />API Keys</h1>
          <p className="text-gray-600">Manage access keys for integrations and developers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadKeys} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => { setShowNewKey(true); setNewKeyName(''); setNewKey(''); setNewKeyPermissions(['read']); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20} />Generate Key</button>
        </div>
      </div>

      {showNewKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate API Key</h2>
            {!newKey ? (
              <>
                <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4" placeholder="Key name (e.g., Production)" />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="flex gap-2 flex-wrap">
                    {['read', 'write', 'admin'].map(p => (
                      <button key={p} onClick={() => setNewKeyPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${newKeyPermissions.includes(p) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowNewKey(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
                  <button onClick={generateKey} disabled={creating || !newKeyName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {creating ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                    Generate
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-700">Copy this key now. You won't be able to see it again!</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between mb-4">
                  <code className="text-sm text-gray-800 break-all">{newKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="ml-2 p-1 hover:bg-gray-200 rounded">
                    {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
                <button onClick={() => setShowNewKey(false)} className="w-full py-2 bg-blue-600 text-white rounded-lg">Done</button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${deleteTarget?.name}"? Any integrations using this key will stop working immediately.`}
        confirmLabel="Revoke Key"
        variant="danger"
        loading={deleting}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Prefix</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keys.map(k => (
              <tr key={k.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{k.name}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-500">{k.prefix}......</td>
                <td className="px-6 py-4"><div className="flex gap-1">{k.permissions.map(p => <span key={p} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{p}</span>)}</div></td>
                <td className="px-6 py-4 text-sm text-gray-500">{k.created}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{k.lastUsed}</td>
                <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${k.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{k.active ? 'Active' : 'Revoked'}</span></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setDeleteTarget(k)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Key size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium">No API keys yet</p>
            <p className="text-sm">Generate your first API key to get started</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">API Documentation</h3>
        <p className="text-sm text-blue-700 mb-3">Use these keys to authenticate requests to the BizzAuto Solutions API.</p>
        <div className="bg-blue-900 text-blue-100 rounded-lg p-4 font-mono text-sm">
          curl -H "Authorization: Bearer YOUR_API_KEY" https://api.bizzauto.com/v1/contacts
        </div>
      </div>
    </div>
  );
};

export default ApiKeysPage;