import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, CheckCircle, AlertCircle, Loader2, Building2, User, Phone, Mail, MapPin, Globe, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { aiAPI } from '../lib/api';

interface BusinessData {
  businessName: string;
  businessType: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  gstNumber: string;
}

interface AutoSetupProps {
  onComplete: (data: BusinessData) => void;
}

const AutoSetupWizard: React.FC<AutoSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<BusinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'pdf' | 'image' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Determine file type
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      if (!isPDF && !isImage) {
        throw new Error('Sirf PDF ya Image upload karo!');
      }

      setUploadType(isPDF ? 'pdf' : 'image');

      // Read file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        // Simulate AI parsing (in production, send to backend API)
        // For now, we'll use a mock parser
        const parsed = await parseDocument(base64, isPDF ? 'pdf' : 'image');
        setParsedData(parsed);
        setStep('preview');
        setLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'File parse nahi ho payi');
      setLoading(false);
    }
  };

  const parseDocument = async (data: string, type: 'pdf' | 'image'): Promise<BusinessData> => {
    const empty: BusinessData = {
      businessName: '',
      businessType: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      gstNumber: '',
    };

    try {
      const res = await aiAPI.generate({
        type: 'medium',
        prompt: `Extract business information from this ${type} document. Return ONLY a JSON object with fields: businessName, businessType, ownerName, phone, email, address, website, gstNumber. Use empty string for any missing fields. Do not include any other text.`,
        context: { document: data, fileType: type }
      });

      const text = res.data?.data?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          businessName: parsed.businessName || '',
          businessType: parsed.businessType || '',
          ownerName: parsed.ownerName || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          address: parsed.address || '',
          website: parsed.website || '',
          gstNumber: parsed.gstNumber || '',
        };
      }
      return empty;
    } catch {
      return empty;
    }
  };

  const handleManualEntry = () => {
    setParsedData({
      businessName: '',
      businessType: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      gstNumber: '',
    });
    setStep('preview');
  };

  const handleFieldChange = (field: keyof BusinessData, value: string) => {
    if (parsedData) {
      setParsedData({ ...parsedData, [field]: value });
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      onComplete(parsedData);
    }
  };

  const isDataComplete = () => {
    return parsedData?.businessName && 
           parsedData?.ownerName && 
           parsedData?.phone && 
           parsedData?.email;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quick Setup Wizard
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload your business card, visiting card, or document - we'll auto-fill everything!
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
          >
            {loading ? (
              <div className="space-y-4">
                <Loader2 size={48} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-gray-600 dark:text-gray-400">
                  {uploadType === 'pdf' ? 'PDF' : 'Image'} parse ho raha hai...
                </p>
                <p className="text-sm text-gray-500">AI se data extract ho raha hai</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload size={48} className="text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Click to upload ya drag & drop karo
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF, JPG, PNG - Business card, visiting card, ya koi bhi document
                  </p>
                </div>
                <div className="flex justify-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText size={16} /> PDF
                  </span>
                  <span className="flex items-center gap-1">
                    <Image size={16} /> Image
                  </span>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500" />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Manual Entry Option */}
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-3">Ya phir manually enter karo:</p>
            <button
              onClick={handleManualEntry}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              ✍️ Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Edit */}
      {step === 'preview' && parsedData && (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500" />
            <p className="text-green-700 dark:text-green-400 text-sm">
              {uploadType === 'pdf' ? 'PDF' : 'Image'} successfully parse ho gaya! Neeche details check karo aur edit karo.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} /> Business Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={parsedData.businessName}
                  onChange={e => handleFieldChange('businessName', e.target.value)}
                  placeholder="Business ka naam"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Type
                </label>
                <select
                  value={parsedData.businessType}
                  onChange={e => handleFieldChange('businessType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select type</option>
                  <option value="Retail">Retail</option>
                  <option value="Services">Services</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={parsedData.ownerName}
                  onChange={e => handleFieldChange('ownerName', e.target.value)}
                  placeholder="Aapka naam"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={parsedData.phone}
                  onChange={e => handleFieldChange('phone', e.target.value)}
                  placeholder="+91 7972888023"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={parsedData.email}
                  onChange={e => handleFieldChange('email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={parsedData.website}
                  onChange={e => handleFieldChange('website', e.target.value)}
                  placeholder="www.example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Address
              </label>
              <textarea
                value={parsedData.address}
                onChange={e => handleFieldChange('address', e.target.value)}
                placeholder="Complete address with city, state, pincode"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                value={parsedData.gstNumber}
                onChange={e => handleFieldChange('gstNumber', e.target.value)}
                placeholder="27AABCS1234N1Z5"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!isDataComplete()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Setup */}
      {step === 'confirm' && parsedData && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ✅ Confirm Details
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Building2 size={18} className="text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Business</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{parsedData.businessName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <User size={18} className="text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Owner</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{parsedData.ownerName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Phone size={18} className="text-purple-500" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{parsedData.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Mail size={18} className="text-orange-500" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{parsedData.email}</p>
                </div>
              </div>

              {parsedData.address && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <MapPin size={18} className="text-red-500" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{parsedData.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('preview')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              ← Edit Details
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2"
            >
              <CheckCircle size={18} /> Setup Complete! 🎉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoSetupWizard;
