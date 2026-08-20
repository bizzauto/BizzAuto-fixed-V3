import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Zap, Users, BarChart3, Globe,
  ArrowRight, Play, TrendingUp, Award, Phone,
  Moon, Sun, Menu, X, CheckCircle, Bot, Sparkles,
  ChevronRight, ChevronLeft, UserPlus, ChevronDown, Star
} from 'lucide-react';
import LandingPageBottom from './LandingPageBottom';
import { useAuthStore } from '../lib/authStore';
import { useThemeStore } from '../lib/themeStore';

const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
};

const useCounter = (end: number, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(p * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
};

const Particles: React.FC = () => {
  const ps = Array.from({ length: 30 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, dur: Math.random() * 20 + 10, delay: Math.random() * 5,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {ps.map(p => (
        <div key={p.id} className="absolute rounded-full bg-emerald-400/20 particle-float"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
};

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  );
};

const StatsSection = () => {
  const { ref, inView } = useInView();
  const c1 = useCounter(10000, 2000, inView);
  const c2 = useCounter(50, 1500, inView);
  const c3 = useCounter(99, 1800, inView);
  const c4 = useCounter(48, 1200, inView);
  const stats = [
    { value: c1 >= 10000 ? '10,000+' : c1.toLocaleString(), label: 'Active Users', icon: <Users size={24} /> },
    { value: c2 >= 50 ? '50M+' : `${c2}M+`, label: 'Messages Sent', icon: <MessageSquare size={24} /> },
    { value: c3 >= 99 ? '99.9%' : `${c3}%`, label: 'Uptime', icon: <TrendingUp size={24} /> },
    { value: c4 >= 48 ? '4.8/5' : `${(c4 / 10).toFixed(1)}/5`, label: 'User Rating', icon: <Award size={24} /> },
  ];
  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((s, i) => (
        <div key={i} className={`text-center group transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 100}ms` }}>
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-all border border-emerald-200 dark:border-emerald-500/10">{s.icon}</div>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-1">{inView ? s.value : '0'}</p>
          <p className="text-gray-500 text-sm">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

const slides = [
  { title: 'WhatsApp Business API', desc: 'Send bulk messages, automate replies, and manage customer conversations at scale with the official WhatsApp API.', icon: <MessageSquare size={32} />, gradient: 'from-emerald-500 to-teal-600',
    preview: (
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200 dark:border-emerald-500/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center"><MessageSquare size={20} className="text-emerald-600 dark:text-emerald-400" /></div>
          <div><p className="text-gray-900 dark:text-white font-semibold text-sm">WhatsApp Campaigns</p><p className="text-emerald-600 dark:text-emerald-400 text-xs">3 active campaigns</p></div>
        </div>
        <div className="space-y-3">
          {[{ n: 'Diwali Sale Blast', r: '5,000', s: 'Active' }, { n: 'New Arrival Alert', r: '2,300', s: 'Scheduled' }, { n: 'Follow-up Sequence', r: '1,200', s: 'Draft' }].map((c, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/30 rounded-xl p-3 flex items-center justify-between">
              <div><p className="text-gray-900 dark:text-white text-sm font-medium">{c.n}</p><p className="text-gray-500 dark:text-gray-400 text-xs">{c.r} recipients</p></div>
              <span className={`text-xs px-2 py-1 rounded-lg ${c.s === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : c.s === 'Scheduled' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'}`}>{c.s}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> 98% Delivery</span>
          <span className="flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500" /> 45% Open Rate</span>
        </div>
      </div>
    )
  },
  { title: 'Smart CRM & Pipelines', desc: 'Visual pipelines, lead scoring, deal tracking, and automated follow-ups. Never lose a lead again.', icon: <Users size={32} />, gradient: 'from-blue-500 to-cyan-600',
    preview: (
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200 dark:border-blue-500/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center"><Users size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <div><p className="text-gray-900 dark:text-white font-semibold text-sm">Sales Pipeline</p><p className="text-blue-600 dark:text-blue-400 text-xs">₹12,50,000 in pipeline</p></div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {['New', 'Contacted', 'Qualified', 'Won'].map((s, i) => (
            <div key={s} className="text-center">
              <div className={`h-16 rounded-lg flex items-end justify-center pb-1 ${['bg-blue-100 dark:bg-blue-500/20', 'bg-cyan-100 dark:bg-cyan-500/20', 'bg-teal-100 dark:bg-teal-500/20', 'bg-emerald-100 dark:bg-emerald-500/20'][i]}`}>
                <span className="text-xs text-gray-900 dark:text-white font-bold">{[8, 12, 6, 4][i]}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{s}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Conversion Rate</span><span className="text-emerald-600 dark:text-emerald-400 font-semibold">23%</span></div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full" style={{ width: '23%' }} /></div>
        </div>
      </div>
    )
  },
  { title: 'AI Automation & Chatbot', desc: 'AI-generated content, smart replies, lead scoring, and 24/7 chatbot support. Let AI do the heavy lifting.', icon: <Bot size={32} />, gradient: 'from-purple-500 to-violet-600',
    preview: (
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200 dark:border-purple-500/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center"><Bot size={20} className="text-purple-600 dark:text-purple-400" /></div>
          <div><p className="text-gray-900 dark:text-white font-semibold text-sm">BizzAuto AI</p><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot" /><span className="text-xs text-green-600 dark:text-green-400">Online</span></div></div>
        </div>
        <div className="space-y-3">
          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl rounded-tl-none p-3 text-sm text-gray-700 dark:text-gray-300">👋 Hello! I can help with marketing, CRM, and WhatsApp campaigns.</div>
          <div className="bg-purple-100 dark:bg-purple-500/30 rounded-xl rounded-tr-none p-3 text-sm text-gray-900 dark:text-white ml-8 border border-purple-300 dark:border-purple-400/20">Generate a Diwali sale poster 🪔</div>
          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl rounded-tl-none p-3 text-sm text-gray-700 dark:text-gray-300"><Sparkles size={14} className="inline text-yellow-500 mr-1" />Creating your poster with festive theme...</div>
        </div>
      </div>
    )
  },
  { title: 'Analytics & Reports', desc: 'Real-time dashboards, CSV exports, revenue tracking, and actionable insights for data-driven decisions.', icon: <BarChart3 size={32} />, gradient: 'from-orange-500 to-amber-600',
    preview: (
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200 dark:border-orange-500/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center"><BarChart3 size={20} className="text-orange-600 dark:text-orange-400" /></div>
          <div><p className="text-gray-900 dark:text-white font-semibold text-sm">Analytics Dashboard</p><p className="text-orange-600 dark:text-orange-400 text-xs">Last 7 days</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{ l: 'Leads', v: '247', c: '+12%' }, { l: 'Revenue', v: '₹2.4L', c: '+23%' }, { l: 'Messages', v: '8.5K', c: '+8%' }].map((s, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center"><p className="text-[10px] text-gray-500 dark:text-gray-400">{s.l}</p><p className="text-gray-900 dark:text-white font-bold text-sm">{s.v}</p><p className="text-emerald-600 dark:text-emerald-400 text-[10px]">{s.c}</p></div>
          ))}
        </div>
        <div className="flex items-end gap-1 h-12">{[40, 65, 45, 80, 55, 70, 90].map((h, i) => (<div key={i} className="flex-1 bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-sm opacity-80" style={{ height: `${h}%` }} />))}</div>
      </div>
    )
  },
  { title: 'Multi-Channel Marketing', desc: 'Facebook, Instagram, LinkedIn, Google, Email — manage all your marketing channels from one unified dashboard.', icon: <Globe size={32} />, gradient: 'from-teal-500 to-emerald-600',
    preview: (
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200 dark:border-teal-500/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-500/20 rounded-xl flex items-center justify-center"><Globe size={20} className="text-teal-600 dark:text-teal-400" /></div>
          <div><p className="text-gray-900 dark:text-white font-semibold text-sm">Multi-Channel Hub</p><p className="text-teal-600 dark:text-teal-400 text-xs">5 channels connected</p></div>
        </div>
        <div className="space-y-2">
          {[{ n: 'WhatsApp', m: '2,340' }, { n: 'Instagram', m: '890' }, { n: 'Facebook', m: '1,200' }, { n: 'Email', m: '3,450' }, { n: 'Google Business', m: '156' }].map((ch, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-gray-900 dark:text-white text-xs font-medium">{ch.n}</span></div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">{ch.m} msgs</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
];

const LandingPage: React.FC = () => {
  const { demoLogin } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const h = () => { setScrolled(window.scrollY > 20); setShowBackToTop(window.scrollY > 500); };
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setActiveSlide(p => (p + 1) % slides.length);
      else setActiveSlide(p => (p - 1 + slides.length) % slides.length);
    }
  };
  const nextSlide = useCallback(() => setActiveSlide(p => (p + 1) % slides.length), []);
  const prevSlide = useCallback(() => setActiveSlide(p => (p - 1 + slides.length) % slides.length), []);

  useEffect(() => { const t = setInterval(nextSlide, 5000); return () => clearInterval(t); }, [nextSlide]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0F1C] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center"><Zap size={18} className="text-white" /></div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">BizzAuto</h1>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {['Features', 'Pricing', 'About', 'Contact'].map(l => (
              <Link key={l} to={`/${l.toLowerCase()}`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <Link to="/login" className="hidden sm:block text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium px-4 py-2 transition-all">Sign In</Link>
            <Link to="/register" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all">Get Started Free</Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 dark:bg-[#0A0F1C]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/5 animate-fade-in-up">
            <div className="px-6 py-4 space-y-2">
              {['Features', 'Pricing', 'About', 'Contact'].map(l => (
                <Link key={l} to={`/${l.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">{l}</Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-24">
        <div className="absolute inset-0"><div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-500/8 rounded-full blur-[150px]" /><div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/10 dark:bg-teal-500/8 rounded-full blur-[150px]" /></div>
        <Particles />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full px-4 py-2 text-sm mb-8">
              <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot" /><span className="text-emerald-700 dark:text-emerald-400">Trusted by 10,000+ businesses across India</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight text-gray-900 dark:text-white">
              Automate your business<br />
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">with WhatsApp & AI</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">CRM, WhatsApp marketing, AI content, automation — all in one powerful platform. Built specifically for Indian businesses.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/register" className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-lg">Start Free Trial<ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></Link>
              <button onClick={() => setShowVideo(true)} className="px-8 py-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center gap-2 transition-all text-lg"><Play size={20} /> Watch Demo</button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> 5 min setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up" onClick={() => setShowVideo(false)}>
          <div className="relative w-full max-w-4xl mx-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowVideo(false)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all"><X size={20} /></button>
            <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
              <div className="text-center"><div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Play size={36} className="text-white ml-1" /></div><h3 className="text-2xl font-bold text-white mb-2">BizzAuto Demo</h3><p className="text-emerald-200">See how businesses automate with BizzAuto</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Slider */}
      <Section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><Sparkles size={14} /> Features</div>
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">Everything you need to grow</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">One platform. All the tools. Zero complexity.</p>
          </div>
          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="grid lg:grid-cols-2 gap-12 items-center">
            <div key={`i-${activeSlide}`} className="animate-fade-in-up">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${slides[activeSlide].gradient} mb-6 shadow-lg text-white`}>{slides[activeSlide].icon}</div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">{slides[activeSlide].title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-8">{slides[activeSlide].desc}</p>
              <Link to="/register" className="group flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">Learn more <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></Link>
            </div>
            <div key={`p-${activeSlide}`} className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>{slides[activeSlide].preview}</div>
          </div>
          <div className="flex items-center justify-between mt-10">
            <div className="flex items-center gap-3">{slides.map((_, i) => (<button key={i} onClick={() => setActiveSlide(i)} className={`h-2 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`} />))}</div>
            <div className="flex items-center gap-2">
              <button onClick={prevSlide} className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all"><ChevronLeft size={20} /></button>
              <button onClick={nextSlide} className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>
      </Section>

      {/* Trusted By */}
      <section className="py-12 px-6 border-y border-gray-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-8">Trusted by businesses in every industry</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {[{ e: '🏥', n: 'Healthcare' }, { e: '🏠', n: 'Real Estate' }, { e: '🍕', n: 'Restaurants' }, { e: '💇', n: 'Salons' }, { e: '📚', n: 'Education' }, { e: '🛒', n: 'E-Commerce' }].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all cursor-default">
                <span className="text-2xl">{item.e}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <Section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><Zap size={14} /> How It Works</div>
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">Up and running in minutes</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Three simple steps to transform your business</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 dark:from-emerald-500/30 dark:via-teal-500/30 dark:to-cyan-500/30" />
            {[
              { step: '01', title: 'Connect WhatsApp', desc: 'Link your WhatsApp Business API in under 2 minutes.', icon: <MessageSquare size={24} /> },
              { step: '02', title: 'Import Contacts', desc: 'Upload via CSV or sync from existing tools.', icon: <UserPlus size={24} /> },
              { step: '03', title: 'Automate & Grow', desc: 'Set up campaigns, AI replies, and automations.', icon: <Zap size={24} /> },
            ].map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-all relative z-10">{item.icon}</div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2 block">Step {item.step}</span>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Stats with Counter */}
      <section className="py-20 px-6 relative overflow-hidden border-y border-gray-200 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-500/5 dark:via-teal-500/5 dark:to-cyan-500/5" />
        <div className="relative max-w-7xl mx-auto"><StatsSection /></div>
      </section>

      <LandingPageBottom openFaq={openFaq} setOpenFaq={setOpenFaq} showBackToTop={showBackToTop} />
    </div>
  );
};

export default LandingPage;
