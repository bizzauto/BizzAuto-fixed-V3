import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../src/components/CreativeGeneratorPage.tsx');

const content = fs.readFileSync(filePath, 'utf-8');

// Find all lines with broken emoji patterns
const lines = content.split('\n');
const broken = [];
for (let i = 0; i < lines.length; i++) {
  // Check for common mojibake patterns: dY followed by special chars, or Ã, Â
  if (lines[i].match(/dY['"Z%,?~\u0081\u008D\u00AD\u009D\u009F]|Ã|Â|â¬|â—|â˜|â™|âš/g)) {
    broken.push({ line: i + 1, content: lines[i].trim().substring(0, 120) });
  }
}

console.log(`Found ${broken.length} broken lines:`);
broken.forEach(b => console.log(`  L${b.line}: ${b.content}`));
