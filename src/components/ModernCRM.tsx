import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, Brain, Flame, Target, Award, ChevronRight, Search,
  Mail, Phone, Calendar, DollarSign, Star, Filter, Sparkles, Bot, Zap,
  Crown, Diamond, Activity, BarChart3, MoreVertical, CheckCircle2, Clock,
  Eye, Edit2, Trash2, MessageSquare, ArrowUpRight, Send, X as XIcon, Plus,
  Briefcase, MapPin, Tag, TrendingDown, Heart, Rocket, Layers, Wand2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import AnimatedCounter from './AnimatedCounter';

type View = 'pipeline' | 'leads' | 'contacts' | 'ai-scoring' | 'analytics';

const ModernCRM: React.FC = () => {
  const navigate = useNavigate();
  const { isDemoMode } = useAuthStore();
  const [view, setView] = useState<View>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIntent, setFilterIntent] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [showLeadModal, setShowLeadModal] = useState(false);

  const leads = [
    { id: '1', name: 'Priya Sharma', company: 'TechCorp', value: 85000, score: 92, intent: 'hot', stage: 'qualified', lastContact: '2h', email: 'priya@techcorp.com', phone: '+91 98765 43210', avatar: 'PS', gradient: 'from-pink-500 to-rose-500' },
    { id: '2', name: 'Amit Kumar', company: 'StartupX', value: 45000, score: 78, intent: 'hot', stage: 'proposal', lastContact: '1d', email: 'amit@startupx.io', phone: '+91 98765 43211', avatar: 'AK', gradient: 'from-amber-500 to-orange-500' },
    { id: '3', name: 'Sneha Patel', company: 'DesignCo', value: 120000, score: 85, intent: 'hot', stage: 'negotiation', lastContact: '4h', email: 'sneha@designco.in', phone: '+91 98765 43212', avatar: 'SP', gradient: 'from-violet-500 to-fuchsia-500' },
    { id: '4', name: 'Ravi Verma', company: 'CloudNine', value: 32000, score: 64, intent: 'warm', stage: 'contacted', lastContact: '2d', email: 'ravi@cloudnine.com', phone: '+91 98765 43213', avatar: 'RV', gradient: 'from-cyan-500 to-blue-500' },
    { id: '5', name: 'Anjali Singh', company: 'MarketPro', value: 68000, score: 71, intent: 'warm', stage: 'qualified', lastContact: '1d', email: 'anjali@marketpro.com', phone: '+91 98765 43214', avatar: 'AS', gradient: 'from-emerald-500 to-teal-500' },
    { id: '6', name: 'Vikram Mehta', company: 'InnovateLabs', value: 95000, score: 88, intent: 'hot', stage: 'proposal', lastContact: '6h', email: 'vikram@innovate.io', phone: '+91 98765 43215', avatar: 'VM', gradient: 'from-indigo-500 to-purple-500' },
    { id: '7', name: 'Neha Gupta', company: 'StyleHub', value: 22000, score: 42, intent: 'cold', stage: 'new', lastContact: '7d', email: 'neha@stylehub.com', phone: '+91 98765 43216', avatar: 'NG', gradient: 'from-slate-500 to-slate-600' },
    { id: '8', name: 'Karthik Iyer', company: 'FinTech Co', value: 145000, score: 95, intent: 'hot', stage: 'negotiation', lastContact: '3h', email: 'karthik@fintech.com', phone: '+91 98765 43217', avatar: 'KI', gradient: 'from-fuchsia-500 to-pink-500' },
  ];

  const filtered = leads.filter(l => {
    const matchesSearch = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterIntent === 'all' || l.intent === filterIntent;
    return matchesSearch && matchesFilter;
  });

  const views: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'pipeline', label: 'Pipeline', icon: <Layers size={16} /> },
    { id: 'leads', label: 'Leads', icon: <Target size={16} /> },
    { id: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
    { id: 'ai-scoring', label: 'AI Scoring', icon: <Brain size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
  ];

  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.intent === 'hot').length,
    warm: leads.filter(l => l.intent === 'warm').length,
    cold: leads.filter(l => l.intent === 'cold').length,
    pipelineValue: leads.reduce((sum, l) => sum + l.value, 0),
    avgScore: Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length),
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-5">
      {/* HERO */}
      <div className="ai-fade-in-up relative overflow-hidden rounded-3xl p-5 sm:p-6 md:p-7 ai-aurora">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-semibold mb-2 text-white">
              <Brain size={10} /> AI-POWERED CRM
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              Sales Command Center
            </h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base mt-1 max-w-2xl">
              AI scoring, smart insights, and pipeline analytics — all in one beautiful view.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowLeadModal(true)} className="ai-btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14} /> New Lead
            </button>
            <button onClick={() => navigate('/whatsapp')} className="px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-white/20">
              <Send size={14} /> Bulk Outreach
            </button>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 ai-stagger">
        {[
          { label: 'Total', value: stats.total, icon: <Users size={16} />, gradient: 'from-indigo-500 to-purple-500' },
          { label: 'Hot', value: stats.hot, icon: <Flame size={16} />, gradient: 'from-orange-500 to-red-500' },
          { label: 'Warm', value: stats.warm, icon: <Star size={16} />, gradient: 'from-amber-500 to-orange-500' },
          { label: 'Cold', value: stats.cold, icon: <TrendingDown size={16} />, gradient: 'from-cyan-500 to-blue-500' },
          { label: 'Pipeline', value: `₹${(stats.pipelineValue / 100000).toFixed(1)}L`, icon: <DollarSign size={16} />, gradient: 'from-emerald-500 to-teal-500', isText: true },
          { label: 'AI Score', value: stats.avgScore, icon: <Brain size={16} />, gradient: 'from-violet-500 to-fuchsia-500', suffix: '/100' },
        ].map((s, i) => (
          <div key={i} className="ai-glass rounded-2xl p-3 ai-lift cursor-pointer">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-1.5`}>
              {s.icon}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-base sm:text-lg font-black text-white">
              {s.isText ? s.value : <AnimatedCounter value={typeof s.value === 'number' ? s.value : 0} suffix={s.suffix} />}
            </p>
          </div>
        ))}
      </div>

      {/* VIEWS */}
      <div className="flex overflow-x-auto ai-glass rounded-2xl p-1.5 gap-1 scrollbar-hide">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              view === v.id ? 'ai-aurora text-white shadow-lg shadow-indigo-500/30' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            {v.icon}
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {/* VIEW CONTENT */}
      {view === 'pipeline' && <PipelineView leads={filtered} />}
      {view === 'leads' && <LeadsView leads={filtered} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterIntent={filterIntent} setFilterIntent={setFilterIntent} />}
      {view === 'contacts' && <ContactsView leads={filtered} />}
      {view === 'ai-scoring' && <AIScoringView leads={leads} />}
      {view === 'analytics' && <AnalyticsView stats={stats} />}

      {/* NEW LEAD MODAL */}
      {showLeadModal && <NewLeadModal onClose={() => setShowLeadModal(false)} />}
    </div>
  );
};

// PIPELINE VIEW
const PipelineView: React.FC<{ leads: any[] }> = ({ leads }) => {
  const stages = [
    { id: 'new', label: 'New', gradient: 'from-slate-500 to-slate-600', icon: <Plus size={14} /> },
    { id: 'contacted', label: 'Contacted', gradient: 'from-cyan-500 to-blue-500', icon: <Phone size={14} /> },
    { id: 'qualified', label: 'Qualified', gradient: 'from-indigo-500 to-purple-500', icon: <CheckCircle2 size={14} /> },
    { id: 'proposal', label: 'Proposal', gradient: 'from-amber-500 to-orange-500', icon: <Briefcase size={14} /> },
    { id: 'negotiation', label: 'Negotiation', gradient: 'from-pink-500 to-rose-500', icon: <Target size={14} /> },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 ai-stagger">
      {stages.map((stage) => {
        const stageLeads = leads.filter(l => l.stage === stage.id);
        const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);
        return (
          <div key={stage.id} className="ai-glass rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stage.gradient} flex items-center justify-center text-white`}>
                  {stage.icon}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">{stage.label}</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2.5">₹{(stageValue / 1000).toFixed(0)}K total</p>
            <div className="space-y-2">
              {stageLeads.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-slate-500">No leads</div>
              ) : (
                stageLeads.map((lead) => (
                  <div key={lead.id} className="ai-glass rounded-xl p-2.5 ai-lift cursor-pointer">
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${lead.gradient} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {lead.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-semibold text-white truncate">{lead.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{lead.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5">
                      <span className="text-[10px] font-bold text-emerald-300">₹{(lead.value / 1000).toFixed(0)}K</span>
                      <span className="text-[9px] flex items-center gap-0.5 font-semibold text-indigo-300">
                        <Brain size={9} /> {lead.score}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// LEADS VIEW
const LeadsView: React.FC<{ leads: any[]; searchQuery: string; setSearchQuery: (s: string) => void; filterIntent: string; setFilterIntent: (f: any) => void }> = ({ leads, searchQuery, setSearchQuery, filterIntent, setFilterIntent }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-2.5 ai-glass rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {['all', 'hot', 'warm', 'cold'].map(f => (
            <button
              key={f}
              onClick={() => setFilterIntent(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterIntent === f ? 'ai-aurora text-white' : 'ai-glass text-slate-300 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 ai-stagger">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
};

// CONTACT VIEW
const ContactsView: React.FC<{ leads: any[] }> = ({ leads }) => {
  return (
    <div className="ai-glass rounded-2xl overflow-hidden">
      <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 px-4 py-3 border-b border-white/10 text-[10px] font-semibold text-slate-400 uppercase">
        <div>Contact</div>
        <div>Company</div>
        <div>Value</div>
        <div>AI Score</div>
        <div></div>
      </div>
      <div className="divide-y divide-white/5">
        {leads.map(lead => (
          <div key={lead.id} className="grid md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${lead.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {lead.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{lead.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{lead.email}</p>
              </div>
            </div>
            <div className="hidden md:block text-xs text-slate-300">{lead.company}</div>
            <div className="hidden md:block text-xs font-bold text-emerald-300">₹{(lead.value / 1000).toFixed(0)}K</div>
            <div className="hidden md:flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${lead.intent === 'hot' ? 'from-orange-500 to-red-500' : lead.intent === 'warm' ? 'from-amber-500 to-orange-500' : 'from-cyan-500 to-blue-500'}`} style={{ width: `${lead.score}%` }} />
              </div>
              <span className="text-[10px] font-bold text-white w-7">{lead.score}</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <button className="p-1.5 hover:bg-white/10 rounded-lg"><Phone size={13} className="text-slate-300" /></button>
              <button className="p-1.5 hover:bg-white/10 rounded-lg"><MessageSquare size={13} className="text-slate-300" /></button>
              <button className="p-1.5 hover:bg-white/10 rounded-lg"><MoreVertical size={13} className="text-slate-300" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// AI SCORING VIEW
const AIScoringView: React.FC<{ leads: any[] }> = ({ leads }) => {
  return (
    <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
      <div className="lg:col-span-2 ai-glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ai-aurora flex items-center justify-center ai-glow-pulse">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">AI Lead Score Distribution</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Predicted conversion probability</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {leads.sort((a, b) => b.score - a.score).map(lead => (
            <div key={lead.id} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${lead.gradient} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                {lead.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-white truncate">{lead.name}</p>
                  <span className="text-[10px] font-bold text-white ml-2">{lead.score}</span>
                </div>
                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      lead.score >= 80 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                      lead.score >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${lead.score}%` }}
                  />
                </div>
              </div>
              {lead.score >= 80 && <Flame size={14} className="text-orange-400 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="ai-glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" /> AI Insights
          </h3>
          <div className="space-y-2">
            {[
              { text: 'Karthik Iyer likely to close in 7 days', icon: <Target size={12} />, color: 'text-emerald-300' },
              { text: 'Sneha Patel needs immediate follow-up', icon: <Clock size={12} />, color: 'text-orange-300' },
              { text: '3 leads trending up this week', icon: <TrendingUp size={12} />, color: 'text-indigo-300' },
              { text: 'Best time to call: 10-11 AM', icon: <Brain size={12} />, color: 'text-violet-300' },
            ].map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-2 ai-glass rounded-lg">
                <span className={insight.color}>{insight.icon}</span>
                <p className="text-[10px] sm:text-xs text-slate-200 leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ai-glass rounded-2xl p-4 sm:p-5 ai-glow-pulse">
          <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
            <Rocket size={14} className="text-pink-400" /> Next Best Action
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed mb-2.5">
            Send a personalized WhatsApp message to <span className="text-white font-semibold">Karthik Iyer</span> with proposal PDF now.
          </p>
          <button className="w-full ai-btn-primary text-xs flex items-center justify-center gap-1.5">
            <Send size={12} /> Send AI Message
          </button>
        </div>
      </div>
    </div>
  );
};

// ANALYTICS VIEW
const AnalyticsView: React.FC<{ stats: any }> = ({ stats }) => {
  return (
    <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
      <div className="ai-glass rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white mb-3">Conversion Funnel</h3>
        <div className="space-y-2">
          {[
            { stage: 'Leads', count: 1240, pct: 100, gradient: 'from-indigo-500 to-purple-500' },
            { stage: 'Contacted', count: 980, pct: 79, gradient: 'from-cyan-500 to-blue-500' },
            { stage: 'Qualified', count: 547, pct: 44, gradient: 'from-amber-500 to-orange-500' },
            { stage: 'Proposal', count: 312, pct: 25, gradient: 'from-pink-500 to-rose-500' },
            { stage: 'Closed', count: 184, pct: 15, gradient: 'from-emerald-500 to-teal-500' },
          ].map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 font-medium">{f.stage}</span>
                <span className="text-xs font-bold text-white">{f.count.toLocaleString()} <span className="text-slate-500">({f.pct}%)</span></span>
              </div>
              <div className="h-6 bg-white/5 rounded-lg overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${f.gradient} rounded-lg flex items-center justify-end pr-2 transition-all duration-1000`} style={{ width: `${f.pct}%` }}>
                  {f.pct > 20 && <span className="text-[10px] font-bold text-white">{f.pct}%</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="ai-glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-2.5">Performance</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Win Rate', value: '34%', icon: <Award size={16} />, gradient: 'from-emerald-500 to-teal-500' },
              { label: 'Avg Deal', value: '₹82K', icon: <DollarSign size={16} />, gradient: 'from-indigo-500 to-purple-500' },
              { label: 'Sales Cycle', value: '12d', icon: <Clock size={16} />, gradient: 'from-amber-500 to-orange-500' },
              { label: 'Forecast', value: '₹18.5L', icon: <TrendingUp size={16} />, gradient: 'from-pink-500 to-rose-500' },
            ].map((m, i) => (
              <div key={i} className="ai-glass rounded-xl p-2.5 ai-lift">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white mb-1.5`}>
                  {m.icon}
                </div>
                <p className="text-[9px] text-slate-400 uppercase font-medium">{m.label}</p>
                <p className="text-sm sm:text-base font-black text-white">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ai-glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-2.5">Activity Timeline</h3>
          <div className="space-y-2.5">
            {[
              { who: 'Priya Sharma', what: 'opened proposal email', when: '2m ago', icon: <Eye size={12} /> },
              { who: 'Karthik Iyer', what: 'replied on WhatsApp', when: '15m ago', icon: <MessageSquare size={12} /> },
              { who: 'Sneha Patel', what: 'scheduled a meeting', when: '1h ago', icon: <Calendar size={12} /> },
              { who: 'Amit Kumar', what: 'downloaded brochure', when: '3h ago', icon: <Briefcase size={12} /> },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2 p-2 ai-glass rounded-lg">
                <div className="w-7 h-7 rounded-lg ai-aurora flex items-center justify-center text-white flex-shrink-0">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-200"><span className="font-semibold text-white">{a.who}</span> {a.what}</p>
                  <p className="text-[9px] text-slate-500">{a.when}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// LEAD CARD
const LeadCard: React.FC<{ lead: any }> = ({ lead }) => (
  <div className="ai-glass rounded-2xl p-4 ai-lift cursor-pointer group">
    <div className="flex items-start gap-3">
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${lead.gradient} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0`}>
        {lead.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white truncate">{lead.name}</p>
          {lead.intent === 'hot' && <Flame size={14} className="text-orange-400 flex-shrink-0" />}
        </div>
        <p className="text-[10px] sm:text-xs text-slate-400 truncate">{lead.company}</p>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${
          lead.score >= 80 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
          lead.score >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
        }`} style={{ width: `${lead.score}%` }} />
      </div>
      <span className="text-[10px] font-bold text-white">{lead.score}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
      <div>
        <p className="text-[9px] text-slate-500">Value</p>
        <p className="text-xs font-bold text-emerald-300">₹{(lead.value / 1000).toFixed(0)}K</p>
      </div>
      <div>
        <p className="text-[9px] text-slate-500">Last contact</p>
        <p className="text-xs font-bold text-white">{lead.lastContact}</p>
      </div>
    </div>
    <div className="flex gap-1.5 mt-2.5">
      <button className="flex-1 px-2 py-1.5 ai-glass rounded-lg text-[10px] font-semibold text-slate-200 hover:bg-white/10 flex items-center justify-center gap-1">
        <MessageSquare size={10} /> Message
      </button>
      <button className="flex-1 px-2 py-1.5 ai-aurora rounded-lg text-[10px] font-semibold text-white flex items-center justify-center gap-1">
        <ArrowUpRight size={10} /> View
      </button>
    </div>
  </div>
);

// NEW LEAD MODAL
const NewLeadModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ai-fade-in-up" onClick={onClose}>
    <div className="ai-glass rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-black text-white">New Lead</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><XIcon size={18} className="text-slate-300" /></button>
      </div>
      <div className="space-y-3">
        {['Full Name', 'Email', 'Phone', 'Company', 'Deal Value (₹)'].map(label => (
          <div key={label}>
            <label className="text-[10px] sm:text-xs font-semibold text-slate-300 mb-1 block">{label}</label>
            <input type="text" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        ))}
        <div>
          <label className="text-[10px] sm:text-xs font-semibold text-slate-300 mb-1 block">Stage</label>
          <select className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500">
            <option>New</option>
            <option>Contacted</option>
            <option>Qualified</option>
            <option>Proposal</option>
          </select>
        </div>
        <button className="w-full ai-btn-primary text-sm mt-2 flex items-center justify-center gap-1.5">
          <Sparkles size={14} /> Create Lead with AI
        </button>
      </div>
    </div>
  </div>
);

export default ModernCRM;
