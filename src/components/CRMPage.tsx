import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Filter, Download, MoreVertical, Mail, Phone, Tag, Edit3, Trash2, Eye, UserPlus, Upload, DollarSign,
  TrendingUp, Calendar, Clock, MessageSquare, FileText, Bell, CheckCircle, X, Star, Activity, ArrowUp, ArrowDown,
  BarChart3, PieChart, Target, Award, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Users, Building2, MapPin,
  Globe, Linkedin, Twitter, Facebook, Copy, Check, List, Grid, Columns, Settings, Share2, Printer, Smartphone,
  Zap, Shield, Flag, MessageCircle, Paperclip, Camera, Video, Headphones, Heart, ThumbsUp, Send, Brain
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { contactsAPI, businessAPI, appointmentsAPI, ledgerAPI, dealsAPI, pipelinesAPI, crmInvoicesAPI, goalsAPI } from '../lib/api';
import { useToast } from './Toast';
import PipelineViewEnhanced from './PipelineViewEnhanced';

// ============================================================
// TYPES
// ============================================================

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  tags: string[];
  stage: string;
  stageId?: string;
  dealValue: number;
  lastActivity: string;
  avatar: string;
  createdAt: string;
  pipelineId?: string;
  notes?: Note[];
  activities?: Activity[];
  tasks?: Task[];
  leadScore?: 'hot' | 'warm' | 'cold';
  source?: string;
  address?: string;
  website?: string;
  linkedin?: string;
  socialMedia?: { platform: string; url: string }[];
  customFields?: { key: string; value: string }[];
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  author?: string;
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'whatsapp' | 'sms' | 'task';
  title: string;
  description?: string;
  date: string;
  duration?: string;
  completed?: boolean;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  category?: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; order: number; color?: string; dealCount?: number; dealValue?: number }[];
  isDefault?: boolean;
}

interface Deal {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  title: string;
  value: number;
  stageId?: string;
  stage: string;
  probability: number;
  expectedClose: string;
  createdAt: string;
  notes?: string;
  products?: { name: string; quantity: number; price: number }[];
}

interface Invoice {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  date: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod?: 'cash' | 'bank' | 'upi' | 'card' | 'cheque';
  invoiceId?: string;
  contactName?: string;
  reference?: string;
  recurring?: boolean;
}

interface Appointment {
  id: string;
  title: string;
  clientName: string;
  clientPhone: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  reminder: boolean;
  location?: string;
  staff?: string;
}

interface Goal {
  id: string;
  title: string;
  type: 'revenue' | 'deals' | 'leads' | 'calls' | 'meetings';
  target: number;
  current: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  progress: number;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const STAGES = ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const STAGE_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Contacted': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Qualified': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Proposal': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Negotiation': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Won': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Lost': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ============================================================
// DEMO DATA
// ============================================================

const demoContacts: Contact[] = [
  { id: '1', name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul@example.com', company: 'Tech Solutions Pvt Ltd', tags: ['Hot Lead', 'VIP', 'Enterprise'], stage: 'Qualified', dealValue: 85000, lastActivity: '2 hours ago', avatar: 'RS', createdAt: '1/10/2024', leadScore: 'hot', source: 'Website', address: 'Mumbai, Maharashtra', website: 'techsolutions.com', linkedin: 'rahul-sharma-123', socialMedia: [{ platform: 'twitter', url: '@rahultech' }], customFields: [{ key: 'Industry', value: 'Technology' }, { key: 'Employee Count', value: '200+' }],
    notes: [
      { id: 'n1', content: 'Interested in premium enterprise package with custom integrations', createdAt: '2024-01-15', type: 'note', author: 'You' },
      { id: 'n2', content: 'Discussed pricing - willing to sign annual contract', createdAt: '2024-01-18', type: 'call', author: 'You' },
    ],
    activities: [
      { id: 'a1', type: 'call', title: 'Discovery Call', description: 'Discussed requirements and budget', date: '2024-01-15', duration: '30 min' },
      { id: 'a2', type: 'email', title: 'Sent Proposal', description: 'Sent enterprise proposal package', date: '2024-01-17', duration: '' },
      { id: 'a3', type: 'whatsapp', title: 'Follow-up Message', description: 'Asked about timeline', date: '2024-01-18', duration: '' },
    ],
    tasks: [
      { id: 't1', title: 'Send proposal document', dueDate: '2024-01-20', completed: false, priority: 'high', category: 'Sales' },
      { id: 't2', title: 'Schedule product demo', dueDate: '2024-01-22', completed: false, priority: 'medium', category: 'Meeting' },
      { id: 't3', title: 'Follow up on pricing', dueDate: '2024-01-19', completed: true, priority: 'high', category: 'Sales' },
    ],
  },
  { id: '2', name: 'Priya Patel', phone: '+91 87654 32109', email: 'priya@example.com', company: 'Digital Marketing Co', tags: ['New', 'Startup'], stage: 'New Lead', dealValue: 45000, lastActivity: '5 hours ago', avatar: 'PP', createdAt: '1/12/2024', leadScore: 'warm', source: 'IndiaMART', address: 'Delhi, India', website: 'digitalmarketing.co' },
  { id: '3', name: 'Amit Kumar', phone: '+91 76543 21098', email: 'amit@example.com', company: 'Global Traders', tags: ['Follow up', 'Decision Maker'], stage: 'Contacted', dealValue: 120000, lastActivity: '1 day ago', avatar: 'AK', createdAt: '1/5/2024', leadScore: 'hot', source: 'Referral' },
  { id: '4', name: 'Sneha Gupta', phone: '+91 65432 10987', email: 'sneha@example.com', company: 'Fashion Hub', tags: ['Urgent', 'High Value'], stage: 'Negotiation', dealValue: 200000, lastActivity: '3 hours ago', avatar: 'SG', createdAt: '12/28/2023', leadScore: 'hot', source: 'Website', customFields: [{ key: 'Annual Revenue', value: '?5Cr+' }] },
  { id: '5', name: 'Vikram Singh', phone: '+91 54321 09876', email: 'vikram@example.com', company: 'Auto Parts Ltd', tags: ['Partner'], stage: 'Won', dealValue: 350000, lastActivity: '1 week ago', avatar: 'VS', createdAt: '12/15/2023', leadScore: 'warm', source: 'Google Ads' },
  { id: '6', name: 'Neha Joshi', phone: '+91 43210 98765', email: 'neha@example.com', company: 'HealthFirst Clinic', tags: ['New'], stage: 'New Lead', dealValue: 65000, lastActivity: '30 min ago', avatar: 'NJ', createdAt: '1/20/2024', leadScore: 'warm', source: 'JustDial' },
];

const demoDeals: Deal[] = [
  { id: '1', contactId: '1', contactName: 'Rahul Sharma', title: 'Enterprise License - Annual', value: 85000, stage: 'Qualified', probability: 60, expectedClose: '2024-02-15', createdAt: '2024-01-10', notes: 'Wants custom API integration' },
  { id: '2', contactId: '4', contactName: 'Sneha Gupta', title: 'Annual Subscription + Add-ons', value: 200000, stage: 'Negotiation', probability: 85, expectedClose: '2024-01-30', createdAt: '2024-01-05', notes: 'Negotiating bulk discount', products: [{ name: 'CRM Pro', quantity: 1, price: 150000 }, { name: 'WhatsApp API', quantity: 1, price: 50000 }] },
  { id: '3', contactId: '5', contactName: 'Vikram Singh', title: 'Enterprise Bulk Deal', value: 350000, stage: 'Closed Won', probability: 100, expectedClose: '2024-01-20', createdAt: '2023-12-15' },
  { id: '4', contactId: '3', contactName: 'Amit Kumar', title: 'Starter Package', value: 45000, stage: 'Qualified', probability: 40, expectedClose: '2024-02-28', createdAt: '2024-01-12' },
  { id: '5', contactId: '6', contactName: 'Neha Joshi', title: 'Clinic Management Suite', value: 120000, stage: 'Proposal', probability: 50, expectedClose: '2024-02-10', createdAt: '2024-01-18' },
];

const demoInvoices: Invoice[] = [
  { id: '1', number: 'INV-2024-001', customerName: 'Rahul Sharma', customerEmail: 'rahul@example.com', customerPhone: '+91 98765 43210', items: [{ description: 'CRM License - Annual Enterprise', quantity: 1, rate: 85000, amount: 85000 }, { description: 'Setup & Onboarding Fee', quantity: 1, rate: 15000, amount: 15000 }], subtotal: 100000, tax: 18000, total: 118000, status: 'paid', date: '2024-01-15', dueDate: '2024-02-15', paidDate: '2024-01-20', paymentMethod: 'Bank Transfer' },
  { id: '2', number: 'INV-2024-002', customerName: 'Sneha Gupta', customerEmail: 'sneha@example.com', customerPhone: '+91 65432 10987', items: [{ description: 'Annual Subscription', quantity: 1, rate: 200000, amount: 200000 }, { description: 'Premium Support', quantity: 1, rate: 36000, amount: 36000 }], subtotal: 236000, tax: 42480, total: 278480, status: 'sent', date: '2024-01-18', dueDate: '2024-02-18', notes: 'Payment terms: Net 30' },
  { id: '3', number: 'INV-2024-003', customerName: 'Vikram Singh', customerEmail: 'vikram@example.com', customerPhone: '+91 54321 09876', items: [{ description: 'Bulk Enterprise Package', quantity: 5, rate: 70000, amount: 350000 }], subtotal: 350000, tax: 63000, total: 413000, status: 'overdue', date: '2024-01-05', dueDate: '2024-02-05', paymentMethod: 'Cheque' },
];

const demoLedger: LedgerEntry[] = [
  { id: '1', date: '2024-01-20', type: 'income', category: 'Sales', description: 'Invoice #INV-2024-001 - Rahul Sharma', amount: 118000, paymentMethod: 'bank', invoiceId: '1', contactName: 'Rahul Sharma' },
  { id: '2', date: '2024-01-18', type: 'expense', category: 'Software', description: 'AWS Hosting - Monthly', amount: 15000, paymentMethod: 'bank' },
  { id: '3', date: '2024-01-15', type: 'income', category: 'Sales', description: 'Deposit - Vikram Singh (Bulk Deal)', amount: 100000, paymentMethod: 'upi', reference: 'REF-UPI-1234' },
  { id: '4', date: '2024-01-12', type: 'expense', category: 'Salary', description: 'Staff Salary - January', amount: 250000, paymentMethod: 'bank', recurring: true },
  { id: '5', date: '2024-01-10', type: 'expense', category: 'Marketing', description: 'Google Ads Campaign', amount: 35000, paymentMethod: 'card' },
  { id: '6', date: '2024-01-08', type: 'income', category: 'Services', description: 'Consulting Fee - TechMahindra', amount: 75000, paymentMethod: 'bank' },
];

const demoAppointments: Appointment[] = [
  { id: '1', title: 'Product Demo - Enterprise Suite', clientName: 'Rahul Sharma', clientPhone: '+91 98765 43210', service: 'Enterprise Demo', date: '2024-01-25', time: '10:00', duration: 60, status: 'confirmed', reminder: true, location: 'Virtual - Google Meet', staff: 'Sales Team' },
  { id: '2', title: 'Follow-up Call', clientName: 'Priya Patel', clientPhone: '+91 87654 32109', service: 'Sales Call', date: '2024-01-26', time: '14:00', duration: 30, status: 'scheduled', reminder: false },
  { id: '3', title: 'Contract Signing', clientName: 'Sneha Gupta', clientPhone: '+91 65432 10987', service: 'Legal', date: '2024-01-28', time: '11:00', duration: 45, status: 'scheduled', reminder: true, location: 'Our Office - Conference Room B', staff: 'Legal Team' },
  { id: '4', title: 'Quarterly Review', clientName: 'Vikram Singh', clientPhone: '+91 54321 09876', service: 'Account Review', date: '2024-01-24', time: '15:30', duration: 60, status: 'confirmed', reminder: true, staff: 'Account Manager' },
];

const demoGoals: Goal[] = [
  { id: 'g1', title: 'Monthly Revenue Target', type: 'revenue', target: 500000, current: 293000, period: 'monthly', startDate: '2024-01-01', endDate: '2024-01-31', progress: 59 },
  { id: 'g2', title: 'Deals Closed', type: 'deals', target: 10, current: 4, period: 'monthly', startDate: '2024-01-01', endDate: '2024-01-31', progress: 40 },
  { id: 'g3', title: 'New Leads', type: 'leads', target: 50, current: 42, period: 'monthly', startDate: '2024-01-01', endDate: '2024-01-31', progress: 84 },
  { id: 'g4', title: 'Client Meetings', type: 'meetings', target: 20, current: 12, period: 'monthly', startDate: '2024-01-01', endDate: '2024-01-31', progress: 60 },
];

const demoAutomationRules: AutomationRule[] = [
  { id: 'ar1', name: 'New Lead Follow-up', trigger: 'New lead created', action: 'Send WhatsApp welcome message in 5 min', isActive: true },
  { id: 'ar2', name: 'Stage Changed to Won', trigger: 'Deal stage changed to Won', action: 'Send thank you email + invoice', isActive: true },
  { id: 'ar3', name: 'Inactive Lead Alert', trigger: 'No activity for 7 days', action: 'Send re-engagement WhatsApp', isActive: false },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

const LeadScoreBadge: React.FC<{ score?: 'hot' | 'warm' | 'cold' }> = ({ score }) => {
  if (!score) return null;
  const config = {
    hot: { color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', icon: <Zap size={12} />, label: 'Hot' },
    warm: { color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400', icon: <Activity size={12} />, label: 'Warm' },
    cold: { color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', icon: <SnowflakeIcon size={12} />, label: 'Cold' },
  };
  const c = config[score];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.icon}{c.label}</span>;
};

const SnowflakeIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L12 22M12 2L8 6M12 2L16 6M12 22L8 18M12 22L16 18M2 12H22M2 12L6 8M2 12L6 16M22 12L18 8M22 12L18 16" />
  </svg>
);

const StageBadge: React.FC<{ stage: string }> = ({ stage }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
    {stage}
  </span>
);

// ============================================================
// MAIN CRM COMPONENT
// ============================================================

export default function CRMPage() {
  const navigate = useNavigate();
  const { business, isDemoMode } = useAuthStore();
  const { info } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [goals, setGoals] = useState<Goal[]>(demoGoals);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(demoAutomationRules);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'contacts' | 'pipeline' | 'deals' | 'invoices' | 'ledger' | 'appointments' | 'goals' | 'automation'>('contacts');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [contactViewMode, setContactViewMode] = useState<'table' | 'grid'>('table');
  const [pipelineId, setPipelineId] = useState('default');
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteContactId, setQuickNoteContactId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Initialize - try API first, fall back to demo data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [contactsRes, appointmentsRes, ledgerRes] = await Promise.allSettled([
          contactsAPI.list({ limit: 200 }),
          appointmentsAPI.list({}),
          ledgerAPI.list({}),
        ]);
        if (contactsRes.status === 'fulfilled' && contactsRes.value?.data?.contacts) {
          setContacts(contactsRes.value.data.contacts);
        } else {
          setContacts(demoContacts);
        }
        if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value?.data?.appointments) {
          setAppointments(appointmentsRes.value.data.appointments);
        } else {
          setAppointments(demoAppointments);
        }
        if (ledgerRes.status === 'fulfilled' && ledgerRes.value?.data?.entries) {
          setLedger(ledgerRes.value.data.entries);
        } else {
          setLedger(demoLedger);
        }
        // Deals from API
        const dealsRes = await dealsAPI.list({ limit: 200 }).catch(() => null);
        if (dealsRes?.data?.deals) {
          setDeals(dealsRes.data.data.deals);
        } else {
          setDeals(demoDeals);
        }
        // Invoices from API
        const invoicesRes = await crmInvoicesAPI.list({ limit: 200 }).catch(() => null);
        if (invoicesRes?.data?.invoices) {
          setInvoices(invoicesRes.data.invoices);
        } else {
          setInvoices(demoInvoices);
        }
        // Goals from API
        const goalsRes = await goalsAPI.list({}).catch(() => null);
        if (goalsRes?.data?.goals) {
          setGoals(goalsRes.data.goals);
        } else {
          setGoals(demoGoals);
        }
        setAutomationRules(demoAutomationRules);
      } catch {
        setContacts(demoContacts);
        setDeals(demoDeals);
        setInvoices(demoInvoices);
        setLedger(demoLedger);
        setAppointments(demoAppointments);
        setGoals(demoGoals);
        setAutomationRules(demoAutomationRules);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filters
  const filteredContacts = useMemo(() => contacts.filter(c =>
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)) &&
    (stageFilter === 'all' || c.stage === stageFilter)
  ), [contacts, search, stageFilter]);

  // Stats
  const crmStats = useMemo(() => {
    const totalDealValue = deals.reduce((sum, d) => sum + d.value, 0);
    const wonDeals = deals.filter(d => d.stage === 'Closed Won' || d.stage === 'Won').reduce((sum, d) => sum + d.value, 0);
    const totalRevenue = ledger.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = ledger.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0]);
    return { totalDealValue, wonDeals, totalRevenue, totalExpenses, todayAppointments };
  }, [deals, ledger, appointments]);

  const { totalDealValue, wonDeals, totalRevenue, totalExpenses, todayAppointments } = crmStats;

  // Stage ID to stage name mapping for PipelineViewEnhanced
  const stageIdToName: Record<string, string> = {
    'lead': 'New Lead',
    'contacted': 'Contacted',
    'qualified': 'Qualified',
    'proposal': 'Proposal',
    'negotiation': 'Negotiation',
    'closed_won': 'Won',
    'closed_lost': 'Lost',
  };

  const handleDealStageChange = (dealId: string, newStageId: string) => {
    const stageName = stageIdToName[newStageId] || newStageId;
    // Optimistic update
    setDeals((prev) => prev.map((d) =>
      d.id === dealId ? { ...d, stage: stageName } : d
    ));
    // Persist to API
    dealsAPI.updateStage(dealId, { stage: stageName }).catch(() => {
      // Revert on failure - reload deals
      showToast('Failed to update deal stage', 'error');
    });
  };

  const handleAddContact = async (contactData: any) => {
    try {
      const res = await contactsAPI.create({
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        tags: contactData.tags || [],
      });
      const created = res?.data?.data;
      if (created) {
        const newContact: Contact = {
          ...created,
          company: contactData.company || '',
          dealValue: contactData.dealValue || 0,
          lastActivity: 'Just now',
          avatar: contactData.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??',
          createdAt: new Date().toLocaleDateString(),
          stage: contactData.stage || 'New Lead',
          source: contactData.source || 'Direct',
          notes: [],
          activities: [],
          tasks: [],
        };
        setContacts(prev => [newContact, ...prev]);
      }
    } catch {
      // Fallback to local state
      const newContact: Contact = {
        ...contactData,
        id: `contact-${Date.now()}`,
        dealValue: 0,
        lastActivity: 'Just now',
        avatar: contactData.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??',
        createdAt: new Date().toLocaleDateString(),
        tags: contactData.tags || [],
        notes: [],
        activities: [],
        tasks: [],
      };
      setContacts(prev => [newContact, ...prev]);
    }
    setShowAddModal(false);
    showToast(`Contact "${contactData.name}" added!`);
  };

  // Add Deal
  const handleAddDeal = (dealData: any) => {
    const newDeal: Deal = {
      ...dealData,
      id: `deal-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setDeals(prev => [newDeal, ...prev]);
    setShowDealModal(false);
    showToast(`New deal created: ${newDeal.title}`);
  };

  // Create Invoice
  const handleCreateInvoice = async (invoiceData: any) => {
    try {
      const res = await crmInvoicesAPI.create({
        customerName: invoiceData.customerName,
        customerEmail: invoiceData.customerEmail || '',
        customerPhone: invoiceData.customerPhone || '',
        items: invoiceData.items || [],
        taxRate: invoiceData.tax !== undefined ? Math.round((invoiceData.tax / (invoiceData.subtotal || 1)) * 100) : 18,
        notes: invoiceData.notes,
      });
      if (res?.data?.data) {
        setInvoices(prev => [res.data.data, ...prev]);
      }
    } catch {
      // Fallback to local state
      const newInvoice: Invoice = {
        ...invoiceData,
        id: `inv-${Date.now()}`,
        number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      setInvoices(prev => [newInvoice, ...prev]);
    }
    setShowInvoiceModal(false);
    showToast('Invoice created');
  };

  // Create Appointment
  const handleCreateAppointment = (appointmentData: any) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: `apt-${Date.now()}`,
      status: 'scheduled',
    };
    setAppointments(prev => [...prev, newAppointment]);
    setShowAppointmentModal(false);
    showToast('Appointment booked!');
  };

  // Add Goal
  const handleAddGoal = async (goalData: any) => {
    try {
      const res = await goalsAPI.create({
        title: goalData.title,
        type: goalData.type,
        target: goalData.target,
        current: goalData.current || 0,
        period: goalData.period || 'monthly',
        startDate: goalData.startDate,
        endDate: goalData.endDate,
      });
      if (res?.data?.data) {
        setGoals(prev => [res.data.data, ...prev]);
      }
    } catch {
      // Fallback to local state
      const goal: Goal = {
        ...goalData,
        id: `g-${Date.now()}`,
        progress: goalData.target > 0 ? Math.round((goalData.current / goalData.target) * 100) : 0,
      };
      setGoals(prev => [...prev, goal]);
    }
    setShowGoalModal(false);
    showToast('New goal created!');
  };

  // Add Quick Note
  const handleAddQuickNote = () => {
    if (!quickNoteContactId || !quickNoteText.trim()) return;
    setContacts(prev => prev.map(c => {
      if (c.id === quickNoteContactId) {
        const notes = c.notes || [];
        return {
          ...c,
          notes: [...notes, { id: `n-${Date.now()}`, content: quickNoteText, createdAt: new Date().toISOString().split('T')[0], type: 'note' as const, author: 'You' }],
          lastActivity: 'Just now',
        };
      }
      return c;
    }));
    setQuickNoteText('');
    setQuickNoteContactId(null);
    setShowQuickNoteModal(false);
    showToast('Note added');
  };

  // Delete Contact
  const deleteContact = async (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    try {
      await contactsAPI.delete(id);
    } catch {
      // Already removed from local state
    }
    showToast('Contact deleted', 'info');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : toast.type === 'error' ? <AlertCircle size={18} /> : <Bell size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">CRM Suite</h1>
          <p className="text-gray-500 dark:text-gray-400">Pipeline management, deals, invoices, appointments & goals</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm">
            <UserPlus size={18} /> Add Contact
          </button>
          <button onClick={() => setShowDealModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm">
            <Target size={18} /> New Deal
          </button>
          <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm">
            <FileText size={18} /> Invoice
          </button>
          <button onClick={() => setShowAppointmentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm">
            <Calendar size={18} /> Appointment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-xs">Pipeline</span></div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">?{(totalDealValue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-green-500 mb-1"><TrendingUp size={14} /><span className="text-xs">Won</span></div>
          <p className="text-xl font-bold text-green-600">?{(wonDeals / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-blue-500 mb-1"><Users size={14} /><span className="text-xs">Contacts</span></div>
          <p className="text-xl font-bold text-blue-600">{contacts.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-green-500 mb-1"><BarChart3 size={14} /><span className="text-xs">Revenue</span></div>
          <p className="text-xl font-bold text-green-600">?{(totalRevenue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-red-500 mb-1"><ArrowDown size={14} /><span className="text-xs">Expenses</span></div>
          <p className="text-xl font-bold text-red-600">?{(totalExpenses / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-purple-500 mb-1"><Target size={14} /><span className="text-xs">Goals</span></div>
          <p className="text-xl font-bold text-purple-600">{goals.filter(g => g.progress >= 100).length}/{goals.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-orange-500 mb-1"><Calendar size={14} /><span className="text-xs">Today</span></div>
          <p className="text-xl font-bold text-orange-600">{todayAppointments.length}</p>
        </div>
      </div>

      {/* AI Lead Scoring Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-1 modern-card rounded-xl p-4 sm:p-5 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">AI Lead Scoring</h3>
              <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-300">Predicted close probability</p>
            </div>
          </div>
          <div className="space-y-2">
            {(() => {
              const hot = contacts.filter(c => c.leadScore === 'hot').length;
              const warm = contacts.filter(c => c.leadScore === 'warm').length;
              const cold = contacts.filter(c => c.leadScore === 'cold').length;
              const total = hot + warm + cold || 1;
              return [
                { label: 'Hot Leads', count: hot, color: 'bg-red-500', icon: <Zap size={12} />, percent: (hot / total * 100) },
                { label: 'Warm Leads', count: warm, color: 'bg-yellow-500', icon: <Activity size={12} />, percent: (warm / total * 100) },
                { label: 'Cold Leads', count: cold, color: 'bg-blue-500', icon: <SnowflakeIcon size={12} />, percent: (cold / total * 100) },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {s.icon} {s.label}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{s.count} <span className="text-gray-500">({s.percent.toFixed(0)}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div className={`${s.color} h-full rounded-full transition-all`} style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
        <div className="lg:col-span-2 modern-card rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Top Hot Leads to Follow Up</h3>
            </div>
            <span className="text-[10px] sm:text-xs text-gray-500">Sorted by AI score</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {contacts
              .filter(c => c.leadScore === 'hot')
              .sort((a, b) => (b.dealValue ?? 0) - (a.dealValue ?? 0))
              .slice(0, 4)
              .map(c => (
                <div key={c.id} className="flex items-center gap-2.5 p-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800/30">
                  <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">?{((c.dealValue ?? 0) / 1000).toFixed(0)}K � {c.lastActivity}</p>
                  </div>
                  <button className="flex-shrink-0 p-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600">
                    <MessageSquare size={12} />
                  </button>
                </div>
              ))}
            {contacts.filter(c => c.leadScore === 'hot').length === 0 && (
              <p className="col-span-2 text-center text-xs text-gray-500 py-4">No hot leads yet. Add lead score in contact profiles.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {([
            { key: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
            { key: 'pipeline', label: 'Pipeline', icon: <Columns size={16} /> },
            { key: 'deals', label: 'Deals', icon: <Target size={16} /> },
            { key: 'invoices', label: 'Invoices', icon: <FileText size={16} /> },
            { key: 'ledger', label: 'Ledger', icon: <DollarSign size={16} /> },
            { key: 'appointments', label: 'Appointments', icon: <Calendar size={16} /> },
            { key: 'goals', label: 'Goals', icon: <Award size={16} /> },
            { key: 'automation', label: 'Automation', icon: <Zap size={16} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                viewMode === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================== CONTACTS VIEW ================== */}
      {viewMode === 'contacts' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, company, email, phone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                <option value="all">All Stages</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setContactViewMode('table')}
                  className={`p-2 rounded ${contactViewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                  title="Table View"
                >
                  <List size={16} className="text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setContactViewMode('grid')}
                  className={`p-2 rounded ${contactViewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                  title="Grid View"
                >
                  <Grid size={16} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <button onClick={() => { const csv = [['Name','Phone','Email','Company','Stage','Deal Value','Source','Tags'].join(','), ...filteredContacts.map(c => [c.name, c.phone, c.email, c.company, c.stage, c.dealValue, c.source||'', c.tags.join(';')].join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'contacts_export.csv'; a.click(); URL.revokeObjectURL(url); showToast('Contacts exported!'); }} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          {contactViewMode === 'table' ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredContacts.map(contact => (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setSelectedContact(contact)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {contact.avatar}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                              <p className="text-xs text-gray-500">{contact.email} � {contact.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{contact.company}</td>
                        <td className="px-4 py-3"><StageBadge stage={contact.stage} /></td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">?{(contact.dealValue ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 hidden lg:table-cell"><LeadScoreBadge score={contact.leadScore} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-gray-500">{contact.source || 'Direct'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-full">{tag}</span>
                            ))}
                            {contact.tags.length > 2 && <span className="text-xs text-gray-400">+{contact.tags.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => window.location.href = 'tel:' + contact.phone} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Call"><Phone size={16} /></button>
                            <button onClick={() => window.location.href = 'mailto:' + contact.email} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Email"><Mail size={16} /></button>
                            <button onClick={() => window.open('https://wa.me/' + contact.phone.replace(/[^0-9]/g, ''), '_blank')} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg" title="WhatsApp"><MessageSquare size={16} /></button>
                            <button
                              onClick={() => { setQuickNoteContactId(contact.id); setQuickNoteText(''); setShowQuickNoteModal(true); }}
                              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="Quick Note"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => deleteContact(contact.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContacts.map(contact => (
                <div key={contact.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedContact(contact)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">{contact.avatar}</div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{contact.name}</p>
                        <p className="text-xs text-gray-500">{contact.company}</p>
                      </div>
                    </div>
                    <LeadScoreBadge score={contact.leadScore} />
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <p className="flex items-center gap-1.5"><Mail size={13} /> {contact.email}</p>
                    <p className="flex items-center gap-1.5"><Phone size={13} /> {contact.phone}</p>
                    <p className="flex items-center gap-1.5"><DollarSign size={13} /> ?{(contact.dealValue ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <StageBadge stage={contact.stage} />
                    <span className="text-xs text-gray-400">{contact.source || 'Direct'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================== PIPELINE VIEW ================== */}
      {viewMode === 'pipeline' && (
        <PipelineViewEnhanced deals={deals} onDealStageChange={handleDealStageChange} />
      )}

      {/* ================== DEALS VIEW ================== */}
      {viewMode === 'deals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map(deal => (
              <div key={deal.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <StageBadge stage={deal.stage} />
                  <span className="text-xs text-gray-500">{deal.probability}% probability</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{deal.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{deal.contactName}</p>
                {deal.notes && <p className="text-xs text-gray-400 mb-3 italic">{deal.notes}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xl font-bold text-green-600">?{deal.value.toLocaleString()}</span>
                  <span className="text-xs text-gray-400">Close: {new Date(deal.expectedClose).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {deal.products && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 mb-1">Products:</p>
                    {deal.products.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>{p.name} � {p.quantity}</span>
                        <span>?{p.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================== INVOICES VIEW ================== */}
      {viewMode === 'invoices' && (
        <div className="space-y-4">
          {invoices.map(invoice => (
            <div key={invoice.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-600' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-600' :
                    invoice.status === 'sent' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{invoice.number}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{invoice.customerName} � {invoice.customerEmail}</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">?{invoice.total.toLocaleString()}</span>
              </div>

              {/* Items */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2">Description</th>
                      <th className="text-center pb-2">Qty</th>
                      <th className="text-right pb-2">Rate</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {invoice.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{item.description}</td>
                        <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-600">?{item.rate.toLocaleString()}</td>
                        <td className="py-2 text-right font-medium">?{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 dark:border-gray-500">
                    <tr><td colSpan={3} className="pt-2 text-right text-gray-500">Subtotal:</td><td className="pt-2 text-right">?{invoice.subtotal.toLocaleString()}</td></tr>
                    <tr><td colSpan={3} className="text-right text-gray-500">Tax:</td><td className="text-right">?{invoice.tax.toLocaleString()}</td></tr>
                    <tr className="font-bold"><td colSpan={3} className="text-right text-gray-900 dark:text-white">Total:</td><td className="text-right text-gray-900 dark:text-white">?{invoice.total.toLocaleString()}</td></tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Issued: {invoice.date}</span>
                  <span>Due: {invoice.dueDate}</span>
                  {invoice.paidDate && <span className="text-green-600">Paid: {invoice.paidDate}</span>}
                  {invoice.paymentMethod && <span>Method: {invoice.paymentMethod}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => showToast('PDF download started')} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1">
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={() => window.print()} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => showToast('Invoice sent to customer')} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1">
                    <Send size={14} /> Send
                  </button>
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <button onClick={() => { crmInvoicesAPI.markPaid(invoice.id).then(() => { setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, status: 'paid', paidDate: new Date().toISOString().split('T')[0] } : inv)); showToast(`Invoice ${invoice.number} marked as paid!`); }).catch(() => showToast('Failed to update', 'error')); }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================== LEDGER VIEW ================== */}
      {viewMode === 'ledger' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">Total Income</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">?{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><ArrowUp size={12} /> 12% vs last month</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-5 rounded-xl border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 mb-1">Total Expenses</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">?{totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><ArrowUp size={12} /> 5% vs last month</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Net Profit</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">?{(totalRevenue - totalExpenses).toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">Profit Margin: {totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0}%</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">All Transactions</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {ledger.map(entry => (
                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      entry.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {entry.type === 'income' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{entry.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{entry.category}</span>
                        <span>�</span>
                        <span>{entry.date}</span>
                        {entry.paymentMethod && <><span>�</span><span className="capitalize">{entry.paymentMethod}</span></>}
                        {entry.recurring && <><span>�</span><span className="text-blue-500">?? Recurring</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'income' ? '+' : '-'}?{entry.amount.toLocaleString()}
                    </p>
                    {entry.reference && <p className="text-xs text-gray-400">Ref: {entry.reference}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================== APPOINTMENTS VIEW ================== */}
      {viewMode === 'appointments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map(apt => (
            <div key={apt.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  apt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                  apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  apt.status === 'no-show' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {apt.status.toUpperCase()}
                </span>
                {apt.reminder && <Bell size={14} className="text-yellow-500" />}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{apt.title}</h3>
              <p className="text-sm text-gray-500 mb-2">{apt.clientName}</p>
              <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                <p className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {apt.time}</p>
                <p className="flex items-center gap-1.5"><Clock size={14} /> {apt.duration} min</p>
                <p className="flex items-center gap-1.5"><MessageSquare size={14} /> {apt.service}</p>
                {apt.location && <p className="flex items-center gap-1.5"><MapPin size={14} /> {apt.location}</p>}
                {apt.staff && <p className="flex items-center gap-1.5"><Users size={14} /> {apt.staff}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'confirmed' as const } : a)); showToast('Appointment confirmed!'); }} className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Confirm</button>
                <button onClick={() => showToast('Reschedule link sent to client', 'info')} className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Reschedule</button>
                <button onClick={() => { setAppointments(prev => prev.filter(a => a.id !== apt.id)); showToast('Appointment cancelled', 'info'); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================== GOALS VIEW ================== */}
      {viewMode === 'goals' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowGoalModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm">
              <Plus size={18} /> New Goal
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(goal => {
              const goalTypeConfig = {
                revenue: { icon: <DollarSign size={18} />, bg: 'bg-green-50 dark:bg-green-900/20 text-green-600', color: 'bg-green-500' },
                deals: { icon: <Target size={18} />, bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600', color: 'bg-blue-500' },
                leads: { icon: <Users size={18} />, bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600', color: 'bg-purple-500' },
                calls: { icon: <Phone size={18} />, bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600', color: 'bg-orange-500' },
                meetings: { icon: <Calendar size={18} />, bg: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600', color: 'bg-pink-500' },
              };
              const cfg = goalTypeConfig[goal.type] || goalTypeConfig.revenue;
              return (
                <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>{cfg.icon}</div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      goal.progress >= 100 ? 'bg-green-100 text-green-700' : goal.progress >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {goal.progress}%
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{goal.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 capitalize">{goal.period} target</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">?{goal.current.toLocaleString()} / ?{goal.target.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">{goal.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${cfg.color}`} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
                  </div>
                  {goal.progress >= 100 && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><Award size={12} /> Goal achieved!</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================== AUTOMATION VIEW ================== */}
      {viewMode === 'automation' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">CRM Automation Rules</h3>
            <div className="space-y-3">
              {automationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rule.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                      <p className="text-sm text-gray-500">"{rule.trigger}" ? {rule.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setAutomationRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${rule.isActive ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================== CONTACT DETAIL MODAL ================== */}
      {selectedContact && (
        <ContactDetailModal contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}

      {/* ================== QUICK NOTE MODAL ================== */}
      {showQuickNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Note</h2>
              <button onClick={() => setShowQuickNoteModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-4">
              <textarea
                value={quickNoteText}
                onChange={e => setQuickNoteText(e.target.value)}
                placeholder="Enter your note..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button onClick={() => setShowQuickNoteModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                Cancel
              </button>
              <button onClick={handleAddQuickNote} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== MODALS ================== */}
      {showAddModal && <AddContactModal onClose={() => setShowAddModal(false)} onAdd={handleAddContact} />}
      {showDealModal && <AddDealModal contacts={contacts} onClose={() => setShowDealModal(false)} onAdd={handleAddDeal} />}
      {showInvoiceModal && <InvoiceModal contacts={contacts} onClose={() => setShowInvoiceModal(false)} onCreate={handleCreateInvoice} />}
      {showAppointmentModal && <AppointmentModal contacts={contacts} onClose={() => setShowAppointmentModal(false)} onCreate={handleCreateAppointment} />}
      {showGoalModal && <GoalModal onClose={() => setShowGoalModal(false)} onAdd={handleAddGoal} />}
    </div>
  );
}

// ============================================================
// CONTACT DETAIL MODAL
// ============================================================

const ContactDetailModal: React.FC<{ contact: Contact; onClose: () => void }> = ({ contact, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'tasks' | 'activities' | 'deals'>('overview');
  const { info } = useToast();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
                {contact.avatar}
              </div>
              <div className="text-white">
                <h2 className="text-xl sm:text-2xl font-bold">{contact.name}</h2>
                <p className="text-blue-100">{contact.company}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6">
          <div className="flex gap-4">
            {(['overview', 'notes', 'tasks', 'activities', 'deals'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'notes' && contact.notes ? ` (${contact.notes.length})` : ''}
                {tab === 'tasks' && contact.tasks ? ` (${contact.tasks.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5 md:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 uppercase mb-1">Email</p><p className="font-medium flex items-center gap-1"><Mail size={14} /> {contact.email}</p></div>
                <div><p className="text-xs text-gray-500 uppercase mb-1">Phone</p><p className="font-medium flex items-center gap-1"><Phone size={14} /> {contact.phone}</p></div>
                {contact.address && <div><p className="text-xs text-gray-500 uppercase mb-1">Address</p><p className="font-medium flex items-center gap-1"><MapPin size={14} /> {contact.address}</p></div>}
                {contact.website && <div><p className="text-xs text-gray-500 uppercase mb-1">Website</p><p className="font-medium flex items-center gap-1"><Globe size={14} /> {contact.website}</p></div>}
                <div><p className="text-xs text-gray-500 uppercase mb-1">Deal Value</p><p className="font-bold text-green-600 text-xl">?{(contact.dealValue ?? 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500 uppercase mb-1">Lead Score</p><LeadScoreBadge score={contact.leadScore} /></div>
                <div><p className="text-xs text-gray-500 uppercase mb-1">Source</p><p className="font-medium">{contact.source || 'Direct'}</p></div>
                <div><p className="text-xs text-gray-500 uppercase mb-1">Created</p><p className="font-medium">{contact.createdAt}</p></div>
              </div>

              {contact.tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {contact.customFields && contact.customFields.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-2">
                    {contact.customFields.map((f, i) => (
                      <div key={i} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                        <span className="text-gray-500">{f.key}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              {(contact.notes && contact.notes.length > 0) ? contact.notes.map(note => (
                <div key={note.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        note.type === 'call' ? 'bg-green-100 text-green-700' :
                        note.type === 'email' ? 'bg-blue-100 text-blue-700' :
                        note.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{note.type}</span>
                      <span className="text-xs text-gray-400">{note.author}</span>
                    </div>
                    <span className="text-xs text-gray-400">{note.createdAt}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4 sm:py-6 md:py-8">No notes yet</p>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {(contact.tasks && contact.tasks.length > 0) ? contact.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked={task.completed} className="w-4 h-4 text-blue-600 rounded" />
                    <div>
                      <p className={`font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'} text-sm`}>{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`flex items-center gap-1 ${
                          task.priority === 'high' ? 'text-red-500' :
                          task.priority === 'medium' ? 'text-yellow-500' : 'text-gray-500'
                        }`}>
                          <Flag size={10} /> {task.priority}
                        </span>
                        {task.category && <span>� {task.category}</span>}
                        <span>� Due: {task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => info('Edit task feature coming soon')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Edit3 size={14} className="text-gray-400" /></button>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4 sm:py-6 md:py-8">No tasks assigned</p>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-3">
              {(contact.activities && contact.activities.length > 0) ? contact.activities.map(act => (
                <div key={act.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    act.type === 'call' ? 'bg-green-100 text-green-600' :
                    act.type === 'email' ? 'bg-blue-100 text-blue-600' :
                    act.type === 'whatsapp' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {act.type === 'call' ? <Phone size={14} /> : act.type === 'email' ? <Mail size={14} /> : act.type === 'whatsapp' ? <MessageSquare size={14} /> : <Calendar size={14} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{act.title}</p>
                    {act.description && <p className="text-xs text-gray-500 mt-0.5">{act.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span>{act.date}</span>
                      {act.duration && <><span>�</span><span>{act.duration}</span></>}
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4 sm:py-6 md:py-8">No activity recorded</p>
              )}
            </div>
          )}

          {activeTab === 'deals' && (
            <p className="text-center text-gray-500 py-4 sm:py-6 md:py-8">Deal history for this contact</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ADD CONTACT MODAL
// ============================================================

const AddContactModal: React.FC<{ onClose: () => void; onAdd: (contact: any) => void }> = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '', tags: '', stage: 'New Lead',
    dealValue: '', leadScore: 'warm', source: 'Direct', address: '', website: ''
  });

  const handleSubmit = () => {
    if (!form.name || !form.phone) return;
    onAdd({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      dealValue: parseInt(form.dealValue) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Contact</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Company</label><input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700" /></div>
            <div><label className="block text-sm font-medium mb-1">Source</label><select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700"><option value="Direct">Direct</option><option value="Website">Website</option><option value="IndiaMART">IndiaMART</option><option value="JustDial">JustDial</option><option value="Google Ads">Google Ads</option><option value="Facebook">Facebook</option><option value="Referral">Referral</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Stage</label><select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700">{['New Lead','Contacted','Qualified','Proposal','Negotiation','Won','Lost'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Lead Score</label><select value={form.leadScore} onChange={e => setForm({ ...form, leadScore: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700"><option value="hot">?? Hot</option><option value="warm">?? Warm</option><option value="cold">? Cold</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Deal Value (?)</label><input type="number" value={form.dealValue} onChange={e => setForm({ ...form, dealValue: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700" /></div>
            <div><label className="block text-sm font-medium mb-1">Website</label><input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700" /></div>
          <div><label className="block text-sm font-medium mb-1">Tags (comma separated)</label><input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="VIP, Hot Lead, Enterprise" className="w-full px-3 py-2.5 border rounded-xl bg-white dark:bg-gray-700" /></div>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">Add Contact</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ADD DEAL MODAL
// ============================================================

const AddDealModal: React.FC<{ contacts: any[]; onClose: () => void; onAdd: (deal: any) => void }> = ({ contacts, onClose, onAdd }) => {
  const [form, setForm] = useState({ contactId: '', title: '', value: '', stage: 'Qualified', probability: 50, expectedClose: '', notes: '' });

  const handleSubmit = () => {
    if (!form.title || !form.value) return;
    const contact = contacts.find(c => c.id === form.contactId);
    onAdd({
      contactId: form.contactId,
      contactName: contact?.name || 'Unknown',
      title: form.title,
      value: parseInt(form.value),
      stage: form.stage,
      probability: parseInt(form.probability as any) || 50,
      expectedClose: form.expectedClose || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">New Deal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Deal Title *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
          <div><label className="text-sm font-medium mb-1 block">Contact</label><select value={form.contactId} onChange={e => setForm({...form, contactId: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl"><option value="">Select contact</option>{contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Value (?) *</label><input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
            <div><label className="text-sm font-medium mb-1 block">Probability %</label><input type="number" min={0} max={100} value={form.probability} onChange={e => setForm({...form, probability: parseInt(e.target.value)})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Stage</label><select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl">{['New Lead','Contacted','Qualified','Proposal','Negotiation','Won','Lost'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Expected Close</label><input type="date" value={form.expectedClose} onChange={e => setForm({...form, expectedClose: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium">Create Deal</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INVOICE MODAL
// ============================================================

const InvoiceModal: React.FC<{ contacts: any[]; onClose: () => void; onCreate: (invoice: any) => void }> = ({ contacts, onClose, onCreate }) => {
  const [form, setForm] = useState({ customerId: '', items: [{ description: '', quantity: 1, rate: 0 }], taxRate: 18, notes: '' });
  const selectedContact = contacts.find(c => c.id === form.customerId);
  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const tax = (subtotal * form.taxRate) / 100;
  const total = subtotal + tax;

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, rate: 0 }] });
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items];
    (newItems[index] as any)[field] = value;
    setForm({ ...form, items: newItems });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold">Create Invoice</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Customer</label><select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2.5 border rounded-xl"><option value="">Select Customer</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium">Items</label><button onClick={addItem} className="text-sm text-blue-600">+ Add Item</button></div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <input type="text" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="col-span-5 px-3 py-2 border rounded-lg text-sm" />
                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="col-span-2 px-3 py-2 border rounded-lg text-sm" />
                <input type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} className="col-span-3 px-3 py-2 border rounded-lg text-sm" />
                <span className="col-span-2 flex items-center justify-end font-semibold text-sm">?{(item.quantity * item.rate).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Tax Rate (%)</label><input type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-xl" /></div>
            <div><label className="text-sm font-medium mb-1 block">Notes</label><input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-xl" /></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Subtotal:</span><span>?{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Tax ({form.taxRate}%):</span><span>?{tax.toLocaleString()}</span></div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t pt-2 mt-2"><span>Total:</span><span>?{total.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={() => {
            if (selectedContact && form.items.length > 0) {
              onCreate({
                customerName: selectedContact.name,
                customerEmail: selectedContact.email,
                customerPhone: selectedContact.phone,
                items: form.items.map(i => ({ ...i, amount: i.quantity * i.rate })),
                subtotal, tax, total,
                notes: form.notes || undefined,
              });
            }
          }} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium">Create Invoice</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// APPOINTMENT MODAL
// ============================================================

const AppointmentModal: React.FC<{ contacts: any[]; onClose: () => void; onCreate: (apt: any) => void }> = ({ contacts, onClose, onCreate }) => {
  const [form, setForm] = useState({ clientId: '', title: '', service: '', date: '', time: '', duration: 30, reminder: true, location: '', staff: '' });

  const handleCreate = () => {
    if (!form.title || !form.date || !form.time) return;
    const contact = contacts.find(c => c.id === form.clientId);
    onCreate({
      title: form.title, clientName: contact?.name || 'Walk-in', clientPhone: contact?.phone || '',
      service: form.service || 'General', date: form.date, time: form.time, duration: form.duration,
      reminder: form.reminder, location: form.location || undefined, staff: form.staff || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">Book Appointment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Client</label><select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl"><option value="">Walk-in (No contact)</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="text-sm font-medium mb-1 block">Title *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Product Demo" className="w-full px-3 py-2.5 border rounded-xl" /></div>
          <div><label className="text-sm font-medium mb-1 block">Service</label><input type="text" value={form.service} onChange={e => setForm({...form, service: e.target.value})} placeholder="Consultation" className="w-full px-3 py-2.5 border rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Date *</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
            <div><label className="text-sm font-medium mb-1 block">Time *</label><input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Duration (min)</label><select value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} className="w-full px-3 py-2.5 border rounded-xl"><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></div>
            <div><label className="text-sm font-medium mb-1 block">Staff</label><input type="text" value={form.staff} onChange={e => setForm({...form, staff: e.target.value})} placeholder="Assign staff" className="w-full px-3 py-2.5 border rounded-xl" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Location</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Office / Google Meet / Phone" className="w-full px-3 py-2.5 border rounded-xl" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.reminder} onChange={e => setForm({...form, reminder: e.target.checked})} className="w-4 h-4" /> Send reminder</label>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={handleCreate} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 text-sm font-medium">Book</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// GOAL MODAL
// ============================================================

const GoalModal: React.FC<{ onClose: () => void; onAdd: (goal: any) => void }> = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ title: '', type: 'revenue', target: '', current: '0', period: 'monthly' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">New Goal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Goal Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Monthly Revenue Target" className="w-full px-3 py-2.5 border rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl"><option value="revenue">Revenue</option><option value="deals">Deals</option><option value="leads">Leads</option><option value="calls">Calls</option><option value="meetings">Meetings</option></select></div>
            <div><label className="text-sm font-medium mb-1 block">Period</label><select value={form.period} onChange={e => setForm({...form, period: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Target *</label><input type="number" value={form.target} onChange={e => setForm({...form, target: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
            <div><label className="text-sm font-medium mb-1 block">Current Progress</label><input type="number" value={form.current} onChange={e => setForm({...form, current: e.target.value})} className="w-full px-3 py-2.5 border rounded-xl" /></div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={() => {
            if (!form.title || !form.target) return;
            onAdd({
              title: form.title, type: form.type, target: parseInt(form.target),
              current: parseInt(form.current) || 0, period: form.period,
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
          }} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium">Create Goal</button>
        </div>
      </div>
    </div>
  );
};

