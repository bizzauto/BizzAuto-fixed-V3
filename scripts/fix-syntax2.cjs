const fs = require('fs');
const c = fs.readFileSync('src/components/WhatsAppModule.tsx', 'utf8');
const lines = c.split(/\r?\n/);

// Find the line that's just whitespace + ")" after a fragment "</>" and before "</div>"
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trimEnd();
  // Looking for: prev line is "</>", this line is ")", next line is "</div>"
  if (trimmed === ')') {
    const prevTrimmed = lines[i - 1]?.trimEnd();
    const nextTrimmed = lines[i + 1]?.trimEnd();
    if (prevTrimmed === '</>' && nextTrimmed === '</div>') {
      console.log(`Found at line ${i + 1}: prev=${JSON.stringify(prevTrimmed)}, curr=${JSON.stringify(trimmed)}, next=${JSON.stringify(nextTrimmed)}`);
      lines[i] = lines[i].replace(/\)\s*$/, ')}');
      console.log(`Fixed: changed line ${i + 1} from ${JSON.stringify(trimmed)} to ${JSON.stringify(lines[i].trimEnd())}`);
      break;
    }
  }
}

fs.writeFileSync('src/components/WhatsAppModule.tsx', lines.join('\n'));
console.log('File saved, checking result...');

// Verify
const c2 = fs.readFileSync('src/components/WhatsAppModule.tsx', 'utf8');
const lines2 = c2.split(/\r?\n/);
for (let i = 448; i <= 454; i++) {
  console.log(`${i + 1}: ${lines2[i]}`);
}
