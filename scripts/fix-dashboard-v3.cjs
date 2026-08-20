const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'DashboardPage.tsx');
let c = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Add state for revenueData, activityFeed, insights after existing state declarations
// Find: const [activityFeed, setActivityFeed] = useState<any[]>([]);
const stateLine = '  const [activityFeed, setActivityFeed] = useState<any[]>([]);';
if (c.includes(stateLine)) {
  c = c.replace(stateLine,
    '  const [activityFeed, setActivityFeed] = useState<any[]>([]);\n  const [insights, setInsights] = useState<any[]>([]);');
  changes++;
  console.log('✅ Added insights state');
} else {
  console.log('❌ Could not find activityFeed state line');
}

// 2. In the fetchDashboard() function, add setting of revenueData, activityFeed, insights
// Find the part where demo mode is handled
const demoModeBlock = '    // If in demo mode, use mock data\n    if (isDemoMode) {\n      setStats(demoStats);\n      setAnalyticsData(demoAnalyticsData);\n      setPipelineData(demoPipelineData);\n      setRecentLeads(demoRecentLeads);\n      setLoading(false);\n      return;\n    }';
const demoModeBlockReplacement = '    // If in demo mode, use mock data\n    if (isDemoMode) {\n      setStats(demoStats);\n      setAnalyticsData(demoAnalyticsData);\n      setPipelineData(demoPipelineData);\n      setRecentLeads(demoRecentLeads);\n      setRevenueData(demoRevenueData);\n      setActivityFeed(demoActivityFeed);\n      setInsights(demoInsights);\n      setLoading(false);\n      return;\n    }';
if (c.includes(demoModeBlock)) {
  c = c.replace(demoModeBlock, demoModeBlockReplacement);
  changes++;
  console.log('✅ Updated demo mode block to set revenue/activity/insights');
} else {
  console.log('❌ Could not find demo mode block');
}

// 3. After the API fetch block, set revenueData, activityFeed, insights from API or fallback
// Find:       setRecentLeads(formattedLeads);\n    } catch (err: any) {
const apiEndBlock = '      setRecentLeads(formattedLeads);\n    } catch (err: any) {';
const apiEndBlockReplacement = '      setRecentLeads(formattedLeads);\n\n      // Set revenue data\n      const revData = dashData?.data?.revenue ?? [];\n      setRevenueData(Array.isArray(revData) && revData.length > 0 ? revData : demoRevenueData);\n\n      // Set activity feed\n      const actData = dashData?.data?.activity ?? [];\n      setActivityFeed(Array.isArray(actData) && actData.length > 0 ? actData : demoActivityFeed);\n\n      // Set AI insights\n      const insData = dashData?.data?.insights ?? [];\n      setInsights(Array.isArray(insData) && insData.length > 0 ? insData : demoInsights);\n    } catch (err: any) {';
if (c.includes(apiEndBlock)) {
  c = c.replace(apiEndBlock, apiEndBlockReplacement);
  changes++;
  console.log('✅ Added revenue/activity/insights fetch from API with fallback');
} else {
  console.log('❌ Could not find API end block');
}

// 4. Replace demoRevenueData reference in BarChart with revenueData
const revChartLine = '            <BarChart data={demoRevenueData}>';
if (c.includes(revChartLine)) {
  c = c.replace(revChartLine, '            <BarChart data={revenueData}>');
  changes++;
  console.log('✅ Replaced demoRevenueData with revenueData in chart');
} else {
  console.log('❌ Could not find demoRevenueData in chart');
}

// 5. Replace demoActivityFeed in Live Activity section
const actFeedLine = '            {demoActivityFeed.map((activity) => (';
if (c.includes(actFeedLine)) {
  c = c.replace(actFeedLine, '            {activityFeed.map((activity) => (');
  changes++;
  console.log('✅ Replaced demoActivityFeed with activityFeed');
} else {
  console.log('❌ Could not find demoActivityFeed in map');
}

// 6. Replace demoInsights in AI Insights section
const insLine = '            {demoInsights.map((insight) => (';
if (c.includes(insLine)) {
  c = c.replace(insLine, '            {insights.map((insight) => (');
  changes++;
  console.log('✅ Replaced demoInsights with insights');
} else {
  console.log('❌ Could not find demoInsights in map');
}

fs.writeFileSync(filePath, c);
console.log(`\n✅ Total changes made: ${changes}`);
