import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Star, Phone, Clock, Globe, Camera, Edit3, MessageSquare, Eye, Plus, CheckCircle, XCircle, AlertCircle, BarChart3, Share2, Search, ExternalLink, RefreshCw, Loader2, Zap, Calendar, Trash2, Edit } from 'lucide-react';
import { googleBusinessAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

interface Review { id: string; author: string; rating: number; text: string; date: string; replied: boolean; replyText?: string; }
interface BusinessPost { id: string; type: string; title: string; content: string; startDate: string; status: string; views: number; clicks: number; }
interface AutoPostTemplate { id: string; name: string; content: string; mediaUrl?: string; callToAction?: { type: string; url?: string }; tags?: string[]; }
interface AutoPostConfig { enabled: boolean; time: string; timezone: string; days: string[]; templates: AutoPostTemplate[]; }

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

const Stars: React.FC<{ r: number; sz?: number }> = ({ r, sz = 18 }) => (
  <div className="flex items-center justify-center gap-1">
    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={sz} className={s <= r ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />)}
  </div>
);

const GoogleBusinessPage: React.FC = () => {
  const { business } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'profile' | 'reviews' | 'posts' | 'insights' | 'auto-post'>('profile');
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
  
  // Auto-Post State
  const [autoPostConfig, setAutoPostConfig] = useState<AutoPostConfig>({ enabled: false, time: '09:00', timezone: 'Asia/Kolkata', days: [], templates: [] });
  const [autoPostLoading, setAutoPostLoading] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AutoPostTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', content: '', mediaUrl: '' });
  const [savingConfig, setSavingConfig] = useState(false);

  const toast_ = (m: string, t = 'success') => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); };

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    
    if (connected === 'true') {
      toast_('Google Business connected successfully!', 'success');
      setSearchParams({});
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'missing_params': 'Missing authentication parameters. Please try again.',
        'invalid_state': 'Session expired. Please try again.',
        'no_business_found': 'No Google Business Profile found for this Google account. Create one at business.google.com first.',
        'access_denied': 'Access denied. You must grant all required permissions when prompted.',
        'api_not_enabled': 'Google Business Profile APIs are not enabled. Go to console.cloud.google.com → APIs & Services → Enable: Business Information API + Google My Business API.',
        'token_expired': 'Authentication expired. Please try again.',
        'callback_failed': 'Connection failed. Check that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and redirect URI are correctly configured. See Setup Guide below.'
      };
      toast_(errorMessages[error] || `Connection failed: ${error}`, 'error');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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
            const rd = reviewsRes.data?.data?.data || [];
            setReviews(Array.isArray(rd) ? rd.map((r: any) => ({
              id: r.reviewId || r.id || String(Math.random()), author: r.reviewer?.displayName || 'Anonymous',
              rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
              text: r.comment || '', date: r.updateTime || new Date().toISOString(), replied: false,
            })) : []);
          }
        } catch { /* Reviews not available */ }
        
        // Fetch posts
        try {
          const postsRes = await googleBusinessAPI.getPosts();
          if (postsRes.data?.success) {
            const pd = postsRes.data?.data?.localPosts || [];
            setPosts(Array.isArray(pd) ? pd.map((p: any) => ({
              id: p.name || String(Math.random()), type: 'update', title: p.topicType || 'Update',
              content: p.summary || '', startDate: p.createTime || new Date().toISOString(),
              status: p.state || 'live', views: 0, clicks: 0,
            })) : []);
          }
        } catch { /* Posts not available */ }

        // Fetch auto-post config
        try {
          const autoPostRes = await googleBusinessAPI.getAutoPostConfig();
          if (autoPostRes.data?.success && autoPostRes.data?.data) {
            setAutoPostConfig(autoPostRes.data.data);
          }
        } catch {
          // Auto-post not configured yet
        }
      } else {
        setConnected(false);
        setReviews([]);
        setPosts([]);
      }
    } catch (err) {
      console.error('[GoogleBusiness] Fetch error:', err);
      setConnected(false);
      setReviews([]);
      setPosts([]);
    } finally { setLoading(false); }
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

  // Auto-Post Functions
  const handleSaveAutoPostConfig = async () => {
    setSavingConfig(true);
    try {
      await googleBusinessAPI.updateAutoPostConfig({
        enabled: autoPostConfig.enabled,
        time: autoPostConfig.time,
        timezone: autoPostConfig.timezone,
        days: autoPostConfig.days,
      });
      toast_('Auto-post settings saved!');
    } catch (err: any) {
      toast_(err?.response?.data?.error || 'Failed to save settings', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleDay = (day: string) => {
    setAutoPostConfig(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) return;
    try {
      if (editingTemplate) {
        await googleBusinessAPI.updateAutoPostTemplate(editingTemplate.id, templateForm);
        setAutoPostConfig(prev => ({
          ...prev,
          templates: prev.templates.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t),
        }));
        toast_('Template updated!');
      } else {
        const res = await googleBusinessAPI.addAutoPostTemplate(templateForm);
        if (res.data?.success) {
          setAutoPostConfig(prev => ({
            ...prev,
            templates: [...prev.templates, res.data.data],
          }));
          toast_('Template added!');
        }
      }
      setTemplateOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', content: '', mediaUrl: '' });
    } catch (err: any) {
      toast_(err?.response?.data?.error || 'Failed to save template', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await googleBusinessAPI.deleteAutoPostTemplate(templateId);
      setAutoPostConfig(prev => ({
        ...prev,
        templates: prev.templates.filter(t => t.id !== templateId),
      }));
      toast_('Template deleted!');
    } catch (err: any) {
      toast_(err?.response?.data?.error || 'Failed to delete template', 'error');
    }
  };

  const handleTriggerAutoPost = async () => {
    try {
      const res = await googleBusinessAPI.triggerAutoPost();
      if (res.data?.success) {
        toast_('Auto-post triggered successfully!');
      } else {
        toast_(res.data?.data?.message || 'Failed to trigger auto-post', 'error');
      }
    } catch (err: any) {
      toast_(err?.response?.data?.error || 'Failed to trigger auto-post', 'error');
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const repliedCount = reviews.filter(r => r.replied).length;

  if (loading) {
    return <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[400px]"><div className="text-center"><RefreshCw size={48} className="text-blue-500 animate-spin mx-auto mb-4" /><p className="text-gray-500">Loading Google Business data...</p></div></div>;
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.t === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.m}</div>}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Google Business Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your business on Google Search & Maps</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['profile', 'reviews', 'posts', 'insights', 'auto-post'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              {v === 'profile' && <><MapPin size={14} className="inline mr-1" />Profile</>}
              {v === 'reviews' && <><Star size={14} className="inline mr-1" />Reviews</>}
              {v === 'posts' && <><MessageSquare size={14} className="inline mr-1" />Posts</>}
              {v === 'insights' && <><BarChart3 size={14} className="inline mr-1" />Insights</>}
              {v === 'auto-post' && <><Zap size={14} className="inline mr-1" />Auto-Post</>}
            </button>
          ))}
        </div>
      </div>

      {!connected ? (
        <div className="space-y-4">
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
            <div className="flex-1"><p className="font-medium text-yellow-800 dark:text-yellow-300">Google Business Not Connected</p><p className="text-sm text-yellow-600 dark:text-yellow-400">Connect your Google Business Profile to manage reviews, posts, and insights.</p></div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/google-business/auth/url', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                  });
                  const data = await res.json();
                  if (data.success && data.data.url) {
                    window.location.href = data.data.url;
                  } else {
                    toast_(data.error || 'Failed to generate auth URL', 'error');
                  }
                } catch (err) {
                  toast_('Failed to start Google authentication', 'error');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Connect Google Business
            </button>
          </div>

          {/* Setup Guide */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Setup Guide</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Google APIs</p>
                  <p className="text-gray-500 dark:text-gray-400">Go to <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a> and enable these APIs:</p>
                  <ul className="mt-1 ml-4 list-disc text-gray-500 dark:text-gray-400">
                    <li>Business Information API</li>
                    <li>Google My Business API (Legacy v4)</li>
                    <li>Google Business Profile APIs</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Configure OAuth Consent Screen</p>
                  <p className="text-gray-500 dark:text-gray-400">In <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OAuth Consent Screen</a>, add the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">business.manage</code> scope and publish the app.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Add Redirect URI</p>
                  <p className="text-gray-500 dark:text-gray-400">In <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Credentials</a>, add this redirect URI to your OAuth 2.0 Client:</p>
                  <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 break-all">{window.location.origin}/api/google-business/auth/callback</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Set Environment Variables</p>
                  <p className="text-gray-500 dark:text-gray-400">Ensure these are set in your <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code> file:</p>
                  <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">GOOGLE_CLIENT_ID=...<br/>GOOGLE_CLIENT_SECRET=...<br/>GOOGLE_BUSINESS_REDIRECT_URL=.../api/google-business/auth/callback</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Click Connect!</p>
                  <p className="text-gray-500 dark:text-gray-400">Make sure you have a Google Business Profile for your business at <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">business.google.com</a>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
          <div className="flex-1"><p className="font-medium text-green-800 dark:text-green-300">Business Connected ✓</p><p className="text-sm text-green-600 dark:text-green-400">Your Google Business Profile is connected and working</p></div>
          <button
            onClick={async () => {
              if (!confirm('Disconnect Google Business Profile? You can reconnect anytime.')) return;
              try {
                await fetch('/api/google-business/disconnect', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setConnected(false);
                setReviews([]);
                setPosts([]);
                toast_('Google Business disconnected', 'success');
              } catch {
                toast_('Failed to disconnect', 'error');
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap"
          >
            Disconnect
          </button>
        </div>
      )}

      {view === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div><h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{business?.name || 'Your Business'}</h2><p className="text-gray-500 dark:text-gray-400">{business?.type || 'Business'}</p></div>
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock size={18} /> Business Hours</h3>
              <div className="space-y-2">{DAYS.map(d => <div key={d} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"><span className="text-sm font-medium text-gray-900 dark:text-white w-16">{d}</span><span className="text-sm text-gray-600 dark:text-gray-400">09:00 - 18:00</span></div>)}</div>
              <p className="text-xs text-gray-400 mt-3">Configure hours in Google Business Profile settings</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-1">{avgRating}</div>
              <Stars r={Math.round(Number(avgRating))} />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{reviews.length} reviews</p>
              {reviews.length > 0 && <button onClick={() => setView('reviews')} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">View all reviews →</button>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
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
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{avgRating}</div>
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
              <div className="text-center"><div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">{reviews.length > 0 ? Math.round((repliedCount / reviews.length) * 100) : 0}%</div><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{repliedCount} of {reviews.length} replied</p></div>
              {reviews.filter(r => !r.replied).length > 0 && <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><p className="text-xs text-yellow-700 dark:text-yellow-400">⚠ {reviews.filter(r => !r.replied).length} review(s) awaiting reply</p></div>}
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.type === 'offer' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : p.type === 'event' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>{p.type === 'offer' ? '🏷 Offer' : p.type === 'event' ? '📅 Event' : '📝 Update'}</span>
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

      {view === 'auto-post' && (
        <div className="space-y-6">
          {!connected ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <Zap size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">Auto-Post Unavailable</h3>
              <p className="text-sm text-gray-400">Connect your Google Business Profile first to enable auto-posting.</p>
            </div>
          ) : (
            <>
              {/* Auto-Post Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Zap size={20} className="text-yellow-500" /> Auto-Post Settings
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automatically post to Google Business Profile daily</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPostConfig.enabled}
                      onChange={e => setAutoPostConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {autoPostConfig.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {/* Time Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock size={14} className="inline mr-1" /> Post Time
                    </label>
                    <input
                      type="time"
                      value={autoPostConfig.time}
                      onChange={e => setAutoPostConfig(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Globe size={14} className="inline mr-1" /> Timezone
                    </label>
                    <select
                      value={autoPostConfig.timezone}
                      onChange={e => setAutoPostConfig(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="America/New_York">US Eastern (ET)</option>
                      <option value="America/Chicago">US Central (CT)</option>
                      <option value="America/Los_Angeles">US Pacific (PT)</option>
                      <option value="Europe/London">UK (GMT)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                    </select>
                  </div>
                </div>

                {/* Days Selection */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar size={14} className="inline mr-1" /> Posting Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          autoPostConfig.days.includes(day)
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveAutoPostConfig}
                    disabled={savingConfig}
                    className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingConfig && <Loader2 size={14} className="animate-spin" />}
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Post Templates */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <MessageSquare size={18} className="inline mr-2" /> Post Templates
                  </h3>
                  <button
                    onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', content: '', mediaUrl: '' }); setTemplateOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Plus size={16} /> Add Template
                  </button>
                </div>

                {autoPostConfig.templates.length === 0 ? (
                  <div className="text-center py-4 sm:py-6 md:py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No templates yet. Add your first template to start auto-posting!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {autoPostConfig.templates.map((template, index) => (
                      <div key={template.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                #{index + 1}
                              </span>
                              <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{template.content}</p>
                            {template.mediaUrl && (
                              <p className="text-xs text-gray-400 mt-1">📎 Has media attachment</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateForm({ name: template.name, content: template.content, mediaUrl: template.mediaUrl || '' });
                                setTemplateOpen(true);
                              }}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTriggerAutoPost}
                    disabled={!autoPostConfig.enabled || autoPostConfig.templates.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap size={16} /> Post Now
                  </button>
                  <button
                    onClick={() => setView('posts')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <Eye size={16} /> View Posts
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  💡 Tip: Create multiple templates and they will rotate daily for variety!
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Business Profile</h2>
              <button onClick={() => setEditOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label><input type="text" value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={() => { setEditOpen(false); toast_('Profile updated!'); }} className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {replyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReplyOpen(null)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-100 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reply to Review</h2>
              <button onClick={() => setReplyOpen(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">{reviews.find(r => r.id === replyOpen)?.text}</p>
                <p className="text-xs text-gray-400 mt-1">— {reviews.find(r => r.id === replyOpen)?.author}</p>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Reply</label><textarea value={replyTxt} onChange={e => setReplyTxt(e.target.value)} rows={3} placeholder="Write your response..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setReplyOpen(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={() => handleReply(replyOpen)} disabled={replying || !replyTxt.trim()} className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{replying && <Loader2 size={14} className="animate-spin" />} Post Reply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {postOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPostOpen(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-100 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Post</h2>
              <button onClick={() => setPostOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Post Type</label><select value={newPost.type} onChange={e => setNewPost({ ...newPost, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"><option value="update">📝 Update</option><option value="offer">🏷 Offer</option><option value="event">📅 Event</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label><input type="text" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} placeholder="Post title" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label><textarea value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} rows={3} placeholder="Write your post content..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setPostOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button onClick={handleCreatePost} disabled={creating || !newPost.title.trim()} className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{creating && <Loader2 size={14} className="animate-spin" />} Create Post</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {templateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setTemplateOpen(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-100 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'Add Template'}
              </h2>
              <button onClick={() => setTemplateOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XCircle size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g., Morning Motivation, Product Showcase"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Post Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={4}
                  placeholder="Write your post content here. Use {business_name} for dynamic content..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Max 200 characters for Google Business posts</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Media URL (Optional)</label>
                <input
                  type="text"
                  value={templateForm.mediaUrl}
                  onChange={e => setTemplateForm({ ...templateForm, mediaUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setTemplateOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!templateForm.name.trim() || !templateForm.content.trim()}
                  className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {editingTemplate ? 'Update' : 'Add'} Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleBusinessPage;
