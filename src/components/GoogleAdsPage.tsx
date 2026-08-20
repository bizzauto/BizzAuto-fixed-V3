import { useState, useEffect } from 'react';
import { Megaphone, Lock, CheckCircle, Mail, ArrowRight, BarChart3, Target, DollarSign, Eye } from 'lucide-react';

const FEATURES = [
  { icon: <BarChart3 size={20} />, title: 'Campaign Management', desc: 'Create, edit, and pause Google Ads campaigns directly from your dashboard' },
  { icon: <DollarSign size={20} />, title: 'ROI Tracking', desc: 'Monitor spend, conversions, and cost-per-acquisition in real time' },
  { icon: <Target size={20} />, title: 'Audience Targeting', desc: 'Define and manage custom audiences, demographics, and remarketing lists' },
  { icon: <Eye size={20} />, title: 'Performance Analytics', desc: 'Detailed reports on impressions, clicks, CTR, and conversion rates' },
];

export default function GoogleAdsPage() {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('google_ads_notify_email');
    if (existing) {
      setEmail(existing);
      setSaved(true);
    }
  }, []);

  const handleNotify = () => {
    if (!email || !email.includes('@')) return;
    localStorage.setItem('google_ads_notify_email', email);
    setSaved(true);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 px-6 py-10 sm:px-10 sm:py-14 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-gray-700 shadow-md mb-5">
            <Megaphone className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Google Ads Integration</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-sm sm:text-base">
            Manage your Google Ads campaigns, track ROI, and optimize ad spend — all from one powerful dashboard.
          </p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full">
              <Lock size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Coming Soon</span>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What you'll be able to do</h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {f.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{f.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-xl cursor-not-allowed text-sm font-medium">
                <Megaphone size={16} />
                Connect Google Ads
                <Lock size={14} />
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">Requires Google Ads API OAuth setup</span>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 flex items-center gap-2">
              <Mail size={16} className="text-blue-600 dark:text-blue-400" />
              Get notified when it's ready
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">We'll send you a one-time email when this feature launches.</p>
            {saved ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircle size={16} />
                You're on the list! We'll notify <span className="font-semibold">{email}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleNotify()}
                />
                <button
                  onClick={handleNotify}
                  disabled={!email || !email.includes('@')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Notify Me
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
