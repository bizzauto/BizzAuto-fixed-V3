const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'SnapshotManager.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
let changes = 0;

// 1. Fix React import to include useEffect
const importIdx = lines.findIndex(l => l.includes('import React') && l.includes('useState'));
if (importIdx !== -1) {
  const oldImport = lines[importIdx];
  if (!oldImport.includes('useEffect')) {
    lines[importIdx] = oldImport.replace('useCallback', 'useCallback, useEffect');
    changes++;
    console.log('✅ Added useEffect to React import');
  }
}

// Find the data access helper functions added by the fix-snapshot.cjs script
// They contain `getDataForCategory` and `itemExistsInLiveData`

// 2. Fix handleExport: replace DEMO_DATA[cat] with getDataForCategory(cat)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('categories[cat] = DEMO_DATA[cat];')) {
    lines[i] = lines[i].replace('categories[cat] = DEMO_DATA[cat];', 'categories[cat] = getDataForCategory(cat).length > 0 ? getDataForCategory(cat) : DEMO_DATA[cat];');
    changes++;
    console.log('✅ Fixed handleExport categories[cat] at line', i+1);
  }
  if (lines[i].includes('totalItems += DEMO_DATA[cat].length;')) {
    lines[i] = lines[i].replace('totalItems += DEMO_DATA[cat].length;', 'totalItems += categories[cat]?.length || 0;');
    changes++;
    console.log('✅ Fixed handleExport totalItems at line', i+1);
  }
}

// 3. Fix handleFileSelect conflict detection
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('DEMO_DATA[cat]?.some((existing) => existing.name === item.name)')) {
    lines[i] = lines[i].replace(
      'DEMO_DATA[cat]?.some((existing) => existing.name === item.name) ?? false',
      'itemExistsInLiveData(cat, item.name)'
    );
    changes++;
    console.log('✅ Fixed conflict detection at line', i+1);
  }
}

// 4. Fix renderCategoryCheckbox count
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('DEMO_DATA[cat].length')) {
    // Check context - this should be from live data
    lines[i] = lines[i].replace('DEMO_DATA[cat].length', '(getDataForCategory(cat).length || 0)');
    changes++;
    console.log('✅ Fixed renderCategoryCheckbox count at line', i+1);
  }
}

// 5. Fix export preview section
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const items = DEMO_DATA[cat];') || lines[i].includes('const items = DEMO_DATA[cat]')) {
    lines[i] = lines[i].replace('DEMO_DATA[cat]', 'getDataForCategory(cat)');
    changes++;
    console.log('✅ Fixed export preview items at line', i+1);
  }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log(`\n✅ Total: ${changes} change(s) made to SnapshotManager.tsx`);
