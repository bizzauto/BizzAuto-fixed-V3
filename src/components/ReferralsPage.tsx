import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import {
  Gift, Copy, Check, Users, TrendingUp, Wallet,
  ArrowUpRight, Loader2, Share2, Award
} from 'lucide-react';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingPayout: number;
  rewards: Reward[];
  payouts: Payout[];
}

interface Reward {
  id: string;
  rewardType: string;
  rewardAmount: number;
  status: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

export default function ReferralsPage() {
  const { token, user } = useAuthStore();
  const toast = useToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const res = await fetch('/api/referrals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch {
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (!data) return;
    const text = `Join BizzAuto using my referral code ${data.referralCode} and get ₹100 bonus! 🎉\n\nhttps://bizzauto.com/register?ref=${data.referralCode}`;

    if (navigator.share) {
      navigator.share({ title: 'Join BizzAuto', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Referral link copied!');
    }
  };

  const requestPayout = async () => {
    if (!data || data.pendingPayout < 100) {
      toast.error('Minimum payout is ₹100');
      return;
    }
    setRequestingPayout(true);
    try {
      const res = await fetch('/api/referrals/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method: 'upi', amount: data.pendingPayout }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Payout request submitted!');
        fetchReferralData();
      } else {
        toast.error(result.error || 'Failed to request payout');
      }
    } catch {
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="text-purple-600" /> Referral Program
        </h1>
        <p className="text-gray-600 mt-1">Invite friends and earn rewards for every successful referral</p>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white mb-6">
        <h2 className="text-lg font-semibold mb-4">Your Referral Code</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 font-mono text-2xl font-bold tracking-wider">
            {data?.referralCode}
          </div>
          <button
            onClick={copyReferralCode}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={shareReferral}
            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-white/90 transition-colors font-medium"
          >
            <Share2 size={18} /> Share
          </button>
        </div>
        <p className="text-white/70 text-sm mt-4">
          Share this code with friends. They get ₹100 bonus, you earn ₹100 for each referral!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">Total Referrals</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.totalReferrals || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">Total Earnings</span>
          </div>
          <p className="text-3xl font-bold text-green-600">₹{(data?.totalEarnings || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Wallet className="text-purple-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">Pending Payout</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">₹{(data?.pendingPayout || 0).toLocaleString()}</p>
          {(data?.pendingPayout ?? 0) >= 100 && (
            <button
              onClick={requestPayout}
              disabled={requestingPayout}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              {requestingPayout ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpRight size={14} />}
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={18} className="text-yellow-500" /> How It Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-purple-600">1</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Share Your Code</h4>
            <p className="text-sm text-gray-500">Share your unique referral code with friends</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-blue-600">2</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Friend Signs Up</h4>
            <p className="text-sm text-gray-500">They register using your code and get ₹100 bonus</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-green-600">3</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">You Both Earn</h4>
            <p className="text-sm text-gray-500">You earn ₹100 for each successful referral</p>
          </div>
        </div>
      </div>

      {/* Rewards History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Reward History</h3>
        {data?.rewards && data.rewards.length > 0 ? (
          <div className="space-y-3">
            {data.rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 capitalize">{reward.rewardType} Reward</p>
                  <p className="text-xs text-gray-500">{new Date(reward.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+₹{reward.rewardAmount}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    reward.status === 'credited' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {reward.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No rewards yet. Start sharing your code!</p>
        )}
      </div>
    </div>
  );
}