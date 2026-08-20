import fs from 'fs';

const filePath = 'src/components/CreativeGeneratorPage.tsx';
const buf = fs.readFileSync(filePath);
let content = buf.toString('utf-8');

// Line 416: category emoji map — replace entire line
content = content.replace(
  /const map: Record<string, string> = \{ Festival: '[^']+', Offer: '[^']+', Product: '[^']+', Seasonal: '[^']+', Testimonial: '[^']+', Menu: '[^']+', 'Price List': '[^']+', Wedding: '[^']+', Birthday: '[^']+' \};/,
  `const map: Record<string, string> = { Festival: '🎉', Offer: '🎁', Product: '📦', Seasonal: '🌸', Testimonial: '⭐', Menu: '🍽', 'Price List': '💰', Wedding: '💍', Birthday: '🎂' };`
);

// Line 770: Badge label
content = content.replace(/>[^<]*Badge<\/span>/, '>⭐ Badge</span>');

// Line 916: PREMIUM badge
content = content.replace(/>[^<]*PREMIUM<\/div>/, '>⭐ PREMIUM</div>');

// Fix share text with broken emojis
content = content.replace(/\?\?/g, '');
content = content.replace(/dY"z/g, '📞');
content = content.replace(/dY",/g, '');

// Also check for any remaining patterns like `â` or `Ã`
const remaining = content.match(/[\u00C0-\u00FF]{2,}/g);
if (remaining) {
  console.log('Remaining potential issues:', remaining.slice(0, 10));
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed remaining mojibake in CreativeGeneratorPage.tsx');
