import fs from 'fs';

const filePath = 'src/components/WhatsAppModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let changes = [];

// ============================================================
// FIX 1 & 2: handleEvolutionConnect - add apiKey + fix QR path
// ============================================================
const oldConnectBlock = [
  "      // Try to create instance",
  "      try {",
  "        await evolutionAPI.createInstance({",
  "          instanceName,",
  "          baseUrl: evolutionConfig.baseUrl,",
  "        });",
  "      } catch {",
  "        // Instance may already exist, continue",
  "      }",
  "",
  "      // Connect and get QR",
  "      const connectRes = await evolutionAPI.connectInstance(instanceName);",
  "      if (connectRes?.data?.qrCode) {",
  "        setEvolutionQR(connectRes.data.qrCode);",
  "      }",
];

const oldConnectStr = oldConnectBlock.join('\n');

const newConnectBlock = [
  "      // Try to create instance (include apiKey!)",
  "      try {",
  "        await evolutionAPI.createInstance({",
  "          instanceName,",
  "          baseUrl: evolutionConfig.baseUrl,",
  "          apiKey: evolutionConfig.apiKey,",
  "        });",
  "      } catch {",
  "        // Instance may already exist, continue",
  "      }",
  "",
  "      // Connect and get QR",
  "      const connectRes = await evolutionAPI.connectInstance(instanceName);",
  "      // Server wraps response: { success: true, data: { qrCode, qrCodeBase64, status } }",
  "      if (connectRes?.data?.data?.qrCode || connectRes?.data?.data?.qrCodeBase64) {",
  "        setEvolutionQR(connectRes.data.data.qrCodeBase64 || connectRes.data.data.qrCode);",
  "      }",
];

const newConnectStr = newConnectBlock.join('\n');

if (content.includes(oldConnectStr)) {
  content = content.replace(oldConnectStr, newConnectStr);
  changes.push('Fix 1 & 2: Added apiKey to createInstance + fixed QR response path');
} else {
  // Try with CRLF
  const oldConnectCrlf = oldConnectStr.replace(/\n/g, '\r\n');
  const newConnectCrlf = newConnectStr.replace(/\n/g, '\r\n');
  if (content.includes(oldConnectCrlf)) {
    content = content.replace(oldConnectCrlf, newConnectCrlf);
    changes.push('Fix 1 & 2: Added apiKey to createInstance + fixed QR response path (CRLF)');
  } else {
    console.log('ERROR: Fix 1 & 2 pattern not found!');
    // Debug
    const idx = content.indexOf('connectRes?.data?.qrCode');
    if (idx >= 0) {
      console.log('Found at index:', idx);
      console.log('Context:', JSON.stringify(content.substring(idx - 50, idx + 80)));
    }
    if (content.includes('apiKey: evolutionConfig.apiKey')) {
      console.log('INFO: Fix 1 already applied');
    }
  }
}

// ============================================================
// FIX 3: Add QR code display in Evolution scanning state
// ============================================================

// Find the Evolution UI section by locating the green badge
const searchStart = 'bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3';
const startIdx = content.indexOf(searchStart);
const endMarker = 'Update Configuration';
const endSearchStart = content.indexOf(endMarker);

if (startIdx >= 0 && endSearchStart >= 0) {
  // Find the start of the block (the opening div)
  const blockStart = content.lastIndexOf('<div', startIdx - 50);
  // Find the end of the Update Configuration button
  const blockEnd = content.indexOf('</button>', endSearchStart) + '</button>'.length;

  if (blockStart >= 0 && blockEnd > blockStart) {
    const oldUIBlock = content.substring(blockStart, blockEnd);

    const newUIBlock = `<div className="space-y-4">
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

    content = content.replace(oldUIBlock, newUIBlock);
    changes.push('Fix 3: Added QR code display area for Evolution scanning state');
  } else {
    console.log('ERROR: Could not find Evolution UI block boundaries');
  }
} else {
  if (content.includes('Scan this QR code with WhatsApp')) {
    console.log('INFO: Fix 3 already applied');
  } else {
    console.log('ERROR: Fix 3 - Evolution UI section not found');
  }
}

// ============================================================
// Add Loader import if not present
// ============================================================
const loaderMatch = content.match(/import \{([^}]+)\} from ['"]lucide-react['"]/);
if (loaderMatch && !loaderMatch[1].includes('Loader')) {
  const newImport = loaderMatch[0].replace(/([\w,\s]+)}/, '$1, Loader}');
  content = content.replace(loaderMatch[0], newImport);
  changes.push('Added Loader to lucide-react imports');
}

// Write the file
fs.writeFileSync(filePath, content);

if (changes.length > 0) {
  console.log('✅ Applied fixes:');
  changes.forEach(c => console.log('  -', c));
} else {
  console.log('✅ No changes needed (all fixes already applied)');
}
