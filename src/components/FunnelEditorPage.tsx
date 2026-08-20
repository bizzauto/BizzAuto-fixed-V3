import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Eye, Trash2, Settings,
  Loader2, CheckCircle, Globe,
  Layout, Mail, CreditCard, ThumbsUp, ShoppingCart, FileText,
  BarChart3, TrendingUp, Users, ChevronRight, ChevronLeft,
  ExternalLink, ToggleLeft, ToggleRight, X, Layers,
  type LucideIcon,
} from 'lucide-react';
import { funnelAPI } from '../lib/api';
import { useToast } from './Toast';
import FunnelBlockEditor, { type Block, renderBlocksToHtml } from './FunnelBlockEditor';

// ============================================================
// TYPES
// ============================================================

interface FunnelPage {
  id: string;
  name: string;
  slug: string;
  type: string;
  content: any;
  html?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  customCss?: string;
  customJs?: string;
  conversionScript?: string;
  isPublished: boolean;
  order: number;
  funnelId: string;
}

interface Funnel {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  isActive: boolean;
  pages: FunnelPage[];
}

type PageType = 'landing' | 'opt_in' | 'sales' | 'checkout' | 'thank_you' | 'order_form';

const PAGE_TYPE_META: Record<PageType, { label: string; icon: LucideIcon; color: string; bgColor: string; borderColor: string; description: string }> = {
  landing: { label: 'Landing Page', icon: Layout, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'First touchpoint — capture attention' },
  opt_in: { label: 'Opt-In Page', icon: FileText, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', description: 'Capture leads with forms' },
  sales: { label: 'Sales Page', icon: ShoppingCart, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', description: 'Present offers & pitches' },
  checkout: { label: 'Checkout', icon: CreditCard, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'Process payments' },
  thank_you: { label: 'Thank You Page', icon: ThumbsUp, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', description: 'Post-conversion confirmation' },
  order_form: { label: 'Order Form', icon: Mail, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30', description: 'Collect order details' },
};

const FUNNEL_FLOW: PageType[] = ['landing', 'opt_in', 'sales', 'checkout', 'thank_you'];

// ============================================================
// FUNNEL STAGE NODE (Draggable)
// ============================================================

function FunnelStageNode({ page, index, total, isSelected, onSelect, onMoveUp, onMoveDown }: {
  page: FunnelPage;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: (pageId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const meta = PAGE_TYPE_META[page.type as PageType];
  const Icon = meta?.icon || Layout;

  return (
    <div
      onClick={() => onSelect(page.id)}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/80'
      }`}
    >
      {/* Drag handle */}
      <div className="flex flex-col gap-0.5 text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(index); }} disabled={index === 0}
          className="p-0.5 hover:text-white disabled:opacity-30">
          <ChevronLeft size={10} className="rotate-90" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(index); }} disabled={index === total - 1}
          className="p-0.5 hover:text-white disabled:opacity-30">
          <ChevronLeft size={10} className="-rotate-90" />
        </button>
      </div>

      {/* Icon */}
      <div className={`flex-shrink-0 p-2 rounded-lg ${meta?.bgColor || 'bg-gray-500/10'}`}>
        <Icon size={18} className={meta?.color || 'text-gray-400'} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{page.name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            page.isPublished ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-600/20 text-gray-400'
          }`}>
            {page.isPublished ? 'Live' : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{meta?.label || page.type}</span>
          <span className="text-gray-600">·</span>
          <span className="text-xs text-gray-500">/{page.slug}</span>
        </div>
      </div>

      {/* Stage number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-400">{index + 1}</span>
      </div>
    </div>
  );
}

// ============================================================
// CONVERSION METRICS CARD
// ============================================================

function ConversionMetricsCard({ label, value, change, icon: Icon, color }: {
  label: string; value: string; change?: string; icon: LucideIcon; color: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {change && (
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp size={12} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">{change}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADD PAGE MODAL
// ============================================================

function AddPageModal({ onClose, onAdd }: { onClose: () => void; onAdd: (type: PageType, name?: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-base font-semibold text-white">Add Page</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {FUNNEL_FLOW.map((type) => {
            const meta = PAGE_TYPE_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800/30 hover:bg-gray-700/50 hover:border-gray-600 transition-all text-left group"
              >
                <div className={`p-2 rounded-lg ${meta.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon size={18} className={meta.color} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{meta.label}</div>
                  <div className="text-xs text-gray-400">{meta.description}</div>
                </div>
                <ChevronRight size={16} className="text-gray-500 group-hover:text-gray-300" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN FUNNEL EDITOR PAGE
// ============================================================

export default function FunnelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(true);
  const [activeConfigTab, setActiveConfigTab] = useState<'content' | 'seo' | 'advanced'>('content');
  const [analytics, setAnalytics] = useState<{
    totalViews: number;
    viewsToday: number;
    views30Days: number;
    overallConversionRate: number;
    pages: Array<{
      pageId: string;
      pageName: string;
      pageType: string;
      slug: string;
      order: number;
      views: number;
      uniqueVisitors: number;
      conversionFromPrevious: number | null;
      isPublished: boolean;
    }>;
  } | null>(null);

  const selectedPage = useMemo(
    () => funnel?.pages.find(p => p.id === selectedPageId) || null,
    [funnel, selectedPageId]
  );

  // Load funnel + analytics
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      funnelAPI.get(id),
      funnelAPI.getAnalytics(id),
    ])
      .then(([funnelRes, analyticsRes]) => {
        const funnelData = funnelRes.data?.data || funnelRes.data;
        setFunnel(funnelData);
        if (funnelData.pages?.length > 0) {
          setSelectedPageId(funnelData.pages[0].id);
        }

        const analyticsData = analyticsRes.data?.data || analyticsRes.data;
        if (analyticsData && analyticsData.pages) {
          setAnalytics(analyticsData);
        }
      })
      .catch(() => toastError('Failed to load funnel'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateFunnel = useCallback(async (updates: Partial<Funnel>) => {
    if (!funnel) return;
    setFunnel(prev => prev ? { ...prev, ...updates } : null);
  }, [funnel]);

  const handleUpdatePage = useCallback(async (pageId: string, data: Record<string, any>) => {
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, ...data } : p),
      };
    });
  }, []);

  const handleMovePage = useCallback((fromIndex: number, toIndex: number) => {
    setFunnel(prev => {
      if (!prev) return null;
      const pages = [...prev.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      return { ...prev, pages: pages.map((p, i) => ({ ...p, order: i })) };
    });
  }, []);

  const handleAddPage = useCallback(async (type: PageType) => {
    if (!funnel) return;
    const count = funnel.pages.length;
    const defaultName = `${PAGE_TYPE_META[type].label} ${count + 1}`;
    const defaultSlug = `${type}-${count + 1}`;

    try {
      const res = await funnelAPI.addPage(funnel.id, {
        name: defaultName,
        slug: defaultSlug,
        type,
        content: {},
      });
      const newPage = res.data?.data;
      if (newPage) {
        setFunnel(prev => prev ? { ...prev, pages: [...prev.pages, newPage] } : null);
        setSelectedPageId(newPage.id);
        setShowAddPage(false);
        toastSuccess(`Added ${PAGE_TYPE_META[type].label}`);
      }
    } catch {
      toastError('Failed to add page');
    }
  }, [funnel, toastSuccess, toastError]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    if (!funnel || funnel.pages.length <= 1) {
      toastError('Funnel must have at least one page');
      return;
    }
    try {
      await funnelAPI.deletePage(pageId);
      setFunnel(prev => {
        if (!prev) return null;
        const pages = prev.pages.filter(p => p.id !== pageId).map((p, i) => ({ ...p, order: i }));
        return { ...prev, pages };
      });
      if (selectedPageId === pageId) {
        setSelectedPageId(funnel.pages.find(p => p.id !== pageId)?.id || null);
      }
      toastSuccess('Page deleted');
    } catch {
      toastError('Failed to delete page');
    }
  }, [funnel, selectedPageId, toastSuccess, toastError]);

  const handleSave = useCallback(async () => {
    if (!funnel) return;
    setSaving(true);
    try {        // Save funnel metadata
      await funnelAPI.update(funnel.id, {
        name: funnel.name,
        description: funnel.description,
        domain: funnel.domain,
      });

      // Save each page
      for (const page of funnel.pages) {
        await funnelAPI.updatePage(page.id, {
          name: page.name,
          slug: page.slug,
          content: page.content,
          html: page.html,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoImage: page.seoImage,
          customCss: page.customCss,
          customJs: page.customJs,
          conversionScript: page.conversionScript,
          isPublished: page.isPublished,
          order: page.order,
        });
      }

      toastSuccess('Funnel saved');
    } catch {
      toastError('Failed to save funnel');
    } finally {
      setSaving(false);
    }
  }, [funnel, toastSuccess, toastError]);

  const handleToggleActive = useCallback(async () => {
    if (!funnel) return;
    try {
      await funnelAPI.update(funnel.id, { isActive: !funnel.isActive });
      setFunnel(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      toastSuccess(`Funnel ${funnel.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toastError('Failed to toggle funnel');
    }
  }, [funnel, toastSuccess, toastError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-900">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-900">
        <div className="text-center">
          <Layout size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Funnel not found</p>
          <button onClick={() => navigate('/funnels')} className="mt-4 text-blue-400 hover:text-blue-300">
            Back to Funnels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate('/funnels')}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Layout size={16} className="text-white" />
          </div>
          <input
            type="text"
            value={funnel.name}
            onChange={(e) => handleUpdateFunnel({ name: e.target.value })}
            className="bg-transparent text-white font-semibold text-sm border-none focus:outline-none focus:ring-0 px-1 py-0.5 rounded hover:bg-gray-700 focus:bg-gray-700 transition-colors min-w-0 max-w-[300px]"
          />
          <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            funnel.isActive
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
          }`}>
            {funnel.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {funnel.domain && (
            <a
              href={`https://${funnel.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <ExternalLink size={14} />
              <span>View</span>
            </a>
          )}
          <button
            onClick={handleToggleActive}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors border ${
              funnel.isActive
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {funnel.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => navigate(`/funnels/${funnel.id}/preview`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT - Funnel Canvas */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Conversion Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ConversionMetricsCard
              label="Total Pages"
              value={String(funnel.pages.length)}
              icon={Layout}
              color="bg-blue-500/10 text-blue-400"
            />
            <ConversionMetricsCard
              label="Published"
              value={String(funnel.pages.filter(p => p.isPublished).length)}
              icon={CheckCircle}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <ConversionMetricsCard
              label="Conversion Rate"
              value={analytics ? `${analytics.overallConversionRate}%` : '--'}
              change={analytics && analytics.views30Days > 0 ? `${analytics.views30Days} views (30d)` : undefined}
              icon={BarChart3}
              color="bg-purple-500/10 text-purple-400"
            />
            <ConversionMetricsCard
              label="Total Views"
              value={analytics ? String(analytics.totalViews) : '--'}
              change={analytics && analytics.viewsToday > 0 ? `+${analytics.viewsToday} today` : undefined}
              icon={Users}
              color="bg-amber-500/10 text-amber-400"
            />
          </div>

          {/* Funnel Description */}
          <div>
            <input
              type="text"
              value={funnel.description || ''}
              onChange={(e) => handleUpdateFunnel({ description: e.target.value })}
              placeholder="Add a description for this funnel..."
              className="w-full bg-transparent text-sm text-gray-400 placeholder-gray-600 border-none focus:outline-none focus:ring-0"
            />
          </div>

          {/* Per-Page Analytics */}
          {analytics && analytics.pages.length > 0 && (
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stage Analytics (30 days)</h4>
              <div className="space-y-2">
                {analytics.pages.map((p, idx) => (
                  <div key={p.pageId} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-gray-400">{idx + 1}</span>
                      </span>
                      <span className="text-sm text-gray-300 truncate">{p.pageName}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${p.isPublished ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-600/20 text-gray-400'}`}>
                        {p.isPublished ? 'Live' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                      <span className="text-gray-400">
                        <span className="text-white font-medium">{p.views}</span> views
                      </span>
                      {p.conversionFromPrevious !== null && (
                        <span className={`font-medium ${p.conversionFromPrevious >= 50 ? 'text-emerald-400' : p.conversionFromPrevious >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                          {p.conversionFromPrevious}% conv.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {analytics.pages.length >= 2 && analytics.totalViews > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Overall funnel conversion (first → last stage)</span>
                    <span className={`font-bold ${analytics.overallConversionRate >= 50 ? 'text-emerald-400' : analytics.overallConversionRate >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                      {analytics.overallConversionRate}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage Nodes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Funnel Stages</h3>
              <button
                onClick={() => setShowAddPage(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/30"
              >
                <Plus size={12} />
                <span>Add Stage</span>
              </button>
            </div>

            {funnel.pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-700 rounded-xl bg-gray-800/20">
                <Layout size={36} className="text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">No pages yet</p>
                <p className="text-xs text-gray-600 mt-1">Add your first funnel stage to get started</p>
                <button
                  onClick={() => setShowAddPage(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/30"
                >
                  <Plus size={14} />
                  <span>Add First Stage</span>
                </button>
              </div>
            ) : (
              <>
                {/* Flow arrows between stages */}
                {funnel.pages.map((page, index) => (
                  <React.Fragment key={page.id}>
                    <FunnelStageNode
                      page={page}
                      index={index}
                      total={funnel.pages.length}
                      isSelected={selectedPageId === page.id}
                      onSelect={setSelectedPageId}
                      onMoveUp={(i) => handleMovePage(i, i - 1)}
                      onMoveDown={(i) => handleMovePage(i, i + 1)}
                    />
                    {/* Arrow between stages */}
                    {index < funnel.pages.length - 1 && (
                      <div className="flex justify-center py-1">
                        <div className="flex flex-col items-center text-gray-600">
                          <ChevronRight size={16} className="rotate-90" />
                          <span className="text-[10px]">converts to</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </>
            )}
          </div>

          {/* Funnel domain settings */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Domain Settings</h4>
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-gray-500" />
              <input
                type="text"
                value={funnel.domain || ''}
                onChange={(e) => handleUpdateFunnel({ domain: e.target.value })}
                placeholder="yourdomain.com"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Point your domain to our servers to publish this funnel live.</p>
          </div>
        </div>

        {/* RIGHT - Page Config Panel */}
        {configPanelOpen && selectedPage && (
          <div className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-700 bg-gray-800/50 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Page Settings</h3>
              <button
                onClick={() => setConfigPanelOpen(false)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Config tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveConfigTab('content')}
                className={`flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  activeConfigTab === 'content'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Layers size={12} className="inline mr-1" />
                Content
              </button>
              <button
                onClick={() => setActiveConfigTab('seo')}
                className={`flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  activeConfigTab === 'seo'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                SEO
              </button>
              <button
                onClick={() => setActiveConfigTab('advanced')}
                className={`flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  activeConfigTab === 'advanced'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Code
              </button>
            </div>

            {activeConfigTab === 'content' && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Page Content</h4>
                  <span className="text-[10px] text-gray-500">{(selectedPage.content?.blocks || []).length} blocks</span>
                </div>
                <FunnelBlockEditor
                  blocks={selectedPage.content?.blocks || []}
                  onChange={(blocks) => {
                    handleUpdatePage(selectedPage.id, {
                      content: { ...(selectedPage.content || {}), blocks },
                      html: renderBlocksToHtml(blocks),
                    });
                  }}
                />
              </div>
            )}

            {activeConfigTab === 'seo' && (
              <div className="p-3 space-y-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">SEO & Sharing</h4>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={selectedPage.seoTitle || ''}
                    onChange={(e) => handleUpdatePage(selectedPage.id, { seoTitle: e.target.value })}
                    placeholder="Page title for search engines"
                    className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Meta Description</label>
                  <textarea
                    value={selectedPage.seoDescription || ''}
                    onChange={(e) => handleUpdatePage(selectedPage.id, { seoDescription: e.target.value })}
                    placeholder="Meta description for search results"
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">OG Image URL</label>
                  <input
                    type="url"
                    value={selectedPage.seoImage || ''}
                    onChange={(e) => handleUpdatePage(selectedPage.id, { seoImage: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                    className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {activeConfigTab === 'advanced' && (
              <div className="p-3 space-y-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Custom Code</h4>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Custom CSS</label>
                  <textarea
                    value={selectedPage.customCss || ''}
                    onChange={(e) => handleUpdatePage(selectedPage.id, { customCss: e.target.value })}
                    placeholder="/* Custom styles */"
                    rows={4}
                    className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Custom JS</label>
                  <textarea
                    value={selectedPage.customJs || ''}
                    onChange={(e) => handleUpdatePage(selectedPage.id, { customJs: e.target.value })}
                    placeholder="// Custom JavaScript"
                    rows={4}
                    className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Conversion Script</label>
                  <textarea
                    value={selectedPage.conversionScript || ''}
                    onChange={(e) => handleUpdatePage(selectedPage.id, { conversionScript: e.target.value })}
                    placeholder="<script>fbq('track', 'Lead');</script>"
                    rows={3}
                    className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* Page name + publish toggle at bottom */}
            <div className="p-3 border-t border-gray-700 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const PageIcon = PAGE_TYPE_META[selectedPage.type as PageType]?.icon || Layout;
                  const pageColor = PAGE_TYPE_META[selectedPage.type as PageType]?.color || 'text-gray-400';
                  return (
                    <div className={`p-1 rounded-lg ${PAGE_TYPE_META[selectedPage.type as PageType]?.bgColor || 'bg-gray-500/10'}`}>
                      <PageIcon size={12} className={pageColor} />
                    </div>
                  );
                })()}
                <span className="text-xs text-gray-500">{PAGE_TYPE_META[selectedPage.type as PageType]?.label || selectedPage.type}</span>
              </div>
              <button
                onClick={() => handleUpdatePage(selectedPage.id, { isPublished: !selectedPage.isPublished })}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  selectedPage.isPublished
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-gray-600/10 text-gray-400 border-gray-600/30 hover:bg-gray-600/20'
                }`}
              >
                {selectedPage.isPublished ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                {selectedPage.isPublished ? 'Published' : 'Draft'}
              </button>
            </div>
          </div>
        )}

        {/* Collapsed config panel */}
        {(!configPanelOpen || !selectedPage) && (
          <div className="w-12 flex-shrink-0 border-l border-gray-700 bg-gray-800/30 flex flex-col items-center py-3 gap-3">
            {selectedPage && (
              <button
                onClick={() => setConfigPanelOpen(true)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Open page settings"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <Settings size={16} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* Add Page Modal */}
      {showAddPage && (
        <AddPageModal
          onClose={() => setShowAddPage(false)}
          onAdd={handleAddPage}
        />
      )}
    </div>
  );
}
