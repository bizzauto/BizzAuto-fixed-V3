import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel, onClose, loading: externalLoading
}) => {
  const [loading, setLoading] = useState(false);
  const isLoading = externalLoading || loading;
  const handleCancel = onCancel || onClose || (() => {});

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  }, [onConfirm]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = {
    danger: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  };
  const c = colors[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4" onClick={handleCancel}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className={`p-4 sm:p-6 ${c.bg} border-b ${c.border} relative`}>
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 sm:hidden p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 ${c.bg} rounded-full flex items-center justify-center ${c.icon} flex-shrink-0`}>
              <AlertTriangle size={18} className="sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-6 sm:pr-0">{title}</h3>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-600">{message}</p>
        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button onClick={handleCancel} disabled={isLoading} className="px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">{cancelLabel}</button>
          <button onClick={handleConfirm} disabled={isLoading} className={`px-4 py-2.5 sm:py-2 ${c.btn} text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50`}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
