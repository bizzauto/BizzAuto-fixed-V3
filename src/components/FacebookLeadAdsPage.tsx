import { useState } from 'react';
import { Facebook, ArrowRight, CheckCircle2, Mail, Bell } from 'lucide-react';

export default function FacebookLeadAdsPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(() => {
    return localStorage.getItem('fb_leads_notify_email') !== null;
  });

  const features = [
    {
      icon: <CheckCircle2 size={20} className="text-green-500 shrink-0" />,
      title: 'Automatic Lead Sync',
      description: 'Automatically import leads from Facebook Lead Ads into your CRM in real-time.',
    },
    {
      icon: <CheckCircle2 size={20} className="text-green-500 shrink-0" />,
      title: 'Form Management',
      description: 'View and manage all your Facebook lead forms from one central dashboard.',
    },
    {
      icon: <CheckCircle2 size={20} className="text-green-500 shrink-0" />,
      title: 'Lead Notifications',
      description: 'Get instant notifications when new leads come in via email or WhatsApp.',
    },
    {
      icon: <CheckCircle2 size={20} className="text-green-500 shrink-0" />,
      title: 'Auto-Response',
      description: 'Send automated welcome messages and follow-ups to new leads instantly.',
    },
    {
      icon: <CheckCircle2 size={20} className="text-green-500 shrink-0" />,
      title: 'Analytics Dashboard',
      description: 'Track lead performance, conversion rates, and campaign ROI in real-time.',
    },
  ];

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    localStorage.setItem('fb_leads_notify_email', email);
    setSubscribed(true);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-12 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Facebook size={40} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Facebook Lead Ads
          </h1>
          <p className="text-blue-100 text-lg max-w-lg mx-auto">
            Sync your Facebook lead forms directly into your CRM. Auto-import leads, send instant replies, and close deals faster.
          </p>
        </div>

        <div className="px-8 py-10">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
              <Bell size={14} />
              Coming Soon
            </span>
            <p className="text-gray-500 mt-4 text-sm">
              We're building a powerful integration with the Facebook Marketing API. Enter your email to get notified when it's ready.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What's coming</h2>
            <div className="space-y-4">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  {feature.icon}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{feature.title}</div>
                    <div className="text-sm text-gray-500">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <button
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-100 text-blue-400 rounded-xl cursor-not-allowed font-medium"
            >
              <Facebook size={18} />
              Connect Facebook Ads
              <ArrowRight size={16} />
            </button>
            <span className="text-xs text-gray-400">
              Requires Facebook Marketing API OAuth setup
            </span>
          </div>

          {subscribed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">You're on the list!</p>
              <p className="text-xs text-green-600">We'll notify you when Facebook Lead Ads sync is ready.</p>
            </div>
          ) : (
            <form onSubmit={handleNotify} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <label htmlFor="fb-notify-email" className="text-sm font-medium text-gray-900 block mb-2">
                Get notified when it's ready
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="fb-notify-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
                >
                  Notify Me
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
