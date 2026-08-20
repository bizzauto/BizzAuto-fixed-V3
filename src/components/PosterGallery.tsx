import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Calendar, Grid3X3, List, Filter,
  ChevronLeft, ChevronRight, RefreshCw, Tag, AlertCircle,
  Clock, ExternalLink, ImageOff, Trash2,
} from 'lucide-react';
import { postersAPI } from '../lib/api';
import ConfirmDialog from './ConfirmDialog';

interface PosterItem {
  id: string;
  name: string;
  url: string;
  thumbnail: string | null;
  category: string;
  tags: string[];
  prompt: string | null;
  metadata: any;
  generatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIES = ['all', 'Festival', 'Offer', 'Product', 'Seasonal', 'social', 'whatsapp', 'flyer', 'poster'];

const CATEGORY_EMOJIS: Record<string, string> = {
  Festival: '🎉',
  Offer: '🎁',
  Product: '📦',
  Seasonal: '🌷',
  social: '📱',
  whatsapp: '💬',
  flyer: '📄',
  poster: '🖼',
};

const PosterGallery: React.FC = () => {
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<PosterItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPosters = useCallback(async (page: number, cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 20 };
      if (cat !== 'all') params.category = cat;
      const res = await postersAPI.generated(params);
      const data = res.data;
      if (data.success) {
        setPosters(data.data || []);
        setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
      } else {
        setError(data.error || 'Failed to load posters');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load posters');
      setPosters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchPosters(1, category).then(() => {
      if (active) setBrokenImages(new Set());
    });
    return () => { active = false; };
  }, [category, fetchPosters]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchPosters(newPage, category);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await postersAPI.deleteGenerated(deleteTarget.id);
      setPosters(prev => prev.filter(p => p.id !== deleteTarget.id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const markBroken = (id: string) => {
    setBrokenImages(prev => new Set(prev).add(id));
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const canShowImage = (poster: PosterItem) =>
    (poster.thumbnail || poster.url) && !brokenImages.has(poster.id);

  // Loading skeleton
  if (loading && posters.length === 0) {
    return (
      <div className="p-4 sm:p-5 md:p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-48 skeleton-animate rounded-lg mb-2" />
            <div className="h-4 w-32 skeleton-animate rounded-lg" />
          </div>
          <div className="h-10 w-24 skeleton-animate rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="modern-card rounded-xl overflow-hidden">
              <div className="aspect-square skeleton-animate" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 skeleton-animate rounded" />
                <div className="h-3 w-1/2 skeleton-animate rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <ImageOff size={20} className="text-white" />
            </div>
            Generated Posters
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total > 0
              ? `${pagination.total} poster${pagination.total !== 1 ? 's' : ''} created`
              : 'Browse your AI-generated posters'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              title="Grid view"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => fetchPosters(pagination.page, category)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter size={16} className="text-gray-400 mr-1" />
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              category === cat
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat === 'all' ? 'All' : `${CATEGORY_EMOJIS[cat] || ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="modern-card rounded-xl p-4 sm:p-5 md:p-6 mb-6 border border-red-200 dark:border-red-800/30">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle size={20} />
            <div>
              <p className="font-medium">Failed to load posters</p>
              <p className="text-sm text-red-500 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posters.length === 0 && (
        <div className="modern-card rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center">
            <ImageOff size={40} className="text-purple-400 dark:text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No posters yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Generate your first AI poster to see it here. Head over to the Creative Studio to get started.
          </p>
          <button
            onClick={() => window.location.href = '/creative'}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            Create a Poster
          </button>
        </div>
      )}

      {/* Posters Grid */}
      {posters.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-children">
              {posters.map(poster => (
                <div
                  key={poster.id}
                  className="group modern-card rounded-xl overflow-hidden card-futuristic"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
                    {canShowImage(poster) ? (
                      <>
                        <img
                          src={poster.thumbnail || poster.url}
                          alt={poster.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={() => markBroken(poster.id)}
                        />
                        {/* Hover overlay — download, view & delete */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleDownload(poster.url)}
                            className="p-2.5 bg-white/90 hover:bg-white rounded-xl transition-all transform hover:scale-105"
                            title="Download"
                          >
                            <Download size={18} className="text-gray-900" />
                          </button>
                          <a
                            href={poster.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-white/90 hover:bg-white rounded-xl transition-all transform hover:scale-105"
                            title="Open in new tab"
                          >
                            <ExternalLink size={18} className="text-gray-900" />
                          </a>
                          <button
                            onClick={() => setDeleteTarget(poster)}
                            className="p-2.5 bg-red-500/90 hover:bg-red-500 rounded-xl transition-all transform hover:scale-105"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-white" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-1">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                          <span className="text-[10px]">No preview</span>
                        </div>
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 rounded-lg backdrop-blur-sm">
                        {poster.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1" title={poster.name}>
                      {poster.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={11} />
                        {formatDate(poster.generatedAt)}
                      </div>
                      {poster.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag size={10} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[60px]">
                            {poster.tags.slice(0, 2).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="modern-card rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {posters.map(poster => (
                  <div
                    key={poster.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex-shrink-0">
                      {canShowImage(poster) ? (
                        <img
                          src={poster.thumbnail || poster.url}
                          alt={poster.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => markBroken(poster.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {poster.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(poster.generatedAt)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          {poster.category}
                        </span>
                        {poster.prompt && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                            &quot;{poster.prompt}&quot;
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={poster.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Open"
                      >
                        <ExternalLink size={16} className="text-gray-500" />
                      </a>
                      <button
                        onClick={() => handleDownload(poster.url)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(poster)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    if (p === 1 || p === pagination.totalPages) return true;
                    if (Math.abs(p - pagination.page) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-400 dark:text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(p)}
                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                          p === pagination.page
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}
        </>
      )}

        {/* Delete confirmation */}
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete Poster"
          message={`Are you sure you want to delete "${deleteTarget?.name || ''}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
    </div>
  );
}

export default PosterGallery;

