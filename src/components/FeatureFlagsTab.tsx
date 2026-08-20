import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag, RefreshCw, Palette, Phone, Workflow, Layers, BookOpen,
  MessageCircle, ShoppingCart, Gift, Users, Zap, Info
} from 'lucide-react';
import { adminAnalyticsAPI } from '../lib/api';

interface FeatureFlag {
  enabled: boolean;
  source: string;
}

interface FeatureFlags {
  [key: string]: FeatureFlag;
}

const FEATURE_META: Record<string, { label: string; description: string; icon: React.ReactNode; category: string }> = {
  aiCreativeStudio: { label: 'AI Creative Studio', description: 'AI-powered poster and design generation', icon: <Palette size={18} />, category: 'AI' },
  voiceCalls: { label: 'Voice Calls', description: 'AI voice calling with Dograh integration', icon: <Phone size={18} />, category: 'Communications' },
  workflowBuilder: { label: 'Workflow Builder', description: 'Visual automation workflow builder', icon: <Workflow size={18} />, category: 'Automation' },
  funnelBuilder: { label: 'Funnel Builder', description: 'Sales funnel builder with block editor', icon: <Layers size={18} />, category: 'Marketing' },
  courseBuilder: { label: 'Course Builder', description: 'Online course creation platform', icon: <BookOpen size={18} />, category: 'Education' },
  liveChat: { label: 'Live Chat', description: 'Website live chat widget', icon: <MessageCircle size={18} />, category: 'Communications' },
  cartRecovery: { label: 'Cart Recovery', description: 'Abandoned cart recovery automation', icon: <ShoppingCart size={18} />, category: 'E-commerce' },
  referrals: { label: 'Referrals Program', description: 'Customer referral programs', icon: <Gift size={18} />, category: 'Marketing' },
  loyaltyProgram: { label: 'Loyalty Program', description: 'Customer loyalty and rewards', icon: <Users size={18} />, category: 'Marketing' },
  betaFeatures: { label: 'Beta Features', description: 'Early access to experimental features', icon: <Zap size={18} />, category: 'System' },
};

const CATEGORY_ORDER = ['AI', 'Automation', 'Communications', 'Marketing', 'E-commerce', 'Education', 'System'];

export default function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAnalyticsAPI.getFeatureFlags();
      if (res.data?.success) setFlags(res.data.data);
      else setError('Failed to fetch feature flags');
    } catch {
      setError('Backend not available');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggleFlag = async (key: string) => {
    const current = flags[key]?.enabled ?? false;
    const newValue = !current;
    setSaving(key);
    setError(null);

    // Optimistic update
    setFlags(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: newValue, source: 'override' },
    }));

    try {
      const res = await adminAnalyticsAPI.updateFeatureFlags({ [key]: newValue });
      if (!res.data?.success) {
        // Revert on failure
        setFlags(prev => ({
          ...prev,
          [key]: { ...prev[key], enabled: current },
        }));
        setError('Failed to update flag');
      }
    } catch {
      setFlags(prev => ({
        ...prev,
        [key]: { ...prev[key], enabled: current },
      }));
      setError('Failed to update flag');
    }
    finally { setSaving(null); }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'env': return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">ENV</span>;
      case 'override': return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">Override</span>;
      default: return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Default</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={32} className="text-purple-500 animate-spin" />
      </div>
    );
  }

  // Group flags by category
  const grouped: Record<string, [string, FeatureFlag][]> = {};
  for (const [key, flag] of Object.entries(flags)) {
    const meta = FEATURE_META[key];
    const category = meta?.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push([key, flag]);
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <Info size={16} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feature Flags</h2>
          <p className="text-sm text-gray-500 mt-1">Enable or disable platform features. Changes take effect immediately.</p>
        </div>
        <button onClick={fetchFlags}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium border border-gray-200 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Feature flags by category */}
      {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(category => (
        <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{category}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {grouped[category].map(([key, flag]) => {
              const meta = FEATURE_META[key];
              const isSaving = saving === key;
              return (
                <div key={key} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${flag.enabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                      {meta?.icon || <Flag size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{meta?.label || key}</span>
                        {getSourceBadge(flag.source)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{meta?.description || key}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFlag(key)}
                    disabled={isSaving}
                    className={`relative inline-flex h-7 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 ${
                      flag.enabled ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      flag.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(flags).length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <Flag size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600 mb-1">No feature flags available</p>
          <p className="text-sm">Feature flags will appear when the backend is connected.</p>
        </div>
      )}

      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-start gap-3">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">About Feature Flags</p>
          <p className="text-blue-600/80 text-xs">
            Feature flags override environment variables for the current server session. 
            Flags marked as "Override" will reset when the server restarts. 
            To make permanent changes, set the corresponding <code className="bg-blue-100 px-1 rounded">FF_*</code> environment variable in your deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
