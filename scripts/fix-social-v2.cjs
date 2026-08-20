const fs = require('fs');
const lines = fs.readFileSync('src/components/SocialMediaPage.tsx', 'utf8').split('\n');
let changes = 0;

// 1. Fix import line (line 13 using postsAPI)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("postsAPI") && lines[i].includes("socialAccountsAPI") && !lines[i].includes("analyticsAPI")) {
    lines[i] = lines[i].replace(
      "import { postsAPI, instagramAPI, socialAccountsAPI }",
      "import { postsAPI, instagramAPI, socialAccountsAPI, analyticsAPI }"
    );
    changes++;
    console.log(`1. analyticsAPI import added at line ${i+1}`);
    break;
  }
}

// 2. Add social stats state after toast state line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setToast") && lines[i].includes("useState") && lines[i].includes("string")) {
    const newLines = [
      "  const [socialStats, setSocialStats] = useState<{ total: number; published: number; scheduled: number; draft: number } | null>(null);",
      "  const [byPlatform, setByPlatform] = useState<Record<string, any>>({});",
      "  const [socialLoading, setSocialLoading] = useState(false);",
      "  const [weeklyEngagement, setWeeklyEngagement] = useState<any[]>([]);",
    ];
    lines.splice(i + 1, 0, ...newLines.map(l => l + '\r'));
    changes++;
    console.log(`2. Social stats state added after line ${i+1}`);
    break;
  }
}

// 3. Rename platformStats to demoPlatformStats and add conditional
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("// Demo platform stats") && lines[i+1].includes("const platformStats")) {
    lines[i] = lines[i].replace("// Demo platform stats", "// Demo platform stats (fallback)");
    lines[i+1] = lines[i+1].replace("const platformStats", "const demoPlatformStats");
    
    // Find the closing ];
    let closeIdx = -1;
    for (let j = i + 2; j < lines.length; j++) {
      if (lines[j].includes("];")) { closeIdx = j; break; }
    }
    
    if (closeIdx > 0) {
      const conditionalLines = [
        "  // Use real API data when available, fallback to demo",
        "  const platformStats = isDemoMode || Object.keys(byPlatform).length === 0",
        "    ? demoPlatformStats",
        '    : Object.entries(byPlatform).map(([name, count]) => ({',
        "        platform: name.charAt(0).toUpperCase() + name.slice(1),",
        "        icon: ({ facebook: '\uD83D\uDCD8', instagram: '\uD83D\uDCF7', linkedin: '\uD83D\uDCBC', twitter: '\uD83D\uDC26', youtube: '\uD83D\uDCFA' })[name.toLowerCase()] || '\uD83D\uDCF1',",
        "        posts: typeof count === 'number' ? count : 0,",
        "        followers: 0,",
        "        engagement: 0,",
        "      }));",
      ];
      lines.splice(closeIdx + 1, 0, ...conditionalLines.map(l => l + '\r'));
      changes++;
      console.log(`3. platformStats made conditional`);
    }
    break;
  }
}

// 4. Make engagementData and platformDistribution conditional
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("// Demo analytics data") && lines[i+1].includes("const engagementData")) {
    lines[i] = lines[i].replace("// Demo analytics data", "// Demo analytics data (fallback)");
    lines[i+1] = lines[i+1].replace("const engagementData", "const demoEngagementData");
    
    // Find closing ]; of engagementData
    let closeEng = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (j > i + 1 && lines[j].trim() === "];") { closeEng = j; break; }
    }
    
    // Find platformDistribution
    let platIdx = -1;
    for (let j = closeEng + 1; j < lines.length; j++) {
      if (lines[j].includes("const platformDistribution")) { platIdx = j; break; }
    }
    
    if (platIdx > 0) {
      lines[platIdx] = lines[platIdx].replace("const platformDistribution", "const demoPlatformDistribution");
      
      // Find closing ]; of platformDistribution  
      let closePlat = -1;
      for (let j = platIdx + 1; j < lines.length; j++) {
        if (lines[j].trim() === "];") { closePlat = j; break; }
      }
      
      if (closePlat > 0 && closeEng > 0) {
        const conditionalEngData = [
          "  const engagementData = isDemoMode || weeklyEngagement.length === 0 ? demoEngagementData : weeklyEngagement;",
          "",
          "  const platformDistribution = isDemoMode || Object.keys(byPlatform).length === 0",
          "    ? demoPlatformDistribution",
          '    : Object.entries(byPlatform).map(([name, count], i) => ({',
          "        name: name.charAt(0).toUpperCase() + name.slice(1),",
          "        value: typeof count === 'number' ? count : 0,",
          "        color: (['#3B82F6', '#EC4899', '#0A66C2', '#000000', '#EF4444'])[i % 5],",
          "      }));",
        ];
        lines.splice(closePlat + 1, 0, ...conditionalEngData.map(l => l + '\r'));
        changes++;
        console.log(`4. engagementData/platformDistribution made conditional`);
      }
    }
    break;
  }
}

// 5. Add analyticsAPI.social() fetch after Instagram status
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setIgStatus(res.data.data)") && lines[i-1].includes("if (res.data.success)")) {
    const analyticsFetch = [
      "",
      "      // Fetch social analytics",
      "      setSocialLoading(true);",
      "      analyticsAPI.social().then(res => {",
      "        if (res.data.success) {",
      "          const d = res.data.data;",
      "          if (d.stats) setSocialStats(d.stats);",
      "          if (d.byPlatform) setByPlatform(d.byPlatform);",
      "          if (d.weeklyEngagement) setWeeklyEngagement(d.weeklyEngagement);",
      "        }",
      "      }).catch(() => {}).finally(() => setSocialLoading(false));",
    ];
    lines.splice(i + 1, 0, ...analyticsFetch.map(l => l + '\r'));
    changes++;
    console.log(`5. Analytics fetch added after line ${i+1}`);
    break;
  }
}

// 6. Replace hardcoded StatCard values
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('label="Total Posts"') && lines[i].includes('value="137"')) {
    lines[i] = lines[i].replace(
      'value="137" change="+12%"',
      'value={isDemoMode ? "137" : (socialStats?.total ?? 0).toString()} change={isDemoMode ? "+12%" : "+0%"}'
    );
    changes++;
    console.log(`6a. Total Posts StatCard fixed at line ${i+1}`);
    break;
  }
}
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('label="Scheduled"') && lines[i].includes('value="8"')) {
    lines[i] = lines[i].replace(
      'value="8" change="+3"',
      'value={isDemoMode ? "8" : (socialStats?.scheduled ?? 0).toString()} change={isDemoMode ? "+3" : "+0"}'
    );
    changes++;
    console.log(`6b. Scheduled StatCard fixed at line ${i+1}`);
    break;
  }
}
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('label="Engagement Rate"') && lines[i].includes('value="4.8%"')) {
    lines[i] = lines[i].replace(
      'value="4.8%" change="+0.6%"',
      `value={isDemoMode ? "4.8%" : posts.filter(p => p.status === 'published').length > 0 ? ((posts.reduce((s, p) => s + p.likes + p.comments, 0) / posts.filter(p => p.status === 'published').length) * 0.1).toFixed(1) + '%' : "0%"} change={isDemoMode ? "+0.6%" : "+0%"}`
    );
    changes++;
    console.log(`6c. Engagement Rate StatCard fixed at line ${i+1}`);
  }
}
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('label="Total Reach"') && lines[i].includes('value="24.5K"')) {
    lines[i] = lines[i].replace(
      'value="24.5K" change="+18%"',
      `value={isDemoMode ? "24.5K" : (() => { const r = posts.reduce((s, p) => s + (p.reach || 0), 0); return r > 1000 ? (r / 1000).toFixed(1) + 'K' : r.toString(); })()} change={isDemoMode ? "+18%" : "+0%"}`
    );
    changes++;
    console.log(`6d. Total Reach StatCard fixed at line ${i+1}`);
  }
}

// 7. Replace calendar Math.random with real scheduled posts
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Calendar data for current month") && lines[i+1].includes("const calendarDays")) {
    const newCalendar = [
      "  const calendarDays = Array.from({ length: 35 }, (_, i) => {",
      "    const day = i - 2;",
      "    const scheduledOnDay = isDemoMode ? 0 : posts.filter(p => {",
      "      if (p.status !== 'scheduled' && p.status !== 'published') return false;",
      "      const date = p.scheduledAt || p.publishedAt;",
      "      if (!date) return false;",
      "      const d = new Date(date);",
      "      return d.getDate() === day && d.getMonth() === new Date().getMonth();",
      "    }).length;",
      "    const demoCount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;",
      "    return { day: day > 0 && day <= 31 ? day : null, posts: isDemoMode ? demoCount : scheduledOnDay };",
      "  });",
    ];
    // Find the end of old calendarDays (closing });
    let endIdx = i + 1;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      if (lines[j].includes("});")) { endIdx = j; break; }
      if (lines[j].trim() === "});") { endIdx = j; break; }
    }
    // Remove old calendarDays lines
    lines.splice(i, endIdx - i + 1, ...newCalendar.map(l => l + '\r'));
    changes++;
    console.log(`7. Calendar made conditional`);
    break;
  }
}

// 8. Replace hardcoded follower growth line chart
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("name: 'Jan', followers: 8200") && lines[i-1].includes("LineChart data={[")) {
    lines[i-1] = lines[i-1].replace(
      "LineChart data={[",
      `LineChart data={isDemoMode ? [`
    );
    
    // Find the closing ]} of the data array
    for (let j = i; j < Math.min(i + 10, lines.length); j++) {
      if (lines[j].includes("]}")) {
        // Add conditional fallback
        lines[j] = lines[j].replace(
          "]}",
          `] : weeklyEngagement.length > 0 ? weeklyEngagement.map((w, i) => ({ name: w.name || w.day || 'Day ' + (i+1), followers: w.likes || w.reach || 0 })) : []}>`
        );
        break;
      }
    }
    changes++;
    console.log(`8. Follower growth chart made conditional`);
    break;
  }
}

fs.writeFileSync('src/components/SocialMediaPage.tsx', lines.join('\n'));
console.log(`\nTotal: ${changes}/8 changes applied`);
