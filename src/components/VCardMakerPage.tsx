import { useState, useEffect } from 'react';
import { CreditCard, Plus, Eye, Edit3, Trash2, Share2, Smartphone, Palette, Link as LinkIcon, Phone, Mail, Globe, MapPin, Copy, Check, X, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';

interface VCard {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  template: string;
  color: string;
  views: number;
  shares: number;
  status: 'active' | 'draft';
  socialLinks: { platform: string; url: string }[];
}

const templates = [
  { id: 'professional', name: 'Professional', gradient: 'from-blue-600 to-blue-800', accent: '#2563eb' },
  { id: 'creative', name: 'Creative', gradient: 'from-purple-600 to-pink-600', accent: '#9333ea' },
  { id: 'minimal', name: 'Minimal', gradient: 'from-gray-700 to-gray-900', accent: '#374151' },
  { id: 'bold', name: 'Bold', gradient: 'from-red-500 to-orange-500', accent: '#ef4444' },
  { id: 'elegant', name: 'Elegant', gradient: 'from-amber-600 to-yellow-500', accent: '#d97706' },
  { id: 'nature', name: 'Nature', gradient: 'from-emerald-600 to-teal-500', accent: '#059669' },
  { id: 'ocean', name: 'Ocean', gradient: 'from-cyan-500 to-blue-500', accent: '#06b6d4' },
  { id: 'sunset', name: 'Sunset', gradient: 'from-rose-500 to-orange-400', accent: '#f43f5e' },
  { id: 'royal', name: 'Royal', gradient: 'from-indigo-700 to-purple-800', accent: '#4f46e5' },
];

export default function VCardMakerPage() {
  const toast = useToast();
  const [view, setView] = useState<'cards' | 'templates' | 'analytics'>('cards');
  const [cards, setCards] = useState<VCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', title: '', company: '', phone: '', email: '', website: '', address: '', template: 'professional' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vcard');
      const data = await res.json();
      if (data.success) setCards(data.data.cards);
    } catch { toast.error('Failed to load vCards'); }
    finally { setLoading(false); }
  };

  const totalViews = cards.reduce((a, b) => a + b.views, 0);
  const totalShares = cards.reduce((a, b) => a + b.shares, 0);

  const createCard = async () => {
    if (!newCard.name.trim()) { toast.error('Name is required'); return; }
    try {
      setSaving(true);
      const tmpl = templates.find(t => t.id === newCard.template);
      const res = await fetch('/api/vcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCard, color: tmpl?.accent || '#2563eb', socialLinks: [] }),
      });
      const data = await res.json();
      if (data.success) {
        setCards(prev => [data.data.card, ...prev]);
        setShowCreate(false);
        setNewCard({ name: '', title: '', company: '', phone: '', email: '', website: '', address: '', template: 'professional' });
        toast.success('V-Card created!');
      } else { toast.error(data.error || 'Failed to create'); }
    } catch { toast.error('Failed to create vCard'); }
    finally { setSaving(false); }
  };

  const deleteCard = async (id: string) => {
    try {
      const res = await fetch(`/api/vcard/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCards(prev => prev.filter(c => c.id !== id));
        toast.success('V-Card deleted');
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to delete'); }
  };

  const updateCard = async (id: string, updates: Partial<VCard>) => {
    try {
      const res = await fetch(`/api/vcard/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        setEditing(null);
        toast.success('V-Card updated');
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to update'); }
  };

  const copyLink = (id: string) => {
    navigator.clipboard?.writeText(`${window.location.origin}/api/vcard/public/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Link copied!');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-indigo-500" size={32} /><span className="ml-2 text-gray-500">Loading vCards...</span></div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <CreditCard className="text-indigo-500" /> Digital V-Card Maker
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create stunning digital business cards with NFC support</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={18} /> Create V-Card
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Cards', value: cards.length, icon: <CreditCard size={20} className="text-indigo-500" /> },
          { label: 'Total Views', value: totalViews.toLocaleString(), icon: <Eye size={20} className="text-blue-500" /> },
          { label: 'Total Shares', value: totalShares.toLocaleString(), icon: <Share2 size={20} className="text-green-500" /> },
          { label: 'Active Cards', value: cards.filter(c => c.status === 'active').length, icon: <Check size={20} className="text-purple-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'cards', label: 'My Cards', icon: <CreditCard size={16} /> },
          { id: 'templates', label: 'Templates', icon: <Palette size={16} /> },
          { id: 'analytics', label: 'Analytics', icon: <Eye size={16} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id as typeof view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${view === tab.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {view === 'cards' && (
        cards.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No vCards yet. Create your first digital business card!</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Plus size={16} className="inline mr-1" /> Create V-Card</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => {
              const tmpl = templates.find(t => t.id === card.template);
              return (
                <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className={`bg-gradient-to-br ${tmpl?.gradient || 'from-blue-600 to-blue-800'} p-6 text-white relative`}>
                    <div className="absolute top-3 right-3 flex gap-1">
                      <button onClick={() => copyLink(card.id)} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30" title="Copy Link">
                        {copiedId === card.id ? <Check size={14} /> : <LinkIcon size={14} />}
                      </button>
                      <button onClick={() => setEditing(card.id)} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30" title="Edit"><Edit3 size={14} /></button>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold mb-3">{card.name.charAt(0)}</div>
                    <h3 className="text-lg font-bold">{card.name}</h3>
                    <p className="text-white/80 text-sm">{card.title} {card.company && `• ${card.company}`}</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {card.phone && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Phone size={14} /> {card.phone}</div>}
                    {card.email && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Mail size={14} /> {card.email}</div>}
                    {card.website && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Globe size={14} /> {card.website}</div>}
                    {card.address && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><MapPin size={14} /> {card.address}</div>}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex gap-3 text-xs text-gray-500"><span>{card.views} views</span><span>{card.shares} shares</span></div>
                      <div className="flex gap-1">
                        <button onClick={() => copyLink(card.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Share"><Share2 size={14} /></button>
                        <button onClick={() => deleteCard(card.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === 'templates' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.id} className={`bg-gradient-to-br ${t.gradient} rounded-xl p-6 text-white cursor-pointer hover:scale-105 transition-transform`}>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold mb-3">B</div>
                <h3 className="font-bold text-lg">Business Name</h3>
                <p className="text-white/80 text-sm">Title • Company</p>
                <div className="mt-4 pt-3 border-t border-white/20 text-xs text-white/60">{t.name} Template</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'analytics' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4">V-Card Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl">
              <p className="text-3xl font-bold text-indigo-600">{totalViews}</p><p className="text-xs text-gray-500 mt-1">Total Views</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-xl">
              <p className="text-3xl font-bold text-green-600">{totalShares}</p><p className="text-xs text-gray-500 mt-1">Total Shares</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">{cards.length}</p><p className="text-xs text-gray-500 mt-1">Active Cards</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
              <p className="text-3xl font-bold text-purple-600">{cards.length > 0 ? Math.round(totalViews / cards.length) : 0}</p><p className="text-xs text-gray-500 mt-1">Avg Views/Card</p>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-500">Top Performing Cards</h4>
            {cards.sort((a, b) => b.views - a.views).slice(0, 5).map((card, i) => (
              <div key={card.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <span className="text-lg font-bold text-gray-400 w-6">{i + 1}</span>
                <div className="flex-1"><p className="font-medium text-sm">{card.name}</p><p className="text-xs text-gray-500">{card.company}</p></div>
                <div className="text-right"><p className="font-medium text-sm">{card.views} views</p><p className="text-xs text-gray-500">{card.shares} shares</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New V-Card</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Full Name *" value={newCard.name} onChange={e => setNewCard(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="text" placeholder="Job Title" value={newCard.title} onChange={e => setNewCard(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="text" placeholder="Company" value={newCard.company} onChange={e => setNewCard(p => ({ ...p, company: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="tel" placeholder="Phone" value={newCard.phone} onChange={e => setNewCard(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="email" placeholder="Email" value={newCard.email} onChange={e => setNewCard(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="text" placeholder="Website" value={newCard.website} onChange={e => setNewCard(p => ({ ...p, website: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="text" placeholder="Address" value={newCard.address} onChange={e => setNewCard(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <div>
                <label className="block text-sm font-medium mb-2">Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setNewCard(p => ({ ...p, template: t.id }))}
                      className={`p-2 rounded-lg border-2 text-center text-xs ${newCard.template === t.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className={`w-6 h-6 mx-auto rounded bg-gradient-to-br ${t.gradient} mb-1`} />{t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={createCard} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Create V-Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
