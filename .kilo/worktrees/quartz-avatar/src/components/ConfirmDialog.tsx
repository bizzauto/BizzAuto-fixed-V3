import React, { useState, useCallback } from 'react';
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

  if (!isOpen) return null;

  const colors = {
    danger: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  };
  const c = colors[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={handleCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`p-6 ${c.bg} border-b ${c.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${c.bg} rounded-full flex items-center justify-center ${c.icon}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={handleCancel} disabled={isLoading} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">{cancelLabel}</button>
          <button onClick={handleConfirm} disabled={isLoading} className={`px-4 py-2 ${c.btn} text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50`}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
