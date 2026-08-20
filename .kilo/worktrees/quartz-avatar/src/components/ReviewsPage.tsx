import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, ThumbsUp, Filter, RefreshCw, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { reviewsAPI } from '../lib/api';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  source: 'google' | 'facebook' | 'whatsapp';
  date: string;
  replied: boolean;
  reply?: string;
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  google: { label: 'Google', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  facebook: { label: 'Facebook', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  whatsapp: { label: 'WhatsApp', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export default function ReviewsPage() {
  const { business } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'replied' | 'unreplied'>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsAPI.list();
      if (res.data.success) {
        const data = (res.data.data?.reviews || []).map((r: any) => ({
          id: r.id,
          customerName: r.customerName || r.customer_name || 'Anonymous',
          rating: r.rating || 5,
          text: r.text || r.content || '',
          source: (r.source || 'google') as Review['source'],
          date: formatTimeAgo(r.createdAt),
          replied: !!r.replyText || !!r.repliedAt,
          reply: r.replyText || undefined,
        }));
        setReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return then.toLocaleDateString();
  };

  const showToast = (m: string, t: 'success' | 'error') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = reviews.filter(r => {
    const matchReply = filter === 'all' || (filter === 'replied' && r.replied) || (filter === 'unreplied' && !r.replied);
    const matchSource = sourceFilter === 'all' || r.source === sourceFilter;
    return matchReply && matchSource;
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const totalReviews = reviews.length;
  const unreplied = reviews.filter(r => !r.replied).length;

  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(rev => rev.rating === r).length / reviews.length) * 100) : 0,
  }));

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await reviewsAPI.reply(reviewId, replyText);
      if (res.data.success) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replied: true, reply: replyText } : r));
        setReplyText('');
        setReplyingTo(null);
        showToast('Reply sent successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      showToast('Failed to send reply', 'error');
    }
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
          {toast.t === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.m}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{business?.name || 'Your Business'} — Manage customer reviews</p>
        </div>
        <button onClick={fetchReviews} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw size={16} /> Sync Reviews
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading reviews...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 stagger-children">
            {/* Average Rating */}
            <div className="modern-card rounded-xl p-6 text-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">{avgRating}</div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={20} className={s <= Math.round(Number(avgRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{totalReviews} total reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="modern-card rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Rating Distribution</h3>
              <div className="space-y-2">
                {ratingDist.map(r => (
                  <div key={r.rating} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3">{r.rating}</span>
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="modern-card rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Unreplied</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">{unreplied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Replied</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{totalReviews - unreplied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">5-Star Reviews</span>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{reviews.filter(r => r.rating === 5).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(['all', 'unreplied', 'replied'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
                  {f === 'all' ? 'All' : f === 'unreplied' ? 'Needs Reply' : 'Replied'}
                </button>
              ))}
            </div>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
              <option value="all">All Sources</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filtered.map(review => (
              <div key={review.id} className="modern-card rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {review.customerName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{review.customerName}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={12} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                          ))}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_CONFIG[review.source]?.color}`}>{SOURCE_CONFIG[review.source]?.label}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{review.date}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{review.text}</p>

                {/* Reply section */}
                {review.replied && review.reply && (
                  <div className="ml-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg mb-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Your Reply</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{review.reply}</p>
                  </div>
                )}

                {replyingTo === review.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && handleReply(review.id)} />
                    <button onClick={() => handleReply(review.id)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Send</button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm">Cancel</button>
                  </div>
                ) : (
                  !review.replied && (
                    <button onClick={() => setReplyingTo(review.id)} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                      <MessageSquare size={14} /> Reply
                    </button>
                  )
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Star size={48} className="mx-auto mb-4 opacity-30" />
                <p>No reviews found</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
