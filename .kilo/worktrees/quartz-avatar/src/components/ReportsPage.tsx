import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, MessageSquare, DollarSign, ArrowUpRight,
  Download, FileText, BarChart3, Clock, Eye, Zap, Target, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { analyticsAPI, leadsAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

interface OverviewData {
  contactsAdded: number;
  messagesSent: number;
  messagesReceived: number;
  campaignsSent: number;
  postsPublished: number;
  reviewsReceived: number;
  dealsWon: number;
  totalRevenue: number;
  conversionRate: number;
  avgResponseTime: string;
}

interface LeadScoreData {
  very_hot: number;
  hot: number;
  warm: number;
  cold: number;
  averageScore: number;
}

interface TopLead {
  name: string;
  score: number;
  category: string;
  dealValue: number;
  reason: string;
}

const ReportsPage: React.FC = () => {
  const { isDemoMode } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'export'>('overview');
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [leadScores, setLeadScores] = useState<LeadScoreData | null>(null);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  // Demo mode data
  const demoOverviewData: OverviewData = {
    contactsAdded: 156,
    messagesSent: 1245,
    messagesReceived: 892,
    campaignsSent: 24,
    postsPublished: 45,
    reviewsReceived: 38,
    dealsWon: 12,
    totalRevenue: 485000,
    conversionRate: 7.8,
    avgResponseTime: '2.5 hours',
  };

  const demoLeadScores: LeadScoreData = {
    very_hot: 18,
    hot: 32,
    warm: 45,
    cold: 61,
    averageScore: 58,
  };

  const demoTopLeads: TopLead[] = [
    { name: 'Rahul Sharma', score: 92, category: 'very_hot', dealValue: 85000, reason: 'High engagement + VIP tag' },
    { name: 'Priya Patel', score: 88, category: 'very_hot', dealValue: 62000, reason: 'Recent activity + good deal' },
    { name: 'Amit Kumar', score: 82, category: 'hot', dealValue: 45000, reason: 'Multiple interactions' },
    { name: 'Sneha Gupta', score: 78, category: 'hot', dealValue: 78000, reason: 'High deal value' },
    { name: 'Vikram Singh', score: 72, category: 'hot', dealValue: 35000, reason: 'Recent engagement' },
  ];

  const demoWeeklyData = [
    { name: 'Mon', leads: 12, messages: 45, revenue: 45000 },
    { name: 'Tue', leads: 18, messages: 62, revenue: 68000 },
    { name: 'Wed', leads: 15, messages: 58, revenue: 52000 },
    { name: 'Thu', leads: 22, messages: 75, revenue: 89000 },
    { name: 'Fri', leads: 28, messages: 92, revenue: 125000 },
    { name: 'Sat', leads: 14, messages: 48, revenue: 42000 },
    { name: 'Sun', leads: 10, messages: 35, revenue: 38000 },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);

    // If in demo mode, use mock data
    if (isDemoMode) {
      setOverviewData(demoOverviewData);
      setLeadScores(demoLeadScores);
      setTopLeads(demoTopLeads);
      setWeeklyData(demoWeeklyData);
      setLoading(false);
      return;
    }

    try {
      // Fetch analytics data
      const [analyticsRes, leadsRes] = await Promise.all([
        analyticsAPI.dashboard().catch(() => ({ data: { success: false } })),
        leadsAPI.list({ limit: 100 }).catch(() => ({ data: { success: false } }))
      ]);

      if (analyticsRes.data.success) {
        const data = analyticsRes.data.data;
        setOverviewData({
          contactsAdded: data.contactsAdded || 0,
          messagesSent: data.messagesSent || 0,
          messagesReceived: data.messagesReceived || 0,
          campaignsSent: data.campaignsSent || 0,
          postsPublished: data.postsPublished || 0,
          reviewsReceived: data.reviewsReceived || 0,
          dealsWon: data.dealsWon || 0,
          totalRevenue: data.totalRevenue || 0,
          conversionRate: data.conversionRate || 0,
          avgResponseTime: data.avgResponseTime || 'N/A',
        });
        setWeeklyData(data.weeklyData || []);
      }

      if (leadsRes.data.success) {
        const leads = leadsRes.data.data?.contacts || [];
        // Calculate lead scores based on engagement and tags
        const scored = leads.map((l: any) => {
          let score = 50;
          const tags = (l.tags || []).map((t: string) => t.toLowerCase());
          if (tags.includes('hot') || tags.includes('vip')) score += 20;
          if (tags.includes('warm')) score += 10;
          if (tags.includes('cold')) score -= 10;
          if (l.dealValue > 100000) score += 15;
          if (l.lastActivity) score += 5;
          score = Math.min(100, Math.max(0, score));

          return {
            name: l.name || 'Unknown',
            score,
            category: score >= 75 ? 'very_hot' : score >= 50 ? 'hot' : score >= 25 ? 'warm' : 'cold',
            dealValue: l.dealValue || 0,
            reason: score >= 75 ? 'High engagement + VIP tag' : score >= 50 ? 'Recent activity + good deal' : 'Moderate engagement',
          };
        });

        scored.sort((a: any, b: any) => b.score - a.score);
        setTopLeads(scored.slice(0, 10));

        const scoreDist = {
          very_hot: scored.filter((l: any) => l.category === 'very_hot').length,
          hot: scored.filter((l: any) => l.category === 'hot').length,
          warm: scored.filter((l: any) => l.category === 'warm').length,
          cold: scored.filter((l: any) => l.category === 'cold').length,
          averageScore: scored.length > 0 ? Math.round(scored.reduce((sum: number, l: any) => sum + l.score, 0) / scored.length) : 0,
        };
        setLeadScores(scoreDist);
      }
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return '₹' + (val / 10000000).toFixed(1) + 'Cr';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val;
  };

  const getScoreColor = (score: number) =>
    score >= 75 ? 'text-red-600 bg-red-50' :
      score >= 50 ? 'text-orange-600 bg-orange-50' :
        score >= 25 ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50';

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <BarChart3 className="text-blue-600" size={32} />
              Reports & Intelligence
            </h1>
            <p className="text-gray-600">AI-powered insights, lead scoring, and export tools</p>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading reports data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={32} />
            Reports & Intelligence
          </h1>
          <p className="text-gray-600">AI-powered insights, lead scoring, and export tools</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex gap-2 mb-6">
        {[
          { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={16} /> },
          { id: 'leads' as const, label: 'AI Lead Scores', icon: <Target size={16} /> },
          { id: 'export' as const, label: 'Export Data', icon: <Download size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'New Contacts', value: overviewData?.contactsAdded || 0, icon: <Users size={20} />, color: 'bg-blue-50 text-blue-600', change: '+12%' },
              { label: 'Messages Sent', value: (overviewData?.messagesSent || 0).toLocaleString(), icon: <MessageSquare size={20} />, color: 'bg-green-50 text-green-600', change: '+15%' },
              { label: 'Revenue', value: formatCurrency(overviewData?.totalRevenue || 0), icon: <DollarSign size={20} />, color: 'bg-purple-50 text-purple-600', change: '+22%' },
              { label: 'Conversion Rate', value: (overviewData?.conversionRate || 0) + '%', icon: <TrendingUp size={20} />, color: 'bg-orange-50 text-orange-600', change: '+5%' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <ArrowUpRight size={14} />{stat.change}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />Weekly Performance
              </h3>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="leads" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} name="Leads" />
                    <Area type="monotone" dataKey="messages" stroke="#10B981" fill="#10B981" fillOpacity={0.1} name="Messages" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No data available
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-green-600" />Revenue Trend
              </h3>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Campaigns Sent', value: overviewData?.campaignsSent || 0, icon: <Zap size={18} /> },
              { label: 'Posts Published', value: overviewData?.postsPublished || 0, icon: <FileText size={18} /> },
              { label: 'Reviews Received', value: overviewData?.reviewsReceived || 0, icon: <Eye size={18} /> },
              { label: 'Avg Response Time', value: overviewData?.avgResponseTime || 'N/A', icon: <Clock size={18} /> },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-600">{stat.icon}</div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* AI LEAD SCORES */}
      {activeTab === 'leads' && (
        <>
          {/* Score Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Very Hot', count: leadScores?.very_hot || 0, color: 'bg-red-500', textColor: 'text-red-600' },
              { label: 'Hot', count: leadScores?.hot || 0, color: 'bg-orange-500', textColor: 'text-orange-600' },
              { label: 'Warm', count: leadScores?.warm || 0, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
              { label: 'Cold', count: leadScores?.cold || 0, color: 'bg-gray-400', textColor: 'text-gray-600' },
              { label: 'Average', count: leadScores?.averageScore || 0, color: 'bg-blue-500', textColor: 'text-blue-600', isAvg: true },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 text-center">
                <div className={`w-16 h-16 ${item.color} rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold`}>
                  {item.count}{item.isAvg && ''}
                </div>
                <p className={`font-medium ${item.textColor}`}>{item.label}</p>
                {!item.isAvg && <p className="text-sm text-gray-500">leads</p>}
              </div>
            ))}
          </div>

          {/* Top Leads Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target size={20} className="text-red-600" />
                Top Scoring Leads
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {topLeads.length > 0 ? topLeads.map((lead, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(lead.dealValue)}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(lead.score)}`}>
                        Score: {lead.score}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-500">
                  No leads data available
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* EXPORT DATA */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Contacts', description: 'Export all contacts with tags, source, and deal values', icon: <Users size={24} />, format: 'CSV' },
            { name: 'Messages', description: 'Export message history with contact details and status', icon: <MessageSquare size={24} />, format: 'CSV' },
            { name: 'Campaigns', description: 'Export campaign performance with delivery stats', icon: <Zap size={24} />, format: 'CSV' },
            { name: 'Orders', description: 'Export order history with payment and shipping details', icon: <FileText size={24} />, format: 'CSV' },
            { name: 'Reviews', description: 'Export all reviews with ratings and responses', icon: <Eye size={24} />, format: 'CSV' },
            { name: 'Full Report', description: 'Complete business report with analytics (PDF)', icon: <BarChart3 size={24} />, format: 'PDF' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600 w-fit mb-4 group-hover:bg-blue-100 transition-colors">
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.format}</span>
                <button className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline">
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
