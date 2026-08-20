import { useState } from 'react';
import { useToast } from '../components/Toast';
import { subscriptionsAPI } from '../lib/api';
import { Check, Loader2, CreditCard } from 'lucide-react';

interface PricingCardProps {
  plan: {
    id: string;
    name: string;
    price: { month: number; year: number };
    features: string[];
    popular?: boolean;
  };
  onSelect: (plan: string, period: 'month' | 'year') => void;
  loading?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, onSelect, loading }) => {
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  const price = period === 'month' ? plan.price.month : plan.price.year;
  const savings = period === 'year' ? Math.round((plan.price.month * 12 - plan.price.year) / plan.price.month * 100) : 0;

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all hover:shadow-xl ${
        plan.popular
          ? 'border-blue-500 shadow-lg scale-105'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>

        {/* Period toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              period === 'month'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              period === 'year'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Yearly
          </button>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              ₹{price.toLocaleString()}
            </span>
            <span className="text-gray-500 dark:text-gray-400">/{period}</span>
          </div>
          {savings > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Save {savings}% with yearly billing
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => onSelect(plan.id, period)}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            plan.popular
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
          } disabled:opacity-50`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Get Started
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface PricingPageProps {
  onNavigate?: (page: string) => void;
}

export default function PricingPage({ onNavigate }: PricingPageProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([
    {
      id: 'FREE',
      name: 'Free',
      price: { month: 0, year: 0 },
      features: [
        '100 Contacts',
        '100 WhatsApp messages/month',
        '10 AI credits',
        '1 User',
        'Basic CRM',
      ],
    },
    {
      id: 'STARTER',
      name: 'Starter',
      price: { month: 999, year: 9990 },
      features: [
        '1,000 Contacts',
        '5,000 WhatsApp messages/month',
        '100 AI credits',
        '3 Users',
        'Full CRM & Pipeline',
        'Email Support',
      ],
      popular: false,
    },
    {
      id: 'GROWTH',
      name: 'Growth',
      price: { month: 2499, year: 24990 },
      features: [
        '10,000 Contacts',
        '25,000 WhatsApp messages/month',
        '500 AI credits',
        '10 Users',
        'Advanced Analytics',
        'Priority Support',
        'Automation Workflows',
      ],
      popular: true,
    },
    {
      id: 'PRO',
      name: 'Pro',
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
      ],
    },
    {
      id: 'AGENCY',
      name: 'Agency',
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
      ],
    },
  ]);

  const handleSelectPlan = async (planId: string, period: 'month' | 'year') => {
    if (planId === 'FREE') {
      toast.info('You are already on the Free plan');
      return;
    }

    setLoading(true);

    try {
      // Create Razorpay order
      const response = await subscriptionsAPI.createCheckout({ plan: planId, period });
      const { orderId, amount, currency, key } = response.data.data;

      // Open Razorpay checkout
      const options = {
        key,
        amount,
        currency,
        name: 'BizzAuto',
        description: `${planId} Plan - ${period === 'month' ? 'Monthly' : 'Yearly'}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyResponse = await subscriptionsAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
              period,
            });

            if (verifyResponse.data.success) {
              toast.success('Payment successful! Subscription activated.');
              if (onNavigate) {
                setTimeout(() => onNavigate('dashboard'), 1500);
              }
            } else {
              toast.error('Payment verification failed');
            }
          } catch (error: any) {
            toast.error(error.response?.data?.error || 'Payment verification failed');
          }
        },
        prefill: {
          email: '',
          contact: '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled');
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your business needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelectPlan}
              loading={loading}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major payment methods including credit/debit cards, UPI, net banking, and wallets via Razorpay.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, all paid plans come with a 14-day free trial. No credit card required.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What happens when I exceed my plan limits?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You'll be notified when you're approaching your limits. You can upgrade your plan to continue using the service without interruption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
