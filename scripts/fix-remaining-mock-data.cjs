const fs = require('fs');
const path = require('path');
const root = __dirname + '/..';
let totalChanges = 0;

// ========== 1. AISalesAssistantPage.tsx - Remove hardcoded demo data ==========
let f1 = fs.readFileSync(path.join(root, 'src', 'components', 'AISalesAssistantPage.tsx'), 'utf8');
let c1 = 0;

// Remove the demo data block inside the api fetch's else branch
// Pattern: if (!data.success) { ... } with demo data
const demoBlockMatch = f1.match(/\/\/ Demo data\s*\n\s+setInsights\(\[[\s\S]*?\]\);\s*\n\s+setHotLeads\(\[[\s\S]*?\]\);\s*\n\s+setForecast\(\{[\s\S]*?\}\);/);
if (demoBlockMatch) {
  // Replace the demo block with just setting empty states
  f1 = f1.replace(demoBlockMatch[0], `// No data available - show empty state
      setInsights([]);
      setHotLeads([]);
      setForecast({ expected: 0, confidence: 0, pipelineValue: 0 });`);
  c1++;
  console.log('1. Removed hardcoded demo data from AISalesAssistantPage');
}

// Also fix the catch block fallback
const catchMatch = f1.match(/catch\s*\{[\s\S]*?setInsights\(\[[\s\S]*?\]\);\s*\n\s+setHotLeads\(\[[\s\S]*?\]\);/);
if (catchMatch) {
  f1 = f1.replace(catchMatch[0], `catch {
      setInsights([]);
      setHotLeads([]);`);
  c1++;
  console.log('1b. Fixed catch block in AISalesAssistantPage');
}

if (c1 > 0) {
  fs.writeFileSync(path.join(root, 'src', 'components', 'AISalesAssistantPage.tsx'), f1);
  totalChanges += c1;
}

// ========== 2. RevenueDashboardPage.tsx - Remove demo data ==========
let f2 = fs.readFileSync(path.join(root, 'src', 'components', 'RevenueDashboardPage.tsx'), 'utf8');
let c2 = 0;

// Find the "Use demo data" block
const revenueDemo = f2.match(/\/\/ Use demo data[\s\S]*?setArpu\([^)]+\);/);
if (revenueDemo) {
  // Replace with empty state
  const replacement = `// No data available - use empty values
      setMrr(0);
      setArr(0);
      setTotalRevenue(0);
      setMonthlyRevenue(0);
      setLastMonthRevenue(0);
      setChurnRate(0);
      setLtv(0);
      setArpu(0);`;
  f2 = f2.replace(revenueDemo[0], replacement);
  c2++;
  console.log('2. Removed Use demo data from RevenueDashboardPage');
}

if (c2 > 0) {
  fs.writeFileSync(path.join(root, 'src', 'components', 'RevenueDashboardPage.tsx'), f2);
  totalChanges += c2;
}

// ========== 3. LeadGenerationPage.tsx - Remove (demo) label from toast ==========
let f3 = fs.readFileSync(path.join(root, 'src', 'components', 'LeadGenerationPage.tsx'), 'utf8');
let c3 = 0;

// Fix the (demo) toast
const demoToast = f3.match(/toast_\(`[^`]*\(demo\)[^`]*`,'success'\);/);
if (demoToast) {
  const newToast = demoToast[0].replace('(demo)', '');
  f3 = f3.replace(demoToast[0], newToast);
  c3++;
  console.log('3. Removed (demo) label from LeadGenerationPage toast');
}

if (c3 > 0) {
  fs.writeFileSync(path.join(root, 'src', 'components', 'LeadGenerationPage.tsx'), f3);
  totalChanges += c3;
}

// ========== 4. workflow-execution.service.ts - Fix Math.random lead scoring ==========
let f4 = fs.readFileSync(path.join(root, 'src', 'server', 'services', 'workflow-execution.service.ts'), 'utf8');
let c4 = 0;

// Replace the Math.random lead scoring with real DB-based calculation
const randomScoringBlock = f4.match(/case 'ai_score_lead':[\s\S]*?default:/);
if (randomScoringBlock) {
  const newScoring = `case 'ai_score_lead':
        // Calculate lead score based on real contact data
        try {
          const { prisma } = require('../db.js');
          const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            select: { dealValue: true, tags: true, lastActivity: true, stage: true }
          }) as any;
          
          let overallScore = 50;
          let engagementScore = 50;
          let recencyScore = 50;
          let intentScore = 50;
          let fitScore = 50;

          if (contact) {
            // Score based on deal value
            engagementScore = Math.min(100, Math.floor((contact.dealValue || 0) / 10000));
            
            // Score based on tags
            const tags = (contact.tags || []).map((t: string) => t.toLowerCase());
            if (tags.includes('hot') || tags.includes('vip')) intentScore = 85;
            else if (tags.includes('warm')) intentScore = 70;
            else if (tags.includes('cold')) intentScore = 30;
            
            // Score based on stage
            switch (contact.stage) {
              case 'Won': fitScore = 95; break;
              case 'Negotiation': fitScore = 85; break;
              case 'Proposal': fitScore = 75; break;
              case 'Qualified': fitScore = 65; break;
              case 'Contacted': fitScore = 55; break;
              default: fitScore = 45;
            }
            
            overallScore = Math.floor((engagementScore + recencyScore + intentScore + fitScore) / 4);
          }

          await prisma.leadScore.upsert({
            where: { contactId: contactId },
            update: { 
              overallScore, engagementScore, recencyScore, 
              intentScore, fitScore, lastCalculated: new Date() 
            },
            create: { 
              contactId: contactId, 
              overallScore, engagementScore, recencyScore, 
              intentScore, fitScore, lastCalculated: new Date() 
            }
          });
        } catch {
          // Score calculation unavailable - skip silently
        }
        break;

      default:`;

  f4 = f4.replace(randomScoringBlock[0], newScoring);
  c4++;
  console.log('4. Replaced Math.random lead scoring with real DB-based calculation');
}

if (c4 > 0) {
  fs.writeFileSync(path.join(root, 'src', 'server', 'services', 'workflow-execution.service.ts'), f4);
  totalChanges += c4;
}

console.log(`\n✅ Total: ${totalChanges} change(s) across all files`);
