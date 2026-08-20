import fs from 'fs';

const filePath = 'src/components/CreativeGeneratorPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Find and replace share text line with broken phone emoji
// The broken version has a garbled phone icon before ${phone}
content = content.replace(
  /\$\{phone \? `[^`]*\$\{phone\}` : ''\}/,
  '${phone ? `📞 ${phone}` : \'\' }'
);

// Also check for any remaining broken double-byte sequences
const broken = content.match(/[\u00F0][\u009F][\u0080-\u00FF][\u0080-\u00FF]/g);
if (broken) {
  console.log('Found broken 4-byte sequences:', [...new Set(broken)]);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed share text');
