import React, { useState } from 'react';
import { Upload, FileText, User, Phone, Mail, MapPin, Package, CheckCircle, AlertCircle, Copy, Plus, Trash2 } from 'lucide-react';
import { useToast } from './Toast';

interface LeadData {
  name: string;
  phone: string;
  email: string;
  product: string;
  requirement: string;
  city: string;
}

const API = import.meta.env.VITE_API_URL || '/api';

const EmailLeadImporter: React.FC = () => {
  const { toast: showToast } = useToast();
  const [leads, setLeads] = useState<LeadData[]>([
    { name: '', phone: '', email: '', product: '', requirement: '', city: '' }
  ]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'paste' | 'bulk'>('single');
  const [pasteContent, setPasteContent] = useState('');

  const addLead = () => {
    setLeads([...leads, { name: '', phone: '', email: '', product: '', requirement: '', city: '' }]);
  };

  const removeLead = (index: number) => {
    setLeads(leads.filter((_, i) => i !== index));
  };

  const updateLead = (index: number, field: keyof LeadData, value: string) => {
    const updated = [...leads];
    updated[index] = { ...updated[index], [field]: value };
    setLeads(updated);
  };

  const parsePasteContent = () => {
    // Parse pasted email content
    const lines = pasteContent.split('\n');
    const parsed: LeadData = { name: '', phone: '', email: '', product: '', requirement: '', city: '' };

    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Phone
      const phoneMatch = line.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/);
      if (phoneMatch && !parsed.phone) {
        parsed.phone = phoneMatch[1];
      }

      // Email
      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && !parsed.email) {
        parsed.email = emailMatch[0];
      }

      // Name
      if (lower.includes('name') || lower.includes('dear') || lower.includes('buyer')) {
        const nameMatch = line.match(/(?:Name|Dear|Buyer)[:\s]*([A-Za-z\s]+)/i);
        if (nameMatch) parsed.name = nameMatch[1].trim();
      }

      // Product
      if (lower.includes('product') || lower.includes('requirement') || lower.includes('interested')) {
        const productMatch = line.match(/(?:Product|Requirement|Interested)[:\s]*(.+)/i);
        if (productMatch) parsed.product = productMatch[1].trim();
      }

      // City
      if (lower.includes('city') || lower.includes('location')) {
        const cityMatch = line.match(/(?:City|Location)[:\s]*([A-Za-z\s]+)/i);
        if (cityMatch) parsed.city = cityMatch[1].trim();
      }
    }

    if (parsed.phone || parsed.email) {
      setLeads([parsed]);
      setPasteContent('');
      showToast('Email parsed successfully!', 'success');
    } else {
      showToast('Could not find phone or email in content', 'error');
    }
  };

  const importLeads = async () => {
    const validLeads = leads.filter(l => l.phone || l.email);
    if (validLeads.length === 0) {
      showToast('Please add at least one lead with phone or email', 'error');
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API}/indiamart-email/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leads: validLeads,
          platform: 'indiamart',
        }),
      });

      const data = await r.json();
      if (data.success) {
        setResults(data.data);
        showToast(`Imported ${data.data.success} leads!`, 'success');
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch (e: any) {
      showToast('Import failed: ' + e.message, 'error');
    }
    setImporting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-5 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Upload className="text-blue-600" size={28} />
          Import IndiaMART Leads
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Paste email content or manually add leads from IndiaMART emails
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'paste' as const, label: 'Paste Email', icon: <FileText size={16} /> },
          { id: 'single' as const, label: 'Manual Entry', icon: <User size={16} /> },
          { id: 'bulk' as const, label: 'Bulk Entry', icon: <Upload size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Paste Email Content */}
      {activeTab === 'paste' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Paste IndiaMART Email Content</h3>
          <p className="text-sm text-gray-500 mb-4">
            Copy the entire email from Gmail and paste it below. The system will automatically extract name, phone, email, product, and city.
          </p>
          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={`Paste email content here...\n\nExample:\nQuery from Rahul Sharma\nPhone: 7972888023\nEmail: rahul@example.com\nRequirement for Hair Oil\nCity: Mumbai`}
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          />
          <button
            onClick={parsePasteContent}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Parse & Add Lead
          </button>
        </div>
      )}

      {/* Manual Entry */}
      {activeTab === 'single' && (
        <div className="space-y-4">
          {leads.map((lead, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Lead {index + 1}</span>
                {leads.length > 1 && (
                  <button onClick={() => removeLead(index)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={lead.name}
                    onChange={(e) => updateLead(index, 'name', e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={lead.phone}
                    onChange={(e) => updateLead(index, 'phone', e.target.value)}
                    placeholder="7972888023"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={lead.email}
                    onChange={(e) => updateLead(index, 'email', e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Product</label>
                  <input
                    type="text"
                    value={lead.product}
                    onChange={(e) => updateLead(index, 'product', e.target.value)}
                    placeholder="Hair Oil"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={lead.city}
                    onChange={(e) => updateLead(index, 'city', e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Requirement</label>
                  <input
                    type="text"
                    value={lead.requirement}
                    onChange={(e) => updateLead(index, 'requirement', e.target.value)}
                    placeholder="Looking for bulk order"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addLead}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            <Plus size={16} /> Add Another Lead
          </button>
        </div>
      )}

      {/* Bulk Entry */}
      {activeTab === 'bulk' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Bulk Import (JSON)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Enter leads in JSON format. One lead per object.
          </p>
          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={`[\n  {"name": "Rahul", "phone": "7972888023", "product": "Hair Oil", "city": "Mumbai"},\n  {"name": "Priya", "phone": "9876543211", "product": "Shampoo", "city": "Delhi"}\n]`}
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          />
          <button
            onClick={() => {
              try {
                const parsed = JSON.parse(pasteContent);
                if (Array.isArray(parsed)) {
                  setLeads(parsed.map(l => ({
                    name: l.name || '',
                    phone: l.phone || '',
                    email: l.email || '',
                    product: l.product || '',
                    requirement: l.requirement || '',
                    city: l.city || '',
                  })));
                  setActiveTab('bulk');
                  showToast(`Loaded ${parsed.length} leads`, 'success');
                }
              } catch {
                showToast('Invalid JSON format', 'error');
              }
            }}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Load JSON
          </button>
        </div>
      )}

      {/* Import Button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={importLeads}
          disabled={importing || leads.every(l => !l.phone && !l.email)}
          className="flex items-center gap-2 px-4 sm:px-5 md:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {importing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload size={20} />
              Import {leads.filter(l => l.phone || l.email).length} Leads
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
            <CheckCircle size={20} />
            Import Complete!
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Successfully Imported</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{results.success}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{results.failed}</p>
            </div>
          </div>
          {results.errors && results.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Errors:</p>
              {results.errors.map((err: string, i: number) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailLeadImporter;
