import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Layout, Loader2, Smartphone, Monitor, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';
import { funnelAPI } from '../lib/api';
import { useToast } from './Toast';

interface FunnelPreviewData {
  html: string;
  funnel: {
    id: string;
    name: string;
    pages: number;
  };
}

type DeviceMode = 'desktop' | 'mobile';

export default function FunnelPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [previewData, setPreviewData] = useState<FunnelPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [funnelName, setFunnelName] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadPreview = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await funnelAPI.preview(id);
      const data = res.data?.data || res.data;
      if (data?.html) {
        setPreviewData(data);
        setFunnelName(data.funnel?.name || 'Funnel Preview');
        setPageCount(data.funnel?.pages || 0);
        setCurrentPage(0);
      } else {
        setError('No preview HTML available');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load preview';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // Navigate between pages
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(pageCount - 1, prev + 1));
  };

  // Copy preview URL
  const handleCopyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toastSuccess('Preview URL copied!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toastError('Failed to copy URL');
    });
  };

  // Open preview as raw HTML in new tab
  const handleOpenPublic = () => {
    if (id) {
      window.open(`/api/funnels/${id}/preview?format=html`, '_blank');
    }
  };

  // Generate page-specific HTML with navigation
  const generatePageHtml = useCallback(() => {
    if (!previewData?.html) return '<p>No preview available</p>';

    // We split by funnel-page divs to navigate between them
    // The backend renders all pages stacked; we isolate the current one
    const parser = new DOMParser();
    const doc = parser.parseFromString(previewData.html, 'text/html');
    const pages = doc.querySelectorAll('.funnel-page');

    if (pages.length === 0) return previewData.html;

    const currentPageEl = pages[currentPage];
    if (!currentPageEl) return '<p>Page not found</p>';

    // Extract head content (styles)
    const styles = doc.querySelectorAll('style');
    const styleHtml = Array.from(styles).map(s => s.outerHTML).join('\n');

    // Extract body content (just the current page)
    const bodyContent = currentPageEl.outerHTML;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${funnelName} - Page ${currentPage + 1}</title>
        ${styleHtml}
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 background: #ffffff; min-height: 100vh; }
          .funnel-page { padding: 2rem; max-width: 100%; }
          @media (max-width: 640px) {
            .funnel-page { padding: 1rem; }
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
      </html>
    `;
  }, [previewData, currentPage, funnelName]);

  // Update iframe content when page changes
  useEffect(() => {
    if (!iframeRef.current || !previewData) return;
    const html = generatePageHtml();
    const iframe = iframeRef.current;
    iframe.srcdoc = html;
  }, [generatePageHtml, previewData, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center max-w-md">
          <Layout size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Preview Unavailable</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/funnels/${id}`)}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Back to Editor
            </button>
            <button
              onClick={loadPreview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* TOP BAR — Clean, minimal preview chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/funnels/${id}`)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Back to Editor"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Eye size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{funnelName}</h1>
            <p className="text-[11px] text-gray-500">Preview mode</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Page navigation */}
          {pageCount > 1 && (
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-gray-400 font-medium min-w-[60px] text-center">
                Page {currentPage + 1} / {pageCount}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= pageCount - 1}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Mobile indicator */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 text-[11px] text-gray-500">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </span>

          {/* Device toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-md transition-colors ${deviceMode === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Desktop view"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-md transition-colors ${deviceMode === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Mobile view"
            >
              <Smartphone size={14} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={loadPreview}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh preview"
          >
            <RefreshCw size={14} />
          </button>

          {/* Copy URL */}
          <button
            onClick={handleCopyUrl}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors relative"
            title="Copy preview URL"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {/* Open in new tab */}
          <button
            onClick={handleOpenPublic}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </button>

          {/* Back to Editor */}
          <button
            onClick={() => navigate(`/funnels/${id}`)}
            className="ml-1 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/30"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Page navigation (mobile) */}
      {pageCount > 1 && (
        <div className="sm:hidden flex items-center justify-between px-4 py-1.5 bg-gray-900 border-b border-gray-800">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <span className="text-xs text-gray-500 font-medium">
            {currentPage + 1} / {pageCount}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= pageCount - 1}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* IFRAME CONTENT */}
      <div className="flex-1 flex items-start justify-center overflow-auto bg-gray-900 p-2 sm:p-4">
        <div
          className={`bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
            deviceMode === 'mobile' ? 'w-[375px] max-w-full' : 'w-full max-w-5xl'
          }`}
          style={{ minHeight: deviceMode === 'mobile' ? '812px' : '600px' }}
        >
          <iframe
            ref={iframeRef}
            title="Funnel Preview"
            className="w-full h-full min-h-[600px] md:min-h-[800px]"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{ border: 'none' }}
          />
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Eye size={12} />
          <span>Preview — not publicly accessible</span>
        </div>
        <span className="text-[11px] text-gray-600">
          {deviceMode === 'mobile' ? '375 × 812' : 'Responsive'}
        </span>
      </div>
    </div>
  );
}
