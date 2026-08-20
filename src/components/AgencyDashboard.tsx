import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, DollarSign, Globe, Palette, Image,
  Plus, Trash2, RefreshCw, ArrowUpRight, ArrowDownRight,
  Pause, Play, Edit3, Save, X, ChevronDown, ExternalLink,
  LayoutDashboard, Settings, CreditCard, Crown, BarChart3,
  Upload, Eye, Code, Loader2, AlertTriangle, CheckCircle,
  Copy, Lock, Unlock, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuthStore } from '../lib/authStore';
import apiClient from '../lib/api';

// ============================================================
// TYPES
// ============================================================

interface Agency {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  customDomain?: string;
  plan: 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
  updatedAt: string;
  subAccountCount: number;
  maxSubAccounts: number;
}

interface SubAccount {
  id: string;
  name: string;
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  updatedAt: string;
  contacts: number;
  messages: number;
  lastActivity?: string;
}

interface AgencyStats {
  totalSubAccounts: number;
  totalContacts: number;
  totalMessages: number;
  totalRevenue: number;
  activeSubAccounts: number;
  suspendedSubAccounts: number;
}

interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  customCSS: string;
}

interface WhiteLabelSettings {
  enabled: boolean;
  customDomain: string;
  hideBranding: boolean;
  customLoginUrl: string;
}

// ============================================================
// API
// ============================================================

const agencyAPI = {
  getAgency: () => apiClient.get('/agency'),
  createAgency: (data: any) => apiClient.post('/agency', data),
  updateAgency: (data: any) => apiClient.put('/agency', data),
  getSubAccounts: () => apiClient.get('/agency/sub-accounts'),
  createSubAccount: (data: any) => apiClient.post('/agency/sub-accounts', data),
  suspendSubAccount: (id: string) => apiClient.put(`/agency/sub-accounts/${id}/suspend`),
  activateSubAccount: (id: string) => apiClient.put(`/agency/sub-accounts/${id}/activate`),
  deleteSubAccount: (id: string) => apiClient.delete(`/agency/sub-accounts/${id}`),
  getStats: () => apiClient.get('/agency/stats'),
  getBranding: () => apiClient.get('/agency/branding'),
  updateBranding: (data: any) => apiClient.put('/agency/branding', data),
  getWhiteLabel: () => apiClient.get('/agency/white-label'),
  updateWhiteLabel: (data: any) => apiClient.put('/agency/white-label', data),
};

// ============================================================
// CONSTANTS
// ============================================================

const AGENCY_PLANS = [
  { value: 'STARTER', label: 'Starter', maxSubAccounts: 5, price: 49 },
  { value: 'GROWTH', label: 'Growth', maxSubAccounts: 15, price: 149 },
  { value: 'PRO', label: 'Pro', maxSubAccounts: 50, price: 299 },
  { value: 'ENTERPRISE', label: 'Enterprise', maxSubAccounts: 999, price: 499 },
] as const;

const SUB_ACCOUNT_PLANS = [
  { value: 'FREE', label: 'Free', color: '#6B7280' },
  { value: 'STARTER', label: 'Starter', color: '#3B82F6' },
  { value: 'GROWTH', label: 'Growth', color: '#10B981' },
  { value: 'PRO', label: 'Pro', color: '#F59E0B' },
] as const;

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  GROWTH: 'bg-emerald-100 text-emerald-700',
  PRO: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-600',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sub-accounts', label: 'Sub-Accounts', icon: Users },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'white-label', label: 'White Label', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

// ============================================================
// SUB-COMPONENTS
// ============================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  positive?: boolean;
}> = ({ title, value, icon, color, change, positive }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      {change && (
        <div className={`flex items-center gap-1 text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </div>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={danger ? 'text-red-600' : 'text-amber-600'} size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const AgencyDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();

  // Tabs
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data
  const [agency, setAgency] = useState<Agency | null>(null);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [branding, setBranding] = useState<BrandingSettings>({
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
    logoUrl: '',
    faviconUrl: '',
    customCSS: '',
  });
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelSettings>({
    enabled: false,
    customDomain: '',
    hideBranding: false,
    customLoginUrl: '',
  });

  // Forms
  const [showCreateAgency, setShowCreateAgency] = useState(false);
  const [showCreateSubAccount, setShowCreateSubAccount] = useState(false);
  const [editingAgency, setEditingAgency] = useState(false);
  const [editingBranding, setEditingBranding] = useState(false);
  const [editingWhiteLabel, setEditingWhiteLabel] = useState(false);

  const [agencyForm, setAgencyForm] = useState({
    name: '',
    logo: '',
    website: '',
    customDomain: '',
    plan: 'STARTER' as Agency['plan'],
  });

  const [subAccountForm, setSubAccountForm] = useState({
    name: '',
    plan: 'FREE' as SubAccount['plan'],
  });

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [agencyRes, subAccountsRes, statsRes, brandingRes, whiteLabelRes] = await Promise.allSettled([
        agencyAPI.getAgency(),
        agencyAPI.getSubAccounts(),
        agencyAPI.getStats(),
        agencyAPI.getBranding(),
        agencyAPI.getWhiteLabel(),
      ]);

      if (agencyRes.status === 'fulfilled' && agencyRes.value?.data) {
        setAgency(agencyRes.value.data);
      }

      if (subAccountsRes.status === 'fulfilled' && subAccountsRes.value?.data) {
        const data = subAccountsRes.value.data;
        setSubAccounts(Array.isArray(data) ? data : data?.subAccounts || []);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }

      if (brandingRes.status === 'fulfilled' && brandingRes.value?.data) {
        setBranding(brandingRes.value.data);
      }

      if (whiteLabelRes.status === 'fulfilled' && whiteLabelRes.value?.data) {
        setWhiteLabel(whiteLabelRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch agency data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // AGENCY CRUD
  // ============================================================

  const handleCreateAgency = async () => {
    if (!agencyForm.name.trim()) {
      toast.error('Agency name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await agencyAPI.createAgency(agencyForm);
      setAgency(res.data);
      setShowCreateAgency(false);
      setAgencyForm({ name: '', logo: '', website: '', customDomain: '', plan: 'STARTER' });
      toast.success('Agency created successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create agency');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAgency = async () => {
    if (!agencyForm.name.trim()) {
      toast.error('Agency name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await agencyAPI.updateAgency(agencyForm);
      setAgency(res.data);
      setEditingAgency(false);
      toast.success('Agency updated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update agency');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SUB-ACCOUNT CRUD
  // ============================================================

  const handleCreateSubAccount = async () => {
    if (!subAccountForm.name.trim()) {
      toast.error('Account name is required');
      return;
    }
    if (agency && subAccounts.length >= agency.maxSubAccounts) {
      toast.error(`You've reached the maximum sub-account limit (${agency.maxSubAccounts})`);
      return;
    }
    setSaving(true);
    try {
      const res = await agencyAPI.createSubAccount(subAccountForm);
      setSubAccounts((prev) => [...prev, res.data]);
      setShowCreateSubAccount(false);
      setSubAccountForm({ name: '', plan: 'FREE' });
      toast.success('Sub-account created successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create sub-account');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendSubAccount = (id: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: 'Suspend Sub-Account',
      message: `Are you sure you want to suspend "${name}"? They will lose access until reactivated.`,
      danger: true,
      confirmLabel: 'Suspend',
      onConfirm: async () => {
        try {
          await agencyAPI.suspendSubAccount(id);
          setSubAccounts((prev) =>
            prev.map((sa) => (sa.id === id ? { ...sa, status: 'suspended' as const } : sa))
          );
          toast.success(`${name} has been suspended`);
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to suspend sub-account');
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleActivateSubAccount = async (id: string) => {
    try {
      await agencyAPI.activateSubAccount(id);
      setSubAccounts((prev) =>
        prev.map((sa) => (sa.id === id ? { ...sa, status: 'active' as const } : sa))
      );
      toast.success('Sub-account activated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to activate sub-account');
    }
  };

  const handleDeleteSubAccount = (id: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: 'Remove Sub-Account',
      message: `Are you sure you want to remove "${name}"? This action cannot be undone.`,
      danger: true,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await agencyAPI.deleteSubAccount(id);
          setSubAccounts((prev) => prev.filter((sa) => sa.id !== id));
          toast.success(`${name} has been removed`);
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to remove sub-account');
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // ============================================================
  // BRANDING
  // ============================================================

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const res = await agencyAPI.updateBranding(branding);
      setBranding(res.data);
      setEditingBranding(false);
      toast.success('Branding updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // WHITE LABEL
  // ============================================================

  const handleSaveWhiteLabel = async () => {
    setSaving(true);
    try {
      const res = await agencyAPI.updateWhiteLabel(whiteLabel);
      setWhiteLabel(res.data);
      setEditingWhiteLabel(false);
      toast.success('White-label settings updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update white-label settings');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const formatCurrency = (val: number) => '\u20B9' + val.toLocaleString('en-IN');

  const getPlanLabel = (plan: string) => AGENCY_PLANS.find((p) => p.value === plan)?.label || plan;

  const startEditAgency = () => {
    if (agency) {
      setAgencyForm({
        name: agency.name,
        logo: agency.logo || '',
        website: agency.website || '',
        customDomain: agency.customDomain || '',
        plan: agency.plan,
      });
    }
    setEditingAgency(true);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw size={48} className="text-indigo-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Agency Dashboard</h2>
          <p className="text-gray-500">Fetching your agency data...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // NO AGENCY STATE
  // ============================================================

  if (!agency && !showCreateAgency) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="text-indigo-600" size={36} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Welcome to Agency Mode</h1>
          <p className="text-gray-600 mb-8 text-lg">
            Create your agency to start managing sub-accounts, custom branding, and white-label solutions.
          </p>
          <button
            onClick={() => setShowCreateAgency(true)}
            className="px-4 sm:px-6 md:px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Create Your Agency
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Crown className="text-indigo-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{agency?.name || 'Agency Dashboard'}</h1>
              <p className="text-gray-500 text-sm">
                {getPlanLabel(agency?.plan || 'STARTER')} Plan &middot; {subAccounts.length}/{agency?.maxSubAccounts || 0} sub-accounts
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <StatCard
                title="Sub-Accounts"
                value={stats?.totalSubAccounts ?? subAccounts.length}
                icon={<Users size={22} className="text-indigo-600" />}
                color="bg-indigo-100"
                change={`${stats?.activeSubAccounts ?? subAccounts.filter((s) => s.status === 'active').length} active`}
                positive
              />
              <StatCard
                title="Total Contacts"
                value={stats?.totalContacts ?? subAccounts.reduce((sum, sa) => sum + (sa.contacts || 0), 0).toLocaleString()}
                icon={<Building2 size={22} className="text-emerald-600" />}
                color="bg-emerald-100"
              />
              <StatCard
                title="Total Messages"
                value={stats?.totalMessages ?? subAccounts.reduce((sum, sa) => sum + (sa.messages || 0), 0).toLocaleString()}
                icon={<BarChart3 size={22} className="text-amber-600" />}
                color="bg-amber-100"
              />
              <StatCard
                title="Revenue"
                value={formatCurrency(stats?.totalRevenue ?? 0)}
                icon={<DollarSign size={22} className="text-purple-600" />}
                color="bg-purple-100"
                change={stats?.suspendedSubAccounts ? `${stats.suspendedSubAccounts} suspended` : undefined}
                positive={false}
              />
            </div>

            {/* Agency Overview */}
            {agency && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Agency Details</h2>
                  <button onClick={startEditAgency} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Agency Name</label>
                    <p className="text-gray-900 font-medium">{agency.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Plan</label>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${PLAN_COLORS[agency.plan] || 'bg-gray-100 text-gray-700'}`}>
                      {getPlanLabel(agency.plan)}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Sub-Accounts</label>
                    <p className="text-gray-900 font-medium">
                      {agency.subAccountCount} / {agency.maxSubAccounts}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((agency.subAccountCount / agency.maxSubAccounts) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Website</label>
                    <p className="text-gray-900 font-medium">{agency.website || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Custom Domain</label>
                    <p className="text-gray-900 font-medium">{agency.customDomain || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Created</label>
                    <p className="text-gray-900 font-medium">{new Date(agency.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Sub-Accounts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Sub-Accounts</h2>
                <button onClick={() => setActiveTab('sub-accounts')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View All →
                </button>
              </div>
              {subAccounts.length === 0 ? (
                <p className="text-gray-500 text-center py-4 sm:py-6 md:py-8">No sub-accounts yet. Create your first one!</p>
              ) : (
                <div className="space-y-3">
                  {subAccounts.slice(0, 5).map((sa) => (
                    <div key={sa.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Building2 className="text-indigo-600" size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sa.name}</p>
                          <p className="text-sm text-gray-500">Created {new Date(sa.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[sa.plan] || 'bg-gray-100 text-gray-700'}`}>
                          {sa.plan}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sa.status]}`}>
                          {sa.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SUB-ACCOUNTS TAB ========== */}
        {activeTab === 'sub-accounts' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sub-Accounts</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Manage your client accounts ({subAccounts.length}/{agency?.maxSubAccounts || 0})
                </p>
              </div>
              <button
                onClick={() => setShowCreateSubAccount(true)}
                disabled={agency ? subAccounts.length >= agency.maxSubAccounts : false}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Plus size={18} />
                Add Sub-Account
              </button>
            </div>

            {/* Sub-Accounts List */}
            {subAccounts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <Users size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sub-Accounts</h3>
                <p className="text-gray-500 mb-6">Create your first sub-account to get started.</p>
                <button
                  onClick={() => setShowCreateSubAccount(true)}
                  className="px-4 sm:px-5 md:px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Create Sub-Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {subAccounts.map((sa) => (
                  <div key={sa.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Building2 className="text-indigo-600" size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{sa.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[sa.plan] || 'bg-gray-100 text-gray-700'}`}>
                              {sa.plan}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sa.status]}`}>
                              {sa.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span>{sa.contacts || 0} contacts</span>
                            <span>{sa.messages || 0} messages</span>
                            <span>Created {new Date(sa.createdAt).toLocaleDateString()}</span>
                            {sa.lastActivity && <span>Last active {new Date(sa.lastActivity).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sa.status === 'active' ? (
                          <button
                            onClick={() => handleSuspendSubAccount(sa.id, sa.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                            title="Suspend"
                          >
                            <Pause size={14} />
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateSubAccount(sa.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Activate"
                          >
                            <Play size={14} />
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubAccount(sa.id, sa.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== BRANDING TAB ========== */}
        {activeTab === 'branding' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Branding Settings</h2>
                <p className="text-gray-500 text-sm mt-1">Customize the look and feel for your sub-accounts.</p>
              </div>
              {!editingBranding && (
                <button onClick={() => setEditingBranding(true)} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  <Edit3 size={14} /> Edit
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 space-y-6">
              {/* Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      disabled={!editingBranding}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      disabled={!editingBranding}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      disabled={!editingBranding}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      disabled={!editingBranding}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={branding.logoUrl}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    disabled={!editingBranding}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                  />
                  {editingBranding && (
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                      <Upload size={16} />
                    </button>
                  )}
                </div>
                {branding.logoUrl && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl flex items-center justify-center">
                    <img src={branding.logoUrl} alt="Logo preview" className="max-h-16 object-contain" />
                  </div>
                )}
              </div>

              {/* Favicon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
                <input
                  type="text"
                  value={branding.faviconUrl}
                  onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
                  disabled={!editingBranding}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Custom CSS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Code size={14} />
                    Custom CSS
                  </div>
                </label>
                <textarea
                  value={branding.customCSS}
                  onChange={(e) => setBranding({ ...branding, customCSS: e.target.value })}
                  disabled={!editingBranding}
                  placeholder=".brand-header { background: #4F46E5; }"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono disabled:bg-gray-50 resize-y"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Eye size={14} />
                    Preview
                  </div>
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div
                    className="p-4 text-white font-semibold"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    {agency?.name || 'Your Agency'}
                  </div>
                  <div className="p-4 flex gap-3">
                    <button
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                      style={{ backgroundColor: branding.secondaryColor }}
                    >
                      Secondary Button
                    </button>
                  </div>
                </div>
              </div>

              {editingBranding && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setEditingBranding(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveBranding} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Branding
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== WHITE LABEL TAB ========== */}
        {activeTab === 'white-label' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">White-Label Settings</h2>
                <p className="text-gray-500 text-sm mt-1">Configure custom domains and hide branding for your clients.</p>
              </div>
              {!editingWhiteLabel && (
                <button onClick={() => setEditingWhiteLabel(true)} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  <Edit3 size={14} /> Edit
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 space-y-6">
              {/* Enable White Label */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {whiteLabel.enabled ? (
                    <Unlock className="text-emerald-600" size={20} />
                  ) : (
                    <Lock className="text-gray-400" size={20} />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Enable White-Label</p>
                    <p className="text-sm text-gray-500">Remove all branding from client-facing pages</p>
                  </div>
                </div>
                <button
                  onClick={() => editingWhiteLabel && setWhiteLabel({ ...whiteLabel, enabled: !whiteLabel.enabled })}
                  disabled={!editingWhiteLabel}
                  className="disabled:opacity-50"
                >
                  {whiteLabel.enabled ? (
                    <ToggleRight className="text-emerald-600" size={36} />
                  ) : (
                    <ToggleLeft className="text-gray-400" size={36} />
                  )}
                </button>
              </div>

              {/* Custom Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
                <input
                  type="text"
                  value={whiteLabel.customDomain}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, customDomain: e.target.value })}
                  disabled={!editingWhiteLabel}
                  placeholder="app.youragency.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">Point a CNAME record to your custom domain to this server.</p>
              </div>

              {/* Hide Branding */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Hide Platform Branding</p>
                  <p className="text-sm text-gray-500">Remove "Powered by" and logo references</p>
                </div>
                <button
                  onClick={() => editingWhiteLabel && setWhiteLabel({ ...whiteLabel, hideBranding: !whiteLabel.hideBranding })}
                  disabled={!editingWhiteLabel}
                  className="disabled:opacity-50"
                >
                  {whiteLabel.hideBranding ? (
                    <ToggleRight className="text-emerald-600" size={36} />
                  ) : (
                    <ToggleLeft className="text-gray-400" size={36} />
                  )}
                </button>
              </div>

              {/* Custom Login URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Login URL</label>
                <input
                  type="text"
                  value={whiteLabel.customLoginUrl}
                  onChange={(e) => setWhiteLabel({ ...whiteLabel, customLoginUrl: e.target.value })}
                  disabled={!editingWhiteLabel}
                  placeholder="https://youragency.com/login"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
              </div>

              {editingWhiteLabel && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setEditingWhiteLabel(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveWhiteLabel} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SETTINGS TAB ========== */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Agency Settings</h2>
              <p className="text-gray-500 text-sm mt-1">Manage your agency profile and plan.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 space-y-6">
              {/* Agency Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
                <input
                  type="text"
                  value={editingAgency ? agencyForm.name : agency?.name || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                  disabled={!editingAgency}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  type="text"
                  value={editingAgency ? agencyForm.logo : agency?.logo || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, logo: e.target.value })}
                  disabled={!editingAgency}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="text"
                  value={editingAgency ? agencyForm.website : agency?.website || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, website: e.target.value })}
                  disabled={!editingAgency}
                  placeholder="https://youragency.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Custom Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
                <input
                  type="text"
                  value={editingAgency ? agencyForm.customDomain : agency?.customDomain || ''}
                  onChange={(e) => setAgencyForm({ ...agencyForm, customDomain: e.target.value })}
                  disabled={!editingAgency}
                  placeholder="app.youragency.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {AGENCY_PLANS.map((plan) => (
                    <button
                      key={plan.value}
                      onClick={() => editingAgency && setAgencyForm({ ...agencyForm, plan: plan.value })}
                      disabled={!editingAgency}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        (editingAgency ? agencyForm.plan : agency?.plan) === plan.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!editingAgency ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <p className="font-semibold text-gray-900">{plan.label}</p>
                      <p className="text-sm text-gray-500">{plan.maxSubAccounts === 999 ? 'Unlimited' : plan.maxSubAccounts} accounts</p>
                      <p className="text-indigo-600 font-bold mt-1">\u20B9{plan.price}/mo</p>
                    </button>
                  ))}
                </div>
              </div>

              {editingAgency && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setEditingAgency(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleUpdateAgency} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              )}

              {!editingAgency && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button onClick={startEditAgency} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <Edit3 size={16} />
                    Edit Agency
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== CREATE AGENCY MODAL ========== */}
      {showCreateAgency && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Building2 className="text-indigo-600" size={22} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Create Agency</h3>
              </div>
              <button onClick={() => setShowCreateAgency(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name *</label>
                <input
                  type="text"
                  value={agencyForm.name}
                  onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                  placeholder="My Digital Agency"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={agencyForm.website}
                  onChange={(e) => setAgencyForm({ ...agencyForm, website: e.target.value })}
                  placeholder="https://myagency.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
                <input
                  type="text"
                  value={agencyForm.customDomain}
                  onChange={(e) => setAgencyForm({ ...agencyForm, customDomain: e.target.value })}
                  placeholder="app.myagency.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  {AGENCY_PLANS.map((plan) => (
                    <button
                      key={plan.value}
                      onClick={() => setAgencyForm({ ...agencyForm, plan: plan.value })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        agencyForm.plan === plan.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{plan.label}</p>
                      <p className="text-xs text-gray-500">{plan.maxSubAccounts === 999 ? 'Unlimited' : plan.maxSubAccounts} accounts</p>
                      <p className="text-indigo-600 font-bold text-sm mt-1">\u20B9{plan.price}/mo</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreateAgency(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateAgency} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Agency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CREATE SUB-ACCOUNT MODAL ========== */}
      {showCreateSubAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Plus className="text-indigo-600" size={22} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">New Sub-Account</h3>
              </div>
              <button onClick={() => setShowCreateSubAccount(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  value={subAccountForm.name}
                  onChange={(e) => setSubAccountForm({ ...subAccountForm, name: e.target.value })}
                  placeholder="Client Business Name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  {SUB_ACCOUNT_PLANS.map((plan) => (
                    <button
                      key={plan.value}
                      onClick={() => setSubAccountForm({ ...subAccountForm, plan: plan.value as SubAccount['plan'] })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        subAccountForm.plan === plan.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: plan.color }} />
                      <p className="font-semibold text-gray-900 text-sm">{plan.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreateSubAccount(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateSubAccount} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default AgencyDashboard;
