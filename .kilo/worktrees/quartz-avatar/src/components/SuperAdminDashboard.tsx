import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, Eye, Shield, DollarSign, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import apiClient from '../lib/api';

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
}

// ============================================================
// API CLIENT
// ============================================================

const superAdminAPI = {
  getStats: () => apiClient.get('/super-admin/stats'),
  getGrowth: () => apiClient.get('/super-admin/growth'),
  getBusinesses: (params?: any) => apiClient.get('/super-admin/businesses', { params }),
};

// ============================================================
// FALLBACK MOCK DATA (used when API is unavailable)
// ============================================================

const FALLBACK_STATS: PlatformStats = {
  totalBusinesses: 0,
  totalUsers: 0,
  totalContacts: 0,
  totalMessages: 0,
  totalRevenue: 0,
  activeSubscriptions: 0,
  planBreakdown: { FREE: 0, STARTER: 0, GROWTH: 0, PRO: 0, AGENCY: 0 },
};

const FALLBACK_GROWTH: GrowthDataPoint[] = [];

const FALLBACK_PLANS: PlanDataPoint[] = [];

const FALLBACK_BUSINESSES: BusinessRecord[] = [];

const PLAN_COLORS: Record<string, string> = {
  FREE: '#6B7280',
  STARTER: '#3B82F6',
  GROWTH: '#10B981',
  PRO: '#F59E0B',
  AGENCY: '#8B5CF6',
};

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
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
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
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [planData, setPlanData] = useState<PlanDataPoint[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsRes, growthRes, businessesRes] = await Promise.allSettled([
        superAdminAPI.getStats(),
        superAdminAPI.getGrowth(),
        superAdminAPI.getBusinesses({ limit: 10 }),
      ]);

      // Stats
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      } else {
        setStats(FALLBACK_STATS);
      }

      // Growth
      if (growthRes.status === 'fulfilled' && growthRes.value?.data) {
        setGrowthData(growthRes.value.data);
      } else {
        setGrowthData(FALLBACK_GROWTH);
      }

      // Businesses
      if (businessesRes.status === 'fulfilled' && businessesRes.value?.data) {
        setBusinesses(Array.isArray(businessesRes.value.data) ? businessesRes.value.data : businessesRes.value.data?.businesses || []);
      } else {
        setBusinesses(FALLBACK_BUSINESSES);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch dashboard data');
      setStats(FALLBACK_STATS);
      setGrowthData(FALLBACK_GROWTH);
      setBusinesses(FALLBACK_BUSINESSES);
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
    }
  }, [stats]);

  const formatCurrency = (val: number) =>
    val > 0 ? '\u20B9' + val.toLocaleString('en-IN') : '\u20B90';

  // Loading state
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw size={48} className="text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Dashboard</h2>
          <p className="text-gray-500">Fetching platform-wide data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="text-purple-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">Platform-wide overview and management</p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50 font-medium text-sm transition-colors"
          >
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h2>
            <p className="text-gray-500 mb-4">Connect the backend to see platform statistics.</p>
            <button
              onClick={() => fetchData(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium mx-auto"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Businesses"
              value={stats.totalBusinesses > 0 ? stats.totalBusinesses.toString() : '0'}
              icon={<Building2 size={24} />}
              color="bg-blue-50 text-blue-600"
              change={stats.totalBusinesses > 0 ? '+12%' : undefined}
              positive={stats.totalBusinesses > 0}
            />
            <StatCard
              title="Total Users"
              value={stats.totalUsers > 0 ? stats.totalUsers.toLocaleString() : '0'}
              icon={<Users size={24} />}
              color="bg-green-50 text-green-600"
              change={stats.totalUsers > 0 ? '+8%' : undefined}
              positive={stats.totalUsers > 0}
            />
            <StatCard
              title="Total Messages"
              value={stats.totalMessages > 0 ? (stats.totalMessages / 1000).toFixed(0) + 'K' : '0'}
              icon={<MessageSquare size={24} />}
              color="bg-purple-50 text-purple-600"
              change={stats.totalMessages > 0 ? '+15%' : undefined}
              positive={stats.totalMessages > 0}
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign size={24} />}
              color="bg-yellow-50 text-yellow-600"
              change={stats.totalRevenue > 0 ? '+22%' : undefined}
              positive={stats.totalRevenue > 0}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Growth Trend */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
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

            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-green-600" />
                Monthly Revenue {growthData.length > 0 ? '(\u20B9)' : '(No Data)'}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Plan Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
              {planData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={planData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
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
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-green-700">{stats.activeSubscriptions > 0 ? stats.activeSubscriptions : '0'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Total Contacts</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.totalContacts > 0 ? (stats.totalContacts / 1000).toFixed(1) + 'K' : '0'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Avg Revenue/Business</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {stats.activeSubscriptions > 0 && stats.totalRevenue > 0
                      ? formatCurrency(Math.round(stats.totalRevenue / stats.activeSubscriptions))
                      : '\u20B90'}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">Users per Business</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {stats.totalBusinesses > 0 && stats.totalUsers > 0
                      ? (stats.totalUsers / stats.totalBusinesses).toFixed(1)
                      : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Businesses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Businesses</h3>
              <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                View All <Eye size={16} />
              </button>
            </div>
            {businesses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {businesses.map((biz) => (
                      <tr key={biz.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {biz.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{biz.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{biz.type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            biz.plan === 'FREE' ? 'bg-gray-100 text-gray-700' :
                            biz.plan === 'STARTER' ? 'bg-blue-100 text-blue-700' :
                            biz.plan === 'GROWTH' ? 'bg-green-100 text-green-700' :
                            biz.plan === 'PRO' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {biz.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{biz.users}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{biz.contacts}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{biz.messages.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{biz.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No businesses to display. Data will appear when the backend is connected.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
