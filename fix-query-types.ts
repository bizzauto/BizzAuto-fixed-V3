import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      files.push(...getAllTsFiles(full));
    } else if (extname(entry) === '.ts' && !entry.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

const srcDir = 'src/server';
const files = getAllTsFiles(srcDir);

let totalFixed = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  // Pattern: req.query.XXX where XXX is a word char sequence
  // But NOT already followed by " as string" or " as any"
  // Replace req.query.XXX with (req.query.XXX as string)
  // We use a function replacement to avoid corrupting surrounding text
  content = content.replace(
    /req\.query\.(\w+)(?!\s*as\s+(?:string|any))/g,
    (match, prop) => `(req.query.${prop} as string)`
  );

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    const short = file.replace(/\\/g, '/');
    console.log(`Fixed: ${short}`);
    totalFixed++;
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
