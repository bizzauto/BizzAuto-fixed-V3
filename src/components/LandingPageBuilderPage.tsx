import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { Layout, Plus, Edit, Eye, Trash2, Globe, Palette, Code, Smartphone, Monitor, Loader2 } from 'lucide-react';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: string;
  blocks: string[];
  views: number;
  conversions: number;
  createdAt: string;
}

const blocks = [
  { type: 'hero', name: 'Hero Section', icon: '🎯' },
  { type: 'features', name: 'Features Grid', icon: '✨' },
  { type: 'testimonials', name: 'Testimonials', icon: '💬' },
  { type: 'pricing', name: 'Pricing Table', icon: '💰' },
  { type: 'cta', name: 'Call to Action', icon: '📢' },
  { type: 'form', name: 'Lead Form', icon: '📝' },
  { type: 'faq', name: 'FAQ Accordion', icon: '❓' },
  { type: 'contact', name: 'Contact Info', icon: '📞' },
];

function generateLandingPageHTML(pageName: string, selectedBlocks: string[]): string {
  const blockSections: string[] = [];

  if (selectedBlocks.includes('hero')) {
    blockSections.push(`<section class="bg-gradient-to-br from-pink-500 to-purple-600 text-white py-20 px-6 text-center"><h1 class="text-4xl md:text-5xl font-bold mb-4">${pageName}</h1><p class="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Welcome to our amazing landing page. Discover what makes us different.</p><a href="#cta" class="inline-block px-8 py-3 bg-white text-pink-600 rounded-full font-semibold hover:bg-gray-100 transition">Get Started</a></section>`);
  }
  if (selectedBlocks.includes('features')) {
    blockSections.push(`<section class="py-16 px-6"><h2 class="text-3xl font-bold text-center mb-12">Our Features</h2><div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-8"><div class="text-center p-6 bg-gray-50 rounded-xl"><div class="text-4xl mb-4">⚡</div><h3 class="font-semibold text-lg mb-2">Lightning Fast</h3><p class="text-gray-600">Optimized performance.</p></div><div class="text-center p-6 bg-gray-50 rounded-xl"><div class="text-4xl mb-4">🔒</div><h3 class="font-semibold text-lg mb-2">Secure & Reliable</h3><p class="text-gray-600">Enterprise-grade security.</p></div><div class="text-center p-6 bg-gray-50 rounded-xl"><div class="text-4xl mb-4">🎯</div><h3 class="font-semibold text-lg mb-2">Easy to Use</h3><p class="text-gray-600">Intuitive design.</p></div></div></section>`);
  }
  if (selectedBlocks.includes('testimonials')) {
    blockSections.push(`<section class="py-16 px-6 bg-gray-50"><h2 class="text-3xl font-bold text-center mb-12">What Our Customers Say</h2><div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-6"><div class="bg-white p-6 rounded-xl shadow-sm"><p class="text-gray-600 italic mb-4">"Great product!"</p><div class="flex items-center gap-3"><div class="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">PS</div><div><div class="font-medium text-sm">Priya Sharma</div><div class="text-xs text-gray-400">CEO, TechCorp</div></div></div></div></div></section>`);
  }
  if (selectedBlocks.includes('pricing')) {
    blockSections.push(`<section class="py-16 px-6"><h2 class="text-3xl font-bold text-center mb-12">Simple Pricing</h2><div class="max-w-4xl mx-auto grid md:grid-cols-3 gap-6"><div class="border rounded-xl p-6 text-center"><h3 class="font-semibold text-lg mb-2">Basic</h3><div class="text-3xl font-bold mb-4">₹999<span class="text-sm text-gray-400">/mo</span></div><ul class="text-sm text-gray-600 space-y-2 mb-6"><li>1 Project</li><li>Email Support</li></ul><button class="w-full py-2 border border-pink-600 text-pink-600 rounded-lg hover:bg-pink-50">Choose</button></div><div class="border-2 border-pink-600 rounded-xl p-6 text-center"><div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-600 text-white text-xs px-3 py-1 rounded-full">Popular</div><h3 class="font-semibold text-lg mb-2">Pro</h3><div class="text-3xl font-bold mb-4">₹2,499<span class="text-sm text-gray-400">/mo</span></div><ul class="text-sm text-gray-600 space-y-2 mb-6"><li>10 Projects</li><li>Priority Support</li></ul><button class="w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Choose</button></div><div class="border rounded-xl p-6 text-center"><h3 class="font-semibold text-lg mb-2">Enterprise</h3><div class="text-3xl font-bold mb-4">₹7,999<span class="text-sm text-gray-400">/mo</span></div><ul class="text-sm text-gray-600 space-y-2 mb-6"><li>Unlimited</li><li>Dedicated Support</li></ul><button class="w-full py-2 border border-pink-600 text-pink-600 rounded-lg hover:bg-pink-50">Contact</button></div></div></section>`);
  }
  if (selectedBlocks.includes('cta')) {
    blockSections.push(`<section id="cta" class="py-16 px-6 bg-pink-50 text-center"><h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2><p class="text-gray-600 mb-8 max-w-xl mx-auto">Join thousands of happy customers.</p><a href="#" class="inline-block px-8 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition">Sign Up Free</a></section>`);
  }
  if (selectedBlocks.includes('form')) {
    blockSections.push(`<section class="py-16 px-6"><div class="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border"><h2 class="text-2xl font-bold mb-6 text-center">Get a Free Quote</h2><form class="space-y-4"><input type="text" placeholder="Your Name" class="w-full px-4 py-3 border rounded-lg" /><input type="email" placeholder="Email Address" class="w-full px-4 py-3 border rounded-lg" /><input type="tel" placeholder="Phone Number" class="w-full px-4 py-3 border rounded-lg" /><button type="submit" class="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold">Submit</button></form></div></section>`);
  }
  if (selectedBlocks.includes('faq')) {
    blockSections.push(`<section class="py-16 px-6 bg-gray-50"><h2 class="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2><div class="max-w-3xl mx-auto space-y-4"><details class="bg-white rounded-lg p-4 shadow-sm"><summary class="font-medium cursor-pointer">How do I get started?</summary><p class="mt-3 text-gray-600 text-sm">Simply sign up and follow the steps.</p></details><details class="bg-white rounded-lg p-4 shadow-sm"><summary class="font-medium cursor-pointer">Is there a free trial?</summary><p class="mt-3 text-gray-600 text-sm">Yes! 14-day free trial.</p></details></div></section>`);
  }
  if (selectedBlocks.includes('contact')) {
    blockSections.push(`<section class="py-16 px-6"><h2 class="text-3xl font-bold text-center mb-12">Contact Us</h2><div class="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center"><div><div class="text-3xl mb-3">📍</div><h3 class="font-semibold mb-1">Address</h3><p class="text-sm text-gray-600">Mumbai, India</p></div><div><div class="text-3xl mb-3">📧</div><h3 class="font-semibold mb-1">Email</h3><p class="text-sm text-gray-600">hello@example.com</p></div><div><div class="text-3xl mb-3">📞</div><h3 class="font-semibold mb-1">Phone</h3><p class="text-sm text-gray-600">+91 98765 43210</p></div></div></section>`);
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${pageName}</title><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style></head><body>${blockSections.join('\n')}<footer class="py-8 px-6 bg-gray-900 text-white text-center text-sm"><p>&copy; 2026 ${pageName}. All rights reserved.</p></footer></body></html>`;
}

export default function LandingPageBuilderPage() {
  const toast = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/landing-pages?limit=50', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setPages(data.data.pages);
    } catch { toast.error('Failed to load pages'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const addBlock = (type: string) => {
    if (!selectedBlocks.includes(type)) { setSelectedBlocks(prev => [...prev, type]); toast.success('Block added!'); }
  };

  const removeBlock = (type: string) => setSelectedBlocks(prev => prev.filter(b => b !== type));

  const createNewPage = async () => {
    if (!newPageName.trim()) { toast.error('Page name required'); return; }
    try {
      setSaving(true);
      const slug = newPageName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const res = await fetch('/api/landing-pages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name: newPageName, slug, blocks: [], status: 'DRAFT' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false); setNewPageName('');
        setEditingPageId(data.data.id); setSelectedBlocks([]); setEditing(true);
        fetchPages(); toast.success('Page created!');
      } else { toast.error(data.error || 'Failed to create page'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const savePage = async () => {
    if (!editingPageId) return;
    try {
      setSaving(true);
      const html = generateLandingPageHTML(pages.find(p => p.id === editingPageId)?.name || 'Page', selectedBlocks);
      const res = await fetch(`/api/landing-pages/${editingPageId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ blocks: selectedBlocks, html }),
      });
      const data = await res.json();
      if (data.success) { fetchPages(); toast.success('Page saved!'); }
      else { toast.error(data.error || 'Failed to save'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const publishPage = async () => {
    if (!editingPageId) { toast.error('Select a page first'); return; }
    if (selectedBlocks.length === 0) { toast.error('Add at least one block'); return; }
    try {
      setSaving(true);
      const page = pages.find(p => p.id === editingPageId);
      if (!page) return;
      const html = generateLandingPageHTML(page.name, selectedBlocks);
      const res = await fetch(`/api/landing-pages/${editingPageId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ blocks: selectedBlocks, html, status: 'PUBLISHED' }),
      });
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([html], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
        fetchPages(); toast.success('Page published!');
      } else { toast.error(data.error || 'Failed to publish'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Delete this landing page?')) return;
    try {
      const res = await fetch(`/api/landing-pages/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { fetchPages(); toast.success('Page deleted'); }
      else { toast.error(data.error || 'Failed to delete'); }
    } catch { toast.error('Network error'); }
  };

  const selectPage = (page: LandingPage) => {
    setEditingPageId(page.id);
    setSelectedBlocks(page.blocks || []);
    setEditing(true);
  };

  const currentPage = pages.find(p => p.id === editingPageId);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Layout className="text-pink-600" /> Landing Page Builder
          </h1>
          <p className="text-gray-600 mt-1">Drag-and-drop builder for high-converting pages</p>
        </div>
        <div className="flex gap-2">
          {editing && (
            <>
              <button onClick={savePage} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Edit size={16} />} Save
              </button>
              <button onClick={publishPage} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg">
                <Globe size={16} /> Publish
              </button>
            </>
          )}
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Plus size={18} /> New Page
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-pink-600" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {editing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Add Blocks</h3>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <button key={block.type} onClick={() => addBlock(block.type)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${selectedBlocks.includes(block.type) ? 'bg-pink-100 text-pink-700' : 'bg-gray-50 hover:bg-pink-50'}`}>
                    <span>{block.icon}</span> {block.name}
                    {selectedBlocks.includes(block.type) && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`${editing ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                <div className="flex gap-2">
                  <button onClick={() => setPreviewMode('desktop')} className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}><Monitor size={16} /></button>
                  <button onClick={() => setPreviewMode('mobile')} className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}><Smartphone size={16} /></button>
                </div>
                <span className="text-xs text-gray-500">{currentPage ? currentPage.name : 'Preview'}</span>
              </div>
              <div className={`mx-auto ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'} p-0 min-h-[400px]`}>
                {selectedBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                    <Layout size={48} className="mb-4 opacity-30" />
                    <p className="text-lg font-medium">No blocks added yet</p>
                    <p className="text-sm mt-1">Click blocks from the palette to build your page</p>
                  </div>
                ) : (
                  <div className="space-y-4 p-4">
                    {selectedBlocks.includes('hero') && (
                      <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white p-8 text-center rounded-lg">
                        <h2 className="text-2xl font-bold mb-2">{currentPage?.name || 'Your Headline'}</h2>
                        <p className="text-white/80 mb-4">Welcome to your landing page</p>
                        <button className="px-6 py-2 bg-white text-pink-600 rounded-full font-semibold">Get Started →</button>
                      </div>
                    )}
                    {selectedBlocks.includes('features') && (
                      <div className="grid grid-cols-3 gap-4">
                        {['Fast', 'Secure', 'Easy'].map((f, i) => (
                          <div key={i} className="text-center p-4 bg-gray-50 rounded-lg"><div className="text-2xl mb-2">✨</div><div className="text-sm font-medium">{f}</div></div>
                        ))}
                      </div>
                    )}
                    {selectedBlocks.includes('pricing') && (
                      <div className="grid grid-cols-3 gap-4">
                        {[{ n: 'Basic', p: '₹999' }, { n: 'Pro', p: '₹2,499' }, { n: 'Enterprise', p: '₹7,999' }].map((plan, i) => (
                          <div key={i} className={`text-center p-4 rounded-lg border ${i === 1 ? 'border-pink-500 bg-pink-50' : 'bg-gray-50'}`}>
                            <div className="font-semibold text-sm">{plan.n}</div><div className="text-xl font-bold mt-2">{plan.p}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedBlocks.includes('cta') && (
                      <div className="bg-pink-50 p-6 text-center rounded-lg"><h3 className="font-bold text-lg mb-2">Ready?</h3><button className="px-6 py-2 bg-pink-600 text-white rounded-lg">Sign Up</button></div>
                    )}
                    {selectedBlocks.includes('form') && (
                      <div className="p-4"><div className="bg-white border rounded-lg p-4 max-w-sm mx-auto"><div className="text-sm font-semibold mb-3">Contact</div>
                        <div className="space-y-2"><div className="h-8 bg-gray-100 rounded"></div><div className="h-8 bg-gray-100 rounded"></div><div className="h-8 bg-pink-100 rounded"></div></div>
                      </div></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">My Pages</h3>
            {pages.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Layout size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No pages yet</p></div>
            ) : (
              <div className="space-y-2">
                {pages.map((page) => (
                  <div key={page.id} className={`rounded-lg p-3 cursor-pointer transition ${editingPageId === page.id ? 'bg-pink-50 ring-1 ring-pink-300' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={() => selectPage(page)}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{page.name}</div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${page.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{page.status}</span>
                        <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">/{page.slug}</div>
                    <div className="text-xs text-gray-400 mt-1">{page.views} views</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">Create New Page</h3></div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Name</label>
              <input type="text" value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="My Landing Page"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
            </div>
            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={createNewPage} disabled={saving} className="px-4 py-2 bg-pink-600 text-white rounded-lg flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : null} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}