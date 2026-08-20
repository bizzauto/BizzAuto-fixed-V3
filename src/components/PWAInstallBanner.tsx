import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { X, Download } from 'lucide-react';

const PWAInstallBanner: React.FC = () => {
  const { canInstall, isInstalled, install, dismiss } = usePWAInstall();
  const [visible, setVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-hide after 30 seconds
  useEffect(() => {
    if (!canInstall || isInstalled) return;

    const timer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setVisible(false);
      }, 300); // Wait for fade-out animation
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  if (isInstalled || !canInstall || !visible) return null;

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'animate-slide-in-up'}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Install BizzAuto</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Quick access from your home screen</p>
        </div>
        <button
          onClick={install}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          Install
        </button>
        <button
          onClick={() => {
            setIsAnimating(true);
            setTimeout(() => {
              dismiss();
              setVisible(false);
            }, 300);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
