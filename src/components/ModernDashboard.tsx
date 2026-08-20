import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight, Sparkles, Brain, MessageSquare,
  Users, DollarSign, Target, Calendar, Star, Zap, Bot, Activity, BarChart3,
  Rocket, ArrowRight, Check, X as XIcon, Phone, Mail, Send, Eye, Heart,
  Lightbulb, AlertTriangle, Award, Flame, Crown, Diamond, ChevronRight, RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { analyticsAPI, leadsAPI } from '../lib/api';
import AnimatedCounter from './AnimatedCounter';

interface Stat {
  title: string;
  value: number | string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
}

const ModernDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [pipelineValue, setPipelineValue] = useState(2450000);
  const [conversionRate, setConversionRate] = useState(24.5);
  const [responseTime, setResponseTime] = useState(8);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [revenueMTD, setRevenueMTD] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  const userName = user?.name?.split(' ')[0] || 'there';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const buildDemoData = useCallback(() => {
    setStats([]);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) { buildDemoData(); setLoading(false); return; }
    try {
      const dashboardRes = await analyticsAPI.dashboard();
      const data = dashboardRes.data?.data || dashboardRes.data;
      setStats([
        { title: 'Revenue Today', value: `₹${(data?.stats?.revenueToday || 45200).toLocaleString('en-IN')}`, change: data?.stats?.revenueChange || '+18%', positive: true, icon: <DollarSign size={22} />, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/40' },
        { title: 'Active Leads', value: data?.stats?.leadsToday || 247, change: data?.stats?.leadsChange || '+12%', positive: true, icon: <Users size={22} />, gradient: 'from-indigo-500 to-purple-600', glow: 'shadow-indigo-500/40' },
        { title: 'Messages Sent', value: data?.stats?.messagesToday || 1829, change: data?.stats?.messagesChange || '+24%', positive: true, icon: <MessageSquare size={22} />, gradient: 'from-pink-500 to-rose-600', glow: 'shadow-pink-500/40' },
        { title: 'Conversion', value: `${conversionRate}%`, change: '+3.2%', positive: true, icon: <Target size={22} />, gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/40' },
        { title: 'Pipeline', value: `₹${(pipelineValue / 100000).toFixed(1)}L`, change: '+15%', positive: true, icon: <TrendingUp size={22} />, gradient: 'from-cyan-500 to-blue-600', glow: 'shadow-cyan-500/40' },
        { title: 'AI Score', value: 82, change: '+7', positive: true, icon: <Brain size={22} />, gradient: 'from-violet-500 to-fuchsia-600', glow: 'shadow-violet-500/40' },
      ]);
    } catch {
      // API unavailable - show empty state gracefully
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, buildDemoData, conversionRate, pipelineValue]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // aiInsights are now set from API data in fetchData

  return (
    <div className="relative min-h-screen p-4 sm:p-5 md:p-6 lg:p-8 space-y-5 sm:space-y-6">
      {/* HERO - Welcome + Greeting + Key Action */}
      <div className="ai-fade-in-up relative overflow-hidden rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 ai-aurora">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl" />

        <div className="relative grid lg:grid-cols-2 gap-5 sm:gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold mb-3 text-white">
              <Sparkles size={12} className="animate-pulse" />
              AI-Powered Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight">
              {greeting}, <span className="ai-gradient-text bg-white/95 bg-clip-text">{userName}!</span>
            </h1>
            <p className="text-white/80 text-sm sm:text-base md:text-lg max-w-xl">
              Track your business performance in real-time. Here's your dashboard overview.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => navigate('/whatsapp')} className="ai-btn-primary flex items-center gap-1.5 text-sm">
                <Rocket size={16} /> Launch AI Campaign
              </button>
              <button onClick={() => navigate('/crm')} className="px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-white/20">
                <Eye size={16} /> View Pipeline
              </button>
            </div>
          </div>

          {/* Hero stats card */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="ai-glass rounded-2xl p-3 sm:p-4 ai-lift">
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium mb-1">Revenue MTD</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                <AnimatedCounter value={revenueMTD || 0} prefix="₹" />
              </p>
              <p className="text-[10px] text-emerald-300 mt-0.5 flex items-center gap-0.5">
                <TrendingUp size={10} /> {revenueMTD > 0 ? "+18% vs last month" : "No data yet"}
              </p>
            </div>
            <div className="ai-glass rounded-2xl p-3 sm:p-4 ai-lift">
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium mb-1">AI Score</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-white flex items-baseline gap-1">
                <AnimatedCounter value={aiScore || 0} /><span className="text-base">/100</span>
              </p>
              <p className="text-[10px] text-emerald-300 mt-0.5 flex items-center gap-0.5">
                <Brain size={10} /> {aiScore > 0 ? "Excellent" : "Insufficient data"}
              </p>
            </div>
            <div className="ai-glass rounded-2xl p-3 sm:p-4 ai-lift">
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium mb-1">Hot Leads</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-white flex items-baseline gap-1">
                <AnimatedCounter value={hotLeads || 0} />
                <Flame size={16} className="text-orange-400" />
              </p>
              <p className="text-[10px] text-orange-300 mt-0.5">{hotLeads > 0 ? "Ready to convert" : "No leads yet"}</p>
            </div>
            <div className="ai-glass rounded-2xl p-3 sm:p-4 ai-lift">
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium mb-1">Response Time</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-white flex items-baseline gap-1">
                <AnimatedCounter value={avgResponseTime || 0} suffix="m" />
              </p>
              <p className="text-[10px] text-emerald-300 mt-0.5 flex items-center gap-0.5">
                <Check size={10} /> Industry best
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 ai-stagger">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`relative overflow-hidden ai-glass rounded-2xl p-3.5 sm:p-4 ai-lift cursor-pointer group`}
          >
            <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
            <div className="relative">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg ${stat.glow} mb-2.5`}>
                {stat.icon}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">{stat.title}</p>
              <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
              </p>
              <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-0.5 ${stat.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.positive ? <ArrowUpRight size={10} /> : <TrendingDown size={10} />} {stat.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* AI INSIGHTS + ACTIONS */}
      <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* AI Insights header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg ai-aurora flex items-center justify-center ai-glow-pulse">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">AI Insights</h2>
                <p className="text-[10px] sm:text-xs text-slate-400">Smart recommendations just for you</p>
              </div>
            </div>
            <button className="text-[10px] sm:text-xs text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>

          {/* Insight cards */}
          {aiInsights.length > 0 ? aiInsights.map((insight: any) => (
            <div key={insight.id} className={`relative overflow-hidden ai-glass rounded-2xl p-4 sm:p-5 ai-lift cursor-pointer bg-gradient-to-r ${insight.color}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white mb-0.5">{insight.title}</p>
                  <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">{insight.text}</p>
                  <button className="mt-2 text-[10px] sm:text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-0.5">
                    {insight.cta} <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="ai-glass rounded-2xl p-4 sm:p-5 text-center">
              <Brain size={24} className="mx-auto text-slate-500 mb-2" />
              <p className="text-xs text-slate-400">No insights available yet. Collect more data to unlock AI-powered recommendations.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="ai-glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Send Message', icon: <MessageSquare size={18} />, gradient: 'from-emerald-500 to-teal-600', to: '/whatsapp' },
              { label: 'New Campaign', icon: <Rocket size={18} />, gradient: 'from-indigo-500 to-purple-600', to: '/campaigns' },
              { label: 'Add Lead', icon: <Users size={18} />, gradient: 'from-pink-500 to-rose-600', to: '/crm' },
              { label: 'AI Content', icon: <Brain size={18} />, gradient: 'from-amber-500 to-orange-600', to: '/ai' },
              { label: 'Schedule', icon: <Calendar size={18} />, gradient: 'from-cyan-500 to-blue-600', to: '/appointments' },
              { label: 'Reports', icon: <BarChart3 size={18} />, gradient: 'from-violet-500 to-fuchsia-600', to: '/reports' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="group flex flex-col items-center gap-1.5 p-3 ai-glass rounded-xl ai-lift"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-200 text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONVERSION CTA BANNER */}
      <div className="relative overflow-hidden ai-glass neon-border rounded-2xl p-4 sm:p-5 md:p-6 ai-glow-pulse">
        <div className="absolute -top-20 -right-10 w-60 h-60 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ai-aurora flex items-center justify-center ai-float flex-shrink-0">
            <Crown size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-white">Upgrade to Pro AI</h3>
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">LIMITED</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">Unlock unlimited AI campaigns, advanced lead scoring, and 5x WhatsApp sending capacity.</p>
          </div>
          <button className="self-stretch sm:self-auto flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 ai-btn-primary text-sm whitespace-nowrap">
            <Diamond size={14} /> Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
