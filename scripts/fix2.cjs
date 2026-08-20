const fs = require('fs');
const f = 'src/components/WhatsAppModule.tsx';
let c = fs.readFileSync(f, 'utf8');

// Fix 2: QR response path - use data.data.qrCode instead of data.qrCode
const oldQr = 'if (connectRes?.data?.qrCode) {\n        setEvolutionQR(connectRes.data.qrCode);\n      }';
const oldQrCrlf = 'if (connectRes?.data?.qrCode) {\r\n        setEvolutionQR(connectRes.data.qrCode);\r\n      }';

let newQr = 'if (connectRes?.data?.data?.qrCode || connectRes?.data?.data?.qrCodeBase64) {\n        setEvolutionQR(connectRes.data.data.qrCodeBase64 || connectRes.data.data.qrCode);\n      }';
let newQrCrlf = 'if (connectRes?.data?.data?.qrCode || connectRes?.data?.data?.qrCodeBase64) {\r\n        setEvolutionQR(connectRes.data.data.qrCodeBase64 || connectRes.data.data.qrCode);\r\n      }';

if (c.includes(oldQrCrlf)) {
  c = c.replace(oldQrCrlf, newQrCrlf);
  console.log('Fix 2 applied (CRLF)');
} else if (c.includes(oldQr)) {
  c = c.replace(oldQr, newQr);
  console.log('Fix 2 applied (LF)');
} else {
  console.log('Fix 2: pattern not found!');
  // Find what's actually there
  const idx = c.indexOf('connectRes?.data?.qrCode');
  if (idx >= 0) {
    console.log('Found at:', idx);
    console.log('Context:', JSON.stringify(c.substring(idx-20, idx+80)));
  } else {
    // Check if already fixed
    if (c.includes('connectRes?.data?.data?.qrCode')) {
      console.log('Fix 2 already applied!');
    } else {
      console.log('connectRes not found at all!');
    }
  }
}

fs.writeFileSync(f, c);
