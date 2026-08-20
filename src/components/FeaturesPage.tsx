import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, Users, Calendar, ShoppingCart, FileText, 
  Share2, TrendingUp, Bot, Phone, Wand2, Zap, BarChart3,
  CheckCircle, ArrowRight
} from 'lucide-react';
import PublicNavbar from './PublicNavbar';

const features = [
  {
    icon: MessageCircle,
    title: 'WhatsApp Business',
    desc: 'Automate conversations, broadcast messages, and manage multiple numbers seamlessly.',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: Users,
    title: 'Advanced CRM',
    desc: 'Track leads, manage contacts, and visualize sales pipelines effortlessly.',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: Calendar,
    title: 'Appointments',
    desc: 'Smart scheduling with calendar sync and automated reminders.',
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: ShoppingCart,
    title: 'E-Commerce',
    desc: 'Build online stores, manage products, and process orders integrated with WhatsApp.',
    color: 'from-orange-500 to-red-600'
  },
  {
    icon: FileText,
    title: 'Documents',
    desc: 'Create, share, and track documents with built-in e-signatures.',
    color: 'from-indigo-500 to-blue-600'
  },
  {
    icon: Share2,
    title: 'Social Media',
    desc: 'Schedule and publish content across all platforms from one dashboard.',
    color: 'from-pink-500 to-rose-600'
  },
  {
    icon: TrendingUp,
    title: 'Google Business',
    desc: 'Manage reviews, posts, and insights directly from your dashboard.',
    color: 'from-teal-500 to-cyan-600'
  },
  {
    icon: Bot,
    title: 'AI Chatbot',
    desc: 'Intelligent bots that learn from your data and handle customer queries.',
    color: 'from-violet-500 to-purple-600'
  },
  {
    icon: Phone,
    title: 'Voice Calls',
    desc: 'Integrated VoIP calling with call recording and analytics.',
    color: 'from-amber-500 to-yellow-600'
  },
  {
    icon: Wand2,
    title: 'AI Content Generator',
    desc: 'Generate posts, captions, images, and videos with AI assistance.',
    color: 'from-rose-500 to-pink-600'
  },
  {
    icon: Zap,
    title: 'Automation',
    desc: 'Create workflows with triggers, conditions, and actions.',
    color: 'from-yellow-500 to-orange-600'
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Real-time dashboards with AI-powered insights and reports.',
    color: 'from-cyan-500 to-blue-600'
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0A0F1C] dark:via-[#0F172A] dark:to-[#0A0F1C]">
        <PublicNavbar />

        <section className="pt-32 pb-16 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Zap size={14} /> Powerful Features
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent"> Grow Your Business</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              All-in-one platform with WhatsApp CRM, AI automation, marketing tools, and more — built for modern businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-8 py-4 rounded-xl hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                Start Free Trial <ArrowRight size={18} />
              </Link>
              <Link to="/pricing" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all flex items-center justify-center">
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="group relative bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.desc}</p>
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={20} className="text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Join thousands of businesses already using BizzAuto to grow their customer base.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              {['No Credit Card Required', '7-Day Free Trial', 'Cancel Anytime'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Link to="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-8 py-4 rounded-xl hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-1 transition-all">
              Get Started Now <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <footer className="py-8 px-6 border-t border-gray-200 dark:border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">BizzAuto</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2026 BizzAuto. All rights reserved.</p>
          </div>
        </footer>
      </div>
  );
}
