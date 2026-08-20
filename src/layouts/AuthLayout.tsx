import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, MessageSquare, Users, Palette, Star,
  BarChart3, Settings, Bell,
  Shield, LogOut,
  Zap, UserPlus, MapPin, Bot, PhoneCall, Send,
  ShoppingCart, FileText, Clock, MoreVertical, Share2, Moon, Sun, Menu, X, Mail,
  Workflow, Link, GraduationCap, MessageCircle, FormInput, PenTool,
  CreditCard, Building2, PhoneOff, Camera, Upload, Store, Calculator,
  Globe, QrCode
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { useThemeStore } from '../lib/themeStore';
import { MobileApp } from '../lib/capacitor-app';
import { useViewport } from '../hooks/useViewport';
import NotificationCenter from '../components/NotificationCenter';
import AvaExecutiveAssistant from '../components/AvaExecutiveAssistant';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  roles?: string[];
  isExternal?: boolean;
}

const menuItems: MenuItem[] = [
  { id: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { id: '/whatsapp', label: 'WhatsApp', icon: <MessageSquare size={20} />, badge: 6 },
  { id: '/crm', label: 'CRM', icon: <Users size={20} /> },
  { id: '/leads', label: 'Leads', icon: <UserPlus size={20} /> },
  { id: '/appointments', label: 'Appointments', icon: <Clock size={20} /> },
  { id: '/ecommerce', label: 'E-Commerce', icon: <ShoppingCart size={20} /> },
  { id: '/store', label: 'Store', icon: <Store size={20} />, isExternal: true },
  { id: '/email-marketing', label: 'Email Marketing', icon: <Mail size={20} /> },
  { id: '/documents', label: 'Documents', icon: <FileText size={20} /> },
  { id: '/social', label: 'Social Media', icon: <span className="text-xl">📱</span> },
  { id: '/google-business', label: 'Google Profile', icon: <MapPin size={20} /> },
  { id: '/ai-chatbot', label: 'AI Chatbot', icon: <Bot size={20} /> },
  { id: '/voice-call', label: 'Voice Call', icon: <PhoneCall size={20} /> },
  { id: '/creative', label: 'Creative', icon: <Palette size={20} /> },
  { id: '/reviews', label: 'Reviews', icon: <Star size={20} /> },
  { id: '/automation', label: 'Automation', icon: <Zap size={20} /> },
  { id: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { id: '/reports', label: 'Reports', icon: <Share2 size={20} /> },
  { id: '/bulk-import', label: 'Import', icon: <Users size={20} /> },
  { id: '/import-leads', label: 'Import Leads', icon: <Upload size={20} /> },
  { id: '/ca-copilot', label: 'CA Copilot', icon: <Calculator size={20} /> },
];

const menuSections: { label: string; items: MenuItem[] }[] = [
  {
    label: 'Products',
    items: [
      { id: '/google-reviews-qr', label: 'Reviews QR', icon: <QrCode size={20} /> },
      { id: '/vcard-maker', label: 'V-Card Maker', icon: <CreditCard size={20} /> },
      { id: '/website-builder-product', label: 'Website Builder', icon: <Globe size={20} /> },
    ],
  },
  {
    label: 'Automation & AI',
    items: [
      { id: '/workflows', label: 'Workflows', icon: <Workflow size={20} /> },
      { id: '/trigger-links', label: 'Trigger Links', icon: <Link size={20} /> },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { id: '/surveys', label: 'Surveys & Forms', icon: <FormInput size={20} /> },
      { id: '/blog', label: 'Blog', icon: <PenTool size={20} /> },
      { id: '/review-requests', label: 'Review Requests', icon: <Star size={20} /> },
      { id: '/payment-links', label: 'Payment Links', icon: <CreditCard size={20} /> },
    ],
  },
  {
    label: 'Growth',
    items: [
      { id: '/courses', label: 'Courses', icon: <GraduationCap size={20} /> },
      { id: '/funnels', label: 'Funnels', icon: <MessageCircle size={20} /> },
      { id: '/conversations', label: 'Conversations', icon: <MessageSquare size={20} /> },
    ],
  },
];

const settingsMenuItems: MenuItem[] = [
  { id: '/custom-fields', label: 'Custom Fields', icon: <FormInput size={20} /> },
  { id: '/client-portal', label: 'Client Portal', icon: <Building2 size={20} /> },
  { id: '/agency', label: 'Agency', icon: <Users size={20} /> },
  { id: '/admin/users', label: 'User Management', icon: <Users size={20} />, roles: ['SUPER_ADMIN', 'OWNER', 'ADMIN'] },
  { id: '/reseller-hub', label: 'Reseller Hub', icon: <Store size={20} /> },
  { id: '/missed-call-settings', label: 'Missed Call', icon: <PhoneOff size={20} /> },
  { id: '/dograh-settings', label: 'Voice AI', icon: <Bot size={20} /> },
  { id: '/snapshots', label: 'Snapshots', icon: <Camera size={20} /> },
  { id: '/profile', label: 'Profile', icon: <Shield size={20} /> },
  { id: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  { id: '/billing', label: 'Billing', icon: <MoreVertical size={20} />, roles: ['OWNER', 'ADMIN'] },
  { id: '/team', label: 'Team', icon: <Users size={20} />, roles: ['OWNER', 'ADMIN'] },
  { id: '/api-keys', label: 'API Keys', icon: <MoreVertical size={20} />, roles: ['OWNER', 'ADMIN'] },
  { id: '/audit-log', label: 'Audit Log', icon: <Shield size={20} />, roles: ['OWNER', 'ADMIN'] },
];

// Bottom nav items for mobile (5 main items)
const bottomNavItems: MenuItem[] = [
  { id: '/dashboard', label: 'Home', icon: <Home size={22} /> },
  { id: '/whatsapp', label: 'Chat', icon: <MessageSquare size={22} /> },
  { id: '/crm', label: 'CRM', icon: <Users size={22} /> },
  { id: '/leads', label: 'Leads', icon: <UserPlus size={22} /> },
  { id: '/more', label: 'More', icon: <Menu size={22} /> },
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, business, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { isMobile, isTablet, isDesktop } = useViewport();
  const [showNotifications, setShowNotifications] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isNative = MobileApp.isNative();
  const sidebarOpen = !collapsed;
  const showSidebarOverlay = isTablet && sidebarOpen;
  const userName = user?.name || 'Admin User';
  const userEmail = user?.email || 'admin@bizzauto.com';
  const userRole = user?.role || 'OWNER';
  const businessPlan = business?.plan || 'FREE';

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const filteredSettingsMenuItems = settingsMenuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const handleBottomNavClick = (id: string) => {
    if (id === '/more') {
      setShowMobileMenu(!showMobileMenu);
    } else {
      navigate(id);
    }
  };

  return (
    <div
      className="bg-gray-50 dark:bg-gray-900 flex"
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
    >
      {/* ===== TABLET BACKDROP (for slide-out sidebar) ===== */}
      {showSidebarOverlay && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-fade-in-up"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      {/* Mobile: completely hidden */}
      {/* Tablet (md-lg): slide-out drawer with w-72 (fixed position) */}
      {/* Desktop (lg+): always visible, collapsible w-64/w-20 (flex item, not fixed) */}
      <div
        className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex-col transition-all duration-300 sidebar-glow ${
          isMobile ? 'hidden' :
          isTablet ? `fixed left-0 top-0 z-50 ${sidebarOpen ? 'flex w-72 shadow-2xl' : 'hidden'}` :
          `flex flex-shrink-0 ${collapsed ? 'w-20' : 'w-64'}`
        }`}
        style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="BizzAuto Ai Logo" className="h-20 w-auto flex-shrink-0" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive(item.id)
                  ? 'bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/20 font-medium relative nav-indicator'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3">
                <span className={`transition-transform duration-200 ${isActive(item.id) ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 pulse-dot">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {menuSections.map((section) => (
            <div key={section.label}>
              <div className="my-3 border-t border-white/10" />
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive(item.id)
                      ? 'bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/20 font-medium relative nav-indicator'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={`transition-transform duration-200 ${isActive(item.id) ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}

          <div className="my-3 border-t border-white/10" />

          {filteredSettingsMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive(item.id)
                  ? 'bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-lg shadow-blue-500/20 font-medium relative nav-indicator'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`transition-transform duration-200 ${isActive(item.id) ? 'scale-110' : 'group-hover:scale-105'}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 w-full hover:bg-white/5 rounded-xl p-2.5 transition-colors"
            title={collapsed ? 'Profile' : undefined}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white/20 flex-shrink-0">
              {(userName || 'A').charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full hover:bg-red-500/10 rounded-xl p-2.5 transition-colors mt-1 text-gray-400 hover:text-red-400"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT AREA ===== */}
      {/* On desktop, sidebar is a flex item so no margin needed — flex-1 handles sizing */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isMobile ? 'ml-0' :
        isTablet ? (sidebarOpen ? 'ml-72' : 'ml-0') :
        ''
      }`}>
        {/* ===== MOBILE TOP BAR (visible only on mobile) =====
            backdrop-blur removed on mobile — kills Android scroll perf. */}
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-700/50 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40 ios-status-bar" style={{ transform: 'translateZ(0)' }}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">BizzAuto</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate">
                {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isDark ? <Sun size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Moon size={16} className="sm:w-[18px] sm:h-[18px]" />}
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 sm:top-12 z-50">
                  <NotificationCenter
                    onNavigate={(tab) => {
                      navigate(tab);
                      setShowNotifications(false);
                    }}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== TABLET TOP BAR ===== */}
        <div className="hidden md:flex lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-700/50 px-4 sm:px-6 py-3 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="text-base font-semibold text-gray-900 dark:text-white capitalize truncate">
              {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium ${
              userRole === 'SUPER_ADMIN' || userRole === 'OWNER'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : userRole === 'ADMIN'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : userRole === 'MEMBER'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {userRole}
            </div>
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 z-50">
                  <NotificationCenter
                    onNavigate={(tab) => {
                      navigate(tab);
                      setShowNotifications(false);
                    }}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">{businessPlan} Plan</span>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP TOP BAR (hidden on mobile/tablet) =====
            backdrop-blur-x removed — only on desktop, but still costly during scroll */}
        <div className="hidden lg:flex bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-6 xl:px-8 py-3.5 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
              </svg>
            </button>
            <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize truncate">
              {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              userRole === 'SUPER_ADMIN' || userRole === 'OWNER'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : userRole === 'ADMIN'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : userRole === 'MEMBER'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {userRole}
            </div>
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 z-50">
                  <NotificationCenter
                    onNavigate={(tab) => {
                      navigate(tab);
                      setShowNotifications(false);
                    }}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{businessPlan} Plan</span>
            </div>
          </div>
        </div>

        {/* ===== PAGE CONTENT ===== */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            minHeight: '0px',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="pb-16 md:pb-0">
            {children}
          </div>
        </div>
      </div>

      {/* ===== AVA EXECUTIVE ASSISTANT ===== */}
      <AvaExecutiveAssistant />

      {/* ===== MOBILE BOTTOM NAVIGATION (visible only on mobile) ===== */}
      <div className="md:hidden mobile-bottom-nav">
        <div className="flex items-center justify-around py-1.5 sm:py-2 px-1 sm:px-2">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleBottomNavClick(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-xl transition-all duration-200 min-w-[50px] sm:min-w-[56px] ${
                item.id === '/more'
                  ? 'text-gray-500 dark:text-gray-400'
                  : isActive(item.id)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className={isActive(item.id) && item.id !== '/more' ? 'scale-110' : ''}>
                {item.icon}
              </span>
              <span className={`text-[9px] sm:text-[10px] mt-0.5 font-medium ${
                isActive(item.id) && item.id !== '/more' ? 'text-blue-600 dark:text-blue-400' : ''
              }`}>
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute -top-0.5 right-0.5 sm:right-1 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== MOBILE SLIDE-OUT MENU (More options) ===== */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
          
          {/* Menu Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[75vh] overflow-y-auto mobile-safe-bottom animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* User info */}
            <div className="px-5 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg ring-2 ring-white/20">
                  {(userName || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded-full">
                    {businessPlan} Plan • {userRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu items grid */}
            <div className="p-4 grid grid-cols-3 gap-2">
              {filteredMenuItems.filter(item => !bottomNavItems.find(b => b.id === item.id)).map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                    isActive(item.id)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.icon}
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </button>
              ))}
            </div>

            {/* New feature sections */}
            {menuSections.map((section) => (
              <div key={section.label} className="px-4 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{section.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
              onClick={() => item.isExternal ? window.open(item.id, '_blank') : navigate(item.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                        isActive(item.id)
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {item.icon}
                      <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Settings items */}
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Settings</p>
              <div className="space-y-1">
                {filteredSettingsMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive(item.id)
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Version Badge */}
            <div className="px-4 pb-2 pt-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-green-600 dark:text-green-400">
                  v12.0.1 • {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Logout */}
            <div className="px-4 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium text-sm"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
