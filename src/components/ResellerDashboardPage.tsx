import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Globe, Palette, LogOut, TrendingUp, DollarSign, Star, Settings, Package, Plus, X, Check, Search, RefreshCw, Download, Mail, Phone, ChevronDown, ExternalLink, QrCode, CreditCard, Zap, Shield, Trash2, Eye, Edit3 } from 'lucide-react';
import { useToast } from './Toast';

interface Reseller {
  id: string; name: string; email: string; company: string; phone: string;
  plan: string; domain: string; logo: string; primaryColor: string;
  clients: number; revenue: string; joinedAt: string;
}

interface Client {
  id: string; name: string; email: string; phone: string;
  product: string; status: 'active' | 'pending' | 'suspended';
  createdAt: string; plan: string;
}

const PRODUCTS = [
  { id: 'google-reviews', name: 'AI Google Reviews QR', price: '₹499/mo', color: '#f59e0b', icon: <Star size={20} /> },
  { id: 'digital-vcard', name: 'Digital V-Card', price: '₹399/mo', color: '#6366f1', icon: <CreditCard size={20} /> },
  { id: 'website-builder', name: 'Website Builder', price: '₹599/mo', color: '#14b8a6', icon: <Globe size={20} /> },
];

const tabs = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'clients', label: 'Clients', icon: <Users size={18} /> },
  { id: 'branding', label: 'Branding', icon: <Palette size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

const plans = [
  { id: 'STARTER', name: 'Starter', maxClients: 5, price: '₹499/mo' },
  { id: 'PRO', name: 'Pro', maxClients: 25, price: '₹1499/mo' },
  { id: 'ENTERPRISE', name: 'Enterprise', maxClients: 100, price: '₹4999/mo' },
];

export default function ResellerDashboardPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', product: 'google-reviews', plan: 'STARTER' });
  const [branding, setBranding] = useState({ company: '', domain: '', logo: '', primaryColor: '#6366f1' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Check if reseller is logged in
  useEffect(() => {
    const token = localStorage.getItem('rp-token');
    if (token) {
      fetchResellerData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchResellerData = async () => {
    try {
      const token = localStorage.getItem('rp-token');
      if (!token) { setLoading(false); return; }

      const [resellerRes, clientsRes, brandingRes] = await Promise.all([
        fetch('/api/wl/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wl/clients', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/wl/branding', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const resellerData = await resellerRes.json();
      if (resellerData.success) setReseller(resellerData.data.reseller);

      const clientsData = await clientsRes.json();
      if (clientsData.success) setClients(clientsData.data.clients || []);

      const brandingData = await brandingRes.json();
      if (brandingData.success) setBranding(brandingData.data);
    } catch (err) {
      console.error('Failed to fetch reseller data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim()) { toast.error('Name and email required'); return; }
    try {
      const token = localStorage.getItem('rp-token');
      if (!token) { toast.error('Not authenticated'); return; }

      const res = await fetch('/api/wl/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newClient),
      });
      const data = await res.json();
      if (data.success) {
        setClients(prev => [...prev, data.data.client]);
        setShowAddClient(false);
        setNewClient({ name: '', email: '', phone: '', product: 'google-reviews', plan: 'STARTER' });
        toast.success('Client added!');
        fetchResellerData(); // refresh stats
      } else {
        toast.error(data.error || 'Failed to add client');
      }
    } catch (err) {
      toast.error('Failed to add client');
    }
  };

  const removeClient = async (id: string) => {
    try {
      const token = localStorage.getItem('rp-token');
      if (!token) return;

      await fetch(`/api/wl/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Client removed');
    } catch (err) {
      toast.error('Failed to remove client');
    }
  };

  const updateClientStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('rp-token');
      if (!token) return;

      await fetch(`/api/wl/clients/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setClients(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const saveBranding = async () => {
    try {
      const token = localStorage.getItem('rp-token');
      if (!token) { toast.error('Not authenticated'); return; }

      const res = await fetch('/api/wl/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(branding),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Branding saved!');
      } else {
        toast.error(data.error || 'Failed to save branding');
      }
    } catch (err) {
      toast.error('Failed to save branding');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rp-token');
    setReseller(null);
    setClients([]);
    toast.success('Logged out');
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingClients = clients.filter(c => c.status === 'pending').length;

  // Not logged in — show login prompt
  if (!loading && !reseller) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Reseller Hub</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Manage your clients, branding, and products. Sign in to access your reseller dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/reseller-login" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
              Sign In
            </a>
            <a href="/reseller-register" className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
              Register
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="text-indigo-500" /> Reseller Hub
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {reseller?.name} • {reseller?.company}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchResellerData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Clients', value: clients.length, icon: <Users size={20} className="text-indigo-500" /> },
              { label: 'Active Clients', value: activeClients, icon: <Check size={20} className="text-green-500" /> },
              { label: 'Pending', value: pendingClients, icon: <Package size={20} className="text-amber-500" /> },
              { label: 'Revenue', value: reseller?.revenue || '₹0', icon: <DollarSign size={20} className="text-emerald-500" /> },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Plan Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Current Plan</h3>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                <Zap size={24} className="text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">{reseller?.plan || 'Starter'}</p>
                <p className="text-sm text-gray-500">{plans.find(p => p.id === reseller?.plan)?.maxClients || 5} max clients</p>
              </div>
              <button className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Upgrade Plan</button>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Your Products</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {PRODUCTS.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg" style={{ background: `${p.color}20`, color: p.color }}>{p.icon}</div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.price}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{clients.filter(c => c.product === p.id).length} clients</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Clients */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Recent Clients</h3>
            {clients.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No clients yet. Add your first client!</p>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-medium text-indigo-600">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : c.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <button onClick={() => setShowAddClient(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus size={16} /> Add Client
            </button>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>{clients.length === 0 ? 'No clients yet' : 'No clients match your search'}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Created</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredClients.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-medium text-indigo-600">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm">{PRODUCTS.find(p => p.id === c.product)?.name || c.product}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select value={c.status} onChange={e => updateClientStatus(c.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${c.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : c.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{c.createdAt}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeClient(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Palette size={20} className="text-indigo-500" /> White-Label Branding</h3>
          <p className="text-sm text-gray-500 mb-6">Customize how your reseller portal looks to your clients.</p>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input type="text" value={branding.company} onChange={e => setBranding(p => ({ ...p, company: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Your Company Name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom Domain</label>
              <input type="text" value={branding.domain} onChange={e => setBranding(p => ({ ...p, domain: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="reseller.yourdomain.com" />
              <p className="text-xs text-gray-500 mt-1">Point a CNAME record to wl.bizzauto.com</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo URL</label>
              <input type="text" value={branding.logo} onChange={e => setBranding(p => ({ ...p, logo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="https://yourdomain.com/logo.png" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={branding.primaryColor} onChange={e => setBranding(p => ({ ...p, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                <input type="text" value={branding.primaryColor} onChange={e => setBranding(p => ({ ...p, primaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono text-sm" />
              </div>
            </div>
            <button onClick={saveBranding} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Branding</button>
          </div>

          {/* Preview */}
          <div className="mt-8 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-sm font-medium text-gray-500 mb-3">Preview</h4>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {branding.logo ? (
                  <img src={branding.logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: branding.primaryColor }}>R</div>
                )}
                <span className="font-semibold" style={{ color: branding.primaryColor }}>{branding.company || 'Your Company'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Account Settings</h3>
            <div className="space-y-3 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" defaultValue={reseller?.name} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" defaultValue={reseller?.email} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <input type="text" defaultValue={reseller?.company} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" defaultValue={reseller?.phone} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Changes</button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Plan & Billing</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map(p => (
                <div key={p.id} className={`p-4 rounded-xl border-2 ${reseller?.plan === p.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-2xl font-bold mt-1">{p.price}</p>
                  <p className="text-sm text-gray-500 mt-1">Up to {p.maxClients} clients</p>
                  {reseller?.plan === p.id && <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">Current Plan</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddClient(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Client</h3>
              <button onClick={() => setShowAddClient(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Client Name *" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="email" placeholder="Email *" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="tel" placeholder="Phone" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCTS.map(p => (
                    <button key={p.id} onClick={() => setNewClient(prev => ({ ...prev, product: p.id }))}
                      className={`p-2 rounded-lg border-2 text-center text-xs ${newClient.product === p.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className="mb-1" style={{ color: p.color }}>{p.icon}</div>
                      {p.name.split(' ').slice(0, 2).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Plan</label>
                <select value={newClient.plan} onChange={e => setNewClient(p => ({ ...p, plan: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <option value="STARTER">Starter (₹499/mo)</option>
                  <option value="PRO">Pro (₹1499/mo)</option>
                  <option value="ENTERPRISE">Enterprise (₹4999/mo)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAddClient(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={addClient} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
