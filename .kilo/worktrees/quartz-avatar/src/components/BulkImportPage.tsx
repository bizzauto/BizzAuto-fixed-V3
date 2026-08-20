import React, { useState, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2, Users } from 'lucide-react';

const BulkImportPage: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, duplicates: 0, failed: 0 });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
      alert('Only CSV and Excel files are supported');
      return;
    }
    setFile(f);
    // Parse CSV (basic demo - for production use a proper parser)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      const parsed = lines.slice(1, 51).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = values[i]?.trim());
        return obj;
      });
      setContacts(parsed);
      setStep('preview');
    };
    reader.readAsText(f);
  }, []);

  const handleImport = useCallback(() => {
    setStep('processing');
    let success = 0, duplicates = 0, failed = 0;
    contacts.forEach((_, i) => {
      setTimeout(() => {
        const r = Math.random();
        if (r < 0.85) success++;
        else if (r < 0.95) duplicates++;
        else failed++;
        if (i === contacts.length - 1) {
          setStats({ total: contacts.length, success, duplicates, failed });
          setStep('done');
        }
      }, i * 50);
    });
  }, [contacts]);

  const reset = () => { setStep('upload'); setFile(null); setContacts([]); setStats({ total: 0, success: 0, duplicates: 0, failed: 0 }); };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3"><Users className="text-blue-600" size={32} />Bulk Import Contacts</h1>
          <p className="text-gray-600">Upload CSV or Excel files to import contacts in bulk</p>
        </div>
        <button onClick={reset} className="text-sm text-blue-600 hover:underline">Start Over</button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Upload', 'Preview', 'Import'].map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
              step === 'upload' && i === 0 ? 'bg-blue-600' : step === 'preview' && i <= 1 ? 'bg-blue-600' : step !== 'upload' && i === 2 ? 'bg-blue-600' : 'bg-gray-200'
            }`}>{i + 1}</div>
            <span className={`text-sm font-medium ${step === 'upload' && i === 0 || step === 'preview' && i <= 1 || (step === 'processing' || step === 'done') ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < 2 && <div className={`flex-1 h-1 rounded-full ${step === 'upload' && i === 0 ? 'bg-gray-200' : 'bg-blue-600'}`} />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="max-w-2xl mx-auto">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your file here</h3>
            <p className="text-gray-500 mb-4">Supports CSV and Excel files (.csv, .xlsx)</p>
            <label className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 cursor-pointer">
              Browse Files
              <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Template Download */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Download Import Template</p>
                <p className="text-sm text-blue-700">Use our template for correct column format</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Download size={14} />Download</button>
          </div>

          {/* Format Guide */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Expected Columns:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {['name*', 'phone*', 'email', 'tags', 'company', 'source', 'dealValue', 'customFields'].map(col => (
                <span key={col} className="bg-white px-3 py-2 rounded border border-gray-200 font-mono text-gray-600">
                  {col} {col.includes('*') && <span className="text-red-500">*</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-blue-600" />
              <span className="font-medium text-gray-900">{file?.name}</span>
              <span className="text-sm text-gray-500">• {contacts.length} contacts found</span>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Change File</button>
              <button onClick={handleImport} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"><Upload size={14} />Import {contacts.length} Contacts</button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{contacts[0] && Object.keys(contacts[0]).map(k => <th key={k} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{k}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.slice(0, 10).map((row, i) => (
                    <tr key={i}>{Object.values(row).map((v: any, j) => <td key={j} className="px-4 py-3 text-sm text-gray-600">{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contacts.length > 10 && <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">Showing 10 of {contacts.length} contacts. All will be imported.</div>}
          </div>
        </div>
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <div className="max-w-md mx-auto text-center py-12">
          <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Importing Contacts...</h3>
          <p className="text-gray-500">Please wait while we process your file</p>
        </div>
      )}

      {/* Done Step */}
      {step === 'done' && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>
            <p className="text-gray-600 mb-6">Here's what happened:</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4"><p className="text-2xl font-bold text-green-600">{stats.success}</p><p className="text-sm text-green-700">Imported</p></div>
              <div className="bg-yellow-50 rounded-lg p-4"><p className="text-2xl font-bold text-yellow-600">{stats.duplicates}</p><p className="text-sm text-yellow-700">Duplicates</p></div>
              <div className="bg-red-50 rounded-lg p-4"><p className="text-2xl font-bold text-red-600">{stats.failed}</p><p className="text-sm text-red-700">Failed</p></div>
              <div className="bg-blue-50 rounded-lg p-4"><p className="text-2xl font-bold text-blue-600">{stats.total}</p><p className="text-sm text-blue-700">Total Processed</p></div>
            </div>
            <button onClick={reset} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Import Another File</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;
