import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, DollarSign, ShoppingCart, TrendingUp, BarChart3,
  Loader2, RefreshCw, Package, CreditCard, PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
  image?: string;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  revenue: number;
}

interface OrderStatusBreakdown {
  status: string;
  count: number;
  color: string;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  total: number;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  categories: CategoryBreakdown[];
  ordersByStatus: OrderStatusBreakdown[];
  paymentMethods: PaymentMethodBreakdown[];
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4'];

const SalesAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/store-features/analytics', { params: { period } });
      const payload = res.data?.data || res.data || {};
      // Backend uses topCategories + paymentMethodBreakdown; ordersByStatus is a Record<string, number>
      // Normalize to what the UI expects
      const rawStatus = payload.ordersByStatus;
      const ordersByStatus = Array.isArray(rawStatus)
        ? rawStatus
        : rawStatus && typeof rawStatus === 'object'
        ? Object.entries(rawStatus).map(([status, count]) => ({ status, count: Number(count) || 0, color: '' }))
        : [];
      const normalized: AnalyticsData = {
        totalRevenue: payload.totalRevenue || 0,
        totalOrders: payload.totalOrders || 0,
        averageOrderValue: payload.averageOrderValue || 0,
        revenueGrowth: payload.revenueGrowth || 0,
        dailyRevenue: payload.dailyRevenue || [],
        topProducts: payload.topProducts || [],
        categories: payload.topCategories || payload.categories || [],
        ordersByStatus,
        paymentMethods: payload.paymentMethodBreakdown || payload.paymentMethods || [],
      };
      setData(normalized);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-5 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ecommerce')}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={28} />
                Sales Analytics
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track your store performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className={`text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {([
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' },
          ] as const).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-5 md:p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={fetchAnalytics} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalRevenue || 0)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Orders</span>
                  <ShoppingCart size={20} className="text-blue-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{data.totalOrders}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</span>
                  <TrendingUp size={20} className="text-purple-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.averageOrderValue || 0)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Revenue Growth</span>
                  <TrendingUp size={20} className={data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'} />
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${(data.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(data.revenueGrowth || 0) >= 0 ? '+' : ''}{Number(data.revenueGrowth || 0).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Revenue Chart */}
            {data.dailyRevenue?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={data.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6">
              {/* Top Products */}
              {data.topProducts?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Package size={18} className="text-blue-600" />
                    Top Products
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">#</th>
                          <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Product</th>
                          <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Qty</th>
                          <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProducts.slice(0, 10).map((p, i) => (
                          <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                            <td className="py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                            <td className="py-2 text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{p.name}</td>
                            <td className="py-2 text-right text-gray-600 dark:text-gray-300">{p.quantity}</td>
                            <td className="py-2 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {data.categories?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChartIcon size={18} className="text-purple-600" />
                    Categories
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.categories}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {data.categories.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Orders']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* Orders by Status */}
              {data.ordersByStatus?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Orders by Status</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.ordersByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {data.ordersByStatus.map((entry, i) => (
                          <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Payment Methods */}
              {data.paymentMethods?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-green-600" />
                    Payment Methods
                  </h3>
                  <div className="space-y-3">
                    {data.paymentMethods.map((pm, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-gray-900 dark:text-white font-medium capitalize">{pm.method}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 dark:text-white font-medium">{pm.count} orders</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(pm.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesAnalyticsPage;
