const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'DashboardPage.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
let changes = 0;

// Find the demo mode block: line 238 = "    if (isDemoMode) {"
// And add setRevenueData, setActivityFeed, setInsights before setLoading(false)
const isDemoIdx = lines.findIndex(l => l.trim() === 'if (isDemoMode) {');
if (isDemoIdx !== -1) {
  const setLoadingFalseIdx = lines.findIndex((l, i) => i > isDemoIdx && l.trim() === 'setLoading(false);');
  if (setLoadingFalseIdx !== -1) {
    lines.splice(setLoadingFalseIdx, 0,
      '      setRevenueData(demoRevenueData);',
      '      setActivityFeed(demoActivityFeed);',
      '      setInsights(demoInsights);'
    );
    changes++;
    console.log('✅ Added revenue/activity/insights to demo mode block');
  }
}

// Find the setRecentLeads block and add revenue/activity/insights after it
const setRecentLeadsIdx = lines.findIndex(l => l.trim() === 'setRecentLeads(formattedLeads);');
if (setRecentLeadsIdx !== -1) {
  // Look for catch block after this
  const catchIdx = lines.findIndex((l, i) => i > setRecentLeadsIdx && l.trim() === '} catch (err: any) {');
  if (catchIdx !== -1) {
    // Insert between setRecentLeads and catch
    lines.splice(catchIdx, 0,
      '',
      '      // Set revenue data from API (fallback to demo)',
      '      const revData = dashData?.data?.revenue ?? [];',
      '      setRevenueData(Array.isArray(revData) && revData.length > 0 ? revData : demoRevenueData);',
      '',
      '      // Set activity feed from API (fallback to demo)',
      '      const actData = dashData?.data?.activity ?? [];',
      '      setActivityFeed(Array.isArray(actData) && actData.length > 0 ? actData : demoActivityFeed);',
      '',
      '      // Set AI insights from API (fallback to demo)',
      '      const insData = dashData?.data?.insights ?? [];',
      '      setInsights(Array.isArray(insData) && insData.length > 0 ? insData : demoInsights);'
    );
    changes++;
    console.log('✅ Added revenue/activity/insights API fetch block');
  }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log(`\n✅ Total: ${changes} change(s) made to DashboardPage.tsx`);
