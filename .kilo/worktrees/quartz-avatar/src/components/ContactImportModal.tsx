import React, { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { contactsAPI } from '../lib/api';

interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const ContactImportModal: React.FC<ContactImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExts = ['.csv', '.xlsx', '.xls'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !validExts.includes(ext)) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await contactsAPI.import(formData);
      const data = res.data?.data;
      setResult({
        success: data?.success || data?.imported || 0,
        failed: data?.failed || data?.errors || 0,
        total: data?.total || 0,
      });
      onImportComplete?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed. Please check your file format.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'name,phone,email,tags,stage,dealValue\nRahul Sharma,+91 98765 43210,rahul@email.com,"VIP,Mumbai",New Lead,50000\nPriya Patel,+91 98765 43211,priya@email.com,"Hot Lead",Contacted,25000';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts-template.csv';
    link.click();
    link.remove();
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Import Contacts</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6">
          {result ? (
            <div className="text-center">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">{result.total || result.success + result.failed}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>
              <button onClick={handleClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {file ? file.name : 'Drop your file here or click to browse'}
                </p>
                <p className="text-xs text-gray-500">Supports CSV, XLSX, XLS (Max 10MB)</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              </div>

              {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-600"><X size={16} /></button>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2 font-medium">Required columns for CSV:</p>
                <code className="text-xs text-gray-800 bg-white px-2 py-1 rounded block">name, phone, email, tags, stage, dealValue</code>
                <button onClick={downloadTemplate} className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Download size={12} /> Download template
                </button>
              </div>
            </>
          )}
        </div>

        {!result && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleImport} disabled={!file || importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {importing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {importing ? 'Importing...' : 'Import Contacts'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactImportModal;