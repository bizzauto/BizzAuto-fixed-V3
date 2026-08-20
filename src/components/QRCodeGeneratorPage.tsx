import { useState } from 'react';
import { useToast } from '../components/Toast';
import { QrCode, Download, Copy, Check, Link, MessageSquare, Phone } from 'lucide-react';

type QRType = 'url' | 'whatsapp' | 'phone' | 'email' | 'wifi' | 'upi';

interface QRConfig {
  type: QRType;
  value: string;
  phone?: string;
  message?: string;
  ssid?: string;
  password?: string;
  upiId?: string;
  amount?: string;
}

export default function QRCodeGeneratorPage() {
  const toast = useToast();
  const [config, setConfig] = useState<QRConfig>({
    type: 'url',
    value: 'https://bizzauto.com',
  });
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generateQR = () => {
    let qrValue = '';

    switch (config.type) {
      case 'url':
        qrValue = config.value;
        break;
      case 'whatsapp':
        qrValue = `https://wa.me/${config.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(config.message || '')}`;
        break;
      case 'phone':
        qrValue = `tel:${config.phone}`;
        break;
      case 'email':
        qrValue = `mailto:${config.value}`;
        break;
      case 'wifi':
        qrValue = `WIFI:T:WPA;S:${config.ssid};P:${config.password};;`;
        break;
      case 'upi':
        qrValue = `upi://pay?pa=${config.upiId}&pn=${config.value}&am=${config.amount || ''}`;
        break;
    }

    // Use free QR API
    const encoded = encodeURIComponent(qrValue);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encoded}&bgcolor=FFFFFF&color=000000`);
  };

  const downloadQR = async () => {
    if (!qrUrl) return;
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizzauto-qr-${config.type}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('QR Code downloaded!');
    } catch {
      toast.error('Failed to download');
    }
  };

  const copyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <QrCode className="text-purple-600" /> QR Code Generator
        </h1>
        <p className="text-gray-600 mt-1">Generate QR codes for your business</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Config Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">QR Code Type</h3>

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { type: 'url' as QRType, icon: <Link size={16} />, label: 'URL' },
              { type: 'whatsapp' as QRType, icon: <MessageSquare size={16} />, label: 'WhatsApp' },
              { type: 'phone' as QRType, icon: <Phone size={16} />, label: 'Phone' },
              { type: 'email' as QRType, icon: <span>@</span>, label: 'Email' },
              { type: 'wifi' as QRType, icon: <span>📶</span>, label: 'WiFi' },
              { type: 'upi' as QRType, icon: <span>₹</span>, label: 'UPI' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setConfig({ ...config, type: item.type })}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm ${
                  config.type === item.type
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {config.type === 'url' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={config.value}
                  onChange={(e) => setConfig({ ...config, value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="https://bizzauto.com"
                />
              </div>
            )}

            {config.type === 'whatsapp' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={config.phone || ''}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="+917972888023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pre-filled Message</label>
                  <textarea
                    value={config.message || ''}
                    onChange={(e) => setConfig({ ...config, message: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Hello! I'm interested in your services."
                  />
                </div>
              </>
            )}

            {config.type === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={config.phone || ''}
                  onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="+917972888023"
                />
              </div>
            )}

            {config.type === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={config.value}
                  onChange={(e) => setConfig({ ...config, value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="contact@bizzauto.com"
                />
              </div>
            )}

            {config.type === 'wifi' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Network Name (SSID)</label>
                  <input
                    type="text"
                    value={config.ssid || ''}
                    onChange={(e) => setConfig({ ...config, ssid: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="MyWiFi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="password123"
                  />
                </div>
              </>
            )}

            {config.type === 'upi' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={config.value}
                    onChange={(e) => setConfig({ ...config, value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="BizzAuto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={config.upiId || ''}
                    onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="bizzauto@upi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Optional)</label>
                  <input
                    type="number"
                    value={config.amount || ''}
                    onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="₹999"
                  />
                </div>
              </>
            )}

            <button
              onClick={generateQR}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700"
            >
              Generate QR Code
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>

          {qrUrl ? (
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
                <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Download size={16} /> Download
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <QrCode size={48} className="mx-auto mb-3 opacity-50" />
              <p>Select a type and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}