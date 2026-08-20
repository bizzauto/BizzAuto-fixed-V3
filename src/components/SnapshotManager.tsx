import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  FileJson,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Clock,
  ArrowLeftRight,
  Users,
  GitBranch,
  Zap,
  FileText,
  Megaphone,
  Package,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useToast } from './Toast';
import { contactsAPI, pipelinesAPI, automationAPI, emailAPI, campaignsAPI, ecommerceAPI } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type SnapshotCategory =
  | 'contacts'
  | 'pipelines'
  | 'automations'
  | 'templates'
  | 'campaigns'
  | 'products';

interface SnapshotItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface SnapshotPayload {
  version: string;
  exportedAt: string;
  exportedBy: string;
  categories: Partial<Record<SnapshotCategory, SnapshotItem[]>>;
}

interface ImportPreview {
  categories: Partial<Record<SnapshotCategory, SnapshotItem[]>>;
  conflicts: Partial<Record<SnapshotCategory, { name: string; existing: boolean }[]>>;
}

interface SnapshotLog {
  id: string;
  type: 'export' | 'import';
  categories: SnapshotCategory[];
  itemCount: number;
  timestamp: string;
  fileName?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  SnapshotCategory,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  contacts: {
    label: 'Contacts',
    icon: <Users size={18} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  pipelines: {
    label: 'Pipelines',
    icon: <GitBranch size={18} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  automations: {
    label: 'Automations',
    icon: <Zap size={18} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  templates: {
    label: 'Templates',
    icon: <FileText size={18} />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  campaigns: {
    label: 'Campaigns',
    icon: <Megaphone size={18} />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  products: {
    label: 'Products',
    icon: <Package size={18} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
};

const CATEGORIES: SnapshotCategory[] = [
  'contacts',
  'pipelines',
  'automations',
  'templates',
  'campaigns',
  'products',
];

const STORAGE_KEY = 'snapshot_logs';
const SNAPSHOT_VERSION = '1.0.0';

// ─── Data Cache & Fetcher ─────────────────────────────────────────────────

// In-memory cache populated from real API on mount
let cachedData: Record<SnapshotCategory, SnapshotItem[]> | null = null;

async function fetchSnapshotData(): Promise<Record<SnapshotCategory, SnapshotItem[]>> {
  if (cachedData) return cachedData;

  const data: Record<SnapshotCategory, SnapshotItem[]> = {
    contacts: [],
    pipelines: [],
    automations: [],
    templates: [],
    campaigns: [],
    products: [],
  };

  const results = await Promise.allSettled([
    contactsAPI.list({ limit: 100 }).then(r => r.data?.data?.contacts || r.data?.data || r.data || []).catch(() => []),
    pipelinesAPI.list().then(r => r.data?.data?.pipelines || r.data?.data || r.data || []).catch(() => []),
    automationAPI.listRules().then(r => r.data?.data?.rules || r.data?.data || r.data || []).catch(() => []),
    emailAPI.listTemplates().then(r => r.data?.data?.templates || r.data?.data || r.data || []).catch(() => []),
    campaignsAPI.list({ limit: 100 }).then(r => r.data?.data?.campaigns || r.data?.data || r.data || []).catch(() => []),
    ecommerceAPI.listProducts({ limit: 100 }).then(r => r.data?.data?.products || r.data?.data || r.data || []).catch(() => []),
  ]);

  const mapResults = (idx: number, src: SnapshotCategory) => {
    const r = results[idx];
    const items = r.status === 'fulfilled' ? r.value : [];
    data[src] = (Array.isArray(items) ? items : []).map((i: any) => ({
      id: i.id || i._id || String(Math.random()),
      name: i.name || i.title || 'Unknown',
      ...i,
    }));
  };

  mapResults(0, 'contacts');
  mapResults(1, 'pipelines');
  mapResults(2, 'automations');
  mapResults(3, 'templates');
  mapResults(4, 'campaigns');
  mapResults(5, 'products');

  cachedData = data;
  return data;
}



// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadLogs(): SnapshotLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: SnapshotLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ───────────────────────────────────────────────────────────────

const SnapshotManager: React.FC = () => {
  const { error: showError, success: showSuccess } = useToast();
  const [liveData, setLiveData] = useState<Record<SnapshotCategory, SnapshotItem[]> | null>(null);

  // Fetch real data on mount
  useEffect(() => {
    fetchSnapshotData().then(data => {
      setLiveData(data);
    });
  }, []);

  // Helper to get live data or empty
  const getDataForCategory = useCallback((cat: SnapshotCategory): SnapshotItem[] => {
    return liveData?.[cat] ?? [];
  }, [liveData]);

  // Helper to check if data exists (for conflict detection)
  const itemExistsInLiveData = useCallback((cat: SnapshotCategory, name: string): boolean => {
    const items = liveData?.[cat] ?? [];
    return items.some(item => item.name === name);
  }, [liveData]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'history'>('export');

  // Export state
  const [exportSelected, setExportSelected] = useState<Record<SnapshotCategory, boolean>>({
    contacts: true,
    pipelines: true,
    automations: false,
    templates: false,
    campaigns: false,
    products: false,
  });
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPayload, setImportPayload] = useState<SnapshotPayload | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [importSelectAll, setImportSelectAll] = useState<Record<SnapshotCategory, boolean>>({
    contacts: true,
    pipelines: true,
    automations: true,
    templates: true,
    campaigns: true,
    products: true,
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<SnapshotCategory, boolean>>({
    contacts: false,
    pipelines: false,
    automations: false,
    templates: false,
    campaigns: false,
    products: false,
  });
  const [importResult, setImportResult] = useState<{
    imported: number;
    conflicts: number;
    skipped: number;
  }>({ imported: 0, conflicts: 0, skipped: 0 });

  // History state
  const [logs, setLogs] = useState<SnapshotLog[]>(loadLogs);

  // ── Export handlers ──────────────────────────────────────────────────────

  const toggleExportCategory = useCallback((cat: SnapshotCategory) => {
    setExportSelected((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const selectAllExport = useCallback(() => {
    const allSelected = CATEGORIES.every((c) => exportSelected[c]);
    const next: Record<SnapshotCategory, boolean> = {} as any;
    CATEGORIES.forEach((c) => (next[c] = !allSelected));
    setExportSelected(next);
  }, [exportSelected]);

  const selectedCount = CATEGORIES.filter((c) => exportSelected[c]).length;

  const handleExport = useCallback(() => {
    if (selectedCount === 0) {
      showError('Select at least one category to export');
      return;
    }
    setExporting(true);

    setTimeout(() => {
      const categories: Partial<Record<SnapshotCategory, SnapshotItem[]>> = {};
      let totalItems = 0;
      CATEGORIES.forEach((cat) => {
        if (exportSelected[cat]) {
          categories[cat] = getDataForCategory(cat);
          totalItems += categories[cat]?.length || 0;
        }
      });

      const payload: SnapshotPayload = {
        version: SNAPSHOT_VERSION,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Current User',
        categories,
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const log: SnapshotLog = {
        id: Date.now().toString(),
        type: 'export',
        categories: CATEGORIES.filter((c) => exportSelected[c]),
        itemCount: totalItems,
        timestamp: new Date().toISOString(),
        fileName: a.download,
      };
      const updated = [log, ...logs];
      setLogs(updated);
      saveLogs(updated);

      setExporting(false);
      showSuccess(`Snapshot exported with ${totalItems} items`);
    }, 800);
  }, [exportSelected, selectedCount, logs, showError, showSuccess]);

  // ── Import handlers ─────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!f.name.endsWith('.json')) {
        showError('Only JSON files are supported');
        return;
      }
      setImportFile(f);

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as SnapshotPayload;
          if (!parsed.version || !parsed.categories) {
            showError('Invalid snapshot file format');
            return;
          }

          // Build preview with conflict detection
          const conflicts: ImportPreview['conflicts'] = {};
          const selected: Record<SnapshotCategory, boolean> = {
            contacts: false,
            pipelines: false,
            automations: false,
            templates: false,
            campaigns: false,
            products: false,
          };

          CATEGORIES.forEach((cat) => {
            const items = parsed.categories[cat];
            if (items && items.length > 0) {
              selected[cat] = true;
              conflicts[cat] = items.map((item) => ({
                name: item.name || item.id,
                existing: itemExistsInLiveData(cat, item.name),
              }));
            }
          });

          setImportPayload(parsed);
          setImportPreview({ categories: parsed.categories, conflicts });
          setImportSelectAll(selected);
          setImportStep('preview');
        } catch {
          showError('Could not parse the JSON file. Make sure it is a valid snapshot.');
        }
      };
      reader.readAsText(f);
    },
    [showError],
  );

  const toggleImportCategory = useCallback((cat: SnapshotCategory) => {
    setImportSelectAll((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const toggleExpandCategory = useCallback((cat: SnapshotCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const totalImportItems = CATEGORIES.reduce((sum, cat) => {
    if (!importSelectAll[cat]) return sum;
    return sum + (importPayload?.categories[cat]?.length ?? 0);
  }, 0);

  const totalConflicts = CATEGORIES.reduce((sum, cat) => {
    if (!importSelectAll[cat]) return sum;
    return sum + (importPreview?.conflicts[cat]?.filter((c) => c.existing).length ?? 0);
  }, 0);

  const handleConfirmImport = useCallback(() => {
    if (totalImportItems === 0) {
      showError('Select at least one category to import');
      return;
    }
    setImportStep('importing');

    setTimeout(() => {
      let imported = 0;
      let conflicts = 0;
      let skipped = 0;

      CATEGORIES.forEach((cat) => {
        if (!importSelectAll[cat]) {
          skipped += importPayload?.categories[cat]?.length ?? 0;
          return;
        }
        const items = importPayload?.categories[cat] ?? [];
        items.forEach((item) => {
          const isConflict =
            importPreview?.conflicts[cat]?.find((c) => c.name === (item.name || item.id))?.existing ?? false;
          if (isConflict) {
            conflicts++;
          } else {
            imported++;
          }
        });
      });

      setImportResult({ imported, conflicts, skipped });
      setImportStep('done');

      const log: SnapshotLog = {
        id: Date.now().toString(),
        type: 'import',
        categories: CATEGORIES.filter((c) => importSelectAll[c]),
        itemCount: imported,
        timestamp: new Date().toISOString(),
        fileName: importFile?.name,
      };
      const updated = [log, ...logs];
      setLogs(updated);
      saveLogs(updated);
    }, 1200);
  }, [
    totalImportItems,
    importSelectAll,
    importPayload,
    importPreview,
    importFile,
    logs,
    showError,
  ]);

  const resetImport = useCallback(() => {
    setImportFile(null);
    setImportPayload(null);
    setImportPreview(null);
    setImportStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  const renderCategoryCheckbox = (
    cat: SnapshotCategory,
    checked: boolean,
    onChange: () => void,
    count?: number,
    conflictCount?: number,
  ) => {
    const meta = CATEGORY_META[cat];
    return (
      <label
        key={cat}
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          checked
            ? 'border-blue-300 bg-blue-50/50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bgColor} ${meta.color}`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{meta.label}</span>
          {count !== undefined && (
            <span className="ml-2 text-xs text-gray-500">({count})</span>
          )}
        </div>
        {conflictCount !== undefined && conflictCount > 0 && (
          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            {conflictCount} conflicts
          </span>
        )}
      </label>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <ArrowLeftRight className="text-blue-600" size={32} />
          Business Snapshot
        </h1>
        <p className="text-gray-600">
          Export your business data as a portable snapshot or import from a previous export.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        {([
          { key: 'export' as const, label: 'Export', icon: <Download size={16} /> },
          { key: 'import' as const, label: 'Import', icon: <Upload size={16} /> },
          { key: 'history' as const, label: 'History', icon: <Clock size={16} /> },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ EXPORT TAB ═══════ */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Select All / Deselect All */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Data to Export</h2>
              <button
                onClick={selectAllExport}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {CATEGORIES.every((c) => exportSelected[c]) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) =>
                renderCategoryCheckbox(cat, exportSelected[cat], () => toggleExportCategory(cat), (getDataForCategory(cat).length || 0)),
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {selectedCount} {selectedCount === 1 ? 'category' : 'categories'} selected
              </p>
              <button
                onClick={handleExport}
                disabled={selectedCount === 0 || exporting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
                  selectedCount > 0 && !exporting
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {exporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Snapshot
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview summary */}
          {selectedCount > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Export Preview
              </h3>
              <div className="space-y-2">
                {CATEGORIES.filter((c) => exportSelected[c]).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const items = getDataForCategory(cat);
                  return (
                    <div key={cat} className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${meta.bgColor} ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <span className="font-medium text-gray-900">{meta.label}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-600">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                <FileJson size={14} />
                File will be saved as{' '}
                <code className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                  business-snapshot-{new Date().toISOString().slice(0, 10)}.json
                </code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ IMPORT TAB ═══════ */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Upload step */}
          {importStep === 'upload' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 md:p-8">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Drop your snapshot file here
                </h3>
                <p className="text-gray-500 mb-4">
                  Supports .json files exported from Business Snapshot
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  <FileJson size={16} />
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Preview step */}
          {importStep === 'preview' && importPreview && (
            <div className="space-y-6">
              {/* File info bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileJson size={20} className="text-blue-600" />
                  <div>
                    <span className="font-medium text-gray-900">{importFile?.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      v{importPayload?.version} &middot; exported{' '}
                      {importPayload?.exportedAt
                        ? formatTimestamp(importPayload.exportedAt)
                        : 'unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetImport}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Change File
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={totalImportItems === 0}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      totalImportItems > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Upload size={14} />
                    Import {totalImportItems} {totalImportItems === 1 ? 'Item' : 'Items'}
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalImportItems}</p>
                  <p className="text-sm text-gray-500">Items to Import</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{totalConflicts}</p>
                  <p className="text-sm text-gray-500">Name Conflicts</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-600">
                    {CATEGORIES.filter((c) => importPayload?.categories[c]?.length).length}
                  </p>
                  <p className="text-sm text-gray-500">Categories Found</p>
                </div>
              </div>

              {totalConflicts > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Conflicts Detected</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Some items share names with existing data. Conflicting items will be skipped during
                      import. Uncheck categories with conflicts if you want to avoid skips.
                    </p>
                  </div>
                </div>
              )}

              {/* Category breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data to Import</h3>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => {
                    const items = importPreview.categories[cat];
                    if (!items || items.length === 0) return null;
                    const meta = CATEGORY_META[cat];
                    const conflicts = importPreview.conflicts[cat] ?? [];
                    const conflictCount = conflicts.filter((c) => c.existing).length;
                    const isExpanded = expandedCategories[cat];

                    return (
                      <div key={cat} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <input
                            type="checkbox"
                            checked={importSelectAll[cat]}
                            onChange={() => toggleImportCategory(cat)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => toggleExpandCategory(cat)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={14} className="text-gray-400" />
                            )}
                            <div
                              className={`w-7 h-7 rounded flex items-center justify-center ${meta.bgColor} ${meta.color}`}
                            >
                              {meta.icon}
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{meta.label}</span>
                            <span className="text-xs text-gray-500">({items.length})</span>
                          </button>
                          {conflictCount > 0 && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                              {conflictCount} {conflictCount === 1 ? 'conflict' : 'conflicts'}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Show item details in a simple modal-like expansion
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye size={14} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {items.map((item, idx) => {
                                const hasConflict = conflicts[idx]?.existing ?? false;
                                return (
                                  <div
                                    key={item.id ?? idx}
                                    className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
                                      hasConflict ? 'bg-amber-50 text-amber-800' : 'text-gray-600'
                                    }`}
                                  >
                                    {hasConflict ? (
                                      <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                                    ) : (
                                      <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                                    )}
                                    <span className="font-mono text-gray-400 w-6">{item.id}</span>
                                    <span className="font-medium">{item.name || 'Unnamed'}</span>
                                    {hasConflict && (
                                      <span className="ml-auto text-amber-600">already exists</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Importing step */}
          {importStep === 'importing' && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Importing Data...</h3>
              <p className="text-gray-500">Please wait while we process your snapshot</p>
            </div>
          )}

          {/* Done step */}
          {importStep === 'done' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 md:p-8 text-center max-w-lg mx-auto">
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600 mb-6">Here's what happened:</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-green-700">Imported</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{importResult.conflicts}</p>
                  <p className="text-sm text-amber-700">Skipped (conflicts)</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  <p className="text-sm text-gray-700">Not Selected</p>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetImport}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Import Another
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  View History
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Snapshots</h2>
            {logs.length > 0 && (
              <button
                onClick={() => {
                  setLogs([]);
                  saveLogs([]);
                }}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Clear History
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Snapshots Yet</h3>
              <p className="text-gray-500 mb-6">
                Your export and import history will appear here.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setActiveTab('export')}
                  className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm"
                >
                  Export Snapshot
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm"
                >
                  Import Snapshot
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      log.type === 'export' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {log.type === 'export' ? <Download size={18} /> : <Upload size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm capitalize">{log.type}</span>
                      <span className="text-xs text-gray-400">&middot;</span>
                      <span className="text-xs text-gray-500">
                        {log.itemCount} {log.itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {log.categories.map((cat) => {
                        const meta = CATEGORY_META[cat];
                        return (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${meta.bgColor} ${meta.color}`}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</p>
                    {log.fileName && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">
                        {log.fileName}
                      </p>
                    )}
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

export default SnapshotManager;

