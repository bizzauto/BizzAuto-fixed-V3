const fs = require('fs');
let c = fs.readFileSync('src/components/WhatsAppModule.tsx', 'utf8');

// Find the grid start
const start = '<div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">';
const si = c.indexOf(start);
if (si === -1) { console.log('NOT FOUND: grid start'); process.exit(1); }

// Find the <button that comes after the grid
const bt = c.indexOf('<button', si + 300);
if (bt === -1) { console.log('NOT FOUND: button after grid'); process.exit(1); }

// The grid closing </div> is right before the button
const ei = c.lastIndexOf('</div>', bt) + 6;

const oldLen = ei - si;
console.log('Old block length:', oldLen);

const newBlock = [
  '<div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">',
  '            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">',
  '              <CheckCircle size={24} className="text-green-500 mx-auto mb-1" />',
  '              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Connected</p>',
  '              <p className="text-xs text-green-500 dark:text-green-400">WhatsApp Active</p>',
  '            </div>',
  '            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">',
  '              <Smartphone size={24} className="text-blue-500 mx-auto mb-1" />',
  '              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{connectedPhone}</p>',
  '              <p className="text-xs text-blue-500 dark:text-blue-400">Phone Number</p>',
  '            </div>',
  '            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">',
  '              <MessageSquare size={24} className="text-purple-500 mx-auto mb-1" />',
  '              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Ready</p>',
  '              <p className="text-xs text-purple-500 dark:text-purple-400">To Send Messages</p>',
  '            </div>',
  '            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 text-center">',
  '              <Wifi size={24} className="text-amber-500 mx-auto mb-1" />',
  '              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Active</p>',
  '              <p className="text-xs text-amber-500 dark:text-amber-400">All Systems Go</p>',
  '            </div>',
  '          </div>',
].join('\n');

c = c.slice(0, si) + newBlock + c.slice(ei);
fs.writeFileSync('src/components/WhatsAppModule.tsx', c);
console.log('DONE');
