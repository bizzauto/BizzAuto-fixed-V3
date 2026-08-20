import React, { useState, useEffect } from 'react';
import { Shield, Settings, X, Check } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'bizzauto_cookie_consent';

const CookieConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always on
    analytics: true,
    marketing: false,
    timestamp: '',
  });

  useEffect(() => {
    // Check if consent already given
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      // Show banner after 2 seconds delay
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const data = { ...prefs, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setPreferences(data);
    setShowBanner(false);
    setShowDetails(false);
  };

  const acceptAll = () => {
    savePreferences({ essential: true, analytics: true, marketing: true, timestamp: '' });
  };

  const rejectNonEssential = () => {
    savePreferences({ essential: true, analytics: false, marketing: false, timestamp: '' });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" />

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {!showDetails ? (
            /* Simple Banner */
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Shield size={24} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    We value your privacy
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                    By clicking "Accept All", you consent to our use of cookies. Read our{' '}
                    <a href="/privacy" className="text-blue-500 hover:underline" target="_blank">Privacy Policy</a>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowDetails(true)}
                  className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Settings size={14} /> Customize
                </button>
                <button
                  onClick={rejectNonEssential}
                  className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  Reject Non-Essential
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <Check size={14} /> Accept All
                </button>
              </div>
            </div>
          ) : (
            /* Detailed Preferences */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Cookie Preferences
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Essential Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    Essential Cookies
                    <span className="ml-2 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      Always Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Required for authentication, security, and core functionality.
                  </p>
                </div>
                <div className="w-10 h-5 bg-green-500 rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    Analytics Cookies
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Help us understand how visitors interact with the platform.
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    preferences.analytics ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    preferences.analytics ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    Marketing Cookies
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Used to deliver personalized advertisements and track campaign effectiveness.
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    preferences.marketing ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    preferences.marketing ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={rejectNonEssential}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Reject All
                </button>
                <button
                  onClick={saveCustom}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Save Preferences
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Accept All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CookieConsentBanner;
