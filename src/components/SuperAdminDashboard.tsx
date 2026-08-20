import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, Shield, DollarSign, RefreshCw,
  Image, Plus, Trash2, ExternalLink, Clock, Calendar, Server,
  FileText, CreditCard, ChevronLeft, ChevronRight, Search,
  LayoutDashboard, Flag
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../lib/api';
import InfrastructureHealthTab from './InfrastructureHealthTab';
import AuditLogTab from './AuditLogTab';
import SubscriptionsTab from './SubscriptionsTab';
import FeatureFlagsTab from './FeatureFlagsTab';

// ============================================================
// TYPES
// ============================================================

interface PlatformStats {
  totalBusinesses: number;
  totalUsers: number;
  totalContacts: number;
  totalMessages: number;
  totalRevenue: number;
  activeSubscriptions: number;
  planBreakdown: Record<string, number>;
  recentBusinesses?: any[];
}

interface GrowthDataPoint {
  month: string;
  businesses: number;
  users: number;
  revenue: number;
}

interface PlanDataPoint {
  name: string;
  value: number;
  color: string;
}

interface BusinessRecord {
  id: string;
  name: string;
  type: string;
  plan: string;
  users: number;
  contacts: number;
  messages: number;
  createdAt: string;
  _count?: { users: number; contacts: number; campaigns: number };
  subscriptions?: any[];
}

// ============================================================
// CONSTANTS
// ============================================================

const PLAN_COLORS: Record<string, string> = {
  FREE: '#6B7280',
  STARTER: '#3B82F6',
  GROWTH: '#10B981',
  PRO: '#F59E0B',
  AGENCY: '#8B5CF6',
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  { id: 'audit-log', label: 'Audit Log', icon: FileText },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'businesses', label: 'Businesses', icon: Building2 },
  { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
  { id: 'backgrounds', label: 'Backgrounds', icon: Image },
] as const;

type TabId = typeof TABS[number]['id'];

// ============================================================
// SUB-COMPONENTS
// ============================================================

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  change?: string;
  positive?: boolean;
}> = ({ title, value, icon, color, change, positive }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      {change && (
        <div className={`flex items-center gap-1 text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}
        </div>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

// ============================================================
// USERS SUB-TAB (Inline business management table)
// ============================================================

function UsersSubTab() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search.trim()) params.search = search.trim();
      const res = await superAdminAPI.listUsers(params);
      if (res.data?.success) {
        setUsers(res.data.data.users);
        setTotalPages(res.data.data.pagination.totalPages);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500" />
        </form>
        <button onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors">
          <Users size={16} /> Full User Management
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center"><RefreshCw size={24} className="animate-spin text-purple-500 mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name || 'No name'}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                        u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'MEMBER' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.business?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

// ============================================================
// BUSINESSES SUB-TAB (Inline table)
// ============================================================

function BusinessesSubTab() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const limit = 20;

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (planFilter) params.plan = planFilter;
      const res = await superAdminAPI.listBusinesses(params);
      if (res.data?.success) {
        const data = res.data.data;
        setBusinesses(data.businesses || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, limit, search, planFilter]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search businesses..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500" />
        </form>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500">
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="PRO">Pro</option>
          <option value="AGENCY">Agency</option>
        </select>
        <span className="text-sm text-gray-400 self-center">{total} total</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Contacts</th>
                <th className="px-4 py-3">Campaigns</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center"><RefreshCw size={24} className="animate-spin text-purple-500 mx-auto" /></td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No businesses found</td></tr>
              ) : (
                businesses.map((biz: any) => (
                  <tr key={biz.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {biz.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{biz.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{biz.type || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        biz.plan === 'FREE' ? 'bg-gray-100 text-gray-700' :
                        biz.plan === 'STARTER' ? 'bg-blue-100 text-blue-700' :
                        biz.plan === 'GROWTH' ? 'bg-green-100 text-green-700' :
                        biz.plan === 'PRO' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{biz.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{biz._count?.users || biz.users || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{biz._count?.contacts || biz.contacts || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{biz._count?.campaigns || 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(biz.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

// ============================================================
// MAIN COMPONENT
// ============================================================

const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [planData, setPlanData] = useState<PlanDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backgrounds state
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [showAddBg, setShowAddBg] = useState(false);
  const [bgForm, setBgForm] = useState({ name: '', imageUrl: '', thumbnailUrl: '', category: 'general', scheduleType: 'manual', expiresAt: '' });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsRes, growthRes] = await Promise.allSettled([
        superAdminAPI.getStats(),
        superAdminAPI.getGrowth(),
      ]);

      // Stats
      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data);
      } else {
        setStats(null);
      }

      // Growth
      if (growthRes.status === 'fulfilled' && growthRes.value?.data?.success) {
        setGrowthData(growthRes.value.data.data || []);
      } else {
        setGrowthData([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch dashboard data');
      setStats(null);
      setGrowthData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build plan data from stats
  useEffect(() => {
    if (stats?.planBreakdown) {
      const plans = Object.entries(stats.planBreakdown)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: PLAN_COLORS[name] || '#6B7280',
        }));
      setPlanData(plans);
    } else {
      setPlanData([]);
    }
  }, [stats]);

  const formatCurrency = (val: number) =>
    val > 0 ? '₹' + val.toLocaleString('en-IN') : '₹0';

  // Background handlers
  const fetchBackgrounds = useCallback(async () => {
    setBgLoading(true);
    try {
      const res = await superAdminAPI.listBackgrounds();
      if (res.data?.success) setBackgrounds(res.data.data || []);
    } catch { setBackgrounds([]); }
    finally { setBgLoading(false); }
  }, []);

  const handleAddBg = async () => {
    if (!bgForm.name.trim() || !bgForm.imageUrl.trim()) return;
    try {
      await superAdminAPI.createBackground(bgForm);
      setShowAddBg(false);
      setBgForm({ name: '', imageUrl: '', thumbnailUrl: '', category: 'general', scheduleType: 'manual', expiresAt: '' });
      fetchBackgrounds();
    } catch { alert('Failed to add background'); }
  };

  const handleDeleteBg = async (id: string) => {
    if (!confirm('Delete this background?')) return;
    try {
      await superAdminAPI.deleteBackground(id);
      fetchBackgrounds();
    } catch { alert('Failed to delete'); }
  };

  const handleToggleBg = async (bg: any) => {
    try {
      await superAdminAPI.updateBackground(bg.id, { isActive: !bg.isActive });
      fetchBackgrounds();
    } catch { alert('Failed to update'); }
  };

  // Loading state
  if (loading && activeTab === 'dashboard') {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw size={48} className="text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Dashboard</h2>
          <p className="text-gray-500">Fetching platform-wide data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-purple-600" size={28} />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Super Admin</h1>
        </div>
        <p className="text-gray-500 text-sm">Platform-wide management console</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'backgrounds') fetchBackgrounds();
            }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Platform Overview</h2>
                <p className="text-gray-500 text-sm mt-1">Key metrics across all businesses</p>
              </div>
              <button onClick={() => fetchData(true)} disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50 font-medium text-sm transition-colors">
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <Shield size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Backend Not Connected</p>
                <p className="text-xs text-yellow-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!stats && !loading && (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <Shield size={64} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h2>
                <p className="text-gray-500 mb-4">Connect the backend to see platform statistics.</p>
                <button onClick={() => fetchData(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium mx-auto">
                  <RefreshCw size={16} /> Retry
                </button>
              </div>
            </div>
          )}

          {stats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
                <StatCard title="Total Businesses" value={stats.totalBusinesses > 0 ? stats.totalBusinesses.toString() : '0'}
                  icon={<Building2 size={24} />} color="bg-blue-50 text-blue-600"
                  change={stats.totalBusinesses > 0 ? '+12%' : undefined} positive />
                <StatCard title="Total Users" value={stats.totalUsers > 0 ? stats.totalUsers.toLocaleString() : '0'}
                  icon={<Users size={24} />} color="bg-green-50 text-green-600"
                  change={stats.totalUsers > 0 ? '+8%' : undefined} positive />
                <StatCard title="Total Messages" value={stats.totalMessages > 0 ? (stats.totalMessages / 1000).toFixed(0) + 'K' : '0'}
                  icon={<MessageSquare size={24} />} color="bg-purple-50 text-purple-600"
                  change={stats.totalMessages > 0 ? '+15%' : undefined} positive />
                <StatCard title="Monthly Revenue" value={formatCurrency(stats.totalRevenue)}
                  icon={<DollarSign size={24} />} color="bg-yellow-50 text-yellow-600"
                  change={stats.totalRevenue > 0 ? '+22%' : undefined} positive />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Growth Trend {growthData.length > 0 ? '(Last 7 Months)' : '(No Data)'}
                  </h3>
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="businesses" stroke="#3B82F6" strokeWidth={2} name="Businesses" />
                        <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2} name="Users" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                      <p>Growth data will appear when the backend is connected.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign size={20} className="text-green-600" />
                    Monthly Revenue {growthData.length > 0 ? '(₹)' : '(No Data)'}
                  </h3>
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                      <p>Revenue data will appear when the backend is connected.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8">
                {/* Plan Distribution */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
                  {planData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={planData} cx="50%" cy="50%" labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                            {planData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {planData.map((plan) => (
                          <div key={plan.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                              <span className="text-gray-600">{plan.name}</span>
                            </div>
                            <span className="font-semibold text-gray-900">{plan.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-gray-400">
                      <p>Plan data will appear when connected.</p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 mb-1">Active Subscriptions</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.activeSubscriptions > 0 ? stats.activeSubscriptions : '0'}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">Total Contacts</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.totalContacts > 0 ? (stats.totalContacts / 1000).toFixed(1) + 'K' : '0'}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 mb-1">Avg Revenue/Business</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-700">
                        {stats.activeSubscriptions > 0 && stats.totalRevenue > 0
                          ? formatCurrency(Math.round(stats.totalRevenue / stats.activeSubscriptions))
                          : '₹0'}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-600 mb-1">Users per Business</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-700">
                        {stats.totalBusinesses > 0 && stats.totalUsers > 0
                          ? (stats.totalUsers / stats.totalBusinesses).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'infrastructure' && <InfrastructureHealthTab />}
      {activeTab === 'audit-log' && <AuditLogTab />}
      {activeTab === 'subscriptions' && <SubscriptionsTab />}
      {activeTab === 'users' && <UsersSubTab />}
      {activeTab === 'businesses' && <BusinessesSubTab />}
      {activeTab === 'feature-flags' && <FeatureFlagsTab />}

      {/* Backgrounds Tab */}
      {activeTab === 'backgrounds' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Poster Backgrounds</h2>
              <p className="text-gray-500 text-sm mt-1">Upload background images that users can use in Creative Studio</p>
            </div>
            <button onClick={() => setShowAddBg(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
              <Plus size={16} /> Add Background
            </button>
          </div>

          {/* Add Background Modal */}
          {showAddBg && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowAddBg(false)}>
              <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add Poster Background</h3>
                  <button onClick={() => setShowAddBg(false)} className="text-gray-400 hover:text-gray-600"><Trash2 size={18} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                    <input type="text" value={bgForm.name} onChange={(e) => setBgForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Diwali 2026 Background" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Image URL *</label>
                    <input type="url" value={bgForm.imageUrl} onChange={(e) => setBgForm(f => ({ ...f, imageUrl: e.target.value, thumbnailUrl: e.target.value }))}
                      placeholder="https://example.com/background.jpg" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm" />
                  </div>
                  {bgForm.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 h-32">
                      <img src={bgForm.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                      <select value={bgForm.category} onChange={(e) => setBgForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm">
                        <option value="general">General</option>
                        <option value="festival">Festival</option>
                        <option value="offer">Offer</option>
                        <option value="seasonal">Seasonal</option>
                        <option value="wedding">Wedding</option>
                        <option value="birthday">Birthday</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Schedule</label>
                      <select value={bgForm.scheduleType} onChange={(e) => setBgForm(f => ({ ...f, scheduleType: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm">
                        <option value="manual">Manual</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Expires At (optional)</label>
                    <input type="date" value={bgForm.expiresAt} onChange={(e) => setBgForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm" />
                  </div>
                  <button onClick={handleAddBg}
                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
                    Add Background
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backgrounds List */}
          {bgLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={32} className="text-purple-500 animate-spin" />
            </div>
          ) : backgrounds.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <Image size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600 mb-1">No backgrounds yet</p>
              <p className="text-sm">Click "Add Background" to upload your first poster background</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {backgrounds.map((bg: any) => (
                <div key={bg.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    <img src={bg.imageUrl} alt={bg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999" font-size="10">No Image</text></svg>'; }} />
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${bg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {bg.isActive ? 'Active' : 'Inactive'}
                    </div>
                    {bg.scheduleType !== 'manual' && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium flex items-center gap-1">
                        <Clock size={10} /> {bg.scheduleType}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{bg.name}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">{bg.category} · {bg.usageCount || 0} uses</p>
                    {bg.expiresAt && (
                      <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> Expires {new Date(bg.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      <button onClick={() => handleToggleBg(bg)}
                        className={`text-[10px] font-medium px-2 py-1 rounded-lg ${bg.isActive ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {bg.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <a href={bg.imageUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-medium px-2 py-1 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center gap-1">
                        <ExternalLink size={10} /> View
                      </a>
                      <button onClick={() => handleDeleteBg(bg.id)}
                        className="text-[10px] font-medium px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 ml-auto">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
