import React from 'react';
import { useLocation } from 'react-router-dom';
import ModernDashboard from './ModernDashboard';
import ModernWhatsApp from './ModernWhatsApp';
import ModernCRM from './ModernCRM';
import ModernFrame from './ModernFrame';
import {
  Sparkles, MessageSquare, Users, Target, Calendar, ShoppingCart, BarChart3,
  Brain, Megaphone, Settings, Phone, Mail, TrendingUp, Zap, Bot, FileText,
  CreditCard, Globe, Image as ImageIcon, Briefcase, BookOpen, Award, Star,
  Heart, Send, Layers, DollarSign, Rocket, Activity, Shield,
} from 'lucide-react';

const ROUTE_META: Record<string, { title: string; subtitle: string; badge: string; icon: React.ReactNode }> = {
  '/leads': { title: 'Lead Generation', subtitle: 'Capture, qualify, and convert leads automatically with AI', badge: 'AI LEAD CAPTURE', icon: <Target size={20} /> },
  '/appointments': { title: 'Appointments', subtitle: 'Smart scheduling with AI-powered reminders', badge: 'SMART BOOKING', icon: <Calendar size={20} /> },
  '/ecommerce': { title: 'E-Commerce Hub', subtitle: 'Manage your store, products, and orders', badge: 'STORE', icon: <ShoppingCart size={20} /> },
  '/social': { title: 'Social Media', subtitle: 'Plan, create, and post content everywhere', badge: 'CONTENT', icon: <Megaphone size={20} /> },
  '/google-business': { title: 'Google Business', subtitle: 'Auto-post to your Google Business profile', badge: 'LOCAL SEO', icon: <Globe size={20} /> },
  '/ai-chatbot': { title: 'AI Chatbot', subtitle: 'Train and deploy your 24/7 AI assistant', badge: 'AI AGENT', icon: <Bot size={20} /> },
  '/voice-call': { title: 'Voice Calls', subtitle: 'AI-powered voice calls and IVR', badge: 'VOICE AI', icon: <Phone size={20} /> },
  '/creative': { title: 'AI Creative Studio', subtitle: 'Generate stunning graphics, posters, and videos', badge: 'AI CREATIVE', icon: <ImageIcon size={20} /> },
  '/automation': { title: 'Automation', subtitle: 'Build powerful workflows with AI triggers', badge: 'WORKFLOWS', icon: <Zap size={20} /> },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Deep insights into your business performance', badge: 'ANALYTICS', icon: <BarChart3 size={20} /> },
  '/analytics': { title: 'Sales Analytics', subtitle: 'Revenue, conversion, and growth metrics', badge: 'SALES', icon: <TrendingUp size={20} /> },
  '/reviews': { title: 'Reviews', subtitle: 'Manage customer reviews and reputation', badge: 'REPUTATION', icon: <Star size={20} /> },
  '/email-marketing': { title: 'Email Marketing', subtitle: 'AI-crafted email campaigns that convert', badge: 'EMAIL AI', icon: <Mail size={20} /> },
  '/workflows': { title: 'Workflow Builder', subtitle: 'Visual workflow automation', badge: 'AUTOMATION', icon: <Activity size={20} /> },
  '/trigger-links': { title: 'Trigger Links', subtitle: 'Smart links that start workflows', badge: 'SMART LINKS', icon: <Zap size={20} /> },
  '/surveys': { title: 'Survey Builder', subtitle: 'Create engaging surveys with AI insights', badge: 'FEEDBACK', icon: <FileText size={20} /> },
  '/blog': { title: 'Blog Manager', subtitle: 'AI-powered blog writing and SEO', badge: 'CONTENT', icon: <BookOpen size={20} /> },
  '/review-requests': { title: 'Review Requests', subtitle: 'Auto-ask for reviews after purchase', badge: 'REVIEWS', icon: <Heart size={20} /> },
  '/payment-links': { title: 'Payment Links', subtitle: 'One-click payments via WhatsApp', badge: 'PAYMENTS', icon: <CreditCard size={20} /> },
  '/courses': { title: 'Course Builder', subtitle: 'Build and sell online courses', badge: 'LEARNING', icon: <BookOpen size={20} /> },
  '/funnels': { title: 'Funnel Builder', subtitle: 'High-converting sales funnels', badge: 'FUNNELS', icon: <Layers size={20} /> },
  '/conversations': { title: 'Conversations', subtitle: 'Unified inbox across all channels', badge: 'INBOX', icon: <MessageSquare size={20} /> },
  '/custom-fields': { title: 'Custom Fields', subtitle: 'Customize your CRM data model', badge: 'SETTINGS', icon: <Settings size={20} /> },
  '/client-portal': { title: 'Client Portal', subtitle: 'Branded portal for your customers', badge: 'PORTAL', icon: <Users size={20} /> },
  '/agency': { title: 'Agency Dashboard', subtitle: 'Manage multiple sub-accounts', badge: 'AGENCY', icon: <Briefcase size={20} /> },
  '/admin/users': { title: 'User Management', subtitle: 'Manage roles and permissions', badge: 'USERS', icon: <Users size={20} /> },
  '/missed-call-settings': { title: 'Missed Call', subtitle: 'Auto-respond to missed calls', badge: 'CALLBACK', icon: <Phone size={20} /> },
  '/dograh-settings': { title: 'Dograh Integration', subtitle: 'AI calling and voice automation', badge: 'VOICE', icon: <Phone size={20} /> },
  '/snapshots': { title: 'Snapshots', subtitle: 'Version control for your account', badge: 'BACKUP', icon: <Shield size={20} /> },
  '/bulk-import': { title: 'Bulk Import', subtitle: 'Import contacts, leads, and products', badge: 'IMPORT', icon: <FileText size={20} /> },
  '/import-leads': { title: 'Import Leads', subtitle: 'Import leads from email or files', badge: 'LEADS', icon: <Mail size={20} /> },
  '/shipping-settings': { title: 'Shipping', subtitle: 'Configure shipping rates and carriers', badge: 'LOGISTICS', icon: <Settings size={20} /> },
  '/documents': { title: 'Documents', subtitle: 'Store and manage business documents', badge: 'FILES', icon: <FileText size={20} /> },
  '/profile': { title: 'Profile', subtitle: 'Manage your account profile', badge: 'ACCOUNT', icon: <Users size={20} /> },
  '/settings': { title: 'Settings', subtitle: 'Configure your account and integrations', badge: 'SETTINGS', icon: <Settings size={20} /> },
  '/billing': { title: 'Billing & Plans', subtitle: 'Manage your subscription and invoices', badge: 'BILLING', icon: <CreditCard size={20} /> },
  '/team': { title: 'Team Management', subtitle: 'Add and manage team members', badge: 'TEAM', icon: <Users size={20} /> },
  '/api-keys': { title: 'API Keys', subtitle: 'Manage your API integrations', badge: 'DEVELOPER', icon: <Settings size={20} /> },
  '/audit-log': { title: 'Audit Log', subtitle: 'View all account activity', badge: 'SECURITY', icon: <Shield size={20} /> },
  '/store-share': { title: 'Store Share', subtitle: 'Share your store with customers', badge: 'STORE', icon: <ShoppingCart size={20} /> },
};

const ModernPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  // Dedicated full modern pages
  if (path === '/dashboard' || path === '/') return <ModernDashboard />;
  if (path === '/whatsapp') return <ModernWhatsApp />;
  if (path === '/crm') return <ModernCRM />;

  // Frame-wrapped pages (with title + animated background, plus coming-soon visual)
  const meta = ROUTE_META[path] || {
    title: 'Coming Soon',
    subtitle: 'The AI mode for this page is being crafted. Try dashboard, WhatsApp, or CRM for the full experience.',
    badge: 'AI MODE',
    icon: <Sparkles size={20} />,
  };

  return (
    <ModernFrame title={meta.title} subtitle={meta.subtitle} badge={meta.badge}>
      <div className="ai-glass rounded-3xl p-8 sm:p-10 md:p-12 text-center ai-fade-in-up">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl ai-aurora flex items-center justify-center ai-float ai-glow-pulse mb-4">
          <div className="text-white">{React.cloneElement(meta.icon as React.ReactElement<{ size?: number }>, { size: 40 })}</div>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          {meta.title} — AI Mode
        </h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto mb-5">
          The full AI-powered experience for this page is coming next. For now, switch to Classic to keep working, or explore the AI Dashboard, WhatsApp, and CRM.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1.5 ai-glass rounded-full text-xs text-slate-200 font-semibold">AI Insights ✨</span>
          <span className="px-3 py-1.5 ai-glass rounded-full text-xs text-slate-200 font-semibold">Smart Automation 🤖</span>
          <span className="px-3 py-1.5 ai-glass rounded-full text-xs text-slate-200 font-semibold">Real-time Analytics 📊</span>
        </div>
      </div>
    </ModernFrame>
  );
};

export default ModernPage;
