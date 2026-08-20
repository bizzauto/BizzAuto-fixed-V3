import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const replacements = [
  [/â€¢/g, '•'],
  [/â‚¹/g, '₹'],
  [/Ã—/g, '×'],
  [/â€”/g, '—'],
  [/â€“/g, '–'],
  [/â†'/g, '→'],
  [/â†’/g, '→'],
  [/âœ…/g, '✅'],
  [/âœ“/g, '✓'],
  [/âš /g, '⚠'],
  [/âš /g, '⚠'],
  [/â‚¬/g, '€'],
  [/âšª/g, '⚪'],
  [/â„/g, '❄'],
  [/â‹®/g, '⋮'],
  [/â”€/g, '─'],
  [/ðŸ’¾/g, '💾'],
  [/ðŸ˜Š/g, '😊'],
  [/ðŸ‘/g, '👍'],
  [/ðŸŸ¢/g, '🟢'],
  [/ðŸŽ‰/g, '🎉'],
  [/ðŸ‘‹/g, '👋'],
  [/ðŸ“Š/g, '📊'],
  [/ðŸ–¼/g, '🖼'],
  [/ðŸ›/g, '🛍'],
  [/ðŸ›’/g, '🛒'],
  [/ðŸŽ/g, '🎁'],
  [/ðŸ“¦/g, '📦'],
  [/ðŸŒ¸/g, '🌷'],
  [/ðŸ“±/g, '📱'],
  [/ðŸ’¬/g, '💬'],
  [/ðŸ“„/g, '📄'],
  [/ðŸ·/g, '🏷'],
  [/ðŸ“…/g, '📅'],
  [/ðŸ“/g, '📝'],
  [/ðŸ“Ž/g, '📎'],
  [/ðŸ’¡/g, '💡'],
  [/ðŸ”„/g, '🔄'],
  [/ðŸ”¥/g, '🔥'],
  [/ðŸ‘¤/g, '👤'],
  [/ðŸ“§/g, '📧'],
  [/ðŸ’³/g, '💳'],
  [/ðŸ“‹/g, '📋'],
  [/ðŸ“‚/g, '📂'],
  [/ðŸš€/g, '🚀'],
  [/ðŸ“¢/g, '📢'],
  [/ðŸ“¸/g, '📸'],
  [/ðŸ“·/g, '📷'],
  [/ðŸŽ¬/g, '🎬'],
  [/ðŸ‘¥/g, '👥'],
  [/ðŸ“‘/g, '🔗'],
  [/ðŸ“ž/g, '📞'],
  [/ðŸ¤/g, '🤝'],
  [/ðŸ’»/g, '💻'],
  [/ðŸ”§/g, '🔧'],
  [/ðŸ“˜/g, '📘'],
  [/ðŸ’¼/g, '💼'],
  [/ðŸ¦/g, '🐦'],
  [/ðŸ¢/g, '🏢'],
  [/ðŸ”/g, '🔐'],
  [/ðŸŽ/g, '🍎'],
  [/ðŸ¥/g, '🏥'],
  [/ðŸ\xa0/g, '🏠'],
  [/ðŸ•/g, '🍕'],
  [/ðŸ’‡/g, '💇'],
  [/ðŸ“š/g, '📚'],
  [/ðŸ¤–/g, '🤖'],
  [/ðŸŽ‚/g, '🎂'],
  [/ðŸª”/g, '🪔'],
  [/ðŸŒ/g, '🌐'],
  [/ðŸ­/g, '🏭'],
  [/ðŸ‡¬ðŸ‡§/g, '🇬🇧'],
  [/ðŸ‡®ðŸ‡³/g, '🇮🇳'],

  // Additional patterns missed in first pass
  [/â³/g, '⏳'],
  [/âš¡/g, '⚡'],
  [/âœ•/g, '✔'],
  [/âœ—/g, '✖'],
  [/â†‘/g, '↑'],
  [/â†“/g, '↓'],
  [/â†µ/g, '↵'],
  [/â“ˆ/g, '⚙'],
  [/â˜Ž/g, '☎'],
  [/â™¥/g, '♥'],
  [/â˜‘/g, '☑'],
  [/âœ”/g, '✔'],

  // CreativeGeneratorPage Hindi text corruption
  // These were Devanagari Hindi strings that got double-encoded
  // Replace with English text since original can't be recovered
  [/à¤§à¤®à¤¾à¤•à¥‡à¤¦à¤¾à¤° à¤‘à¤«à¤°/g, 'Biggest Sale Ever'],
  [/à¤¤à¥à¤¯à¥‹à¤¹à¤¾à¤°à¥€ à¤›à¥‚à¤Ÿ/g, 'Festival Special'],
  [/à¤¨à¤¯à¤¾ à¤•à¤²à¥‡à¤•à¥à¤¶à¤¨/g, 'New Collection'],
  [/à¤œà¤²à¥à¤¦à¥€ à¤•à¤°à¥‡à¤‚/g, 'Limited Time'],
  [/à¤¸à¥à¤ªà¥‡à¤¶à¤² à¤¡à¥€à¤²/g, 'Exclusive Deal'],
  [/à¤…à¤­à¥€ à¤–à¤°à¥€à¤¦à¥‡à¤‚/g, 'Shop Now'],
  [/à¤¸à¥€à¤®à¤¿à¤¤ à¤¸à¤®à¤¯/g, 'Limited Time'],
  [/à¤¸à¥à¤Ÿà¥‰à¤• à¤–à¤¤à¥à¤®/g, 'While Stocks Last'],
  [/à¤†à¤ªà¤•à¥€ à¤¸à¤¬à¤Ÿà¤¾à¤‡à¤Ÿà¤²/g, 'Your subtitle goes here'],
  [/à¤¹à¥‡à¤¡à¤²à¤¾à¤‡à¤¨ à¤²à¤¿à¤–à¥‡à¤‚/g, 'Enter headline...'],
  [/à¤¹à¥‡à¤¡à¤²à¤¾à¤‡à¤¨/g, 'Headline'],
  [/à¤¨à¤¯à¤¾ à¤•à¥‰à¤²à¥‡à¤•à¥à¤¶à¤¨/g, 'New Collection'],
  [/à¤œà¤²à¥à¤¦à¥€ à¤•à¤°à¥‹/g, 'Hurry Up'],
  [/à¤¹à¤®à¤¾à¤°à¥€ à¤“à¤° à¤¸à¥‡/g, 'From us'],
  [/à¤¬à¤¹à¥à¤¤ à¤¬à¤¢à¤¼à¤¿à¤¯à¤¾/g, 'Amazing'],
  [/à¤†à¤œ à¤¹à¥€ à¤†à¤°à¥à¤¡à¤° à¤•à¤°à¥‡à¤‚/g, 'Order Now'],
  [/à¤†à¤ªà¤•à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆ/g, 'Welcome'],
  [/à¤¹à¥ˆà¤²à¥à¤« à¤ªà¥à¤°à¤¾à¤‡à¤¸/g, 'Half Price'],
  [/à¤®à¥à¤«à¥à¤¤ à¤¹à¥ˆ/g, 'Free'],
  // More CreativeGeneratorPage Hindi text (different corruption variants)
  [/à¤•à¥‹à¤ˆ à¤ªà¥‹à¤¸à¥à¤Ÿà¤° à¤¸à¥‡à¤µ à¤¨à¤¹à¥€à¤‚/g, 'No saved posters yet'],
  [/à¤…à¤ªà¤¨à¤¾ à¤ªà¤¹à¤²à¤¾ à¤ªà¥‹à¤¸à¥à¤Ÿà¤° à¤¬à¤¨à¤¾à¤à¤‚/g, 'Create your first poster'],
  [/à¤…à¤ªà¤¨à¥€ à¤¹à¥‡à¤¡à¤²à¤¾à¤‡à¤¨ à¤²à¤¿à¤–à¥‡à¤‚/g, 'Your Headline'],

  // Box drawing section separators
  [/â•/g, '═'],

  // More emoji / special chars
  [/âŒ/g, '❌'],
  [/â°/g, '🕐'],
  [/âœ¨/g, '✨'],
  [/â†/g, '←'],
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.git')) {
      yield* walk(full);
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      yield full;
    }
  }
}

let totalFixed = 0;
let modFiles = 0;

for (const file of walk('src')) {
  let content = readFileSync(file, 'utf8');
  let beforeCount = (content.match(/[âÃð]/g) || []).length;
  if (beforeCount === 0) continue;

  for (const [re, sub] of replacements) {
    content = content.replace(re, sub);
  }

  let afterCount = (content.match(/[âÃð]/g) || []).length;
  let fixed = beforeCount - afterCount;
  if (fixed > 0) {
    writeFileSync(file, content, 'utf8');
    totalFixed += fixed;
    modFiles++;
    console.log(`${file.replace(/.*[/\\]/, '')}: ${fixed} fixes`);
  }
}

console.log(`\n✅ Fixed ${totalFixed} mojibake occurrences across ${modFiles} files`);
