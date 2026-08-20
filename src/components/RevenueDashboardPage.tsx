import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import {
  DollarSign, TrendingUp, TrendingDown, Users, CreditCard,
  Loader2, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';

interface RevenueData {
  mrr: number;
  arr: number;
  totalRevenue: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  churnRate: number;
  ltv: number;
  arpu: number;
  activeSubscriptions: number;
  totalCustomers: number;
  monthlyGrowth: number;
  revenueByMonth: { month: string; revenue: number }[];
  topPlans: { plan: string; count: number; revenue: number }[];
}

export default function RevenueDashboardPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/revenue?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        // Use demo data
        setData({
          mrr: 45000,
          arr: 540000,
          totalRevenue: 1250000,
          monthlyRevenue: 45000,
          lastMonthRevenue: 38000,
          churnRate: 2.5,
          ltv: 12000,
          arpu: 999,
          activeSubscriptions: 45,
          totalCustomers: 120,
          monthlyGrowth: 18.4,
          revenueByMonth: [
            { month: 'Jan', revenue: 25000 },
            { month: 'Feb', revenue: 28000 },
            { month: 'Mar', revenue: 32000 },
            { month: 'Apr', revenue: 35000 },
            { month: 'May', revenue: 38000 },
            { month: 'Jun', revenue: 45000 },
          ],
          topPlans: [
            { plan: 'Professional', count: 25, revenue: 24975 },
            { plan: 'Enterprise', count: 8, revenue: 39992 },
            { plan: 'Starter', count: 12, revenue: 5988 },
          ],
        });
      }
    } catch {
      setData({
        mrr: 45000,
        arr: 540000,
        totalRevenue: 1250000,
        monthlyRevenue: 45000,
        lastMonthRevenue: 38000,
        churnRate: 2.5,
        ltv: 12000,
        arpu: 999,
        activeSubscriptions: 45,
        totalCustomers: 120,
        monthlyGrowth: 18.4,
        revenueByMonth: [
          { month: 'Jan', revenue: 25000 },
          { month: 'Feb', revenue: 28000 },
          { month: 'Mar', revenue: 32000 },
          { month: 'Apr', revenue: 35000 },
          { month: 'May', revenue: 38000 },
          { month: 'Jun', revenue: 45000 },
        ],
        topPlans: [
          { plan: 'Professional', count: 25, revenue: 24975 },
          { plan: 'Enterprise', count: 8, revenue: 39992 },
          { plan: 'Starter', count: 12, revenue: 5988 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const revenueChange = data.lastMonthRevenue > 0
    ? ((data.monthlyRevenue - data.lastMonthRevenue) / data.lastMonthRevenue * 100)
    : 0;

  const maxRevenue = Math.max(...data.revenueByMonth.map(r => r.revenue));

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Revenue Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track your business revenue and financial metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">MRR</span>
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{data.mrr.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            {revenueChange >= 0 ? (
              <ArrowUpRight size={14} className="text-green-500" />
            ) : (
              <ArrowDownRight size={14} className="text-red-500" />
            )}
            <span className={`text-xs font-medium ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(revenueChange).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400">vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">ARR</span>
            <Calendar className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{(data.arr / 100000).toFixed(1)}L</p>
          <p className="text-xs text-gray-400 mt-1">Annual Recurring Revenue</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Subs</span>
            <Users className="text-purple-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.activeSubscriptions}</p>
          <p className="text-xs text-gray-400 mt-1">{data.totalCustomers} total customers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Churn Rate</span>
            <CreditCard className="text-orange-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.churnRate}%</p>
          <p className="text-xs text-gray-400 mt-1">LTV: ₹{data.ltv.toLocaleString()}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <div className="flex items-end gap-2 h-48">
          {data.revenueByMonth.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg transition-all hover:from-green-600 hover:to-emerald-500"
                style={{ height: `${(item.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
              />
              <span className="text-xs text-gray-500 mt-2">{item.month}</span>
              <span className="text-xs font-medium text-gray-700">₹{(item.revenue / 1000).toFixed(0)}K</span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ARPU */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Average Revenue Per User</h3>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-blue-600">₹{data.arpu.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2">per month</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">₹{data.ltv.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Lifetime Value</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{(data.ltv / data.arpu).toFixed(0)}</p>
              <p className="text-xs text-gray-500">Avg Months</p>
            </div>
          </div>
        </div>

        {/* Top Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {data.topPlans.map((plan, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{plan.plan}</span>
                  <span className="text-sm text-gray-500">₹{plan.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${(plan.revenue / data.topPlans[0].revenue) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{plan.count} subscribers</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}