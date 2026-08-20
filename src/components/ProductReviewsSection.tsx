import React, { useState, useEffect, useCallback } from 'react';
import { Star, Send, Loader2, MessageSquare } from 'lucide-react';
import apiClient from '../lib/api';

interface Review {
  id: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
}

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
}

interface Props {
  businessId: string;
  productId: string;
  productName: string;
}

const ProductReviewsSection: React.FC<Props> = ({ businessId, productId, productName }) => {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, title: '', comment: '' });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/store-features/reviews/public/${businessId}/${productId}`);
      setData(res.data);
    } catch {
      setData({ reviews: [], averageRating: 0, totalReviews: 0, distribution: [] });
    } finally {
      setLoading(false);
    }
  }, [businessId, productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/store-features/reviews/public/${businessId}/${productId}`, {
        userName: form.name,
        email: form.email,
        rating: form.rating,
        title: form.title,
        comment: form.comment,
      });
      setForm({ name: '', email: '', rating: 5, title: '', comment: '' });
      setShowForm(false);
      fetchReviews();
    } catch { /* empty */ } finally {
      setSubmitting(false);
    }
  };

  const maxDistCount = Math.max(...(data?.distribution?.map((d) => d.count) || [1]), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-blue-600" />
        Reviews for {productName}
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Average Rating */}
            <div className="text-center sm:text-left shrink-0">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{data.averageRating.toFixed(1)}</p>
              <div className="flex items-center gap-0.5 mt-1 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={18}
                    className={s <= Math.round(data.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.totalReviews} reviews</p>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((r) => {
                const count = data.distribution?.find((d) => d.rating === r)?.count || 0;
                return (
                  <div key={r} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-gray-500 dark:text-gray-400">{r}</span>
                    <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${(count / maxDistCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-500 dark:text-gray-400 text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review List */}
          {data.reviews?.length > 0 && (
            <div className="space-y-4">
              {data.reviews.map((review) => (
                <div key={review.id} className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-medium text-blue-600">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{review.userName}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                    ))}
                  </div>
                  {review.title && <p className="font-medium text-gray-900 dark:text-white text-sm">{review.title}</p>}
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Write Review Form */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              Write a Review
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Write a Review</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Rating *</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, rating: s })}
                      className="p-0.5"
                    >
                      <Star
                        size={24}
                        className={`cursor-pointer transition-colors ${
                          s <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Summarize your review"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Comment *</label>
                <textarea
                  required
                  rows={3}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Share your experience"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ProductReviewsSection;
