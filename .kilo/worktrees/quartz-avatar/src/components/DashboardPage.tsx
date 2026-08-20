import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Users, Calendar, Star, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
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
  <div className="modern-card hover-lift rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl text-blue-600 dark:text-blue-400">{icon}</div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${positive ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
        {change}
      </span>
    </div>
    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatCardProps[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadContact[]>([]);

  // Demo mode data
  const demoStats: StatCardProps[] = [
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
      title: 'Scheduled Posts',
      value: 8,
      change: '+25%',
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
      setLoading(false);
      return;
    }

    try {
      const [dashboardRes, leadsRes] = await Promise.all([
        analyticsAPI.dashboard(),
        leadsAPI.list({ limit: 4 }),
      ]);

      const dashData = dashboardRes.data;

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
          value: dashData?.stats?.messagesSent ?? 0,
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
      const chartData: AnalyticsData[] = dashData?.chartData ?? dashData?.analytics ?? [];
      setAnalyticsData(chartData.length > 0 ? chartData : []);

      // Set pipeline distribution
      const pipeData: PipelineData[] = dashData?.pipeline ?? dashData?.pipelineDistribution ?? [];
      setPipelineData(pipeData.length > 0 ? pipeData : []);

      // Set recent leads
      const leads = leadsRes.data?.leads ?? leadsRes.data ?? [];
      const formattedLeads: LeadContact[] = leads.map((lead: any) => ({
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
      <div className="p-6 lg:p-8 animate-fade-in-up">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 animate-fade-in-up">
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
    <div className="p-6 lg:p-8 animate-fade-in-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {userName}!</h1>
          <p className="text-gray-500 dark:text-gray-400">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh dashboard"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="modern-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Overview</h3>
          {analyticsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={2} name="Messages" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="posts" stroke="#10B981" strokeWidth={2} name="Posts" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="leads" stroke="#F59E0B" strokeWidth={2} name="Leads" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
              No activity data available
            </div>
          )}
        </div>

        <div className="modern-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline Distribution</h3>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pipelineData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
              No pipeline data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="modern-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
            <button onClick={() => navigate('/crm')} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">View All</button>
          </div>
          {recentLeads.length > 0 ? (
            <div className="space-y-3">
              {recentLeads.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {contact.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{contact.dealValue ? `&#8377;${contact.dealValue.toLocaleString()}` : '-'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{contact.lastActivity}</p>
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

        <div className="modern-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/whatsapp')} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all gap-2 border border-green-200/50 dark:border-green-800/30 hover-lift">
              <MessageSquare className="text-green-600 dark:text-green-400" size={24} />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">WhatsApp Chat</span>
            </button>
            <button onClick={() => navigate('/social')} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all gap-2 border border-blue-200/50 dark:border-blue-800/30 hover-lift">
              <span className="text-2xl">&#128241;</span>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Create Post</span>
            </button>
            <button onClick={() => navigate('/creative')} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all gap-2 border border-purple-200/50 dark:border-purple-800/30 hover-lift">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Make Poster</span>
            </button>
            <button onClick={() => navigate('/reviews')} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 transition-all gap-2 border border-orange-200/50 dark:border-orange-800/30 hover-lift">
              <Star className="text-orange-600" size={24} />
              <span className="text-sm font-medium text-orange-700">View Reviews</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
