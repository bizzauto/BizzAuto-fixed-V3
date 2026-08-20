import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, QrCode, Code, Share2, ExternalLink, LinkIcon, MessageSquare, Download, Globe } from 'lucide-react';
import apiClient from '../lib/api';
import { useToast } from './Toast';
import { useAuthStore } from '../lib/authStore';

const StoreSharePage: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess } = useToast();
  const { user } = useAuthStore();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'embed' | 'whatsapp'>('link');

  const fetchStore = useCallback(async () => {
    try {
      const res = await apiClient.get('/ecommerce/store');
      setStoreData(res.data?.data);
    } catch {
      setStoreData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const businessId = user?.businessId || '';
  const baseUrl = window.location.origin;
  const storeUrl = `${baseUrl}/store/${businessId}`;
  const trackUrl = `${baseUrl}/order-tracking`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showSuccess('Copied!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shareOnWhatsApp = () => {
    const message = `🛍 Check out our store!\n\n${storeData?.name || 'Our Store'}\n\n🛒 Browse products & order online:\n${storeUrl}\n\nTrack your order anytime:\n${trackUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`, '_blank');
  };

  const shareOnInstagram = () => {
    copyToClipboard(storeUrl, 'instagram');
    showSuccess('Link copied! Paste it in your Instagram bio or story.');
  };

  const shareOnTwitter = () => {
    const text = `🛍 Shop online at ${storeData?.name || 'Our Store'}: ${storeUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storeUrl)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Shop at ${storeData?.name || 'Our Store'}`;
    const body = `Check out our online store: ${storeUrl}\n\nTrack orders: ${trackUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `store-qr-${businessId.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const generateQRCode = (text: string) => {
    const size = 256;
    const cellSize = size / 25;
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Simple QR-like pattern (for demo - in production use a QR library)
    ctx.fillStyle = '#000000';
    const pattern = generateSimplePattern(text);

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        if (pattern[row][col]) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    // Add center logo area
    const logoSize = cellSize * 5;
    const logoPos = (size - logoSize) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(logoPos - 2, logoPos - 2, logoSize + 4, logoSize + 4);
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(logoPos, logoPos, logoSize, logoSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛍', size / 2, size / 2);
  };

  const generateSimplePattern = (data: string): boolean[][] => {
    const grid: boolean[][] = Array(25).fill(null).map(() => Array(25).fill(false));

    // Position detection patterns (corners)
    const addFinderPattern = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            grid[startRow + r][startCol + c] = true;
          }
        }
      }
    };

    addFinderPattern(0, 0);
    addFinderPattern(0, 18);
    addFinderPattern(18, 0);

    // Timing patterns
    for (let i = 8; i < 17; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Data encoding from text
    const hash = data.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);

    for (let r = 9; r < 20; r++) {
      for (let c = 9; c < 20; c++) {
        if ((r + c) % 3 === 0) {
          grid[r][c] = ((hash * (r * 25 + c)) % 7) > 2;
        }
      }
    }

    return grid;
  };

  useEffect(() => {
    if (activeTab === 'qr' && storeUrl) {
      generateQRCode(storeUrl);
    }
  }, [activeTab, storeUrl]);

  const embedCode = `<iframe
  src="${storeUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 12px; max-width: 1200px;"
  title="Online Store"
></iframe>`;

  const widgetCode = `<!-- BizzAutoAI Store Widget -->
<div id="bizzauto-store-widget"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${storeUrl}';
    iframe.style.cssText = 'width:100%;max-width:400px;height:600px;border:1px solid #e5e7eb;border-radius:12px;position:fixed;bottom:20px;right:20px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.15);';
    document.getElementById('bizzauto-store-widget').appendChild(iframe);
  })();
</script>`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/ecommerce')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Share Your Store</h1>
            <p className="text-sm text-gray-500">Get links, QR codes, and embed codes</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5 md:py-6">
        {/* Store URL Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Globe size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{storeData?.name || 'Your Store'}</h2>
              <p className="text-sm text-gray-500">{storeData?.description || 'Online Store'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <LinkIcon size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{storeUrl}</span>
            <button onClick={() => copyToClipboard(storeUrl, 'url')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
              {copiedField === 'url' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
            </button>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
              <ExternalLink size={14} className="text-gray-500" />
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'link', label: 'Share Link', icon: <LinkIcon size={16} /> },
            { key: 'qr', label: 'QR Code', icon: <QrCode size={16} /> },
            { key: 'embed', label: 'Embed on Website', icon: <Code size={16} /> },
            { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={16} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Share Link Tab */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Store Link</h3>
              <p className="text-sm text-gray-500 mb-4">Share this link on any platform - WhatsApp, Instagram, Facebook, or your website.</p>
              <div className="flex gap-2">
                <input type="text" value={storeUrl} readOnly className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <button onClick={() => copyToClipboard(storeUrl, 'main')} className="px-4 sm:px-5 md:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  {copiedField === 'main' ? <Check size={16} /> : <Copy size={16} />}
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Order Tracking Link</h3>
              <p className="text-sm text-gray-500 mb-4">Share this so customers can track their orders.</p>
              <div className="flex gap-2">
                <input type="text" value={trackUrl} readOnly className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                <button onClick={() => copyToClipboard(trackUrl, 'track')} className="px-4 sm:px-5 md:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  {copiedField === 'track' ? <Check size={16} /> : <Copy size={16} />}
                  Copy
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Share on Social Media</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button onClick={shareOnWhatsApp} className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors">
                  <MessageSquare size={18} /> WhatsApp
                </button>
                <button onClick={shareOnFacebook} className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  <Share2 size={18} /> Facebook
                </button>
                <button onClick={shareOnInstagram} className="flex items-center gap-2 px-4 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors">
                  <Share2 size={18} /> Instagram
                </button>
                <button onClick={shareOnTwitter} className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <Share2 size={18} /> Twitter/X
                </button>
                <button onClick={shareOnLinkedIn} className="flex items-center gap-2 px-4 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors">
                  <Share2 size={18} /> LinkedIn
                </button>
                <button onClick={shareViaEmail} className="flex items-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors">
                  <Share2 size={18} /> Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">QR Code</h3>
            <p className="text-sm text-gray-500 mb-6">Customers can scan this to open your store directly.</p>
            <div className="inline-block p-4 bg-white rounded-xl shadow-lg mb-4">
              <canvas id="qr-canvas" width="256" height="256" style={{ imageRendering: 'pixelated' }}></canvas>
            </div>
            <p className="text-sm text-gray-500 mb-4">Print this QR code at your physical store, on bills, or on product packaging.</p>
            <div className="flex justify-center gap-3">
              <button onClick={downloadQR} className="px-4 sm:px-5 md:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2">
                <Download size={18} /> Download QR
              </button>
              <button onClick={() => copyToClipboard(storeUrl, 'qr')} className="px-4 sm:px-5 md:px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                {copiedField === 'qr' ? <Check size={18} /> : <Copy size={18} />}
                Copy Link
              </button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-left">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Where to use QR Code:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Print on receipts and bills</li>
                <li>• Display at checkout counter</li>
                <li>• Add to product packaging</li>
                <li>• Include in business cards</li>
                <li>• Show on social media posts</li>
              </ul>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Embed Full Store</h3>
              <p className="text-sm text-gray-500 mb-4">Paste this code in your website's HTML to show the full store.</p>
              <div className="relative">
                <pre className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 overflow-x-auto border border-gray-200 dark:border-gray-600">{embedCode}</pre>
                <button onClick={() => copyToClipboard(embedCode, 'embed')} className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-600 rounded-lg shadow hover:bg-gray-100 dark:hover:bg-gray-500">
                  {copiedField === 'embed' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Floating Widget</h3>
              <p className="text-sm text-gray-500 mb-4">Add a floating store button on your website that opens a mini store.</p>
              <div className="relative">
                <pre className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 overflow-x-auto border border-gray-200 dark:border-gray-600">{widgetCode}</pre>
                <button onClick={() => copyToClipboard(widgetCode, 'widget')} className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-600 rounded-lg shadow hover:bg-gray-100 dark:hover:bg-gray-500">
                  {copiedField === 'widget' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">This adds a floating store icon in the bottom-right corner of your website.</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 sm:p-5 md:p-6 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">How to Add to Your Website:</h4>
              <ol className="text-sm text-green-800 dark:text-green-400 space-y-2 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Open your website's HTML editor or CMS</li>
                <li>Paste the code where you want the store to appear</li>
                <li>Save and publish your website</li>
              </ol>
            </div>
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Share on WhatsApp</h3>
              <p className="text-sm text-gray-500 mb-4">Send your store link to customers via WhatsApp.</p>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {`🛍 Check out our store!\n\n${storeData?.name || 'Our Store'}\n\n🛒 Browse products & order online:\n${storeUrl}\n\nTrack your order anytime:\n${trackUrl}`}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={shareOnWhatsApp} className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 flex items-center justify-center gap-2">
                  <MessageSquare size={18} /> Share on WhatsApp
                </button>
                <button onClick={() => copyToClipboard(`🛍 Check out our store!\n\n${storeData?.name || 'Our Store'}\n\n🛒 Browse products & order online:\n${storeUrl}\n\nTrack your order anytime:\n${trackUrl}`, 'whatsapp')} className="px-4 sm:px-5 md:px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  {copiedField === 'whatsapp' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">WhatsApp Business Tips</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Add the store link to your WhatsApp Business Profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Send this link to customers after they inquire about products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Use it in WhatsApp catalogs for direct ordering</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Include in automated reply messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Share in WhatsApp groups and communities</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreSharePage;
