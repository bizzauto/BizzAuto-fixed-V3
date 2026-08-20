const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'SnapshotManager.tsx');
let c = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Add API imports to the existing imports section
// Find the import from './Toast' line and add API imports after it
const toastImportLine = `import { useToast } from './Toast';`;
const apiImportsBlock = `import { useToast } from './Toast';
import { contactsAPI, pipelinesAPI, automationAPI, emailAPI, campaignsAPI, ecommerceAPI } from '../lib/api';`;

if (c.includes(toastImportLine)) {
  c = c.replace(toastImportLine, apiImportsBlock);
  changes++;
  console.log('✅ Added API imports');
} else {
  console.log('❌ Could not find Toast import');
}

// 2. Replace the DEMO_DATA constant with a memory cache + add fetch function
const demoDataStart = `const DEMO_DATA: Record<SnapshotCategory, SnapshotItem[]> = {`;
const demoDataEnd = `};`;
const demoDataStartIdx = c.indexOf(demoDataStart);
if (demoDataStartIdx !== -1) {
  const demoDataEndIdx = c.indexOf(demoDataEnd, demoDataStartIdx) + 2; // include `};`
  const demoSpan = c.slice(demoDataStartIdx, demoDataEndIdx);
  
  const replacement = `// ─── Data Cache & Fetcher ─────────────────────────────────────────────────

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

// Re-export DEMO_DATA for backward compat (Snapshots page still references it by name)
const DEMO_DATA: Record<SnapshotCategory, SnapshotItem[]> = {
  contacts: [],
  pipelines: [],
  automations: [],
  templates: [],
  campaigns: [],
  products: [],
};`;

  c = c.replace(demoSpan, replacement);
  changes++;
  console.log('✅ Replaced DEMO_DATA with fetchSnapshotData() + cache');
} else {
  console.log('❌ Could not find DEMO_DATA constant');
}

// 3. In the SnapshotManager component, add useEffect to fetch real data
// Find the component function start
const compStart = `const SnapshotManager: React.FC = () => {`;
// Add useEffect + loading state for data fetch after the error/success destructure
const compStartIdx = c.indexOf(compStart);
if (compStartIdx !== -1) {
  // Find the line after useToast destructure and add fetch
  const toastLineIdx = c.indexOf(`  const { error: showError, success: showSuccess } = useToast();`, compStartIdx);
  if (toastLineIdx !== -1) {
    const insertAt = toastLineIdx + `  const { error: showError, success: showSuccess } = useToast();`.length;
    const fetchCode = `
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
`;
    c = c.slice(0, insertAt) + fetchCode + c.slice(insertAt);
    changes++;
    console.log('✅ Added data fetching useEffect + helpers');
  }
}

fs.writeFileSync(filePath, c);
console.log(`\n✅ Total: ${changes} change(s) made to SnapshotManager.tsx`);
