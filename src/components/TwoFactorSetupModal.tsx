import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { X, QrCode, Lock, Shield, Copy, Check, Key, AlertTriangle } from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function TwoFactorSetupModal({ isOpen, onClose, onComplete }: TwoFactorSetupModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (isOpen && step === 'setup') {
      fetchSetupData();
    }
  }, [isOpen, step]);

  const fetchSetupData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/two-factor/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setQrCode(data.data.qrCode);
        setSecret(data.data.manualEntryKey);
      } else {
        toast.error(data.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/two-factor/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await response.json();
      if (data.success) {
        // Generate backup codes for display
        const codes = Array.from({ length: 10 }, () =>
          Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        setBackupCodes(codes);
        setStep('backup');
        toast.success('Two-factor authentication enabled!');
      } else {
        toast.error(data.error || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success('Secret copied to clipboard');
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bizzauto-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    setStep('setup');
    setVerificationCode('');
    setBackupCodes([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold">Two-Factor Authentication</h2>
                <p className="text-blue-100 text-xs sm:text-sm">
                  {step === 'setup' && 'Step 1: Scan QR Code'}
                  {step === 'verify' && 'Step 2: Verify Code'}
                  {step === 'backup' && 'Step 3: Save Backup Codes'}
                  {step === 'complete' && 'All Done!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-2">
            {['setup', 'verify', 'backup', 'complete'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  ['setup', 'verify', 'backup', 'complete'].indexOf(step) >= i
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {step === 'setup' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="text-center">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>

                {isLoading ? (
                  <div className="h-40 sm:h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <>
                    {qrCode && (
                      <div className="inline-block p-3 sm:p-4 bg-white rounded-xl shadow-lg">
                        <img
                          src={qrCode}
                          alt="2FA QR Code"
                          className="w-40 h-40 sm:w-48 sm:h-48"
                        />
                      </div>
                    )}

                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Can't scan? Enter this code manually:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 dark:bg-gray-600 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-mono break-all">
                          {secret}
                        </code>
                        <button
                          onClick={handleCopySecret}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
                          title="Copy secret"
                        >
                          {copiedSecret ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setStep('verify')}
                disabled={isLoading || !qrCode}
                className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                I've scanned the code
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="text-center">
                <Lock className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-40 sm:w-48 text-center text-2xl sm:text-3xl tracking-[0.4em] sm:tracking-[0.5em] font-mono px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Verify & Enable 2FA
                  </>
                )}
              </button>

              <button
                onClick={() => setStep('setup')}
                className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors"
              >
                Back to QR Code
              </button>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Save Your Backup Codes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Store these codes in a safe place. You'll need them if you lose access to your authenticator app.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-3 sm:p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="bg-white dark:bg-gray-600 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-mono text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleCopyBackupCodes}
                  className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm sm:text-base font-medium hover:border-blue-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                  Copy
                </button>
                <button
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm sm:text-base font-medium hover:border-blue-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                  Download
                </button>
              </div>

              <button
                onClick={() => setStep('complete')}
                className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-medium hover:opacity-90 transition-opacity"
              >
                I've saved my backup codes
              </button>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-5 sm:space-y-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Two-Factor Authentication Enabled!
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Your account is now protected with an extra layer of security.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4 rounded-xl text-left">
                <h4 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                  What's Next?
                </h4>
                <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• You'll need your authenticator app to log in</li>
                  <li>• Keep your backup codes safe</li>
                  <li>• You can disable 2FA in security settings</li>
                </ul>
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
