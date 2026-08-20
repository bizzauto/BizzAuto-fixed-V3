const fs = require('fs');
const c = fs.readFileSync('src/components/WhatsAppModule.tsx', 'utf8');
const lines = c.split(/\r?\n/);

// Line 450 should be "                    )}" not "                    )"
// We need to find the exact line that's a closing paren after the fragment
for (let i = 0; i < lines.length; i++) {
  // Look for a line that is just whitespace + ")" followed by blank line then whitespace + "</div>"
  // This is the line closing the inner ternary's false branch, but missing the } 
  const trimmed = lines[i].trimEnd();
  if (trimmed === ')') {
    const nextLine = lines[i + 1]?.trim();
    const prevLine = lines[i - 1]?.trim();
    // Check context: previous should be </> (fragment close), next should be </div>
    // And this should NOT be inside a different location
    if (prevLine === '</>' && nextLine === '</div>') {
      lines[i] = lines[i].replace(/\)\s*$/, ')}');
      console.log('Fixed line', i + 1, ': added missing }');
      break;
    }
  }
}

fs.writeFileSync('src/components/WhatsAppModule.tsx', lines.join('\n'));
console.log('File saved');
