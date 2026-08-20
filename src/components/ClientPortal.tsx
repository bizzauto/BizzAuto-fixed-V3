import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Key, Clock, CheckCircle, XCircle, Plus, Search, RefreshCw, Copy, Check,
  ExternalLink, Loader2, X, Eye, EyeOff, Calendar, DollarSign, FileText, TrendingUp,
  LogOut, ChevronDown, Building2, Mail, Phone, ToggleLeft, ToggleRight, AlertCircle,
  BarChart3, ArrowUpRight, Wallet, Handshake
} from 'lucide-react';
import { useToast } from './Toast';

// ============================================================
// TYPES
// ============================================================

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
}

interface PortalEntry {
  id: string;
  token: string;
  contactId: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact | null;
}

interface PortalPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Invoice {
  id: string;
  documentNumber: string;
  title: string;
  amount: number;
  status: string;
  createdAt: string;
  contactName?: string;
}

interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  location?: string;
}

interface DealData {
  contactId: string;
  contactName: string;
  dealValue: number;
  dealStage: string;
  stageName?: string;
  pipeline?: { id: string; name: string; stages: { id: string; name: string; color?: string }[] };
}

interface DashboardStats {
  invoices?: { total: number; totalAmount: number; paidAmount: number; pendingAmount: number };
  appointments?: { total: number; upcoming: number; completed: number };
  deals?: { dealValue: number; dealStage: string; pipeline: { id: string; name: string } | null };
}

interface ClientPortalView {
  admin: 'list';
  client: 'login' | 'dashboard' | 'invoices' | 'appointments' | 'deals';
}

const PERMISSION_OPTIONS = [
  { key: 'view_invoices', label: 'View Invoices', icon: <FileText size={16} /> },
  { key: 'view_deals', label: 'View Deals', icon: <Handshake size={16} /> },
  { key: 'view_appointments', label: 'View Appointments', icon: <Calendar size={16} /> },
  { key: 'make_payments', label: 'Make Payments', icon: <Wallet size={16} /> },
] as const;

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const COMPONENT_PERMISSIONS = [
  'view_invoices',
  'view_deals',
  'view_appointments',
  'make_payments',
];

// ============================================================
// MAIN COMPONENT
// ============================================================

const ClientPortal: React.FC = () => {
  const { success, error: showError } = useToast();

  // --- Admin state ---
  const [portals, setPortals] = useState<PortalEntry[]>([]);
  const [portalPagination, setPortalPagination] = useState<PortalPagination>({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([...COMPONENT_PERMISSIONS]);
  const [creating, setCreating] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [editingPortal, setEditingPortal] = useState<PortalEntry | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Client state ---
  const [clientToken, setClientToken] = useState<string>(() => localStorage.getItem('clientPortalToken') || '');
  const [clientView, setClientView] = useState<'login' | 'dashboard' | 'invoices' | 'appointments' | 'deals'>('login');
  const [clientLoginInput, setClientLoginInput] = useState('');
  const [clientLogging, setClientLogging] = useState(false);
  const [clientProfile, setClientProfile] = useState<Contact | null>(null);
  const [clientPermissions, setClientPermissions] = useState<string[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats>({});
  const [dashboardInvoices, setDashboardInvoices] = useState<Invoice[]>([]);
  const [dashboardAppointments, setDashboardAppointments] = useState<Appointment[]>([]);
  const [clientLoading, setClientLoading] = useState(false);

  // --- Invoice sub-view ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // --- Appointment sub-view ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptStatusFilter, setApptStatusFilter] = useState('');
  const [apptLoading, setApptLoading] = useState(false);

  // --- Deals sub-view ---
  const [deals, setDeals] = useState<DealData | null>(null);
  const [dealActivities, setDealActivities] = useState<any[]>([]);
  const [dealLoading, setDealLoading] = useState(false);

  // ============================================================
  // ADMIN: Fetch portals
  // ============================================================

  const fetchPortals = useCallback(async () => {
    setAdminLoading(true);
    try {
      const params: any = { page: portalPagination.page, limit: portalPagination.limit };
      if (adminSearch) params.search = adminSearch;
      const res = await fetch(`/api/client-portal?${new URLSearchParams(params)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) {
        setPortals(json.data.portals);
        setPortalPagination(json.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load portals:', err);
    } finally {
      setAdminLoading(false);
    }
  }, [portalPagination.page, portalPagination.limit, adminSearch]);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

  // ============================================================
  // ADMIN: Fetch contacts for create modal
  // ============================================================

  const fetchContacts = async (search?: string) => {
    setContactsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      const res = await fetch(`/api/contacts?${new URLSearchParams(params)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      const list = json.data?.contacts || json.data || [];
      setContacts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  // ============================================================
  // ADMIN: Create portal access
  // ============================================================

  const handleCreatePortal = async () => {
    if (!selectedContactId) {
      showError('Please select a contact');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/client-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ contactId: selectedContactId, permissions: selectedPermissions }),
      });
      const json = await res.json();
      if (json.success) {
        success('Portal access created');
        setShowCreateModal(false);
        setSelectedContactId('');
        setSelectedPermissions([...COMPONENT_PERMISSIONS]);
        fetchPortals();
      } else {
        showError(json.error || 'Failed to create portal access');
      }
    } catch (err) {
      showError('Failed to create portal access');
    } finally {
      setCreating(false);
    }
  };

  // ============================================================
  // ADMIN: Toggle active status
  // ============================================================

  const handleToggleActive = async (portal: PortalEntry) => {
    try {
      const res = await fetch(`/api/client-portal/${portal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isActive: !portal.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        success(json.data.isActive ? 'Portal activated' : 'Portal deactivated');
        fetchPortals();
      }
    } catch {
      showError('Failed to update portal');
    }
  };

  // ============================================================
  // ADMIN: Update permissions
  // ============================================================

  const handleUpdatePermissions = async () => {
    if (!editingPortal) return;
    try {
      const res = await fetch(`/api/client-portal/${editingPortal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const json = await res.json();
      if (json.success) {
        success('Permissions updated');
        setEditingPortal(null);
        fetchPortals();
      }
    } catch {
      showError('Failed to update permissions');
    }
  };

  // ============================================================
  // ADMIN: Regenerate token
  // ============================================================

  const handleRegenerateToken = async (portal: PortalEntry) => {
    setRegeneratingId(portal.id);
    try {
      const res = await fetch(`/api/client-portal/${portal.id}/regenerate-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) {
        success('Token regenerated. Old token is now invalid.');
        fetchPortals();
      }
    } catch {
      showError('Failed to regenerate token');
    } finally {
      setRegeneratingId(null);
    }
  };

  // ============================================================
  // ADMIN: Delete portal
  // ============================================================

  const handleDeletePortal = async (portal: PortalEntry) => {
    if (!confirm(`Revoke portal access for ${portal.contact?.name || 'this contact'}?`)) return;
    setDeletingId(portal.id);
    try {
      const res = await fetch(`/api/client-portal/${portal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) {
        success('Portal access revoked');
        fetchPortals();
      }
    } catch {
      showError('Failed to revoke portal access');
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // ADMIN: Copy portal link
  // ============================================================

  const getPortalLink = (token: string) => {
    const base = window.location.origin;
    return `${base}/portal?token=${token}`;
  };

  const handleCopyLink = async (portal: PortalEntry) => {
    const link = getPortalLink(portal.token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTokenId(portal.id);
      success('Portal link copied');
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch {
      showError('Failed to copy link');
    }
  };

  // ============================================================
  // CLIENT: Login with token
  // ============================================================

  const handleClientLogin = async () => {
    const token = clientLoginInput.trim() || clientToken;
    if (!token) {
      showError('Enter a portal token');
      return;
    }
    setClientLogging(true);
    try {
      const res = await fetch('/api/client-portal/p/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (json.success) {
        setClientToken(token);
        localStorage.setItem('clientPortalToken', token);
        setClientProfile(json.data.contact);
        setClientPermissions(json.data.portal.permissions || []);
        success(`Welcome, ${json.data.contact?.name}`);
        setClientView('dashboard');
        loadDashboard(token);
      } else {
        showError(json.error || 'Invalid token');
      }
    } catch {
      showError('Login failed');
    } finally {
      setClientLogging(false);
    }
  };

  // ============================================================
  // CLIENT: Logout
  // ============================================================

  const handleClientLogout = () => {
    setClientToken('');
    localStorage.removeItem('clientPortalToken');
    setClientProfile(null);
    setClientPermissions([]);
    setDashboard({});
    setClientView('login');
    setClientLoginInput('');
  };

  // ============================================================
  // CLIENT: Load dashboard
  // ============================================================

  const loadDashboard = async (token?: string) => {
    const t = token || clientToken;
    if (!t) return;
    setClientLoading(true);
    try {
      const res = await fetch('/api/client-portal/p/dashboard', {
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = await res.json();
      if (json.success) {
        setDashboard(json.data.stats || {});
        setDashboardInvoices(json.data.recentInvoices || []);
        setDashboardAppointments(json.data.upcomingAppointments || []);
        if (json.data.contact) setClientProfile(json.data.contact);
      }
    } catch {
      console.error('Failed to load dashboard');
    } finally {
      setClientLoading(false);
    }
  };

  // ============================================================
  // CLIENT: Load invoices
  // ============================================================

  const loadInvoices = async (status?: string) => {
    if (!clientToken) return;
    setInvoiceLoading(true);
    try {
      const params: any = {};
      if (status) params.status = status;
      const res = await fetch(`/api/client-portal/p/invoices?${new URLSearchParams(params)}`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data.invoices || []);
      }
    } catch {
      console.error('Failed to load invoices');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ============================================================
  // CLIENT: Load appointments
  // ============================================================

  const loadAppointments = async (status?: string) => {
    if (!clientToken) return;
    setApptLoading(true);
    try {
      const params: any = {};
      if (status) params.status = status;
      const res = await fetch(`/api/client-portal/p/appointments?${new URLSearchParams(params)}`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setAppointments(json.data.appointments || []);
      }
    } catch {
      console.error('Failed to load appointments');
    } finally {
      setApptLoading(false);
    }
  };

  // ============================================================
  // CLIENT: Load deals
  // ============================================================

  const loadDeals = async () => {
    if (!clientToken) return;
    setDealLoading(true);
    try {
      const res = await fetch('/api/client-portal/p/deals', {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setDeals(json.data.deal || null);
        setDealActivities(json.data.activities || []);
      }
    } catch {
      console.error('Failed to load deals');
    } finally {
      setDealLoading(false);
    }
  };

  // ============================================================
  // CLIENT: Check existing token on mount
  // ============================================================

  useEffect(() => {
    if (clientToken) {
      handleClientLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // CLIENT: Navigate views and load data
  // ============================================================

  const navigateClientView = (view: typeof clientView) => {
    setClientView(view);
    if (view === 'dashboard') loadDashboard();
    else if (view === 'invoices') loadInvoices(invoiceStatusFilter);
    else if (view === 'appointments') loadAppointments(apptStatusFilter);
    else if (view === 'deals') loadDeals();
  };

  // ============================================================
  // Check if we are on /portal route (client mode) vs admin mode
  // We detect by checking if URL has ?token= param
  // ============================================================

  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  const isClientMode = !!urlToken;

  // Auto-login from URL token
  useEffect(() => {
    if (urlToken && !clientToken) {
      setClientLoginInput(urlToken);
      // Will trigger login on next effect
    }
  }, [urlToken]);

  // ============================================================
  // RENDER: Client Portal Login
  // ============================================================

  const renderClientLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Client Portal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your access token to view your account</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Portal Token</label>
              <div className="relative">
                <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={clientLoginInput}
                  onChange={(e) => setClientLoginInput(e.target.value)}
                  placeholder="Paste your portal token..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleClientLogin()}
                />
              </div>
            </div>
            <button
              onClick={handleClientLogin}
              disabled={clientLogging || !clientLoginInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {clientLogging ? <Loader2 size={20} className="animate-spin" /> : <ArrowUpRight size={20} />}
              {clientLogging ? 'Logging in...' : 'Access Portal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER: Client Sidebar
  // ============================================================

  const renderClientSidebar = () => {
    const navItems = [
      { key: 'dashboard' as const, label: 'Dashboard', icon: <BarChart3 size={20} /> },
      ...(clientPermissions.includes('view_invoices') ? [{ key: 'invoices' as const, label: 'Invoices', icon: <FileText size={20} /> }] : []),
      ...(clientPermissions.includes('view_appointments') ? [{ key: 'appointments' as const, label: 'Appointments', icon: <Calendar size={20} /> }] : []),
      ...(clientPermissions.includes('view_deals') ? [{ key: 'deals' as const, label: 'Deals', icon: <Handshake size={20} /> }] : []),
    ];

    return (
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-screen">
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Client Portal</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{clientProfile?.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigateClientView(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                clientView === item.key
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">{clientProfile?.email}</p>
            {clientProfile?.company && <p className="text-xs text-gray-400 dark:text-gray-500">{clientProfile.company}</p>}
          </div>
          <button
            onClick={handleClientLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>
    );
  };

  // ============================================================
  // RENDER: Client Dashboard
  // ============================================================

  const renderClientDashboard = () => {
    const stats = dashboard;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Welcome, {clientProfile?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's an overview of your account</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.invoices && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoices</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">${stats.invoices.totalAmount.toLocaleString()}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="text-green-600 dark:text-green-400">Paid: ${stats.invoices.paidAmount.toLocaleString()}</span>
                <span className="text-yellow-600 dark:text-yellow-400">Pending: ${stats.invoices.pendingAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {stats.appointments && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Appointments</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.appointments.upcoming}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.appointments.completed} completed
              </p>
            </div>
          )}

          {stats.deals && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Deal Value</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">${(stats.deals.dealValue || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.deals.dealStage || 'No stage'}</p>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        {dashboardInvoices.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Invoices</h3>
              {clientPermissions.includes('view_invoices') && (
                <button onClick={() => navigateClientView('invoices')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {dashboardInvoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.documentNumber || inv.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">${inv.amount.toLocaleString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {dashboardAppointments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h3>
              {clientPermissions.includes('view_appointments') && (
                <button onClick={() => navigateClientView('appointments')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {dashboardAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{apt.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(apt.startTime).toLocaleDateString()} at {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${APPOINTMENT_STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER: Client Invoices
  // ============================================================

  const renderClientInvoices = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <div className="flex gap-2">
          {['', 'pending', 'paid', 'overdue'].map((s) => (
            <button
              key={s}
              onClick={() => { setInvoiceStatusFilter(s); loadInvoices(s); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                invoiceStatusFilter === s
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {invoiceLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No invoices found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-right px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-center px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 sm:px-5 md:px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.documentNumber || inv.title}</p>
                  </td>
                  <td className="px-4 sm:px-5 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-5 md:px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td className="px-4 sm:px-5 md:px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDER: Client Appointments
  // ============================================================

  const renderClientAppointments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
        <div className="flex gap-2">
          {['', 'scheduled', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => { setApptStatusFilter(s); loadAppointments(s); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                apptStatusFilter === s
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {apptLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>No appointments found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Appointment</th>
                <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date & Time</th>
                <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="text-center px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 sm:px-5 md:px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{apt.title}</p>
                    {apt.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{apt.description}</p>}
                  </td>
                  <td className="px-4 sm:px-5 md:px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <div>{new Date(apt.startTime).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 sm:px-5 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{apt.location || '-'}</td>
                  <td className="px-4 sm:px-5 md:px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${APPOINTMENT_STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                      {apt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDER: Client Deals
  // ============================================================

  const renderClientDeals = () => (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Your Deal</h1>

      {dealLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
      ) : !deals ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Handshake size={48} className="mx-auto mb-4 opacity-50" />
          <p>No deal information available</p>
        </div>
      ) : (
        <>
          {/* Deal Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{deals.contactName}</h3>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {deals.stageName || deals.dealStage || 'No Stage'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deal Value</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">${(deals.dealValue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipeline</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{deals.pipeline?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Pipeline Stages */}
            {deals.pipeline?.stages && deals.pipeline.stages.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Pipeline Stages</p>
                <div className="flex gap-2 flex-wrap">
                  {deals.pipeline.stages.map((stage) => {
                    const isCurrent = deals.stageName === stage.name;
                    return (
                      <div
                        key={stage.id}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                          isCurrent
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {stage.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Deal Activity */}
          {dealActivities.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Deal Activity</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {dealActivities.map((act: any) => (
                  <div key={act.id} className="px-4 sm:px-5 md:px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{act.title}</p>
                    {act.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{act.description}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(act.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ============================================================
  // RENDER: Client Portal Layout
  // ============================================================

  const renderClientPortal = () => {
    if (!clientToken || clientView === 'login') {
      return renderClientLogin();
    }

    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {renderClientSidebar()}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {clientView === 'dashboard' && renderClientDashboard()}
          {clientView === 'invoices' && renderClientInvoices()}
          {clientView === 'appointments' && renderClientAppointments()}
          {clientView === 'deals' && renderClientDeals()}
        </main>
      </div>
    );
  };

  // ============================================================
  // RENDER: Admin - Create Portal Modal
  // ============================================================

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Portal Access</h2>
            <button onClick={() => { setShowCreateModal(false); setSelectedContactId(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>
          <div className="p-4 sm:p-5 md:p-6 space-y-6">
            {/* Contact selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact</label>
              <div className="relative">
                <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  onFocus={() => fetchContacts()}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">{contactsLoading ? 'Loading contacts...' : 'Select a contact'}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissions</label>
              <div className="space-y-2">
                {PERMISSION_OPTIONS.map((perm) => {
                  const enabled = selectedPermissions.includes(perm.key);
                  return (
                    <button
                      key={perm.key}
                      onClick={() => {
                        setSelectedPermissions((prev) =>
                          enabled ? prev.filter((p) => p !== perm.key) : [...prev, perm.key]
                        );
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        enabled
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {perm.icon}
                      <span className="flex-1 text-left">{perm.label}</span>
                      {enabled ? <CheckCircle size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 md:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setShowCreateModal(false); setSelectedContactId(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePortal}
              disabled={creating || !selectedContactId}
              className="px-4 sm:px-5 md:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create Access'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: Admin - Edit Permissions Modal
  // ============================================================

  const renderEditPermissionsModal = () => {
    if (!editingPortal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Permissions — {editingPortal.contact?.name}
            </h2>
            <button onClick={() => setEditingPortal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>
          <div className="p-4 sm:p-5 md:p-6 space-y-3">
            {PERMISSION_OPTIONS.map((perm) => {
              const enabled = selectedPermissions.includes(perm.key);
              return (
                <button
                  key={perm.key}
                  onClick={() => {
                    setSelectedPermissions((prev) =>
                      enabled ? prev.filter((p) => p !== perm.key) : [...prev, perm.key]
                    );
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    enabled
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {perm.icon}
                  <span className="flex-1 text-left">{perm.label}</span>
                  {enabled ? <CheckCircle size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 md:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setEditingPortal(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePermissions}
              className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Check size={16} />
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: Admin View
  // ============================================================

  const renderAdminView = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield size={28} className="text-blue-600 dark:text-blue-400" />
                Client Portal
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Manage client portal access and permissions</p>
            </div>
            <button
              onClick={() => { setShowCreateModal(true); fetchContacts(); }}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <Plus size={18} />
              Create Portal Access
            </button>
          </div>

          {/* Search bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPortals()}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchPortals}
              className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <RefreshCw size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Portal list */}
      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6">
        {adminLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : portals.length === 0 ? (
          <div className="text-center py-16">
            <Key size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Portal Access Entries</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create portal access for your contacts to let them view invoices, appointments, and deals.</p>
            <button
              onClick={() => { setShowCreateModal(true); fetchContacts(); }}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create Portal Access
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                  <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Token</th>
                  <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Permissions</th>
                  <th className="text-left px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Login</th>
                  <th className="text-center px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-right px-4 sm:px-5 md:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {portals.map((portal) => (
                  <tr key={portal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 sm:px-5 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {portal.contact?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{portal.contact?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{portal.contact?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-gray-600 dark:text-gray-300 max-w-[120px] truncate">
                          {portal.token.substring(0, 12)}...
                        </code>
                        <button
                          onClick={() => handleCopyLink(portal)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copy portal link"
                        >
                          {copiedTokenId === portal.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {portal.permissions.map((p) => (
                          <span key={p} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
                            {p.replace('view_', '').replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {portal.lastLoginAt ? (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(portal.lastLoginAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Never</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(portal)}
                        className="inline-flex items-center gap-1"
                      >
                        {portal.isActive ? (
                          <>
                            <ToggleRight size={24} className="text-green-500" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={24} className="text-gray-400" />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingPortal(portal); setSelectedPermissions(portal.permissions); }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit permissions"
                        >
                          <Eye size={16} className="text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleRegenerateToken(portal)}
                          disabled={regeneratingId === portal.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Regenerate token"
                        >
                          <RefreshCw size={16} className={`text-gray-500 dark:text-gray-400 ${regeneratingId === portal.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeletePortal(portal)}
                          disabled={deletingId === portal.id}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Revoke access"
                        >
                          {deletingId === portal.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <XCircle size={16} className="text-red-500" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renderCreateModal()}
      {renderEditPermissionsModal()}
    </div>
  );

  // ============================================================
  // ROUTE DECISION: /portal -> client view, otherwise -> admin view
  // ============================================================

  // Check if URL path is /portal
  const isPortalRoute = window.location.pathname === '/portal';

  if (isPortalRoute || isClientMode || clientToken) {
    return renderClientPortal();
  }

  return renderAdminView();
};

export default ClientPortal;
