import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Search, Sparkles, Layout, TrendingUp, Users, ShoppingCart, Calendar, FileText, Eye, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import { funnelAPI } from '../lib/api';
import { useToast } from './Toast';

interface FunnelTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail?: string | null;
  content: any;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  lead_generation: { label: 'Lead Gen', icon: Users, color: 'bg-blue-500' },
  sales: { label: 'Sales', icon: TrendingUp, color: 'bg-green-500' },
  webinar: { label: 'Webinar', icon: Calendar, color: 'bg-purple-500' },
  event: { label: 'Event', icon: Calendar, color: 'bg-orange-500' },
  product_launch: { label: 'Product Launch', icon: Sparkles, color: 'bg-pink-500' },
  consultation: { label: 'Consultation', icon: Users, color: 'bg-teal-500' },
  general: { label: 'General', icon: Layout, color: 'bg-gray-500' },
  default: { label: 'Other', icon: FileText, color: 'bg-indigo-500' },
};

const STAGE_META: Record<string, { label: string; icon: any; color: string }> = {
  landing: { label: 'Landing', icon: Eye, color: 'text-blue-500', },
  opt_in: { label: 'Opt-In', icon: CheckCircle, color: 'text-purple-500', },
  sales: { label: 'Sales', icon: ShoppingCart, color: 'text-green-500', },
  checkout: { label: 'Checkout', icon: Copy, color: 'text-orange-500', },
  thank_you: { label: 'Thank You', icon: ChevronRight, color: 'text-teal-500', },
};

interface FunnelTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FunnelTemplatePicker({ isOpen, onClose }: FunnelTemplatePickerProps) {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [templates, setTemplates] = useState<FunnelTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Custom name modal
  const [customNameModal, setCustomNameModal] = useState<{ template: FunnelTemplate; open: boolean }>({ template: null as any, open: false });
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await funnelAPI.getTemplates();
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setTemplates(data);
      } else if (data?.templates) {
        setTemplates(data.templates);
      } else {
        setTemplates([]);
      }
    } catch (err: any) {
      setError('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => cats.add(t.category || 'default'));
    return Array.from(cats);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (selectedCategory !== 'all') {
      list = list.filter(t => (t.category || 'default') === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [templates, selectedCategory, searchQuery]);

  const handleQuickClone = async (template: FunnelTemplate) => {
    try {
      setCloningId(template.id);
      const res = await funnelAPI.cloneTemplate(template.id);
      const data = res.data?.data || res.data;
      const funnelId = data?.id;
      if (funnelId) {
        toastSuccess(`"${template.name}" deployed as new funnel!`);
        onClose();
        navigate(`/funnels/${funnelId}`);
      } else {
        toastError('Failed to clone template - no funnel ID returned.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to clone template';
      toastError(msg);
    } finally {
      setCloningId(null);
    }
  };

  const handleNamedClone = async () => {
    if (!customNameModal.template || !customName.trim()) return;
    const template = customNameModal.template;
    try {
      setCloningId(template.id);
      const res = await funnelAPI.cloneTemplate(template.id, { name: customName.trim() });
      const data = res.data?.data || res.data;
      const funnelId = data?.id;
      if (funnelId) {
        toastSuccess(`"${customName.trim()}" created!`);
        setCustomNameModal({ template: null as any, open: false });
        setCustomName('');
        onClose();
        navigate(`/funnels/${funnelId}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to clone template';
      toastError(msg);
    } finally {
      setCloningId(null);
    }
  };

  if (!isOpen) return null;

  // Custom name sub-modal
  if (customNameModal.open && customNameModal.template) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[210] p-0 sm:p-4" onClick={() => { setCustomNameModal({ template: null as any, open: false }); setCustomName(''); }}>
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Name Your Funnel</h3>
            <p className="text-sm text-gray-500 mt-1">Give your cloned funnel a custom name</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Funnel Name</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={customNameModal.template.name}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleNamedClone(); }}
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Layout size={18} className="text-white" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">{customNameModal.template.name}</span>
                <p>Based on template</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={() => { setCustomNameModal({ template: null as any, open: false }); setCustomName(''); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleNamedClone}
              disabled={cloningId === customNameModal.template.id || !customName.trim()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all"
            >
              {cloningId === customNameModal.template.id ? <Loader2 className="animate-spin" size={16} /> : <Copy size={16} />}
              Clone Funnel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={20} className="text-purple-500" />
              Funnel Templates
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Choose a pre-built template or start from scratch</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Category Tabs + Search */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              All Templates
            </button>
            {categories.map(cat => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.default;
              const Icon = meta.icon;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <Icon size={14} />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="relative flex-shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-48 pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && filteredTemplates.length === 0 && (
            <div className="text-center py-16">
              <Layout size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {searchQuery ? 'No matching templates' : 'No templates available'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'Try a different search term' : 'Templates will appear here once created'}
              </p>
            </div>
          )}

          {!loading && !error && filteredTemplates.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => {
                const pageCount = template.content?.pages?.length || 0;
                const pageTypes: string[] = template.content?.pages?.map((p: any) => p.type) || [];
                const meta = CATEGORY_META[template.category] || CATEGORY_META.default;
                const CatIcon = meta.icon;
                const isCloning = cloningId === template.id;

                return (
                  <div
                    key={template.id}
                    className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 flex flex-col"
                  >
                    {/* Thumbnail / Preview */}
                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 relative flex items-center justify-center overflow-hidden">
                      {template.thumbnail ? (
                        <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {pageTypes.slice(0, 4).map((type: string, i: number) => {
                            const stageMeta = STAGE_META[type];
                            if (!stageMeta) return null;
                            const StageIcon = stageMeta.icon;
                            return (
                              <div key={i} className={`w-8 h-8 rounded-lg bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center ${stageMeta.color}`}>
                                <StageIcon size={16} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <button
                          onClick={() => { setCustomNameModal({ template, open: true }); setCustomName(template.name); }}
                          className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center gap-1.5"
                        >
                          <Eye size={14} />
                          Customize Name
                        </button>
                      </div>
                      {/* Category badge */}
                      <span className={`absolute top-2 left-2 text-[10px] font-medium text-white px-1.5 py-0.5 rounded-md ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">{template.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Layout size={12} />
                          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {template.usageCount} uses
                        </span>
                      </div>

                      {/* Stage types as mini badges */}
                      {pageTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {Array.from(new Set(pageTypes)).slice(0, 4).map(type => {
                            const stageMeta = STAGE_META[type];
                            if (!stageMeta) return null;
                            return (
                              <span key={type} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 ${stageMeta.color}`}>
                                {stageMeta.label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-auto">
                        <button
                          onClick={() => handleQuickClone(template)}
                          disabled={isCloning}
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                        >
                          {isCloning ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                          {isCloning ? 'Cloning...' : 'Use Template'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
