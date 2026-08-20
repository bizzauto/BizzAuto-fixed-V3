import { useState, useEffect } from 'react';
import { Save, Palette, Globe, Image, Code, Link, Eye, ToggleLeft, ToggleRight, Loader2, AlertCircle, CheckCircle2, RefreshCw, Upload, ExternalLink, Smartphone } from 'lucide-react';
import { useToast } from './Toast';
import { settingsAPI } from '../lib/api';

interface WhiteLabelData {
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  customCss: string;
  customDomain: string;
  isActive: boolean;
}

const DEFAULT_BRANDING: WhiteLabelData = {
  brandName: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#6366f1',
  customCss: '',
  customDomain: '',
  isActive: false,
};

const PRESET_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Green', value: '#10B981' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Gray', value: '#6B7280' },
];

const CSS_TEMPLATES = [
  { label: 'None (Empty)', value: '' },
  { label: 'Rounded Cards', value: '/* Rounded Card Styles */\n.card, .bg-white, .rounded-2xl {\n  border-radius: 16px !important;\n}\n\n/* Soft Shadows */\n.shadow-lg, .shadow-xl, .shadow-2xl {\n  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08) !important;\n}' },
  { label: 'Compact Mode', value: '/* Compact UI */\n.p-4 { padding: 0.75rem !important; }\n.p-6 { padding: 1rem !important; }\n.gap-4 { gap: 0.75rem !important; }\n.text-2xl { font-size: 1.25rem !important; }' },
  { label: 'Custom Font', value: '/* Custom Font */\n@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");\n\n* { font-family: "Inter", sans-serif !important; }' },
  { label: 'Dark Mode Override', value: '/* Force Dark Elements */\n.dark .bg-white { background-color: #1f2937 !important; }\n.dark .text-gray-900 { color: #f9fafb !important; }\n.dark .border-gray-200 { border-color: #374151 !important; }' },
];

export default function WhiteLabelSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<WhiteLabelData>(DEFAULT_BRANDING);
  const [activeTab, setActiveTab] = useState<'basic' | 'appearance' | 'domain' | 'css'>('basic');
  const [showCssTemplates, setShowCssTemplates] = useState(false);
  const [domainCheckResult, setDomainCheckResult] = useState<{ available?: boolean; error?: string } | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getWhiteLabel();
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setBranding({
          brandName: data.brandName || '',
          logoUrl: data.logoUrl || '',
          faviconUrl: data.faviconUrl || '',
          primaryColor: data.primaryColor || '#6366f1',
          customCss: data.customCss || '',
          customDomain: data.customDomain || '',
          isActive: data.isActive || false,
        });
      }
    } catch (err: any) {
      console.error('Failed to load white-label settings:', err);
      toast.error('Failed to load white-label settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settingsAPI.updateWhiteLabel(branding);
      if (res.data?.success) {
        toast.success('White-label settings saved successfully');
      } else {
        toast.error(res.data?.error || 'Failed to save settings');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!branding.customDomain) return;
    setCheckingDomain(true);
    setDomainCheckResult(null);
    // Simulate DNS check — in production, this would call a backend API
    setTimeout(() => {
      const domain = branding.customDomain.toLowerCase();
      const isValid = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain);
      if (isValid) {
        setDomainCheckResult({ available: true });
      } else {
        setDomainCheckResult({ error: 'Invalid domain format. Use format: app.yourbrand.com' });
      }
      setCheckingDomain(false);
    }, 1000);
  };

  const handleLogoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Convert to data URL for preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBranding(prev => ({ ...prev, logoUrl: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleFaviconUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/x-icon,image/png,image/svg+xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBranding(prev => ({ ...prev, faviconUrl: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const previewStyles = branding.isActive
    ? {
        '--brand-primary': branding.primaryColor,
        '--brand-primary-rgb': hexToRgb(branding.primaryColor),
        '--brand-logo': `url(${branding.logoUrl})`,
        '--brand-favicon': `url(${branding.faviconUrl})`,
      } as React.CSSProperties
    : {};

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-8" style={previewStyles}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              White-Label Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Customize the look and feel of your platform. Apply your brand identity across the entire app.
            </p>
          </div>
        </div>
      </div>

      {/* Enable/Disable Banner */}
      <div className={`mb-6 rounded-2xl border p-4 sm:p-5 transition-all ${
        branding.isActive
          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.isActive ? (
              <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {branding.isActive ? 'White-Labeling is Active' : 'White-Labeling is Disabled'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {branding.isActive
                  ? 'Your brand is being applied across the platform.'
                  : 'Enable white-labeling to apply your custom branding.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setBranding(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              branding.isActive
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300'
            }`}
          >
            {branding.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {branding.isActive ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="xl:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
            {([
              { id: 'basic' as const, label: 'Basic', icon: Image },
              { id: 'appearance' as const, label: 'Appearance', icon: Palette },
              { id: 'domain' as const, label: 'Domain', icon: Globe },
              { id: 'css' as const, label: 'Custom CSS', icon: Code },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Basic */}
          {activeTab === 'basic' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Brand Identity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set your brand name, logo, and favicon.</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Brand Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={branding.brandName}
                    onChange={(e) => setBranding(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Your Business Name"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Used in email footers, login pages, and the browser title bar.
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logo
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 transition-all ${
                        branding.logoUrl
                          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      {branding.logoUrl ? (
                        <img
                          src={branding.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Image className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <button
                        type="button"
                        onClick={handleLogoUpload}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </button>
                      <input
                        type="url"
                        value={branding.logoUrl}
                        onChange={(e) => setBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Or paste image URL..."
                      />
                      <p className="text-xs text-gray-400">
                        Recommended: PNG or SVG, 200×200px or larger, transparent background preferred.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favicon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Favicon
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 transition-all ${
                        branding.faviconUrl
                          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      {branding.faviconUrl ? (
                        <img
                          src={branding.faviconUrl}
                          alt="Favicon"
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Globe className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleFaviconUpload}
                          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Favicon
                        </button>
                      </div>
                      <input
                        type="url"
                        value={branding.faviconUrl}
                        onChange={(e) => setBranding(prev => ({ ...prev, faviconUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Or paste favicon URL..."
                      />
                      <p className="text-xs text-gray-400">
                        Recommended: PNG or ICO, 32×32px or 64×64px.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Appearance */}
          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Color Scheme</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Choose a primary color that represents your brand. It will be used across the platform.
                </p>
              </div>
              <div className="p-6 space-y-6">
                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div
                        className="w-14 h-14 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm cursor-pointer"
                        style={{ backgroundColor: branding.primaryColor }}
                      />
                    </div>
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-32 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                      placeholder="#6366f1"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Preset Colors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Preset Colors
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setBranding(prev => ({ ...prev, primaryColor: color.value }))}
                        className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 ${
                          branding.primaryColor === color.value
                            ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-indigo-500'
                            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Preview
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      Primary Button
                    </span>
                    <span
                      className="px-4 py-2 rounded-lg text-sm font-medium border"
                      style={{
                        borderColor: branding.primaryColor,
                        color: branding.primaryColor,
                      }}
                    >
                      Outline Button
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      Badge
                    </span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: branding.primaryColor }}
                    />
                    <span
                      className="text-sm font-bold"
                      style={{ color: branding.primaryColor }}
                    >
                      Brand Text
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Domain */}
          {activeTab === 'domain' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Custom Domain</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Point your own domain to the platform for a fully branded experience.
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Domain
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={branding.customDomain}
                        onChange={(e) => {
                          setBranding(prev => ({ ...prev, customDomain: e.target.value }));
                          setDomainCheckResult(null);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="app.yourbrand.com"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckDomain}
                      disabled={!branding.customDomain || checkingDomain}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm font-medium"
                    >
                      {checkingDomain ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Check
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Enter your domain without http:// or https:// (e.g., app.yourbrand.com)
                  </p>
                </div>

                {/* Domain Check Result */}
                {domainCheckResult && (
                  <div className={`p-4 rounded-xl border ${
                    domainCheckResult.available
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {domainCheckResult.available ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Domain format looks good! Update your DNS A-record / CNAME to point to our server.
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-red-800 dark:text-red-200">
                            {domainCheckResult.error}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* DNS Instructions */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">DNS Setup Instructions</p>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>1. Go to your domain registrar's DNS settings</p>
                    <p>2. Add a <strong>CNAME record</strong> pointing to: <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">app.bizzauto.com</code></p>
                    <p>3. Or add an <strong>A record</strong> pointing to your server IP</p>
                    <p>4. Wait for DNS propagation (can take up to 48 hours)</p>
                    <p>5. SSL certificate will be automatically provisioned</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Custom CSS */}
          {activeTab === 'css' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Custom CSS</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Add custom CSS to override default styles. Use with caution.
                  </p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCssTemplates(!showCssTemplates)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    <Code className="w-4 h-4" />
                    Templates
                  </button>
                  {showCssTemplates && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                      {CSS_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.label}
                          type="button"
                          onClick={() => {
                            setBranding(prev => ({ ...prev, customCss: tmpl.value }));
                            setShowCssTemplates(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="relative">
                  <textarea
                    value={branding.customCss}
                    onChange={(e) => setBranding(prev => ({ ...prev, customCss: e.target.value }))}
                    className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                    placeholder="/* Enter your custom CSS here */
.your-class {
  color: red;
}"
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-gray-400">
                    Custom CSS is applied globally on all pages. Test thoroughly before saving.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-lg shadow-indigo-500/25"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-8">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Brand Preview
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Logo Preview */}
              <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[100px]">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="Brand Logo"
                    className="max-h-16 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-gray-400 text-sm">Invalid image</span>';
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <Image className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">No logo uploaded</p>
                  </div>
                )}
              </div>

              {/* Brand Name */}
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white" style={{ color: branding.primaryColor }}>
                  {branding.brandName || 'Your Brand Name'}
                </p>
                {branding.customDomain && (
                  <p className="text-xs text-gray-400 mt-1">{branding.customDomain}</p>
                )}
              </div>

              {/* Color Swatch */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Color</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{branding.primaryColor}</span>
                </div>
              </div>

              {/* Preview Link */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  {branding.isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {branding.isActive
                      ? 'Branding is live and applied across the platform.'
                      : 'Branding is not applied yet. Enable it above.'}
                  </p>
                </div>
              </div>

              {/* Status Card */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Brand Name', done: !!branding.brandName },
                    { label: 'Logo', done: !!branding.logoUrl },
                    { label: 'Favicon', done: !!branding.faviconUrl },
                    { label: 'Color', done: !!branding.primaryColor && branding.primaryColor !== '#6366f1' },
                    { label: 'Custom CSS', done: !!branding.customCss },
                    { label: 'Custom Domain', done: !!branding.customDomain },
                    { label: 'Enabled', done: branding.isActive },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                      {item.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '99, 102, 241';
}
