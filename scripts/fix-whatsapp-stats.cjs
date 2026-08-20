const fs = require('fs');
let c = fs.readFileSync('src/components/WhatsAppModule.tsx', 'utf8');

// Find the grid start marker
const gridStart = '<div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">';
const idxStart = c.indexOf(gridStart);
if (idxStart === -1) { console.log('Grid start not found'); process.exit(1); }

// Find the pattern: </div> followed by whitespace and <button (the grid closing)
const afterGridPattern = '</div>';
const searchFrom = idxStart + gridStart.length + 300;

// Find the LAST </div> before the <button that comes after the grid
// We'll look for the <button that's right after the grid
const buttonAfter = c.indexOf('<button', searchFrom);
if (buttonAfter === -1) { console.log('Button after grid not found'); process.exit(1); }

// Find the grid's closing </div> which is right before the button
const closeBefore = c.lastIndexOf('</div>', buttonAfter);
const idxEnd = closeBefore + 6; // length of </div>

console.log('Replacing from', idxStart, 'to', idxEnd);

const newBlock = '<div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">\n' +
'            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">\n' +
'              <CheckCircle size={24} className="text-green-500 mx-auto mb-1" />\n' +
'              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Connected</p>\n' +
'              <p className="text-xs text-green-500 dark:text-green-400">WhatsApp Active</p>\n' +
'            </div>\n' +
'            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">\n' +
'              <Smartphone size={24} className="text-blue-500 mx-auto mb-1" />\n' +
'              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{connectedPhone}</p>\n' +
'              <p className="text-xs text-blue-500 dark:text-blue-400">Phone Number</p>\n' +
'            </div>\n' +
'            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">\n' +
'              <MessageSquare size={24} className="text-purple-500 mx-auto mb-1" />\n' +
'              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Ready</p>\n' +
'              <p className="text-xs text-purple-500 dark:text-purple-400">To Send Messages</p>\n' +
'            </div>\n' +
'            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 text-center">\n' +
'              <Wifi size={24} className="text-amber-500 mx-auto mb-1" />\n' +
'              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Active</p>\n' +
'              <p className="text-xs text-amber-500 dark:text-amber-400">All Systems Go</p>\n' +
'            </div>\n' +
'          </div>';

c = c.slice(0, idxStart) + newBlock + c.slice(idxEnd);

// Also add the remaining hardcoded stats that were part of the grid
// The original block also included a second row of similar stat cards (2,050 Total Sent, 96.5% Delivery Rate, etc.)
// Let's check if those are still there and remove them too
const secondGridStart = '<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 sm:gap-4 mb-6">';
const secondIdx = c.indexOf(secondGridStart, idxEnd);
if (secondIdx >= 0) {
  console.log('Found SECOND stats grid at', secondIdx);
  // Find the closing </div> of the second grid
  const secondButtonAfter = c.indexOf('<div', secondIdx + 300);
  if (secondButtonAfter >= 0) {
    const secondCloseDiv = c.lastIndexOf('</div>', secondButtonAfter);
    if (secondCloseDiv >= 0 && secondCloseDiv < secondButtonAfter) {
      const secondEnd = secondCloseDiv + 6;
      const secondBlock = c.slice(secondIdx, secondEnd);
      console.log('Second grid block length:', secondBlock.length);
      c = c.slice(0, secondIdx) + c.slice(secondEnd);
      console.log('Second grid removed');
    }
  }
}

fs.writeFileSync('src/components/WhatsAppModule.tsx', c);
console.log('✅ WhatsAppModule.tsx fixed successfully');
