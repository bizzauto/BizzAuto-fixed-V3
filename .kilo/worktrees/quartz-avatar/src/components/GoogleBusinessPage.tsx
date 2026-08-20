import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Star, Phone, Clock, Globe, Camera, Edit3, MessageSquare, Eye, Plus, CheckCircle, XCircle, AlertCircle, BarChart3, Share2, Search, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { googleBusinessAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

interface Review { id: string; author: string; rating: number; text: string; date: string; replied: boolean; replyText?: string; }
interface BusinessPost { id: string; type: string; title: string; content: string; startDate: string; status: string; views: number; clicks: number; }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Stars: React.FC<{ r: number; sz?: number }> = ({ r, sz = 18 }) => (
  <div className="flex items-center justify-center gap-1">
    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={sz} className={s <= r ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />)}
  </div>
);

const GoogleBusinessPage: React.FC = () => {
  const { business } = useAuthStore();
  const [view, setView] = useState<'profile' | 'reviews' | 'posts' | 'insights'>('profile');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<BusinessPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyTxt, setReplyTxt] = useState('');
  const [replying, setReplying] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [newPost, setNewPost] = useState({ type: 'update', title: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [editForm, setEditForm] = useState({ name: business?.name || '', phone: business?.phone || '', website: business?.website || '', description: '' });
  const [toast, setToast] = useState<{ m: string; t: string } | null>(null);

  const toast_ = (m: string, t = 'success') => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // First check connection status
      const statusRes = await googleBusinessAPI.getStatus();
      if (statusRes.data?.success && statusRes.data?.data?.connected) {
        setConnected(true);
        // Fetch reviews
        try {
          const reviewsRes = await googleBusinessAPI.getReviews();
          if (reviewsRes.data?.success) {
            const rd = reviewsRes.value.data?.data || [];
            setReviews(Array.isArray(rd) ? rd.map((r: any) => ({
              id: r.reviewId || r.id || String(Math.random()), author: r.reviewer?.displayName || 'Anonymous',
              rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
              text: r.comment || '', date: r.updateTime ? new Date(r.updateTime).toLocaleDateString() : 'Recently',
              replied: !!r.reviewReply?.comment, replyText: r.reviewReply?.comment,
            })) : []);
          }
        } catch {
          setReviews([]);
        }
        // Fetch posts
        try {
          const postsRes = await googleBusinessAPI.getPosts();
          if (postsRes.data?.success) {
            const pd = postsRes.value.data?.data || [];
            setPosts(Array.isArray(pd) ? pd.map((p: any) => ({
              id: p.name || String(Math.random()), type: p.eventType ? 'event' : p.offerCode ? 'offer' : 'update',
              title: p.summary?.substring(0, 60) || 'Post', content: p.summary || '',
              startDate: p.startTime ? new Date(p.startTime).toLocaleDateString() : 'Now',
              status: p.state === 'LIVE' ? 'active' : 'expired', views: 0, clicks: 0,
            })) : []);
          }
        } catch {
          setPosts([]);
        }
      } else {
        setConnected(false);
        setReviews([]);
        setPosts([]);
      }
    } catch { setConnected(false); setReviews([]); setPosts([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReply = async (id: string) => {
    if (!replyTxt.trim()) return;
    setReplying(true);
    try {
      await googleBusinessAPI.replyToReview(id, replyTxt);
      setReviews(reviews.map(r => r.id === id ? { ...r, replied: true, replyText: replyTxt } : r));
      setReplyOpen(null); setReplyTxt(''); toast_('Reply posted!');
    } catch (err: any) { toast_(err?.response?.data?.error || 'Failed to post reply', 'error'); } finally { setReplying(false); }
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim()) return;
    setCreating(true);
    try {
      await googleBusinessAPI.createPost({ content: `${newPost.title}\n\n${newPost.content}` });
      setPosts([{ id: Date.now().toString(), ...newPost, status: 'active', views: 0, clicks: 0, startDate: 'Now' }, ...posts]);
      setNewPost({ type: 'update', title: '', content: '' }); setPostOpen(false); toast_('Post created!');
    } catch (err: any) { toast_(err?.response?.data?.error || 'Failed to create post', 'error'); } finally { setCreating(false); }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const repliedCount = reviews.filter(r => r.replied).length;

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="text-center"><RefreshCw size={48} className="text-blue-500 animate-spin mx-auto mb-4" /><p className="text-gray-500">Loading Google Business data...</p></div></div>;
  }

  return (
    <div className="p-6 lg:p-8">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.m}</div>}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Google Business Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your business on Google Search & Maps</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['profile', 'reviews', 'posts', 'insights'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {v === 'profile' && <><MapPin size={14} className="inline mr-1" />Profile</>}
              {v === 'reviews' && <><Star size={14} className="inline mr-1" />Reviews</>}
              {v === 'posts' && <><MessageSquare size={14} className="inline mr-1" />Posts</>}
              {v === 'insights' && <><BarChart3 size={14} className="inline mr-1" />Insights</>}
            </button>
          ))}
        </div>
      </div>

      {!connected ? (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
          <div><p className="font-medium text-yellow-800 dark:text-yellow-300">Google Business Not Connected</p><p className="text-sm text-yellow-600 dark:text-yellow-400">Connect your Google Business Profile in Settings → Integrations to manage reviews, posts, and insights.</p></div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
          <div><p className="font-medium text-green-800 dark:text-green-300">Business Verified ✓</p><p className="text-sm text-green-600 dark:text-green-400">Your Google Business Profile is connected</p></div>
        </div>
      )}

      {view === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{business?.name || 'Your Business'}</h2><p className="text-gray-500 dark:text-gray-400">{business?.type || 'Business'}</p></div>
                <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"><Edit3 size={14} /> Edit</button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{editForm.description || `${business?.name || 'Your business'} - powered by BizzAuto`}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {business?.address && <div className="flex items-start gap-3"><MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" /><div><p className="text-sm font-medium text-gray-900 dark:text-white">Address</p><p className="text-sm text-gray-500 dark:text-gray-400">{business.address}</p></div></div>}
                {business?.phone && <div className="flex items-start gap-3"><Phone size={18} className="text-gray-400 mt-0.5 shrink-0" /><div><p className="text-sm font-medium text-gray-900 dark:text-white">Phone</p><p className="text-sm text-gray-500 dark:text-gray-400">{business.phone}</p></div></div>}
                {business?.website && <div className="flex items-start gap-3"><Globe size={18} className="text-gray-400 mt-0.5 shrink-0" /><div><p className="text-sm font-medium text-gray-900 dark:text-white">Website</p><a href={business.website} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{business.website}</a></div></div>}
                <div className="flex items-start gap-3"><Camera size={18} className="text-gray-400 mt-0.5 shrink-0" /><div><p className="text-sm font-medium text-gray-900 dark:text-white">Photos</p><p className="text-sm text-gray-500 dark:text-gray-400">Manage via Google Business</p></div></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock size={18} /> Business Hours</h3>
              <div className="space-y-2">{DAYS.map(d => <div key={d} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"><span className="text-sm font-medium text-gray-900 dark:text-white w-16">{d}</span><span className="text-sm text-gray-600 dark:text-gray-400">09:00 - 18:00</span></div>)}</div>
              <p className="text-xs text-gray-400 mt-3">Configure hours in Google Business Profile settings</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-1">{avgRating}</div>
              <Stars r={Math.round(Number(avgRating))} />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{reviews.length} reviews</p>
              {reviews.length > 0 && <button onClick={() => setView('reviews')} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">View all reviews →</button>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setPostOpen(true)} className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-medium"><Plus size={16} /> Create Post</button>
                <button onClick={() => setView('reviews')} className="w-full flex items-center gap-2 px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 text-sm font-medium"><Star size={16} /> Respond to Reviews</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'reviews' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">{avgRating}</div>
              <Stars r={Math.round(Number(avgRating))} />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{reviews.length} total reviews</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Rating Distribution</h4>
              {[5, 4, 3, 2, 1].map(r => {
                const count = reviews.filter(rv => rv.rating === r).length;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return <div key={r} className="flex items-center gap-2 mb-1.5"><span className="text-xs text-gray-600 dark:text-gray-400 w-6">{r}⭐</span><div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} /></div><span className="text-xs text-gray-500 dark:text-gray-400 w-6">{count}</span></div>;
              })}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Response Rate</h4>
              <div className="text-center"><div className="text-4xl font-bold text-green-600 dark:text-green-400">{reviews.length > 0 ? Math.round((repliedCount / reviews.length) * 100) : 0}%</div><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{repliedCount} of {reviews.length} replied</p></div>
              {reviews.filter(r => !r.replied).length > 0 && <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><p className="text-xs text-yellow-700 dark:text-yellow-400">⚠️ {reviews.filter(r => !r.replied).length} review(s) awaiting reply</p></div>}
            </div>
          </div>
          {reviews.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <Star size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">No Reviews Yet</h3>
              <p className="text-sm text-gray-400">Reviews will appear once your Google Business Profile is connected.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700"><h3 className="font-semibold text-gray-900 dark:text-white">All Reviews</h3></div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {reviews.map(rv => (
                  <div key={rv.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">{rv.author.charAt(0)}</div>
                        <div><p className="font-medium text-gray-900 dark:text-white">{rv.author}</p><div className="flex items-center gap-2"><Stars r={rv.rating} sz={12} /><span className="text-xs text-gray-400">{rv.date}</span></div></div>
                      </div>
                      {!rv.replied && connected && <button onClick={() => { setReplyOpen(rv.id); setReplyTxt(''); }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Reply</button>}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{rv.text}</p>
                    {rv.replied && rv.replyText && <div className="mt-3 ml-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400"><p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Owner Response</p><p className="text-sm text-gray-700 dark:text-gray-300">{rv.replyText}</p></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'posts' && (
        <div className="space-y-6">
          <div className="flex justify-end"><button onClick={() => setPostOpen(true)} disabled={!connected} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Plus size={18} /> Create Post</button></div>
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">No Posts Yet</h3>
              <p className="text-sm text-gray-400">Create your first Google Business post to engage with customers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.type === 'offer' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : p.type === 'event' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>{p.type === 'offer' ? '🏷️ Offer' : p.type === 'event' ? '📅 Event' : '📝 Update'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{p.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{p.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400"><span>{p.startDate}</span><div className="flex items-center gap-3"><span className="flex items-center gap-1"><Eye size={12} /> {p.views}</span><span className="flex items-center gap-1"><Share2 size={12} /> {p.clicks}</span></div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'insights' && (
        <div className="space-y-6">
          {!connected ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <BarChart3 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">Insights Unavailable</h3>
              <p className="text-sm text-gray-400">Connect your Google Business Profile to see search performance and customer analytics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[{ i: <Search size={20} />, l: 'Search Views', cl: 'blue' }, { i: <Phone size={20} />, l: 'Phone Calls', cl: 'green' }, { i: <ExternalLink size={20} />, l: 'Website Clicks', cl: 'purple' }, { i: <MapPin size={20} />, l: 'Directions', cl: 'orange' }].map((s, i) => {
                const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400', purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' };
                return <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"><div className="flex items-center justify-between mb-3"><div className={`p-2.5 rounded-lg ${cm[s.cl]}`}>{s.i}</div></div><p className="text-sm text-gray-500 dark:text-gray-400">{s.l}</p><p className="text-xs text-gray-400 mt-2">Requires Google Analytics access</p></div>;
              })}
            </div>
          )}
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Business Profile</h2>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label><input type="text" value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={() => { setEditOpen(false); toast_('Profile updated!'); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {replyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReplyOpen(null)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reply to Review</h2>
              <button onClick={() => setReplyOpen(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">{reviews.find(r => r.id === replyOpen)?.text}</p>
                <p className="text-xs text-gray-400 mt-1">— {reviews.find(r => r.id === replyOpen)?.author}</p>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Reply</label><textarea value={replyTxt} onChange={e => setReplyTxt(e.target.value)} rows={3} placeholder="Write your response..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setReplyOpen(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={() => handleReply(replyOpen)} disabled={replying || !replyTxt.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{replying && <Loader2 size={14} className="animate-spin" />} Post Reply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {postOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPostOpen(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Post</h2>
              <button onClick={() => setPostOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Post Type</label><select value={newPost.type} onChange={e => setNewPost({ ...newPost, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"><option value="update">📝 Update</option><option value="offer">🏷️ Offer</option><option value="event">📅 Event</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label><input type="text" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} placeholder="Post title" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label><textarea value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} rows={3} placeholder="Write your post content..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setPostOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={handleCreatePost} disabled={creating || !newPost.title.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{creating && <Loader2 size={14} className="animate-spin" />} Create Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleBusinessPage;
