import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Users, Calendar, Star, RefreshCw, Smartphone,
  TrendingUp, DollarSign, Target, Clock, ArrowUpRight, ArrowDownRight,
  Zap, Brain, Eye, BarChart3, Phone, Mail, Send, Bot, Sparkles,
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { useAuthStore } from '../lib/authStore';
import { analyticsAPI, leadsAPI } from '../lib/api';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 1000 }) => {
  const [current, setCurrent] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!hasAnimated) {
      setHasAnimated(true);
      const animate = () => {
        let start = 0;
        const increment = value / (duration / 16);
        const handle = setInterval(() => {
          start += increment;
          if (start >= value) {
            clearInterval(handle);
            start = value;
          }
          setCurrent(Math.floor(start));
        }, 16);
      };
      animate();
    }
  }, [value, hasAnimated, duration]);

  return <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{current}</span>;
};

interface LeadContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  stage?: string;
  dealValue?: number;
  lastActivity?: string;
  avatar?: string;
}

interface AnalyticsData {
  name: string;
  messages: number;
  posts: number;
  leads: number;
}

interface PipelineData {
  name: string;
  value: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, positive, icon }) => (
  <div className="modern-card card-futuristic hover-lift rounded-xl md:rounded-2xl p-4 md:p-5 animate-fade-in-up">
    <div className="flex items-center justify-between mb-3 md:mb-4">
      <div className="p-2 md:p-2.5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-lg md:rounded-xl text-blue-600 dark:text-blue-400 glow-effect">{icon}</div>
      <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${positive ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
        {change}
      </span>
    </div>
    <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium mb-1">{title}</h3>
    {typeof value === 'number' ? (
      <AnimatedNumber value={value} />
    ) : (
      <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">{value}</p>
    )}
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">Loading dashboard...</p>
    </div>
  </div>
);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuthStore();
  const userName = user?.name || 'Admin';
  const setActiveModule = (m: string) => { navigate('/' + m); };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatCardProps[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadContact[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter'>('week');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  // Demo mode data - 8 KPI Cards
  const demoStats: StatCardProps[] = [
    {
      title: 'Revenue Today',
      value: '₹45,200',
      change: '+18%',
      positive: true,
      icon: <DollarSign size={24} />,
    },
    {
      title: 'Leads Today',
      value: 24,
      change: '+12%',
      positive: true,
      icon: <Users size={24} />,
    },
    {
      title: 'Messages Sent',
      value: 156,
      change: '+8%',
      positive: true,
      icon: <MessageSquare size={24} />,
    },
    {
      title: 'Conversion Rate',
      value: '12.5%',
      change: '+2.3%',
      positive: true,
      icon: <Target size={24} />,
    },
    {
      title: 'Pipeline Value',
      value: '₹8.5L',
      change: '+15%',
      positive: true,
      icon: <TrendingUp size={24} />,
    },
    {
      title: 'Appointments',
      value: 6,
      change: '+2',
      positive: true,
      icon: <Calendar size={24} />,
    },
    {
      title: 'Avg. Rating',
      value: '4.8',
      change: '+0.2',
      positive: true,
      icon: <Star size={24} />,
    },
    {
      title: 'Pending Tasks',
      value: 12,
      change: '-3',
      positive: true,
      icon: <Clock size={24} />,
    },
  ];

  const demoAnalyticsData: AnalyticsData[] = [
    { name: 'Mon', messages: 45, posts: 8, leads: 12 },
    { name: 'Tue', messages: 52, posts: 10, leads: 15 },
    { name: 'Wed', messages: 38, posts: 6, leads: 10 },
    { name: 'Thu', messages: 65, posts: 12, leads: 18 },
    { name: 'Fri', messages: 78, posts: 15, leads: 22 },
    { name: 'Sat', messages: 42, posts: 8, leads: 14 },
    { name: 'Sun', messages: 35, posts: 5, leads: 11 },
  ];

  const demoRevenueData = [
    { name: 'Jan', revenue: 120000, expenses: 45000 },
    { name: 'Feb', revenue: 150000, expenses: 52000 },
    { name: 'Mar', revenue: 180000, expenses: 48000 },
    { name: 'Apr', revenue: 220000, expenses: 55000 },
    { name: 'May', revenue: 195000, expenses: 50000 },
    { name: 'Jun', revenue: 250000, expenses: 58000 },
  ];

  const demoActivityFeed = [
    { id: 1, type: 'lead', icon: <Users size={16} />, color: 'blue', message: 'New lead captured from WhatsApp', time: '2 min ago' },
    { id: 2, type: 'deal', icon: <TrendingUp size={16} />, color: 'green', message: 'Deal closed: ₹45,000 - Priya Enterprises', time: '15 min ago' },
    { id: 3, type: 'message', icon: <MessageSquare size={16} />, color: 'purple', message: '12 new messages received', time: '30 min ago' },
    { id: 4, type: 'review', icon: <Star size={16} />, color: 'orange', message: 'New 5-star review from Rahul Verma', time: '1 hour ago' },
    { id: 5, type: 'appointment', icon: <Calendar size={16} />, color: 'indigo', message: 'Meeting scheduled with Sharma Corp', time: '2 hours ago' },
  ];

  const demoInsights = [
    { id: 1, icon: <Brain size={18} />, title: 'Lead Response Time', value: '8 min avg', suggestion: 'Your response time is 40% faster than last week!', trend: 'up' },
    { id: 2, icon: <Target size={18} />, title: 'Best Performing Source', value: 'WhatsApp', suggestion: '65% of conversions come from WhatsApp leads', trend: 'up' },
    { id: 3, icon: <Zap size={18} />, title: 'Campaign Opportunity', value: 'Festival Season', suggestion: 'Run a Diwali campaign - last year saw 3x revenue', trend: 'up' },
  ];

  const demoPipelineData: PipelineData[] = [
    { name: 'New Leads', value: 45, color: '#3B82F6' },
    { name: 'Contacted', value: 32, color: '#10B981' },
    { name: 'Qualified', value: 28, color: '#F59E0B' },
    { name: 'Proposal', value: 18, color: '#8B5CF6' },
    { name: 'Closed', value: 12, color: '#EF4444' },
  ];

  const demoRecentLeads: LeadContact[] = [
    { id: '1', name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul@example.com', tags: ['Hot Lead'], stage: 'Qualified', dealValue: 45000, lastActivity: '2 hours ago', avatar: 'RS' },
    { id: '2', name: 'Priya Patel', phone: '+91 87654 32109', email: 'priya@example.com', tags: ['New'], stage: 'New Lead', dealValue: 28000, lastActivity: '5 hours ago', avatar: 'PP' },
    { id: '3', name: 'Amit Kumar', phone: '+91 76543 21098', email: 'amit@example.com', tags: ['Follow-up'], stage: 'Contacted', dealValue: 62000, lastActivity: '1 day ago', avatar: 'AK' },
    { id: '4', name: 'Sneha Gupta', phone: '+91 65432 10987', email: 'sneha@example.com', tags: ['Hot Lead'], stage: 'Proposal', dealValue: 85000, lastActivity: '2 days ago', avatar: 'SG' },
  ];

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    // If in demo mode, use mock data
    if (isDemoMode) {
      setStats(demoStats);
      setAnalyticsData(demoAnalyticsData);
      setPipelineData(demoPipelineData);
      setRecentLeads(demoRecentLeads);
      setRevenueData(demoRevenueData);
      setActivityFeed(demoActivityFeed);
      setInsights(demoInsights);
      setLoading(false);
      return;
    }

    try {
      const [dashboardRes, leadsRes] = await Promise.all([
        analyticsAPI.dashboard(),
        leadsAPI.list({ limit: 4 }),
      ]);

      const dashData = dashboardRes.data?.data || dashboardRes.data;

      // Build stats from API response
      const statsData: StatCardProps[] = [
        {
          title: 'Leads Today',
          value: dashData?.stats?.leadsToday ?? 0,
          change: dashData?.stats?.leadsChange ?? '+0%',
          positive: (dashData?.stats?.leadsChange ?? '+0%').includes('+'),
          icon: <Users size={24} />,
        },
        {
          title: 'Messages Sent',
          value: dashData?.stats?.messagesToday ?? 0,
          change: dashData?.stats?.messagesChange ?? '+0%',
          positive: (dashData?.stats?.messagesChange ?? '+0%').includes('+'),
          icon: <MessageSquare size={24} />,
        },
        {
          title: 'Scheduled Posts',
          value: dashData?.stats?.scheduledPosts ?? 0,
          change: dashData?.stats?.postsChange ?? '+0%',
          positive: (dashData?.stats?.postsChange ?? '+0%').includes('+'),
          icon: <Calendar size={24} />,
        },
        {
          title: 'Avg. Rating',
          value: dashData?.stats?.avgRating != null ? `${dashData.stats.avgRating}` : 'N/A',
          change: dashData?.stats?.ratingChange ?? '+0',
          positive: true,
          icon: <Star size={24} />,
        },
      ];
      setStats(statsData);

      // Set analytics chart data
      const chartData = dashData?.data?.chartData ?? [];
      setAnalyticsData(Array.isArray(chartData) ? chartData : []);

      // Set pipeline distribution
      const pipeData = dashData?.data?.pipeline ?? [];
      setPipelineData(Array.isArray(pipeData) ? pipeData : []);

      // Set recent leads
      const leads = leadsRes.data?.data ?? [];
      const formattedLeads: LeadContact[] = (Array.isArray(leads) ? leads : []).map((lead: any) => ({
        id: lead._id || lead.id,
        name: lead.name || 'Unknown',
        phone: lead.phone || 'N/A',
        email: lead.email,
        tags: lead.tags || [],
        stage: lead.stage || 'New Lead',
        dealValue: lead.dealValue || 0,
        lastActivity: lead.lastActivity || 'Recently',
        avatar: (lead.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      }));
      setRecentLeads(formattedLeads);

      // Set revenue data from API (fallback to demo)
      const revData = dashData?.data?.revenue ?? [];
      setRevenueData(Array.isArray(revData) && revData.length > 0 ? revData : demoRevenueData);

      // Set activity feed from API (fallback to demo)
      const actData = dashData?.data?.activity ?? [];
      setActivityFeed(Array.isArray(actData) && actData.length > 0 ? actData : demoActivityFeed);

      // Set AI insights from API (fallback to demo)
      const insData = dashData?.data?.insights ?? [];
      setInsights(Array.isArray(insData) && insData.length > 0 ? insData : demoInsights);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in-up">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in-up">
        <div className="modern-card rounded-2xl p-8 text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in-up">
      <div className="mb-5 sm:mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Welcome back, {userName}!</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Date Range Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {(['today', 'week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  dateRange === range
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 8 KPI Cards - 2 rows of 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-8 stagger-children">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Row: Activity + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-5 sm:mb-6 md:mb-8">
        <div className="lg:col-span-2 modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Activity Overview</h3>
          {analyticsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <RechartsTooltip />
                <Legend />
                <Area type="monotone" dataKey="messages" stroke="#3B82F6" fill="url(#colorMessages)" strokeWidth={2} name="Messages" />
                <Area type="monotone" dataKey="leads" stroke="#10B981" fill="url(#colorLeads)" strokeWidth={2} name="Leads" />
                <Line type="monotone" dataKey="posts" stroke="#F59E0B" strokeWidth={2} name="Posts" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
              No activity data available
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Live Activity</h3>
          <div className="space-y-2 sm:space-y-3">
            {activityFeed.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5 sm:gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                  activity.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  activity.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                  activity.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words">{activity.message}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-5 sm:mb-6 md:mb-8">
        <div className="lg:col-span-2 modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Brain className="text-purple-600 dark:text-purple-400" size={18} />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-2.5 sm:p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl border border-purple-200/50 dark:border-purple-800/30">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className="flex-shrink-0">{insight.icon}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{insight.title}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">{insight.value}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">{insight.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Claude AI Cost Savings Widget */}
      <div className="modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 mb-5 sm:mb-6 md:mb-8 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border-emerald-200 dark:border-emerald-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Claude AI Cost Savings</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Smart WhatsApp + SMS routing</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModule('whatsapp')}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors border border-emerald-200 dark:border-emerald-700"
          >
            <Sparkles size={14} />
            Configure
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/50">
            <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-0.5">Saved This Month</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">₹3,247</p>
            <p className="text-[10px] text-gray-500">vs. always-Meta baseline</p>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/50">
            <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 font-medium mb-0.5">Channel Mix</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">62%</p>
            <p className="text-[10px] text-gray-500">WhatsApp / 38% SMS</p>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/50">
            <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-300 font-medium mb-0.5">AI Optimized</p>
            <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">1,428</p>
            <p className="text-[10px] text-gray-500">messages</p>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/50">
            <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-300 font-medium mb-0.5">Auto-Fallbacks</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">47</p>
            <p className="text-[10px] text-gray-500">rescued by SMS</p>
          </div>
        </div>
      </div>

      {/* Pipeline + Quick Actions + Recent Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {/* Pipeline Distribution */}
        <div className="modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Pipeline</h3>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pipelineData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 dark:text-gray-500">
              No pipeline data
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
            <button onClick={() => navigate('/crm')} className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap">View All</button>
          </div>
          {recentLeads.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentLeads.slice(0, 4).map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-sm flex-shrink-0">
                      {contact.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">{contact.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="WhatsApp">
                      <Phone size={14} className="text-green-600 dark:text-green-400" />
                    </button>
                    <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Email">
                      <Mail size={14} className="text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>No leads found</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="modern-card rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 md:col-span-2 lg:col-span-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 sm:gap-3">
            <button onClick={() => navigate('/whatsapp')} className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg sm:rounded-xl hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all gap-1.5 sm:gap-2 border border-green-200/50 dark:border-green-800/30">
              <MessageSquare className="text-green-600 dark:text-green-400" size={20} />
              <span className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-400">WhatsApp</span>
            </button>
            <button onClick={() => navigate('/social')} className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg sm:rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all gap-1.5 sm:gap-2 border border-blue-200/50 dark:border-blue-800/30">
              <Smartphone className="text-blue-600 dark:text-blue-400" size={20} />
              <span className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-400">Social Post</span>
            </button>
            <button onClick={() => navigate('/social')} className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg sm:rounded-xl hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all gap-1.5 sm:gap-2 border border-purple-200/50 dark:border-purple-800/30">
              <Send className="text-purple-600 dark:text-purple-400" size={20} />
              <span className="text-[10px] sm:text-xs font-medium text-purple-700 dark:text-purple-400">Campaign</span>
            </button>
            <button onClick={() => navigate('/workflows')} className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg sm:rounded-xl hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 transition-all gap-1.5 sm:gap-2 border border-orange-200/50 dark:border-orange-800/30">
              <Zap className="text-orange-600 dark:text-orange-400" size={20} />
              <span className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-400">Workflow</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
