import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Shield, Key, Plus, CheckCircle2, Settings, Globe, Lock, Loader2, X, Trash2 } from 'lucide-react';

interface SSOProvider {
  id: string;
  name: string;
  provider: 'google' | 'github' | 'microsoft' | 'okta' | 'auth0';
  clientId: string;
  domain?: string;
  enabled: boolean;
}

export default function SSOConfigPage() {
  const toast = useToast();
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [newProvider, setNewProvider] = useState({ provider: 'google' as const, clientId: '', clientSecret: '', domain: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProviders(); }, []);

  const loadProviders = async () => {
    try {
      const res = await fetch('/api/sso');
      const data = await res.json();
      if (data.success) {
        setProviders(data.data.configs.map((c: any) => ({
          id: c.id,
          name: `${c.provider.charAt(0).toUpperCase() + c.provider.slice(1)} SSO`,
          provider: c.provider,
          clientId: c.clientId,
          domain: c.domain,
          enabled: c.enabled,
        })));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const addProvider = async () => {
    if (!newProvider.clientId.trim()) { toast.error('Client ID is required'); return; }
    try {
      setSaving(true);
      const res = await fetch('/api/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      });
      const data = await res.json();
      if (data.success) {
        const p = data.data.config;
        setProviders(prev => [...prev, { id: p.id, name: `${p.provider.charAt(0).toUpperCase() + p.provider.slice(1)} SSO`, provider: p.provider, clientId: p.clientId, domain: p.domain, enabled: p.enabled }]);
        setShowSetup(false);
        setNewProvider({ provider: 'google', clientId: '', clientSecret: '', domain: '' });
        toast.success('SSO provider added');
      } else { toast.error(data.error || 'Failed to add'); }
    } catch { toast.error('Failed to add SSO provider'); }
    finally { setSaving(false); }
  };

  const toggleProvider = async (id: string) => {
    const prov = providers.find(p => p.id === id);
    if (!prov) return;
    try {
      const res = await fetch(`/api/sso/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !prov.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
        toast.success('Provider updated');
      }
    } catch { toast.error('Failed to update'); }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm('Delete this SSO provider?')) return;
    try {
      const res = await fetch(`/api/sso/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProviders(prev => prev.filter(p => p.id !== id));
        toast.success('Provider deleted');
      }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-500" size={32} /><span className="ml-2 text-gray-500">Loading SSO config...</span></div>;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="text-blue-600" /> Single Sign-On (SSO)
        </h1>
        <p className="text-gray-600 mt-1">Configure SSO providers for your organization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {providers.map((provider) => (
          <div key={provider.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${provider.provider === 'google' ? 'bg-blue-100' : provider.provider === 'github' ? 'bg-gray-100' : 'bg-indigo-100'}`}>
                  {provider.provider === 'google' ? <Globe size={20} className="text-blue-600" /> :
                   provider.provider === 'github' ? <Key size={20} className="text-gray-600" /> :
                   <Shield size={20} className="text-indigo-600" />}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{provider.name}</div>
                  <div className="text-xs text-gray-500 uppercase">{provider.provider}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteProvider(provider.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                <button onClick={() => toggleProvider(provider.id)} className={`w-12 h-6 rounded-full transition-colors ${provider.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${provider.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Client ID</span><span className="font-mono text-xs">{provider.clientId.substring(0, 20)}...</span></div>
              {provider.domain && <div className="flex justify-between"><span className="text-gray-500">Domain</span><span>{provider.domain}</span></div>}
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={provider.enabled ? 'text-green-600 flex items-center gap-1' : 'text-gray-400'}>
                  <CheckCircle2 size={14} /> {provider.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        ))}

        <button onClick={() => setShowSetup(true)}
          className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors min-h-[200px]">
          <Plus size={32} />
          <div className="font-medium mt-2">Add SSO Provider</div>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Settings size={18} /> SSO Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Enforce SSO for all users</div>
              <div className="text-xs text-gray-500">Users must sign in via SSO (no password login)</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Auto-provision users</div>
              <div className="text-xs text-gray-500">Automatically create accounts for new SSO users</div>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Just-In-Time (JIT) provisioning</div>
              <div className="text-xs text-gray-500">Create user on first SSO login with default role</div>
            </div>
          </label>
        </div>
      </div>

      {showSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSetup(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add SSO Provider</h3>
              <button onClick={() => setShowSetup(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select value={newProvider.provider} onChange={e => setNewProvider(p => ({ ...p, provider: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white">
                  <option value="google">Google Workspace</option>
                  <option value="github">GitHub</option>
                  <option value="microsoft">Microsoft Azure AD</option>
                  <option value="okta">Okta</option>
                  <option value="auth0">Auth0</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input type="text" placeholder="Enter Client ID" value={newProvider.clientId} onChange={e => setNewProvider(p => ({ ...p, clientId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Secret</label>
                <input type="password" placeholder="Enter Client Secret" value={newProvider.clientSecret} onChange={e => setNewProvider(p => ({ ...p, clientSecret: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Allowed Domain (optional)</label>
                <input type="text" placeholder="e.g. yourcompany.com" value={newProvider.domain} onChange={e => setNewProvider(p => ({ ...p, domain: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowSetup(false)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={addProvider} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Add Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
