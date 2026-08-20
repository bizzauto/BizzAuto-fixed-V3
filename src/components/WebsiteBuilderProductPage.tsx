import { useState, useEffect } from 'react';
import { Globe, Plus, Eye, Edit3, Trash2, Smartphone, Monitor, ArrowRight, Copy, Check, Layout, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

interface Website {
  id: string;
  name: string;
  slug: string;
  template: string;
  status: 'published' | 'draft';
  views: number;
  leads: number;
  createdAt: string;
  customDomain?: string;
  blocks?: any[];
}

const websiteTemplates = [
  { id: 'business', name: 'Business', icon: '💼', color: 'from-blue-500 to-blue-700', pages: 8 },
  { id: 'restaurant', name: 'Restaurant', icon: '🍕', color: 'from-orange-500 to-red-500', pages: 6 },
  { id: 'portfolio', name: 'Portfolio', icon: '🎨', color: 'from-purple-500 to-pink-500', pages: 5 },
  { id: 'ecommerce', name: 'E-Commerce', icon: '🛒', color: 'from-green-500 to-emerald-500', pages: 10 },
  { id: 'landing', name: 'Landing Page', icon: '🚀', color: 'from-cyan-500 to-blue-500', pages: 3 },
  { id: 'blog', name: 'Blog', icon: '📝', color: 'from-amber-500 to-orange-500', pages: 7 },
  { id: 'clinic', name: 'Clinic', icon: '🏥', color: 'from-teal-500 to-cyan-500', pages: 6 },
  { id: 'realestate', name: 'Real Estate', icon: '🏠', color: 'from-indigo-500 to-purple-500', pages: 8 },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: 'from-red-500 to-pink-500', pages: 5 },
];

const blockTypes = [
  { type: 'hero', name: 'Hero Section', icon: '🎯' },
  { type: 'features', name: 'Features', icon: '✨' },
  { type: 'testimonials', name: 'Testimonials', icon: '💬' },
  { type: 'pricing', name: 'Pricing', icon: '💰' },
  { type: 'cta', name: 'Call to Action', icon: '📢' },
  { type: 'form', name: 'Lead Form', icon: '📝' },
  { type: 'faq', name: 'FAQ', icon: '❓' },
  { type: 'contact', name: 'Contact', icon: '📞' },
  { type: 'gallery', name: 'Gallery', icon: '🖼️' },
  { type: 'team', name: 'Team', icon: '👥' },
];

export default function WebsiteBuilderProductPage() {
  const toast = useToast();
  const [view, setView] = useState<'websites' | 'templates' | 'editor'>('websites');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('business');
  const [editingWebsite, setEditingWebsite] = useState<string | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(['hero', 'features', 'cta', 'form']);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showCreate, setShowCreate] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', slug: '', template: 'business' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { loadWebsites(); }, []);

  const loadWebsites = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/websites');
      const data = await res.json();
      if (data.success) setWebsites(data.data.websites);
    } catch { toast.error('Failed to load websites'); }
    finally { setLoading(false); }
  };

  const totalViews = websites.reduce((a, b) => a + b.views, 0);
  const totalLeads = websites.reduce((a, b) => a + b.leads, 0);

  const createWebsite = async () => {
    if (!newSite.name.trim()) { toast.error('Name is required'); return; }
    try {
      setSaving(true);
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSite.name, slug: newSite.slug, template: newSite.template, blocks: [] }),
      });
      const data = await res.json();
      if (data.success) {
        setWebsites(prev => [data.data.website, ...prev]);
        setShowCreate(false);
        setNewSite({ name: '', slug: '', template: 'business' });
        toast.success('Website created!');
      } else { toast.error(data.error || 'Failed to create'); }
    } catch { toast.error('Failed to create website'); }
    finally { setSaving(false); }
  };

  const deleteWebsite = async (id: string) => {
    try {
      const res = await fetch(`/api/websites/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setWebsites(prev => prev.filter(w => w.id !== id));
        toast.success('Website deleted');
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to delete'); }
  };

  const publishWebsite = async (id: string) => {
    try {
      const res = await fetch(`/api/websites/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWebsites(prev => prev.map(w => w.id === id ? { ...w, status: 'published' } : w));
        toast.success('Website published!');
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to publish'); }
  };

  const saveWebsiteBlocks = async (id: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: selectedBlocks }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Website saved!');
        setEditingWebsite(null);
        setView('websites');
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard?.writeText(`${window.location.origin}/api/websites/public/${slug}`);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Link copied!');
  };

  const addBlock = (type: string) => {
    if (!selectedBlocks.includes(type)) {
      setSelectedBlocks(prev => [...prev, type]);
      toast.success('Block added!');
    }
  };

  const removeBlock = (type: string) => {
    setSelectedBlocks(prev => prev.filter(b => b !== type));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-teal-500" size={32} /><span className="ml-2 text-gray-500">Loading websites...</span></div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Globe className="text-teal-500" /> Website Builder</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Build beautiful single-page websites in minutes — no coding required</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"><Plus size={18} /> New Website</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Websites', value: websites.length, icon: <Globe size={20} className="text-teal-500" /> },
          { label: 'Total Views', value: totalViews.toLocaleString(), icon: <Eye size={20} className="text-blue-500" /> },
          { label: 'Leads Generated', value: totalLeads.toLocaleString(), icon: <ArrowRight size={20} className="text-green-500" /> },
          { label: 'Published', value: websites.filter(w => w.status === 'published').length, icon: <Check size={20} className="text-purple-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'websites', label: 'My Websites', icon: <Globe size={16} /> },
          { id: 'templates', label: 'Templates', icon: <Layout size={16} /> },
          { id: 'editor', label: 'Editor', icon: <Edit3 size={16} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id as typeof view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${view === tab.id ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {view === 'websites' && (
        websites.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <Globe size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No websites yet. Create your first website!</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"><Plus size={16} className="inline mr-1" /> New Website</button>
          </div>
        ) : (
          <div className="space-y-4">
            {websites.map(site => {
              const tmpl = websiteTemplates.find(t => t.id === site.template);
              return (
                <div key={site.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tmpl?.color || 'from-teal-500 to-cyan-500'} flex items-center justify-center text-2xl`}>{tmpl?.icon || '🌐'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{site.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${site.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{site.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{site.customDomain || `${site.slug}.bizzauto.com`}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500"><span>{site.views.toLocaleString()} views</span><span>{site.leads} leads</span><span>Created {new Date(site.createdAt).toLocaleDateString()}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingWebsite(site.id); setSelectedBlocks((site.blocks as string[]) || ['hero', 'features', 'cta', 'form']); setView('editor'); }} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"><Edit3 size={14} className="inline mr-1" /> Edit</button>
                    {site.status === 'draft' && <button onClick={() => publishWebsite(site.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Publish</button>}
                    <button onClick={() => copyLink(site.slug)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Copy Link">{copiedId === site.slug ? <Check size={16} /> : <Copy size={16} />}</button>
                    <button onClick={() => deleteWebsite(site.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === 'templates' && (
        <div className="grid md:grid-cols-3 gap-4">
          {websiteTemplates.map(t => (
            <div key={t.id} onClick={() => { setSelectedTemplate(t.id); setNewSite(p => ({ ...p, template: t.id })); setShowCreate(true); }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className={`bg-gradient-to-br ${t.color} h-32 flex items-center justify-center text-5xl`}>{t.icon}</div>
              <div className="p-4"><h3 className="font-semibold">{t.name}</h3><p className="text-sm text-gray-500">{t.pages} pre-built pages</p></div>
            </div>
          ))}
        </div>
      )}

      {view === 'editor' && (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm mb-3">Add Blocks</h3>
            <div className="space-y-2">
              {blockTypes.map(block => (
                <button key={block.type} onClick={() => addBlock(block.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-sm text-left">
                  <span>{block.icon}</span> {block.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Preview</span>
                <div className="flex gap-1">
                  <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' : 'text-gray-400'}`}><Monitor size={16} /></button>
                  <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' : 'text-gray-400'}`}><Smartphone size={16} /></button>
                </div>
              </div>
              <div className={`mx-auto bg-gray-50 dark:bg-gray-900 ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'} min-h-[500px] p-4 transition-all`}>
                {selectedBlocks.map((block, i) => (
                  <div key={block} className="mb-4 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg relative group">
                    <button onClick={() => removeBlock(block)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded text-xs transition-opacity"><Trash2 size={12} /></button>
                    <div className="text-center text-gray-400">
                      <span className="text-2xl">{blockTypes.find(b => b.type === block)?.icon}</span>
                      <p className="text-sm mt-1">{blockTypes.find(b => b.type === block)?.name}</p>
                    </div>
                  </div>
                ))}
                {selectedBlocks.length === 0 && (
                  <div className="text-center text-gray-400 py-20"><Globe size={48} className="mx-auto mb-4 opacity-50" /><p>Add blocks from the left panel to start building</p></div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm mb-3">Page Settings</h3>
            <div className="space-y-3">
              {editingWebsite && (
                <>
                  <button onClick={() => saveWebsiteBlocks(editingWebsite)} disabled={saving} className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center justify-center gap-2">
                    {saving && <Loader2 size={14} className="animate-spin" />} Save & Publish
                  </button>
                  <button onClick={() => publishWebsite(editingWebsite)} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Publish</button>
                </>
              )}
              <button onClick={() => { setEditingWebsite(null); setView('websites'); }} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Back to Websites</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create New Website</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Website Name *" value={newSite.name} onChange={e => setNewSite(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="text" placeholder="Slug (e.g. my-business)" value={newSite.slug} onChange={e => setNewSite(p => ({ ...p, slug: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <div>
                <label className="block text-sm font-medium mb-2">Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {websiteTemplates.slice(0, 6).map(t => (
                    <button key={t.id} onClick={() => setNewSite(p => ({ ...p, template: t.id }))}
                      className={`p-2 rounded-lg border-2 text-center text-xs ${newSite.template === t.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      <span className="text-lg">{t.icon}</span><p className="mt-1">{t.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={createWebsite} disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
