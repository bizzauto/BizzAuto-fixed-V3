import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, CheckCircle, AlertCircle, Loader2, Trash2, Download } from 'lucide-react';
import { useToast } from './Toast';

interface UploadedFile {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
}

interface FileUploaderProps {
  businessId?: string;
  category?: 'avatar' | 'product' | 'poster' | 'document' | 'social' | 'general';
  entityType?: string;
  entityId?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  acceptedTypes?: string;
  multiple?: boolean;
  showPreview?: boolean;
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  avatar: 'Profile Pictures',
  product: 'Product Images',
  poster: 'Posters & Graphics',
  document: 'Documents & PDFs',
  social: 'Social Media Media',
  general: 'General Files',
};

const CATEGORY_ACCEPTS: Record<string, string> = {
  avatar: 'image/*',
  product: 'image/*',
  poster: 'image/*',
  document: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  social: 'image/*,video/mp4',
  general: 'image/*,.pdf,.doc,.docx,video/mp4',
};

export default function FileUploader({
  category = 'general',
  entityType,
  entityId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedTypes,
  multiple = true,
  showPreview = true,
  className = '',
}: FileUploaderProps) {
  const { success, error } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const acceptedTypesStr = acceptedTypes || CATEGORY_ACCEPTS[category] || 'image/*,.pdf';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  const handleUpload = useCallback(async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    const totalFiles = files.length + fileArray.length;
    if (totalFiles > maxFiles) {
      error(`Maximum ${maxFiles} files allowed. You already have ${files.length} file(s).`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      if (fileArray.length === 1) {
        formData.append('file', fileArray[0]);
      } else {
        fileArray.forEach(f => formData.append('files', f));
      }
      
      formData.append('category', category);
      if (entityType) formData.append('entityType', entityType);
      if (entityId) formData.append('entityId', entityId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: formData,
      });

      const json = await res.json();

      if (json.success && json.data?.uploads) {
        const newFiles: UploadedFile[] = json.data.uploads.map((u: any) => ({
          id: u.id,
          url: u.url,
          thumbnailUrl: u.thumbnailUrl,
          originalName: u.originalName,
          mimeType: u.mimeType,
          size: u.size,
          category: u.category,
        }));

        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        setUploadProgress(100);
        
        if (onUploadComplete) onUploadComplete(newFiles);
        success(`${newFiles.length} file(s) uploaded successfully`);
      } else {
        const errMsg = json.error || json.data?.errors?.[0]?.error || 'Upload failed';
        error(errMsg);
        if (onUploadError) onUploadError(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Network error during upload';
      error(errMsg);
      if (onUploadError) onUploadError(errMsg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [category, entityType, entityId, files, maxFiles, onUploadComplete, onUploadError, success, error]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/upload/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
      });
      const json = await res.json();
      if (json.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        success('File deleted');
      } else {
        error(json.error || 'Failed to delete');
      }
    } catch {
      error('Network error');
    }
  }, [success, error]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  }, [handleUpload]);

  const handleClickDropZone = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onClick={handleClickDropZone}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypesStr}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Uploading files...</p>
              {uploadProgress > 0 && (
                <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                <Upload size={24} className="text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Drop files here or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {CATEGORY_LABELS[category] || 'Files'} &mdash; {acceptedTypesStr.replace(/,/g, ', ')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files Preview */}
      {showPreview && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map(file => (
            <div
              key={file.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail / Preview */}
              {isImage(file.mimeType) ? (
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  <img
                    src={file.thumbnailUrl || file.url}
                    alt={file.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white/90 rounded-lg hover:bg-white text-gray-700"
                      title="View full size"
                      onClick={e => e.stopPropagation()}
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 bg-red-500/90 rounded-lg hover:bg-red-500 text-white"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center relative">
                  <div className="text-center p-2">
                    <FileText size={32} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500 break-all line-clamp-2 px-1">
                      {file.originalName}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-lg hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}

              {/* File Info */}
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-gray-500 truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <p className="text-[9px] text-gray-400">{formatSize(file.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state hint */}
      {files.length === 0 && !uploading && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Supported formats: {acceptedTypesStr.replace(/,/g, ', ')}
        </p>
      )}
    </div>
  );
}
