import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle,
  X, Loader2, Package,
} from 'lucide-react';
import apiClient from '../lib/api';
import { useToast } from './Toast';

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorMessages: string[];
}

const BulkImportExport: React.FC = () => {
  const { error: showError, success: showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      showError('Only CSV files are supported');
      return;
    }
    setFile(f);
    setImportResult(null);
  }, [showError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/store-features/bulk/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      const result = res.data;
      setImportResult({
        success: result.success || 0,
        errors: result.errors || 0,
        total: result.total || 0,
        errorMessages: result.errorMessages || result.errors_detail || [],
      });
      showSuccess(`Import completed: ${result.success || 0} succeeded`);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Import failed');
      setImportResult({ success: 0, errors: 1, total: 1, errorMessages: [err.response?.data?.error || 'Unknown error'] });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/store-features/bulk/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showSuccess('Products exported successfully');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setImportResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Package size={18} className="text-blue-600" />
        Bulk Import & Export
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Import Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Import Products (CSV)</h4>
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <Upload size={36} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Drop CSV file here or click to browse</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supports .csv files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-green-600" />
                  <span className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{file.name}</span>
                </div>
                <button onClick={reset} className="text-gray-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={uploading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              importResult.errors > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {importResult.errors > 0 ? <AlertCircle size={18} className="text-yellow-600" /> : <CheckCircle size={18} className="text-green-600" />}
                <span className="font-medium text-gray-900 dark:text-white text-sm">Import Results</span>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-green-600 dark:text-green-400">✓ {importResult.success} products imported</p>
                {importResult.errors > 0 && (
                  <p className="text-red-600 dark:text-red-400">✖ {importResult.errors} errors</p>
                )}
                {importResult.errorMessages.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {importResult.errorMessages.map((msg, i) => (
                      <p key={i} className="text-xs text-red-500 dark:text-red-400 pl-2">• {msg}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Export Products</h4>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-5 md:p-6 text-center">
            <Download size={36} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">Export all products as a CSV file</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 sm:px-5 md:px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportExport;
