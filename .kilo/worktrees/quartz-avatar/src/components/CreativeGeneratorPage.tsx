import React, { useState, useEffect } from 'react';
import {
  Download, Share2, Sparkles, Palette, Type, Image,
  Wand2, RefreshCw, Layout, Eye, Clock, Heart,
  ChevronRight, Sun, Moon, Zap, Copy, CheckCircle
} from 'lucide-react';
import { postersAPI } from '../lib/api';

interface Template {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  category: string;
}

interface SavedPoster {
  id: string;
  name: string;
  createdAt: string;
  thumbnail?: string;
}

const COLOR_PALETTES = [
  { name: 'Sunset', colors: ['#FF6B35', '#F7931E', '#FFD700'] },
  { name: 'Ocean', colors: ['#0077B6', '#00B4D8', '#90E0EF'] },
  { name: 'Forest', colors: ['#2D6A4F', '#40916C', '#95D5B2'] },
  { name: 'Royal', colors: ['#7B2CBF', '#9D4EDD', '#C77DFF'] },
  { name: 'Cherry', colors: ['#D00000', '#E85D04', '#FFBA08'] },
  { name: 'Midnight', colors: ['#1B263B', '#415A77', '#778DA9'] },
];

const FONT_OPTIONS = [
  { name: 'Bold Sans', class: 'font-bold' },
  { name: 'Elegant', class: 'font-serif italic' },
  { name: 'Modern', class: 'font-light tracking-wider' },
  { name: 'Impact', class: 'font-black uppercase' },
];

const FORMAT_OPTIONS = [
  { name: 'Square', desc: '1080×1080', ratio: 'aspect-square' },
  { name: 'Story', desc: '1080×1920', ratio: 'aspect-[9/16]' },
  { name: 'Landscape', desc: '1200×628', ratio: 'aspect-[16/9]' },
];

const CreativeGeneratorPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [category, setCategory] = useState('Festival');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<SavedPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiHeadlines, setAiHeadlines] = useState<string[]>([]);
  const [aiSubtitles, setAiSubtitles] = useState<string[]>([]);

  // Fetch templates and history on mount
  useEffect(() => {
    fetchTemplates();
    fetchHistory();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await postersAPI.list();
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        // Map backend PosterTemplate to frontend Template interface
        const mappedTemplates = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          emoji: getEmojiForCategory(t.category),
          gradient: getGradientForCategory(t.category),
          category: t.category,
        }));
        setTemplates(mappedTemplates);
        setSelectedTemplate(mappedTemplates[0]);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      // Set default templates if API fails
      const defaultTemplates = [
        { id: '1', name: 'Diwali Special', emoji: '🪔', gradient: 'from-orange-500 via-red-500 to-yellow-500', category: 'Festival' },
        { id: '2', name: 'Holi Colors', emoji: '🎨', gradient: 'from-pink-500 via-purple-500 to-blue-500', category: 'Festival' },
        { id: '3', name: 'Eid Mubarak', emoji: '🌙', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', category: 'Festival' },
        { id: '4', name: 'Christmas', emoji: '🎄', gradient: 'from-red-600 via-green-600 to-red-700', category: 'Festival' },
        { id: '5', name: 'Flash Sale', emoji: '⚡', gradient: 'from-blue-600 via-indigo-600 to-purple-600', category: 'Offer' },
        { id: '6', name: 'Grand Opening', emoji: '🏪', gradient: 'from-amber-500 via-orange-500 to-red-500', category: 'Offer' },
        { id: '7', name: 'New Arrival', emoji: '🆕', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', category: 'Product' },
        { id: '8', name: 'Summer Deal', emoji: '☀️', gradient: 'from-yellow-400 via-orange-400 to-red-400', category: 'Seasonal' },
        { id: '9', name: 'Monsoon Sale', emoji: '🌧️', gradient: 'from-slate-500 via-blue-500 to-indigo-500', category: 'Seasonal' },
      ];
      setTemplates(defaultTemplates);
      setSelectedTemplate(defaultTemplates[0] || null);
    } finally {
      setLoading(false);
    }
  };

  const getEmojiForCategory = (category: string): string => {
    const emojiMap: Record<string, string> = {
      'Festival': '🎉',
      'Offer': '🎁',
      'Product': '📦',
      'Seasonal': '🌸',
      'Testimonial': '⭐',
      'Menu': '🍽️',
      'Price List': '💰',
    };
    return emojiMap[category] || '🎨';
  };

  const getGradientForCategory = (category: string): string => {
    const gradientMap: Record<string, string> = {
      'Festival': 'from-orange-500 via-red-500 to-yellow-500',
      'Offer': 'from-blue-600 via-indigo-600 to-purple-600',
      'Product': 'from-violet-500 via-purple-500 to-fuchsia-500',
      'Seasonal': 'from-yellow-400 via-orange-400 to-red-400',
      'Testimonial': 'from-green-500 via-teal-500 to-cyan-500',
      'Menu': 'from-amber-500 via-orange-500 to-red-500',
      'Price List': 'from-slate-500 via-blue-500 to-indigo-500',
    };
    return gradientMap[category] || 'from-purple-500 to-pink-500';
  };

  const fetchHistory = async () => {
    try {
      const res = await postersAPI.list();
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setHistory(data.map((item: any) => ({
          id: item.id,
          name: item.name || 'Untitled',
          createdAt: item.createdAt || new Date().toISOString(),
          thumbnail: item.thumbnail,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistory([]);
    }
  };

  const filteredTemplates = templates.filter(t => t.category === category);

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await postersAPI.generate({
        templateId: selectedTemplate?.id || '',
        userData: {
          headline,
          subtitle,
          businessName,
          phone,
        },
      });

      if (res.data?.headline) setHeadline(res.data.headline);
      if (res.data?.subtitle) setSubtitle(res.data.subtitle);
      if (res.data?.headlines) setAiHeadlines(res.data.headlines);
      if (res.data?.subtitles) setAiSubtitles(res.data.subtitles);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToHistory = async () => {
    try {
      const res = await postersAPI.create({
        templateId: selectedTemplate?.id || '',
        headline,
        subtitle,
        phone,
        businessName,
        format: FORMAT_OPTIONS[selectedFormat].name,
        font: FONT_OPTIONS[selectedFont].name,
        palette: COLOR_PALETTES[selectedPalette].name,
      });

      if (res.data?.data) {
        setHistory(prev => [{
          id: res.data.data.id,
          name: headline || 'Untitled',
          createdAt: new Date().toISOString(),
          thumbnail: res.data.data.thumbnail,
        }, ...prev]);
      }
    } catch (error) {
      console.error('Failed to save poster:', error);
    }
  };

  const handleDownload = () => {
    // In production, this would call the download API
    console.log('Downloading poster...');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading creative studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Wand2 size={20} className="text-white" />
            </div>
            AI Creative Studio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 ml-13">Design stunning posters with AI-powered suggestions</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['create', 'history'] as const).map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === v
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
              {v === 'create' ? 'Create' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-4">
            {/* AI Quick Actions */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-purple-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  {isGenerating ? 'Generating...' : 'AI Generate'}
                </button>
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  <Sparkles size={14} />
                  AI Headlines
                </button>
              </div>
              {showAIPanel && aiHeadlines.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {aiHeadlines.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { setHeadline(h); setShowAIPanel(false); }}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={18} className="text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Templates</h3>
              </div>
              {/* Category Tabs */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                {['Festival', 'Offer', 'Product', 'Seasonal'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${category === cat
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* Template Grid */}
              <div className="grid grid-cols-3 gap-2">
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${selectedTemplate?.id === template.id
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span className="text-2xl">{template.emoji}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-full px-1">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Design Options */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={18} className="text-pink-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Design Options</h3>
              </div>

              {/* Format */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFormat(i)}
                      className={`px-2 py-2 rounded-lg text-xs transition-all ${selectedFormat === i
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Font Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFont(i)}
                      className={`px-2 py-2 rounded-lg text-xs transition-all ${opt.class} ${selectedFont === i
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Color Palette</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PALETTES.map((palette, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPalette(i)}
                      className={`h-10 rounded-lg transition-all ${selectedPalette === i ? 'ring-2 ring-purple-500' : ''
                        }`}
                      style={{
                        background: `linear-gradient(to right, ${palette.colors.join(', ')})`,
                      }}
                      title={palette.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-8 space-y-4">
            {/* Preview Card */}
            <div className="modern-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-gray-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Preview</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCopied(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy Design"
                  >
                    <Copy size={18} className="text-gray-500" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={18} className="text-gray-500" />
                  </button>
                  <button
                    onClick={handleSaveToHistory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Poster Preview */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 flex items-center justify-center min-h-[500px]">
                {selectedTemplate ? (
                  <div
                    className={`w-full max-w-md bg-gradient-to-br ${selectedTemplate.gradient} rounded-2xl p-8 text-white shadow-2xl ${FORMAT_OPTIONS[selectedFormat].ratio}`}
                  >
                    <div className="text-center space-y-4">
                      <div className="text-6xl mb-4">{selectedTemplate.emoji}</div>
                      <h2 className={`text-3xl font-bold ${FONT_OPTIONS[selectedFont].class}`}>
                        {headline || 'Your Headline'}
                      </h2>
                      <p className="text-lg opacity-90">
                        {subtitle || 'Your subtitle goes here'}
                      </p>
                      <div className="pt-4 border-t border-white/20">
                        <p className="font-semibold">{businessName || 'Business Name'}</p>
                        <p className="text-sm opacity-75">{phone || '+91 XXXXX XXXXX'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Layout size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Select a template to preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Text Inputs */}
            <div className="modern-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Type size={18} className="text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Content</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter headline..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter subtitle..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Business name..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="modern-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Saved Posters</h3>
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Image size={48} className="mx-auto mb-4 opacity-30" />
              <p>No saved posters yet</p>
              <p className="text-sm mt-1">Create your first poster to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {history.map(item => (
                <div
                  key={item.id}
                  className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={32} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-lg hover:bg-gray-100">
                      <Download size={16} className="text-gray-900" />
                    </button>
                    <button className="p-2 bg-white rounded-lg hover:bg-gray-100">
                      <Share2 size={16} className="text-gray-900" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-xs truncate">{item.name}</p>
                    <p className="text-white/70 text-xs">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreativeGeneratorPage;
