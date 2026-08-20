import fs from 'fs';
import path from 'path';

const SRC = 'src/components';
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

// All mojibake replacement pairs: [broken_pattern, correct_replacement]
const REPLACEMENTS = [
  // Category 1: 4-byte UTF-8 emojis broken into Windows-1252
  // Specific broken sequences from the audit
  ['\u00F0\u009F\u008E\u0089', '🎉'],  // 🎉
  ['\u00F0\u009F\u008E\u0081', '🎁'],  // 🎁
  ['\u00F0\u009F\u0093\u00A6', '📦'],  // 📦
  ['\u00F0\u009F\u008C\u00B8', '🌸'],  // 🌸
  ['\u00F0\u009F\u0092\u00B0', '💰'],  // 💰
  ['\u00F0\u009F\u0091\u008D', '💍'],  // 💍
  ['\u00F0\u009F\u008E\u0082', '🎂'],  // 🎂
  ['\u00F0\u009F\u008E\u00AA', '🎨'],  // 🎨
  ['\u00F0\u009F\u0091\u00B0', '👤'],  // 👤
  ['\u00F0\u009F\u0092\u00AC', '💬'],  // 💬
  ['\u00F0\u009F\u0092\u00A9', '📧'],  // 📧
  ['\u00F0\u009F\u0093\u00B5', '📅'],  // 📅
  ['\u00F0\u009F\u0092\u00B3', '💳'],  // 💳
  ['\u00F0\u009F\u0093\u009D', '📝'],  // 📝
  ['\u00F0\u009F\u0092\u00A6', '🔗'],  // 🔗
  ['\u00F0\u009F\u0092\u00A1', '💡'],  // 💡
  ['\u00F0\u009F\u0094\u00A7', '🔧'],  // 🔧
  ['\u00F0\u009F\u0092\u00AA', '📢'],  // 📢
  ['\u00F0\u009F\u009A\u0080', '🚀'],  // 🚀
  ['\u00F0\u009F\u0093\u00B7', '📷'],  // 📷
  ['\u00F0\u009F\u0093\u00B1', '📱'],  // 📱
  ['\u00F0\u009F\u0092\u00E5', '😊'],  // 😊
  ['\u00F0\u009F\u0091\u008C', '👍'],  // 👍
  ['\u00F0\u009F\u009F\u00A2', '🟢'],  // 🟢
  ['\u00F0\u009F\u008E\u008B', '🎉'],  // 🎉 (alt)
  ['\u00F0\u009F\u0087\u00AC\u00F0\u009F\u0087\u00A7', '🇬🇧'],  // 🇬🇧
  ['\u00F0\u009F\u0087\u00AE\u00F0\u009F\u0087\u00B3', '🇮🇳'],  // 🇮🇳
  ['\u00F0\u009F\u0091\u008B', '👋'],  // 👋
  ['\u00F0\u009F\u0092\u00BE', '💾'],  // 💾
  ['\u00F0\u009F\u0092\u00A5', '🔥'],  // 🔥
  ['\u00F0\u009F\u008E\u00A8', '🖼'],  // 🖼
  ['\u00F0\u009F\u008E\u00AC', '🎬'],  // 🎬
  ['\u00F0\u009F\u0091\u00A5', '👥'],  // 👥
  ['\u00F0\u009F\u0093\u0091', '📋'],  // 📋
  ['\u00F0\u009F\u0093\u0082', '📂'],  // 📂
  ['\u00F0\u009F\u0093\u0084', '📑'],  // 📑
  ['\u00F0\u009F\u0094\u00B9', '🏷'],  // 🏷
  ['\u00F0\u009F\u008E\u008D', '🎄'],  // 🎄
  ['\u00F0\u009F\u0092\u008E', '💎'],  // 💎
  ['\u00F0\u009F\u008F\u0086', '🏆'],  // 🏆
  ['\u00F0\u009F\u008C\u009F', '🌟'],  // 🌟
  ['\u00F0\u009F\u0094\u00A2', '🔔'],  // 🔔
  ['\u00F0\u009F\u0094\u00A3', '🔊'],  // 🔊
  ['\u00F0\u009F\u009B\u0099', '🛍'],  // 🛍
  ['\u00F0\u009F\u009B\u009D', '🛒'],  // 🛒
  ['\u00F0\u009F\u008C\u009D', '🌙'],  // 🌙
  ['\u00F0\u009F\u008E\u00B8', '🍜'],  // 🍜
  ['\u00F0\u009F\u0092\u00B1', '💪'],  // 💪
  ['\u00F0\u009F\u0092\u009A', '❤'],  // ❤
  ['\u00F0\u009F\u008E\u00B9', '🍷'],  // 🍷
  ['\u00F0\u009F\u008D\u00B1', '🍕'],  // 🍕
  ['\u00F0\u009F\u008D\u00BD', '💇'],  // 💇
  ['\u00F0\u009F\u0093\u009A', '📚'],  // 📚
  ['\u00F0\u009F\u009B\u0092', '🛒'],  // 🛒 (alt)
  ['\u00F0\u009F\u008F\u00A5', '🏥'],  // 🏥
  ['\u00F0\u009F\u008F\u00A0', '🏠'],  // 🏠
  ['\u00F0\u009F\u0091\u00A6', '👩'],  // 👩
  ['\u00F0\u009F\u0091\u00A8', '👨'],  // 👨
  ['\u00F0\u009F\u0092\u00B2', '💳'],  // 💳 (alt)
  ['\u00F0\u009F\u0092\u00B9', '🚽'],  // 🚽
  ['\u00F0\u009F\u009A\u00B6', '🚌'],  // 🚌
  ['\u00F0\u009F\u008D\u00AF', '🍰'],  // 🍰
  ['\u00F0\u009F\u0091\u00BB', '👧'],  // 👧
  ['\u00F0\u009F\u0092\u0097', '💗'],  // 💗
  ['\u00F0\u009F\u0092\u0093', '💓'],  // 💓
  ['\u00F0\u009F\u0091\u0095', '👏'],  // 👏
  ['\u00F0\u009F\u0091\u008F', '🙏'],  // 🙏
  ['\u00F0\u009F\u0092\u009C', '💜'],  // 💜
  ['\u00F0\u009F\u0092\u0099', '💛'],  // 💛
  ['\u00F0\u009F\u0092\u0098', '💚'],  // 💚
  ['\u00F0\u009F\u0092\u009D', '💙'],  // 💙
  ['\u00F0\u009F\u0092\u0096', '💖'],  // 💖
  ['\u00F0\u009F\u0092\u0095', '💕'],  // 💕
  ['\u00F0\u009F\u0091\u0094', '🐶'],  // 🐶
  ['\u00F0\u009F\u0090\u00B1', '🐱'],  // 🐱
  ['\u00F0\u009F\u0090\u00A6', '🐙'],  // 🐙
  ['\u00F0\u009F\u0090\u00B3', '🐍'],  // 🐍
  ['\u00F0\u009F\u0090\u00A8', '🐧'],  // 🐧
  ['\u00F0\u009F\u0090\u00B9', '🐴'],  // 🐴
  ['\u00F0\u009F\u0090\u00BE', '🦋'],  // 🦋
  ['\u00F0\u009F\u0090\u00BF', '🐠'],  // 🐠
  ['\u00F0\u009F\u0090\u00BC', '🐟'],  // 🐟
  ['\u00F0\u009F\u0090\u00A3', '🐊'],  // 🐊
  ['\u00F0\u009F\u0090\u00A4', '🐯'],  // 🐯
  ['\u00F0\u009F\u0090\u00A5', '🦁'],  // 🦁
  ['\u00F0\u009F\u0090\u00A7', '🐻'],  // 🐻
  ['\u00F0\u009F\u0090\u00B0', '🐼'],  // 🐼
  ['\u00F0\u009F\u0090\u00B4', '🐤'],  // 🐤
  ['\u00F0\u009F\u0090\u00B5', '🐣'],  // 🐣
  ['\u00F0\u009F\u0090\u00B7', '🐥'],  // 🐥
  ['\u00F0\u009F\u0090\u00B8', '🐦'],  // 🐦
  ['\u00F0\u009F\u0090\u00BA', '🐨'],  // 🐨
  ['\u00F0\u009F\u0090\u00BB', '🐘'],  // 🐘
  ['\u00F0\u009F\u0090\u00BC', '🐧'],  // 🐧 (alt)
  ['\u00F0\u009F\u0090\u00BD', '🐦'],  // 🐦 (alt)
  ['\u00F0\u009F\u0090\u00BE', '🦅'],  // 🦅
  ['\u00F0\u009F\u0090\u00BF', '🦆'],  // 🦆
  ['\u00F0\u009F\u0091\u0080', '🐺'],  // 🐺
  ['\u00F0\u009F\u0091\u0081', '🐗'],  // 🐗
  ['\u00F0\u009F\u0091\u0082', '🐴'],  // 🐴 (alt)
  ['\u00F0\u009F\u0091\u0083', '🦄'],  // 🦄
  ['\u00F0\u009F\u0091\u0084', '🐝'],  // 🐝
  ['\u00F0\u009F\u0091\u0086', '🐣'],  // 🐣 (alt)
  ['\u00F0\u009F\u0091\u0087', '🦉'],  // 🦉
  ['\u00F0\u009F\u0091\u0088', '🦇'],  // 🦇
  ['\u00F0\u009F\u0091\u0089', '🐺'],  // 🐺 (alt)
  ['\u00F0\u009F\u0091\u008A', '🐗'],  // 🐗 (alt)
  ['\u00F0\u009F\u0091\u008B', '🐴'],  // 🐴 (alt)
  ['\u00F0\u009F\u0091\u008C', '🦄'],  // 🦄 (alt)

  // ₹ (Indian Rupee) - E2 82 B9
  ['\u00E2\u0082\u00B9', '₹'],

  // • (Bullet) - E2 80 A2
  ['\u00E2\u0080\u00A2', '•'],

  // – (En Dash) - E2 80 93
  ['\u00E2\u0080\u0093', '–'],

  // × (Multiplication) - C3 97
  ['\u00C3\u0097', '×'],

  // © (Copyright) - C2 A9
  ['\u00C2\u00A9', '©'],

  // · (Middle Dot) - C2 B7
  ['\u00C2\u00B7', '·'],

  // £ (Pound) - C2 A3
  ['\u00C2\u00A3', '£'],

  // → (Right Arrow) - E2 86 92
  ['\u00E2\u0086\u0092', '→'],

  // ← (Left Arrow) - E2 86 90
  ['\u00E2\u0086\u0090', '←'],

  // ↑ (Up Arrow) - E2 86 91
  ['\u00E2\u0086\u0091', '↑'],

  // ↓ (Down Arrow) - E2 86 93
  ['\u00E2\u0086\u0093', '↓'],

  // ↵ (Return) - E2 86 B5
  ['\u00E2\u0086\u00B5', '↵'],

  // ⭐ (Star) - E2 AD 90
  ['\u00E2\u00AD\u0090', '⭐'],

  // ⚠ (Warning) - E2 9A A0
  ['\u00E2\u009A\u00A0', '⚠'],

  // 🪔 (Diya) - F0 9F AA 94
  ['\u00F0\u009F\u00AA\u0094', '🪔'],

  // Variation selector-16 (FE0F) — broken as EF B8 8F
  ['\u00EF\u00B8\u008F', ''],

  // 🍽 (ForkKnife) - F0 9F 8D BD
  ['\u00F0\u009F\u008D\u00BD', '🍽'],

  // ✅ (CheckMark) - E2 9C 85
  ['\u00E2\u009C\u0085', '✅'],

  // 🤝 (Handshake)
  ['\u00F0\u009F\u00A4\u009D', '🤝'],

  // 💻 (Laptop)
  ['\u00F0\u009F\u0092\u00BB', '💻'],

  // 🔄 (Refresh)
  ['\u00F0\u009F\u0094\u0084', '🔄'],

  // 📊 (Chart)
  ['\u00F0\u009F\u0093\u008A', '📊'],

  // 🏷 (Label)
  ['\u00F0\u009F\u008F\u00B7', '🏷'],

  // 📎 (Paperclip)
  ['\u00F0\u009F\u0093\u008E', '📎'],

  // 🎁 (Gift)
  ['\u00F0\u009F\u008E\u0081', '🎁'],

  // 🎂 (Cake)
  ['\u00F0\u009F\u008E\u0082', '🎂'],

  // 🤖 (Robot)
  ['\u00F0\u009F\u00A4\u0096', '🤖'],

  // 📞 (Phone)
  ['\u00F0\u009F\u0093\u009E', '📞'],

  // 🏢 (Building)
  ['\u00F0\u009F\u008F\u00A2', '🏢'],

  // 🌐 (Globe)
  ['\u00F0\u009F\u008C\u0090', '🌐'],

  // ⚡ (Lightning)
  ['\u00E2\u009A\u00A1', '⚡'],

  // 🎯 (Target)
  ['\u00F0\u009F\u008E\u00AF', '🎯'],

  // 🎪 (Circus)
  ['\u00F0\u009F\u008E\u00AA', '🎪'],

  // 📢 (Loudspeaker)
  ['\u00F0\u009F\u0092\u00A2', '📢'],

  // 💡 (Bulb)
  ['\u00F0\u009F\u0092\u00A1', '💡'],

  // 🎬 (Clapper)
  ['\u00F0\u009F\u008E\u00AC', '🎬'],

  // 📋 (Clipboard)
  ['\u00F0\u009F\u0093\u008B', '📋'],

  // 📂 (Open Folder)
  ['\u00F0\u009F\u0093\u0082', '📂'],

  // 📑 (Bookmark Tabs)
  ['\u00F0\u009F\u0093\u0091', '📑'],

  // 🏥 (Hospital)
  ['\u00F0\u009F\u008F\u00A5', '🏥'],

  // 🏠 (House)
  ['\u00F0\u009F\u008F\u00A0', '🏠'],

  // 🍕 (Pizza)
  ['\u00F0\u009F\u008D\u00B5', '🍕'],

  // 💼 (Briefcase)
  ['\u00F0\u009F\u0092\u00BC', '💼'],

  // 🐦 (Bird)
  ['\u00F0\u009F\u0090\u00A6', '🐦'],

  // 🏢 (Office)
  ['\u00F0\u009F\u008F\u00A2', '🏢'],

  // 🔐 (Lock)
  ['\u00F0\u009F\u0094\u0090', '🔐'],

  // 🍎 (Apple)
  ['\u00F0\u009F\u008D\u008E', '🍎'],

  // 📚 (Books)
  ['\u00F0\u009F\u0093\u009A', '📚'],

  // 🐦 (Twitter/Bird)
  ['\u00F0\u009F\u0090\u00A6', '🐦'],

  // 📺 (TV)
  ['\u00F0\u009F\u0093\u00BA', '📺'],

  // 📘 (Blue Book)
  ['\u00F0\u009F\u0093\u0098', '📘'],

  // 📷 (Camera)
  ['\u00F0\u009F\u0093\u00B7', '📷'],
];

let totalFixed = 0;
let filesFixed = [];

for (const file of files) {
  const filePath = path.join(SRC, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let fileFixed = 0;

  for (const [broken, correct] of REPLACEMENTS) {
    while (content.includes(broken)) {
      content = content.replace(broken, correct);
      fileFixed++;
    }
  }

  if (fileFixed > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalFixed += fileFixed;
    filesFixed.push(`${file} (${fileFixed} fixes)`);
  }
}

console.log(`\nFixed ${totalFixed} mojibake instances across ${filesFixed.length} files:`);
filesFixed.forEach(f => console.log(`  ${f}`));
