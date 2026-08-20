import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, CreditCard, Shield, Zap, Star, ArrowRight,
  Building2, Users, MessageSquare, Globe,
  TrendingUp, Headphones, Lock, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { subscriptionsAPI } from '../lib/api';
import { useToast } from './Toast';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: { month: number; year: number };
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: 'FREE',
    name: 'Free Trial',
    description: 'Try BizzAuto free for 7 days',
    price: { month: 0, year: 0 },
    features: [
      '100 Contacts',
      '100 WhatsApp messages/month',
      '10 AI credits',
      '1 User',
      'Basic CRM',
      '7-day trial',
    ],
    icon: <Zap size={22} />,
    color: 'from-slate-500 to-slate-600',
    badge: 'Trial',
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'For small businesses',
    price: { month: 999, year: 9990 },
    features: [
      '1,000 Contacts',
      '5,000 WhatsApp messages/month',
      '100 AI credits',
      '3 Users',
      'Full CRM & Pipeline',
      'Email Support',
      'Basic Automation',
    ],
    icon: <Building2 size={22} />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    description: 'For growing businesses',
    price: { month: 2499, year: 24990 },
    features: [
      '10,000 Contacts',
      '25,000 WhatsApp messages/month',
      '500 AI credits',
      '10 Users',
      'Advanced Analytics',
      'Priority Support',
      'Automation Workflows',
      'Social Media Integration',
    ],
    icon: <TrendingUp size={22} />,
    popular: true,
    color: 'from-indigo-500 to-purple-600',
    badge: 'Most Popular',
  },
  {
    id: 'PRO',
    name: 'Professional',
    description: 'For established businesses',
    price: { month: 4999, year: 49990 },
    features: [
      '50,000 Contacts',
      '100,000 WhatsApp messages/month',
      '2,000 AI credits',
      '25 Users',
      'White Label',
      'Dedicated Support',
      'Custom Integrations',
      'API Access',
      'Advanced Reports',
    ],
    icon: <Star size={22} />,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    description: 'For agencies & enterprises',
    price: { month: 9999, year: 99990 },
    features: [
      'Unlimited Contacts',
      'Unlimited WhatsApp messages',
      '10,000 AI credits',
      'Unlimited Users',
      'Multi-tenant Support',
      'Custom Branding',
      'Premium Support',
      'SLA Guarantee',
      'Dedicated Account Manager',
    ],
    icon: <Globe size={22} />,
    color: 'from-emerald-500 to-green-600',
  },
];

const ResorPayBoard: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, business } = useAuthStore();
  const toast = useToast();

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'FREE') {
      navigate('/admission-form', { replace: true });
      return;
    }

    setSelectedPlan(planId);
    setIsProcessing(true);
    setError('');

    try {
      const response = await subscriptionsAPI.createCheckout({
        plan: planId,
        period: billingPeriod,
      });

      const { orderId, amount, currency, key } = response.data.data;

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(script);
        });
      }

      const planData = plans.find(p => p.id === planId);

      const options = {
        key,
        amount,
        currency,
        name: 'BizzAuto',
        description: `${planData?.name} Plan - ${billingPeriod === 'month' ? 'Monthly' : 'Yearly'}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const verifyResponse = await subscriptionsAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
              period: billingPeriod,
            });

            if (verifyResponse.data.success) {
              toast.success('Payment successful! Subscription activated.');
              setTimeout(() => {
                navigate('/admission-form', { replace: true });
              }, 1500);
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (error: any) {
            toast.error(error.response?.data?.error || 'Payment verification failed');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#6366F1',
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. You can try again anytime.');
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to initiate payment');
      toast.error(error.response?.data?.error || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSavings = (plan: Plan) => {
    if (billingPeriod === 'year') {
      const monthlyTotal = plan.price.month * 12;
      const yearlyPrice = plan.price.year;
      if (monthlyTotal > 0) {
        return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
      }
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                BizzAuto
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose Your Plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Shield size={16} className="text-green-500" />
            <span className="hidden sm:inline">256-bit SSL Encrypted</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles size={16} />
            Welcome to BizzAuto
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Choose the perfect plan for
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            <span className="font-semibold text-indigo-600">{business?.name || 'Your Business'}</span>
            {' '}— All plans include a 7-day free trial
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setBillingPeriod('month')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                billingPeriod === 'month'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('year')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all relative ${
                billingPeriod === 'year'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 max-w-2xl mx-auto">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-12">
          {plans.map((plan) => {
            const price = billingPeriod === 'month' ? plan.price.month : plan.price.year;
            const savings = getSavings(plan);
            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? 'border-indigo-500 shadow-lg lg:scale-105 z-10'
                    : isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-5 sm:p-6">
                  {/* Plan Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center text-white`}>
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {price === 0 ? 'Free' : `₹${price.toLocaleString()}`}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          /{billingPeriod}
                        </span>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                        Save {savings}% with yearly billing
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:opacity-90'
                        : plan.id === 'FREE'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                    } disabled:opacity-50`}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : plan.id === 'FREE' ? (
                      'Start Free Trial'
                    ) : (
                      <>
                        <Lock size={16} />
                        Pay ₹{price.toLocaleString()}/{billingPeriod === 'month' ? 'mo' : 'yr'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Shield size={24} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Secure Payment</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">256-bit SSL encryption</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <CreditCard size={24} className="text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Razorpay Gateway</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cards, UPI, Net Banking</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Headphones size={24} className="text-purple-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">24/7 Support</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chat, Email, Phone</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Accepted Payment Methods</p>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
              💳 Credit/Debit Cards
            </span>
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
              📱 UPI
            </span>
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
              🏦 Net Banking
            </span>
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
              👛 Wallets
            </span>
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <button
            onClick={() => {
              localStorage.setItem('admissionCompleted', 'true');
              navigate('/dashboard', { replace: true });
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium"
          >
            Skip for now → Complete payment later
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by Razorpay | BizzAuto Solutions | All rights reserved
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Your payment is secured with industry-standard encryption. We never store your card details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResorPayBoard;
