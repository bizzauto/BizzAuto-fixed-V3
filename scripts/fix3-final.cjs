const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'WhatsAppModule.tsx');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// ===== Fix 3: Add QR code display area in Evolution scanning state =====
// Find the exact Evolution UI section - look for the green badge + buttons

const searchStart = 'bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3';
const searchMiddle = 'Connect & Get QR Code';
const searchEnd = 'Update Configuration';

const startIdx = content.indexOf(searchStart);
if (startIdx === -1) {
  console.log('ERROR: Evolution green badge not found in file!');
  process.exit(1);
}

// Get the full block from the green badge to the Update Configuration button
const fromIdx = content.lastIndexOf('<div', startIdx - 50);
const toIdx = content.indexOf('</button>', content.indexOf(searchEnd)) + '</button>'.length;

if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) {
  console.log('ERROR: Could not find boundaries of Evolution UI section');
  process.exit(1);
}

const oldBlock = content.substring(fromIdx, toIdx);
console.log('Found Evolution UI block at', fromIdx, '-', toIdx, 'length:', oldBlock.length);

// Check if we already have the QR scanning display
if (content.includes('Scan this QR code with WhatsApp')) {
  console.log('Fix 3 already applied!');
  process.exit(0);
}

// Create the new block
const newBlock = `<div className="space-y-4">
                    {connectionStatus === 'scanning' || connectionStatus === 'connecting' ? (
                      <div className="text-center space-y-4">
                        {qrValue ? (
                          <div className="bg-white rounded-xl p-4 border-2 border-purple-300 inline-block mx-auto">
                            {qrValue.startsWith('data:') || qrValue.startsWith('http') ? (
                              <img
                                src={qrValue}
                                alt="WhatsApp QR Code"
                                className="w-64 h-64 object-contain mx-auto rounded-lg"
                              />
                            ) : (
                              <div className="w-64 h-64 mx-auto flex items-center justify-center bg-purple-50 rounded-lg">
                                <QrCode size={120} className="text-purple-400" />
                              </div>
                            )}
                            <p className="text-sm text-gray-500 mt-3">
                              {connectionStatus === 'connecting' ? 'Connecting...' : 'Scan this QR code with WhatsApp'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Open WhatsApp &gt; Linked Devices &gt; Link a Device
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-purple-600">
                            <Loader size={20} className="animate-spin" />
                            <span>Generating QR code...</span>
                          </div>
                        )}
                        <button
                          onClick={onEvolutionConnect}
                          className="text-sm text-purple-600 hover:text-purple-800 underline"
                        >
                          Refresh QR Code
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                          <CheckCircle size={20} className="text-green-600" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-green-800">Evolution API Configured</p>
                            <p className="text-xs text-green-600">{evolutionConfig.baseUrl}</p>
                          </div>
                        </div>
                        <button
                          onClick={onEvolutionConnect}
                          className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                        >
                          <QrCode size={20} />
                          Connect & Get QR Code
                        </button>
                        <button
                          onClick={() => setShowEvolutionForm(true)}
                          className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                          Update Configuration
                        </button>
                      </>
                    )`;

content = content.replace(oldBlock, newBlock);
console.log('Fix 3 applied: QR code display added for Evolution scanning state');
changes++;

// Verify Loader import
const loaderMatch = content.match(/import \{([^}]+)\} from ['"]lucide-react['"]/);
if (loaderMatch && !loaderMatch[1].includes('Loader')) {
  const newImport = loaderMatch[0].replace(/([\w,\s]+)}/, '$1, Loader}');
  content = content.replace(loaderMatch[0], newImport);
  console.log('Added Loader to lucide-react imports');
  changes++;
} else if (loaderMatch && loaderMatch[1].includes('Loader')) {
  console.log('Loader already imported');
} else {
  console.log('WARNING: Could not find lucide-react import');
}

fs.writeFileSync(filePath, content);
console.log(`\n✅ Done! ${changes} change(s) applied.`);
