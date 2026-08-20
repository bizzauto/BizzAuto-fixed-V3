import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CheckCircle, Clock, Loader2, Download } from 'lucide-react';
import { walletAPI } from '../lib/api';

interface Earning {
  id: string;
  businessId: string;
  twilioCost: number;
  platformMargin: number;
  totalCharged: number;
  type: string;
  status: string;
  createdAt: string;
}

interface EarningsSummary {
  totalTwilioCost: number;
  totalPlatformMargin: number;
  totalCharged: number;
}

const PlatformEarnings: React.FC = () => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({ totalTwilioCost: 0, totalPlatformMargin: 0, totalCharged: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchEarnings();
  }, [page]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await walletAPI.getEarnings({ page, limit: 20 });
      const data = res.data?.data || res.data;
      setEarnings(data?.earnings || []);
      setSummary(data?.summary || { totalTwilioCost: 0, totalPlatformMargin: 0, totalCharged: 0 });
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (ids: string[]) => {
    try {
      await walletAPI.settleEarnings(ids);
      fetchEarnings();
    } catch (err) {
      console.error('Failed to settle:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/30">
              <TrendingUp size={20} className="text-green-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{summary.totalPlatformMargin.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform Earnings (10%)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <DollarSign size={20} className="text-blue-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{summary.totalCharged.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Collected</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30">
              <DollarSign size={20} className="text-purple-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{summary.totalTwilioCost.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Twilio Pass-through</p>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Earnings History</h3>
          <button
            onClick={() => {
              const pendingIds = earnings.filter(e => e.status === 'pending').map(e => e.id);
              if (pendingIds.length > 0) handleSettle(pendingIds);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            <CheckCircle size={16} /> Settle All
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-4 sm:p-5 md:p-6 lg:p-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : earnings.length === 0 ? (
          <div className="p-4 sm:p-6 md:p-8 text-center text-gray-400">
            <p>No earnings yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <th className="p-4">Date</th>
                    <th className="p-4">Twilio Cost</th>
                    <th className="p-4">Platform Margin</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {earnings.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 text-sm text-gray-900 dark:text-white">
                        {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">₹{e.twilioCost.toFixed(2)}</td>
                      <td className="p-4 text-sm font-medium text-green-600 dark:text-green-400">₹{e.platformMargin.toFixed(2)}</td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">₹{e.totalCharged.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          e.status === 'settled'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {e.status === 'settled' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 20 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformEarnings;
