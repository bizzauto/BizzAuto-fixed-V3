import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../lib/api';

const ForgotPasswordPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.verifyOTP(email, otp.join(''));
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(email, otp.join(''), newPassword);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value) && value !== '') return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">BizzAuto Solutions</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <button onClick={() => onNavigate?.('login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
              <ArrowLeft size={16} /> Back to login
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
            <p className="text-gray-600 mb-6">Enter your email and we'll send you a verification code.</p>
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@company.com" required />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Send Code <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
            <p className="text-gray-600 mb-6">We sent a 6-digit code to <strong>{email}</strong></p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} type="text" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required />
                ))}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Verify Code <ArrowRight size={18} /></>}
              </button>
              <p className="text-center text-sm text-gray-500">Didn't receive code? <button type="button" onClick={handleSendOTP} className="text-blue-600 hover:underline">Resend</button></p>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h2>
            <p className="text-gray-600 mb-6">Create a strong password for your account.</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min. 8 characters" required minLength={8} />
                </div>
                {newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        newPassword.length >= 12 ? 'w-full bg-green-500' :
                        newPassword.length >= 8 ? 'w-2/3 bg-yellow-500' : 'w-1/3 bg-red-500'
                      }`} />
                    </div>
                    <span className={`text-xs font-medium ${
                      newPassword.length >= 12 ? 'text-green-600' : newPassword.length >= 8 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Reset Password <CheckCircle size={18} /></>}
              </button>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-gray-600 mb-6">Your password has been changed successfully.</p>
            <button onClick={() => onNavigate?.('login')}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;