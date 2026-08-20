import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { walletAPI } from '../lib/api';

interface WalletData {
  balance: number;
  totalRecharged: number;
  totalSpent: number;
  lowBalanceThreshold: number;
}

interface WalletWidgetProps {
  onAddFunds?: () => void;
  onViewHistory?: () => void;
}

const WalletWidget: React.FC<WalletWidgetProps> = ({ onAddFunds, onViewHistory }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await walletAPI.get();
      setWallet(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  const balance = wallet?.balance || 0;
  const threshold = wallet?.lowBalanceThreshold || 50;
  const isLow = balance < threshold;
  const usedPercent = wallet?.totalRecharged
    ? Math.min(100, (wallet.totalSpent / wallet.totalRecharged) * 100)
    : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border ${
      isLow ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`p-2 sm:p-2.5 rounded-xl ${isLow ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
            <WalletIcon size={18} className={`sm:w-5 sm:h-5 ${isLow ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Wallet Balance</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{balance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {isLow && (
        <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-3 sm:mb-4">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
            Low balance! Add funds to continue making calls.
          </p>
        </div>
      )}

      <div className="space-y-2.5 sm:space-y-3 mb-3 sm:mb-4">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">Total Recharged</span>
          <span className="font-medium text-gray-900 dark:text-white">₹{(wallet?.totalRecharged || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">Total Spent</span>
          <span className="font-medium text-gray-900 dark:text-white">₹{(wallet?.totalSpent || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">Platform Fee (10%)</span>
          <span className="font-medium text-orange-600 dark:text-orange-400">₹{((wallet as any)?.totalMarginPaid || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onAddFunds}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20 text-xs sm:text-sm font-medium"
        >
          <Plus size={16} /> Add Funds
        </button>
        <button
          onClick={onViewHistory}
          className="px-3 sm:px-4 py-2 sm:py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs sm:text-sm font-medium"
        >
          History
        </button>
      </div>
    </div>
  );
};

export default WalletWidget;
