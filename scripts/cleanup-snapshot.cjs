const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'SnapshotManager.tsx');
let c = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Remove the "Demo data" comment block
const demoDataComment = `// ─── Demo data (simulates what would come from an API / store) ──────────────\n\n`;
if (c.includes(demoDataComment)) {
  c = c.replace(demoDataComment, '');
  changes++;
  console.log('✅ Removed Demo data comment');
}

// 2. Remove the backward compat comment + empty DEMO_DATA constant
const backwardCompatBlock = `// Re-export DEMO_DATA for backward compat (Snapshots page still references it by name)
const DEMO_DATA: Record<SnapshotCategory, SnapshotItem[]> = {
  contacts: [],
  pipelines: [],
  automations: [],
  templates: [],
  campaigns: [],
  products: [],
};`;

// Find and replace the block
if (c.includes(backwardCompatBlock)) {
  c = c.replace(backwardCompatBlock, '');
  changes++;
  console.log('✅ Removed empty DEMO_DATA constant');
} else {
  console.log('❌ Could not find DEMO_DATA constant block');
}

// 3. Remove the fallback in handleExport that references DEMO_DATA
const oldFallback = `categories[cat] = getDataForCategory(cat).length > 0 ? getDataForCategory(cat) : DEMO_DATA[cat];`;
const newFallback = `categories[cat] = getDataForCategory(cat);`;
if (c.includes(oldFallback)) {
  c = c.replace(oldFallback, newFallback);
  changes++;
  console.log('✅ Removed DEMO_DATA fallback in handleExport');
}

fs.writeFileSync(filePath, c);
console.log(`\n✅ Total: ${changes} change(s) made to SnapshotManager.tsx`);
