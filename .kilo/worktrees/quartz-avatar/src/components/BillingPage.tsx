import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Download, CheckCircle, ArrowUpRight, FileText, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { billingAPI, subscriptionsAPI, analyticsAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import ConfirmDialog from './ConfirmDialog';

const BillingPage: React.FC = () => {
  const { business } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = subscription?.plan || {
    name: business?.plan || 'STARTER',
    price: business?.plan === 'PRO' ? '₹2,999' : business?.plan === 'ENTERPRISE' ? '₹9,999' : '₹1,499',
    nextBilling: subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
    status: subscription?.status || 'Active',
  };

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, invRes, usageRes] = await Promise.allSettled([
        billingAPI.getCurrent(),
        billingAPI.getInvoices(),
        analyticsAPI.dashboard(),
      ]);

      if (subRes.status === 'fulfilled' && subRes.value.data?.data) {
        setSubscription(subRes.value.data.data);
      }

      if (invRes.status === 'fulfilled' && invRes.value.data?.data) {
        const invData = invRes.value.data.data;
        setInvoices(Array.isArray(invData) ? invData : invData.invoices || []);
      }

      if (usageRes.status === 'fulfilled' && usageRes.value.data?.data) {
        const dashData = usageRes.value.data.data;
        const usageData = [
          { label: 'Contacts', used: dashData?.stats?.contactsUsed ?? dashData?.usage?.contacts ?? 0, limit: dashData?.stats?.contactsLimit ?? dashData?.limits?.contacts ?? 1000, pct: 0 },
          { label: 'WhatsApp Messages', used: dashData?.stats?.messagesUsed ?? dashData?.usage?.messages ?? 0, limit: dashData?.stats?.messagesLimit ?? dashData?.limits?.messages ?? 5000, pct: 0 },
          { label: 'AI Credits', used: dashData?.stats?.aiCreditsUsed ?? business?.aiCreditsUsed ?? 0, limit: dashData?.stats?.aiCreditsLimit ?? dashData?.limits?.aiCredits ?? 100, pct: 0 },
          { label: 'Users', used: dashData?.stats?.usersUsed ?? dashData?.usage?.users ?? 1, limit: dashData?.stats?.usersLimit ?? dashData?.limits?.users ?? 3, pct: 0 },
        ].map(u => ({ ...u, pct: u.limit > 0 ? Math.round((u.used / u.limit) * 100) : 0 }));
        setUsage(usageData);
      } else {
        // Fallback usage from business data
        setUsage([
          { label: 'Contacts', used: 0, limit: 1000, pct: 0 },
          { label: 'WhatsApp Messages', used: 0, limit: 5000, pct: 0 },
          { label: 'AI Credits', used: business?.aiCreditsUsed ?? 0, limit: business?.aiCreditsLimit ?? 100, pct: business?.aiCreditsLimit ? Math.round(((business?.aiCreditsUsed ?? 0) / business.aiCreditsLimit) * 100) : 0 },
          { label: 'Users', used: 1, limit: 3, pct: 33 },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      setError('Failed to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await billingAPI.cancelSubscription();
      setSubscription((prev: any) => ({ ...prev, status: 'cancelling' }));
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    }
    setCancelling(false);
    setCancelDialogOpen(false);
  };

  const handleUpgrade = async (plan: string) => {
    try {
      await billingAPI.upgradeSubscription(plan);
      loadBilling();
    } catch (err) {
      console.error('Failed to upgrade:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading billing info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={40} />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={loadBilling} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3"><CreditCard className="text-blue-600" size={32} />Billing & Subscription</h1>
          <p className="text-gray-600">Manage your plan, payment methods, and invoices</p>
        </div>
        <button onClick={loadBilling} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">Current Plan</p>
            <h2 className="text-3xl font-bold mb-2">{currentPlan.name}</h2>
            <p className="text-blue-100">{currentPlan.price}/month - Next billing: {currentPlan.nextBilling}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
            <CheckCircle size={18} />
            <span className="font-medium">{currentPlan.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
          {usage.length > 0 ? (
            <div className="space-y-4">
              {usage.map((u, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{u.label}</span>
                    <span className="text-sm text-gray-500">{u.used.toLocaleString()} / {u.limit.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${u.pct > 80 ? 'bg-red-500' : u.pct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(u.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No usage data available</p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => handleUpgrade('PRO')} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">Upgrade Plan <ArrowUpRight size={14} /></button>
            <button onClick={() => setCancelDialogOpen(true)} className="text-red-600 text-sm font-medium hover:underline">Cancel Subscription</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
          {subscription?.paymentMethod ? (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">{subscription.paymentMethod.brand || 'CARD'}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">.... {subscription.paymentMethod.last4 || '4242'}</p>
                  <p className="text-xs text-gray-500">Expires {subscription.paymentMethod.expiry || '12/2027'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
              <CreditCard size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No payment method on file</p>
            </div>
          )}
          <button className="w-full py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Change Card</button>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Billing Cycle</h4>
            <div className="flex gap-2">
              {(['monthly', 'yearly'] as const).map(c => (
                <button key={c} onClick={() => setBillingCycle(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {c === 'monthly' ? 'Monthly' : 'Yearly (Save 20%)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period."
        confirmLabel="Cancel Subscription"
        variant="danger"
        loading={cancelling}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
        </div>
        {invoices.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600"><FileText size={18} /></div>
                  <div>
                    <p className="font-medium text-gray-900">{inv.id || inv.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : inv.date} - {inv.plan || inv.description || 'Subscription'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900">{inv.amount || inv.total}</span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${inv.status === 'paid' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>
                    {inv.status === 'paid' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : 'Pending'}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Download size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No invoices yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
