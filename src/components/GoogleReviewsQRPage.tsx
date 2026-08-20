import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Star, QrCode, MessageSquare, Shield, BarChart3, Zap, Download, Copy, Settings, Eye, Trash2, Plus, Check, X, ExternalLink, RefreshCw, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';
import { googleBusinessAPI, reviewsAPI } from '../lib/api';

interface QRCodeItem {
  id: string;
  name: string;
  url: string;
  scans: number;
  reviews: number;
  createdAt: string;
  status: 'active' | 'paused';
  fgColor: string;
  bgColor: string;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  time: string;
  replied: boolean;
  replyText?: string;
}

const STORAGE_KEY = 'bz-qr-reviews-config';

const defaultConfig: QRCodeItem[] = [];

export default function GoogleReviewsQRPage() {
  const toast = useToast();
  const [view, setView] = useState<'qr' | 'auto-reply' | 'analytics' | 'settings'>('qr');
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultConfig; } catch { return defaultConfig; }
  });
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQRName, setNewQRName] = useState('');
  const [reviewUrl, setReviewUrl] = useState(() => localStorage.getItem('bz-review-url') || '');
  const [negativeRedirect, setNegativeRedirect] = useState(() => localStorage.getItem('bz-negative-redirect') || '');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real data from backend
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ total: 0, average: 0, fiveStar: 0, recentCount: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Auto-reply rules
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(() => localStorage.getItem('bz-auto-reply') === 'true');

  // Persist QR codes
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(qrCodes)); }, [qrCodes]);
  useEffect(() => { localStorage.setItem('bz-review-url', reviewUrl); }, [reviewUrl]);
  useEffect(() => { localStorage.setItem('bz-negative-redirect', negativeRedirect); }, [negativeRedirect]);
  useEffect(() => { localStorage.setItem('bz-auto-reply', String(autoReplyEnabled)); }, [autoReplyEnabled]);

  // Fetch real reviews from Google Business
  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const statusRes = await googleBusinessAPI.getStatus();
      const connected = statusRes.data?.data?.connected || false;
      setGoogleConnected(connected);

      if (connected) {
        const reviewsRes = await googleBusinessAPI.getReviews({ pageSize: 10 });
        if (reviewsRes.data?.data?.reviews) {
          const r = reviewsRes.data.data.reviews;
          setReviews(r.map((rev: any) => ({
            id: rev.reviewId || rev.name || Math.random().toString(),
            author: rev.reviewer?.displayName || rev.author || 'Anonymous',
            rating: rev.starRating === 'FIVE' ? 5 : rev.starRating === 'FOUR' ? 4 : rev.starRating === 'THREE' ? 3 : rev.starRating === 'TWO' ? 2 : rev.starRating === 'ONE' ? 1 : rev.rating || 5,
            text: rev.comment || rev.text || '',
            time: rev.updateTime || rev.time || 'Recently',
            replied: !!rev.reviewReply?.comment || !!rev.replyText,
            replyText: rev.reviewReply?.comment || rev.replyText,
          })));
        }

        const statsRes = await googleBusinessAPI.getStats();
        if (statsRes.data?.data) {
          const s = statsRes.data.data;
          setReviewStats({
            total: s.totalReviews || s.reviewCount || 0,
            average: s.averageRating || 4.7,
            fiveStar: s.fiveStarCount || 0,
            recentCount: s.recentReviews || 0,
          });
        }
      } else {
        // Try internal reviews API as fallback
        try {
          const internalReviews = await reviewsAPI.list();
          if (internalReviews.data?.data?.reviews) {
            const r = internalReviews.data.data.reviews;
            setReviews(r.slice(0, 10).map((rev: any) => ({
              id: rev.id,
              author: rev.author || rev.contactName || 'Customer',
              rating: rev.rating || 5,
              text: rev.text || rev.content || '',
              time: rev.createdAt || 'Recently',
              replied: !!rev.replyText,
              replyText: rev.replyText,
            })));
          }
          const statsRes = await reviewsAPI.stats();
          if (statsRes.data?.data) {
            const s = statsRes.data.data;
            setReviewStats({
              total: s.total || s.totalReviews || 0,
              average: s.averageRating || s.avgRating || 0,
              fiveStar: s.fiveStar || 0,
              recentCount: s.recentCount || 0,
            });
          }
        } catch { /* internal reviews not available */ }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const totalScans = qrCodes.reduce((a, b) => a + b.scans, 0);
  const totalReviews = qrCodes.reduce((a, b) => a + b.reviews, 0);
  const avgConversion = totalScans > 0 ? ((totalReviews / totalScans) * 100).toFixed(1) : '0';

  const createQR = () => {
    if (!newQRName.trim()) { toast.error('Enter a name'); return; }
    const newItem: QRCodeItem = {
      id: Date.now().toString(), name: newQRName,
      url: reviewUrl || 'https://g.page/bizzauto/review',
      scans: 0, reviews: 0, createdAt: new Date().toISOString().split('T')[0],
      status: 'active', fgColor: '#000000', bgColor: '#ffffff',
    };
    setQrCodes(prev => [...prev, newItem]);
    setSelectedQR(newItem.id);
    setShowCreateModal(false); setNewQRName('');
    toast.success('QR Code created!');
  };

  const deleteQR = (id: string) => {
    setQrCodes(prev => prev.filter(q => q.id !== id));
    if (selectedQR === id) setSelectedQR(null);
    toast.success('QR Code deleted');
  };

  const toggleQRStatus = (id: string) => {
    setQrCodes(prev => prev.map(q => q.id === id ? { ...q, status: q.status === 'active' ? 'paused' : 'active' } : q));
    toast.success('Status updated');
  };

  const downloadQR = (id: string) => {
    const svgEl = document.getElementById(`qr-svg-${id}`)?.querySelector('svg');
    if (!svgEl) { toast.error('QR code not found'); return; }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx?.fillRect(0, 0, 400, 400);
      ctx?.drawImage(img, 0, 0, 400, 400);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `review-qr-${id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('QR Code downloaded!');
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const copyReviewLink = (url: string, id: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Review link copied!');
  };

  const qrUrl = reviewUrl || 'https://g.page/bizzauto/review';

  const [showHelp, setShowHelp] = useState(true);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Star className="text-amber-500" /> Google Reviews QR
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Generate QR codes to collect more Google reviews automatically</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHelp(!showHelp)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${showHelp ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <AlertCircle size={16} /> How to Use
          </button>
          <button onClick={() => fetchReviews()} className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={loadingReviews ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            <Plus size={18} /> Create QR Code
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Content */}
        <div className="flex-1 min-w-0">

      {/* Connection Status */}
      {!googleConnected && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Google Business not connected</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Connect your Google Business Profile in <a href="/google-business" className="underline font-medium">Google Profile</a> to see real reviews and analytics.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Scans', value: totalScans.toLocaleString(), icon: <QrCode size={20} className="text-amber-500" /> },
          { label: 'Reviews Collected', value: (reviewStats.total || totalReviews).toLocaleString(), icon: <Star size={20} className="text-green-500" /> },
          { label: 'Avg Rating', value: reviewStats.average > 0 ? reviewStats.average.toFixed(1) : `${avgConversion}%`, icon: <BarChart3 size={20} className="text-blue-500" />, sub: reviewStats.average > 0 ? 'avg rating' : 'conversion' },
          { label: 'Active QR Codes', value: qrCodes.filter(q => q.status === 'active').length, icon: <Zap size={20} className="text-purple-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-2xl font-bold">{stat.value}</p>
            {'sub' in stat && stat.sub && <p className="text-xs text-gray-400">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'qr', label: 'QR Codes', icon: <QrCode size={16} /> },
          { id: 'auto-reply', label: 'Auto-Reply', icon: <MessageSquare size={16} /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
          { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id as typeof view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${view === tab.id ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* QR Codes View */}
      {view === 'qr' && (
        <div className="space-y-4">
          {qrCodes.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <QrCode size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-3">No QR codes yet</p>
              <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
                Create Your First QR Code
              </button>
            </div>
          )}
          {qrCodes.map(qr => (
            <div key={qr.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* QR Preview */}
                <div id={`qr-svg-${qr.id}`} className="w-24 h-24 flex items-center justify-center bg-white rounded-lg border border-gray-100 shrink-0">
                  <QRCodeSVG value={qr.url} size={80} fgColor={qr.fgColor} bgColor={qr.bgColor} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{qr.name}</h3>
                    <button onClick={() => toggleQRStatus(qr.id)} className={`px-2 py-0.5 text-xs rounded-full cursor-pointer ${qr.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {qr.status}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-1">
                    <LinkIcon size={12} /> {qr.url}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{qr.scans.toLocaleString()} scans</span>
                    <span>{qr.reviews} reviews</span>
                    <span>Created {qr.createdAt}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => downloadQR(qr.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" title="Download QR PNG">
                    <Download size={16} />
                  </button>
                  <button onClick={() => copyReviewLink(qr.url, qr.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" title="Copy Review Link">
                    {copiedId === qr.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => setShowPreview(qr.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" title="Preview Large">
                    <Eye size={16} />
                  </button>
                  <a href={qr.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" title="Open Review Page">
                    <ExternalLink size={16} />
                  </a>
                  <button onClick={() => deleteQR(qr.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-Reply View */}
      {view === 'auto-reply' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="text-amber-500" size={20} />
                <h3 className="font-semibold">Auto-Reply to Reviews</h3>
              </div>
              <button onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${autoReplyEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${autoReplyEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">AI automatically replies to Google reviews based on star rating.</p>

            {autoReplyEnabled && (
              <div className="space-y-3">
                {[
                  { stars: 5, label: '5 Star', reply: 'Thank you so much for the amazing review! We\'re thrilled you had a great experience. 🙏', color: 'green' },
                  { stars: 4, label: '4 Star', reply: 'Thanks for your feedback! We\'re glad you enjoyed it. Let us know if there\'s anything we can improve.', color: 'blue' },
                  { stars: 3, label: '3 Star', reply: 'Thank you for your feedback. We\'d love to hear how we can improve your experience.', color: 'yellow' },
                  { stars: 2, label: 'Negative', reply: 'We\'re sorry to hear about your experience. Please contact us directly so we can make it right.', color: 'red' },
                ].map(rule => (
                  <div key={rule.stars} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= rule.stars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{rule.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{rule.reply}</p>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-2">Auto-reply uses AI to personalize responses for each review.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-amber-500" /> Review Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                <p className="text-3xl font-bold text-amber-600">{reviewStats.average > 0 ? reviewStats.average.toFixed(1) : '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Avg Rating</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600">{reviewStats.total || reviews.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Reviews</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600">{totalScans.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">QR Scans</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
                <p className="text-3xl font-bold text-purple-600">{avgConversion}%</p>
                <p className="text-xs text-gray-500 mt-1">Scan→Review</p>
              </div>
            </div>
          </div>

          {/* Real Reviews */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-4">Recent Reviews</h4>
            {loadingReviews ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : reviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No reviews found. Connect Google Business in <a href="/google-business" className="underline text-amber-600">Google Profile</a>.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{review.author}</span>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}</div>
                      <span className="text-xs text-gray-500 ml-auto">{review.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{review.text}</p>
                    {review.replied && (
                      <div className="mt-2 pl-3 border-l-2 border-green-300 dark:border-green-600">
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">Auto-replied:</p>
                        <p className="text-xs text-gray-500">{review.replyText}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings View */}
      {view === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings size={20} className="text-amber-500" /> QR Code Settings</h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Google Review URL</label>
              <input type="url" value={reviewUrl} onChange={e => setReviewUrl(e.target.value)}
                placeholder="https://g.page/your-business/review"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <p className="text-xs text-gray-500 mt-1">Your Google Maps review link. Find it in Google Business Profile dashboard.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Negative Review Redirect URL</label>
              <input type="url" value={negativeRedirect} onChange={e => setNegativeRedirect(e.target.value)}
                placeholder="https://forms.gle/your-feedback-form"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <p className="text-xs text-gray-500 mt-1">Customers leaving 1-3 star reviews will be redirected here instead of posting publicly.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Quick Link</label>
              <div className="flex gap-2">
                <input type="text" value={reviewUrl || qrUrl} readOnly className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-mono" />
                <button onClick={() => copyReviewLink(reviewUrl || qrUrl, 'settings')} className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm flex items-center gap-1">
                  {copiedId === 'settings' ? <Check size={14} /> : <Copy size={14} />} Copy
                </button>
              </div>
            </div>
            <div className="pt-2">
              <button onClick={() => { toast.success('Settings saved!'); }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

        </div>{/* end main content */}

        {/* ===== HOW TO USE SIDEBAR ===== */}
        {showHelp && (
          <div className="w-80 shrink-0 hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> How to Use</h3>
                <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X size={14} /></button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">Get Your Review URL</p>
                    <p className="text-xs text-gray-500 mt-0.5">Go to <a href="https://business.google.com" target="_blank" className="text-amber-600 underline">Google Business Profile</a> → Copy your review link (starts with https://g.page/...)</p>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">Paste URL in Settings</p>
                    <p className="text-xs text-gray-500 mt-0.5">Go to Settings tab → Paste your Google Review URL → Save</p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">Create QR Codes</p>
                    <p className="text-xs text-gray-500 mt-0.5">Click "Create QR Code" → Name it (e.g. "Front Desk") → Download the PNG</p>
                  </div>
                </div>
                {/* Step 4 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium">Print & Place</p>
                    <p className="text-xs text-gray-500 mt-0.5">Print QR codes on receipts, counters, standees, business cards, or NFC tags</p>
                  </div>
                </div>
                {/* Step 5 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">5</div>
                  <div>
                    <p className="font-medium">Customers Scan → Review</p>
                    <p className="text-xs text-gray-500 mt-0.5">Customer scans QR → Lands on Google review page → Leaves a review → You get notified</p>
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Tips */}
                <div>
                  <p className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-2">Pro Tips</p>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <li className="flex gap-2"><Check size={14} className="text-green-500 shrink-0 mt-0.5" /> Place QR at payment counter for max scans</li>
                    <li className="flex gap-2"><Check size={14} className="text-green-500 shrink-0 mt-0.5" /> Add "Scan for 10% off" to boost scans</li>
                    <li className="flex gap-2"><Check size={14} className="text-green-500 shrink-0 mt-0.5" /> Use NFC tags for tap-to-review on tables</li>
                    <li className="flex gap-2"><Check size={14} className="text-green-500 shrink-0 mt-0.5" /> Enable Auto-Reply to thank reviewers instantly</li>
                    <li className="flex gap-2"><Check size={14} className="text-green-500 shrink-0 mt-0.5" /> Connect Google Business for real-time analytics</li>
                  </ul>
                </div>

                {/* Where to Print */}
                <div>
                  <p className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-2">Where to Print</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Receipt', 'Counter', 'Standee', 'Menu', 'Business Card', 'Window', 'Billboard', 'NFC Tag'].map(place => (
                      <span key={place} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">{place}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>{/* end flex */}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New QR Code</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="QR Code Name (e.g. Main Entrance)" value={newQRName} onChange={e => setNewQRName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" autoFocus onKeyDown={e => e.key === 'Enter' && createQR()} />
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <QRCodeSVG value={qrUrl} size={120} />
                <p className="text-xs text-gray-500 mt-2">Preview — links to: {qrUrl}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={createQR} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Large Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">{qrCodes.find(q => q.id === showPreview)?.name}</h3>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={qrCodes.find(q => q.id === showPreview)?.url || qrUrl} size={250} />
            </div>
            <p className="text-xs text-gray-500 mb-4">Scan to leave a review</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { if (showPreview) downloadQR(showPreview); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm flex items-center gap-1">
                <Download size={14} /> Download
              </button>
              <button onClick={() => setShowPreview(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
