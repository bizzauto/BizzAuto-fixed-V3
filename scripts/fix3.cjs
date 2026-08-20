const fs = require('fs');
const f = 'src/components/WhatsAppModule.tsx';
let c = fs.readFileSync(f, 'utf8');
let changes = false;

// Fix 3: Add QR code display area when connectionStatus is scanning/connecting in Evolution mode
// Find the section: {evolutionConfig.configured ? ( ... Connect & Get QR Code button ... )

// The old UI section (with CRLF):
const oldUISection = `<div className=\"space-y-4\">
                    <div className=\"bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3\">
                      <CheckCircle size={20} className=\"text-green-600\" />
                      <div className=\"text-left\">
                        <p className=\"text-sm font-medium text-green-800\">Evolution API Configured</p>
                        <p className=\"text-xs text-green-600\">{evolutionConfig.baseUrl}</p>
                      </div>
                    </div>
                    <button
                      onClick={onEvolutionConnect}
                      className=\"w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2\"
                    >
                      <QrCode size={20} />
                      Connect & Get QR Code
                    </button>`;

const newUISection = `<div className=\"space-y-4\">
                    {connectionStatus === 'scanning' || connectionStatus === 'connecting' ? (
                      <div className=\"text-center space-y-4\">
                        {qrValue ? (
                          <div className=\"bg-white rounded-xl p-4 border-2 border-purple-300 inline-block mx-auto\">
                            {qrValue.startsWith('data:') || qrValue.startsWith('http') ? (
                              <img
                                src={qrValue}
                                alt=\"WhatsApp QR Code\"
                                className=\"w-64 h-64 object-contain mx-auto rounded-lg\"
                              />
                            ) : (
                              <div className=\"w-64 h-64 mx-auto flex items-center justify-center bg-purple-50 rounded-lg\">
                                <QrCode size={120} className=\"text-purple-400\" />
                              </div>
                            )}
                            <p className=\"text-sm text-gray-500 mt-3\">
                              {connectionStatus === 'connecting' ? 'Connecting...' : 'Scan this QR code with WhatsApp'}
                            </p>
                            <p className=\"text-xs text-gray-400 mt-1\">
                              Open WhatsApp {'>'} Linked Devices {'>'} Link a Device
                            </p>
                          </div>
                        ) : (
                          <div className=\"flex items-center justify-center gap-2 text-purple-600\">
                            <Loader size={20} className=\"animate-spin\" />
                            <span>Generating QR code...</span>
                          </div>
                        )}
                        <button
                          onClick={onEvolutionConnect}
                          className=\"text-sm text-purple-600 hover:text-purple-800 underline\"
                        >
                          Refresh QR Code
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className=\"bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3\">
                          <CheckCircle size={20} className=\"text-green-600\" />
                          <div className=\"text-left\">
                            <p className=\"text-sm font-medium text-green-800\">Evolution API Configured</p>
                            <p className=\"text-xs text-green-600\">{evolutionConfig.baseUrl}</p>
                          </div>
                        </div>
                        <button
                          onClick={onEvolutionConnect}
                          className=\"w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2\"
                        >
                          <QrCode size={20} />
                          Connect & Get QR Code
                        </button>
                      </>
                    )`;

if (c.includes(oldUISection)) {
  c = c.replace(oldUISection, newUISection);
  console.log('Fix 3: QR display added for Evolution scanning state');
  changes = true;
} else {
  console.log('Fix 3: Old UI pattern not found! Checking variants...');
  // Try with different spacing patterns
  const idx1 = c.indexOf('Evolution API Configured');
  if (idx1 >= 0) {
    console.log('Found "Evolution API Configured" at', idx1);
    // Check if fix already applied
    if (c.includes('connectionStatus ===')) {
      console.log('Fix 3 may already be applied!');
    } else {
      // Get the exact context
      const context = c.substring(idx1 - 100, idx1 + 600);
      // Write context to a debug file
      fs.writeFileSync('scripts/debug-context.txt', context);
      console.log('Context written to scripts/debug-context.txt. Character count:', context.length);
    }
  }
}

// Make sure Loader is imported from lucide-react
const loaderMatch = c.match(/import \{([^}]+)\} from ['"]lucide-react['"]/);
if (loaderMatch && !loaderMatch[1].includes('Loader')) {
  const newImport = loaderMatch[0].replace(/([\w,\s]+)}/, '$1, Loader}');
  c = c.replace(loaderMatch[0], newImport);
  console.log('Added Loader to lucide-react imports');
  changes = true;
} else if (!loaderMatch) {
  console.log('Could not find lucide-react import');
} else {
  console.log('Loader already imported');
}

if (changes) {
  fs.writeFileSync(f, c);
  console.log('File saved!');
} else {
  console.log('No changes made');
}
