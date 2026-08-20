const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'WhatsAppModule.tsx');
let content = fs.readFileSync(filePath, 'utf8');

let changes = 0;

// ============================================================
// FIX 1 & 2: handleEvolutionConnect - add apiKey + fix QR path
// ============================================================
const oldConnect = `      // Try to create instance
      try {
        await evolutionAPI.createInstance({
          instanceName,
          baseUrl: evolutionConfig.baseUrl,
        });
      } catch {
        // Instance may already exist, continue
      }

      // Connect and get QR
      const connectRes = await evolutionAPI.connectInstance(instanceName);
      if (connectRes?.data?.qrCode) {
        setEvolutionQR(connectRes.data.qrCode);
      }`;

const newConnect = `      // Try to create instance (include apiKey!)
      try {
        await evolutionAPI.createInstance({
          instanceName,
          baseUrl: evolutionConfig.baseUrl,
          apiKey: evolutionConfig.apiKey,
        });
      } catch {
        // Instance may already exist, continue
      }

      // Connect and get QR
      const connectRes = await evolutionAPI.connectInstance(instanceName);
      // Server returns { success: true, data: { qrCode: "...", qrCodeBase64: "..." } }
      if (connectRes?.data?.data?.qrCode || connectRes?.data?.data?.qrCodeBase64) {
        setEvolutionQR(connectRes.data.data.qrCodeBase64 || connectRes.data.data.qrCode);
      }`;

if (content.includes(oldConnect)) {
  content = content.replace(oldConnect, newConnect);
  console.log('✅ Fix 1 & 2: Added apiKey to createInstance + fixed QR response path');
  changes++;
} else {
  console.log('❌ Fix 1 & 2: Could not find the old connect code to replace');
}

// ============================================================
// FIX 3: Add QR code display in Evolution mode scanning state
// ============================================================

// Find the evolution mode section where the "Connect & Get QR Code" button is shown
// After connecting, when connectionStatus is 'scanning', show the QR code
const oldEvolutionUI = `                    {evolutionConfig.configured ? (
                  <div className=\"space-y-4\">
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

const newEvolutionUI = `                    {evolutionConfig.configured ? (
                  <div className=\"space-y-4\">
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
                              Open WhatsApp > Linked Devices > Link a Device
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
                    )}`;

if (content.includes(oldEvolutionUI)) {
  content = content.replace(oldEvolutionUI, newEvolutionUI);
  console.log('✅ Fix 3: Added QR code display area for Evolution mode scanning state');
  changes++;
} else {
  console.log('❌ Fix 3: Could not find the old Evolution UI section to replace');
}

// Also need to add Loader import if it's not already imported
// Check if Loader is imported from lucide-react
if (!content.includes('Loader')) {
  // Find the lucide-react import line and add Loader
  const lucideImportMatch = content.match(/import \{([^}]+)\} from ['"]lucide-react['"]/);
  if (lucideImportMatch) {
    const existingImports = lucideImportMatch[1];
    if (!existingImports.includes('Loader')) {
      const newImports = existingImports.trim().endsWith(',')
        ? existingImports + ' Loader'
        : existingImports + ', Loader';
      content = content.replace(lucideImportMatch[0], `import {${newImports}} from 'lucide-react'`);
      console.log('✅ Added Loader import from lucide-react');
      changes++;
    }
  }
}

fs.writeFileSync(filePath, content);
console.log(`\n✅ Done! ${changes} changes applied to WhatsAppModule.tsx`);
