import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../src/components/CreativeGeneratorPage.tsx');

let content = fs.readFileSync(filePath, 'utf-8');

// Fix desc format
content = content.replace(/1080Ã—1080/g, '1080×1080');
content = content.replace(/1080Ã—1920/g, '1080×1920');
content = content.replace(/1200Ã—628/g, '1200×628');

// Fix template emojis - replace each mojibake with correct emoji
const fixes = [
  ['ðŸª"', '🪔'],
  ['ðŸŽ¨', '🎨'],
  ['ðŸŒ™', '🌙'],
  ['ðŸŽ„', '🎄'],
  ['ðŸŒ¾', '🌾'],
  ['âš¡', '⚡'],
  ['ðŸª', '🏪'],
  ['ðŸŽ¯', '🎯'],
  ['ðŸ†•', '🆕'],
  ['ðŸ†', '🏆'],
  ['ðŸŒ§', '🌧'],
  ['ðŸ½', '🍽'],
  ['ðŸ›', '🍛'],
  ['ðŸ•', '🍕'],
  ['ðŸ"‹', '📋'],
  ['ðŸ\'°', '💰'],
  ['ðŸ˜Š', '😊'],
  ['ðŸ\'\u008D', '💁'],
  ['ðŸ\'Ž', '💎'],
  ['ðŸŽ‚', '🎂'],
  ['ðŸŽˆ', '🎈'],
  ['â­\u00AD', '⭐'],
  ['â˜\u0080', '☀'],
  ['â\u009D\u0082', '❄'],
  ['ðŸ›\u0081', '🛍'],
  ['ðŸ\"±', '📱'],
  ['ðŸ\u009D\u0081', '🎁'],
  ['ðŸ\'¡', '💡'],
  ['ðŸ\"\"', '📢'],
  ['ðŸ¥‡', '🥇'],
  ['ðŸ\"¢', '📣'],
  ['ðŸ\'«', '💫'],
  ['ðŸŽŠ', '🎊'],
  ['ðŸŒŸ', '🌟'],
  ['ðŸŽª', '🎪'],
  ['ðŸš€', '🚀'],
  ['ðŸ\'¥', '💥'],
  ['âœ¨', '✨'],
  ['âœ…', '✅'],
];

for (const [bad, good] of fixes) {
  while (content.includes(bad)) {
    content = content.replace(bad, good);
  }
}

// Fix logo style icons
content = content.replace(/icon: 'â¬¡'/g, "icon: '🔷'");
content = content.replace(/icon: 'âœ¦'/g, "icon: '✨'");
content = content.replace(/icon: 'â—ˆ'/g, "icon: '⭕'");
content = content.replace(/icon: 'â˜…'/g, "icon: '⭐'");
content = content.replace(/icon: 'ðŸŒ¿'/g, "icon: '🌿'");
content = content.replace(/icon: 'â™¦'/g, "icon: '👑'");

// Fix ₹ symbol
content = content.replace(/â‚¹/g, '₹');

// Replace entire stickers array with clean emojis
content = content.replace(
  /const STICKERS = \[.*?\];/s,
  "const STICKERS = ['⭐', '🔥', '❤️', '✨', '🎉', '💥', '🎯', '✅', '🚀', '💰', '💎', '🏆', '🌟', '🎪', '🎨', '🛍️', '📱', '🎁', '💡', '📢', '🥇', '📣', '💫', '🎊'];"
);

fs.writeFileSync(filePath, content, 'utf-8');

// Verify
const check = fs.readFileSync(filePath, 'utf-8');
const remaining = (check.match(/ðŸ|âœ|â¬|â—|â˜|â™|âš/g) || []).length;
console.log('Fixed CreativeGeneratorPage.tsx! Remaining mojibake: ' + remaining);
