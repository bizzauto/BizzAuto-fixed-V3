import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Phone, RefreshCw, Loader2 } from 'lucide-react';
import { walletAPI } from '../lib/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
  metadata?: any;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  recharge: { icon: <ArrowDownLeft size={14} />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Recharge' },
  call_deduction: { icon: <Phone size={14} />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Call' },
  refund: { icon: <RefreshCw size={14} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Refund' },
  adjustment: { icon: <ArrowUpRight size={14} />, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'Adjustment' },
};

const WalletHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await walletAPI.getTransactions({ page, limit: 20 });
      const data = res.data?.data || res.data;
      setTransactions(data?.transactions || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Transaction History</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-4 sm:p-5 md:p-6 md:p-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-4 sm:p-6 md:p-8 text-center text-gray-400">
          <p>No transactions yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-[400px] overflow-y-auto">
            {transactions.map((txn) => {
              const tc = typeConfig[txn.type] || typeConfig.adjustment;
              const isCredit = txn.amount > 0;
              return (
                <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${tc.bg}`}>
                      {tc.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isCredit ? '+' : ''}₹{Math.abs(txn.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">Balance: ₹{txn.balance.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
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
  );
};

export default WalletHistory;

