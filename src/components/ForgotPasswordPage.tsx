import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Zap, TrendingUp, Users, MessageSquare, BarChart3, Shield, Star } from 'lucide-react';
import { authAPI } from '../lib/api';

const ForgotPasswordPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    if (onNavigate) onNavigate('login');
    else navigate('/login');
  };

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Growth Hero (visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 items-center justify-center p-8 xl:p-12 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-lg w-full">
          <Link to="/login" className="inline-flex items-center gap-2 mb-8 text-white/80 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm">Back to login</span>
          </Link>

          <div className="mb-6">
            <img src="/logo.svg" alt="BizzAuto Ai Logo" className="h-28 w-auto" />
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-3">
            Secure Account Recovery
          </h2>
          <p className="text-base xl:text-lg text-purple-100 mb-8">
            Don't worry, we'll help you get back into your account in just a few steps.
          </p>

          {/* Growth Visualization */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 xl:p-6 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-400/30 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} className="text-emerald-200" />
                </div>
                <span className="text-white font-semibold text-sm">Your Account Growth</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-400/20 text-emerald-100 px-2 py-1 rounded-md text-xs font-medium">
                <Shield size={12} />
                Secured
              </div>
            </div>

            {/* Animated Bar Chart */}
            <div className="flex items-end justify-between gap-1.5 h-28 mb-4">
              {[28, 42, 35, 55, 48, 68, 60, 78, 70, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-pink-400/60 to-pink-200 rounded-t-sm"
                  style={{
                    height: `${h}%`,
                    animation: `growBar 1s ease-out ${i * 0.1}s both`,
                  }}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-white/10">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-pink-200 mb-0.5">
                  <Users size={12} />
                </div>
                <p className="text-white font-bold text-base sm:text-lg">1.8K</p>
                <p className="text-purple-200 text-[10px] sm:text-xs">Contacts</p>
              </div>
              <div className="text-center border-x border-white/10">
                <div className="flex items-center justify-center gap-1 text-pink-200 mb-0.5">
                  <MessageSquare size={12} />
                </div>
                <p className="text-white font-bold text-base sm:text-lg">12K</p>
                <p className="text-purple-200 text-[10px] sm:text-xs">Messages</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-pink-200 mb-0.5">
                  <BarChart3 size={12} />
                </div>
                <p className="text-white font-bold text-base sm:text-lg">₹2.8L</p>
                <p className="text-purple-200 text-[10px] sm:text-xs">Revenue</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4 text-white/80">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-300" />
              <span className="text-xs sm:text-sm">256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={12} className="fill-yellow-300 text-yellow-300" />
              ))}
              <span className="text-xs sm:text-sm ml-1">4.9/5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6 justify-center sm:justify-start">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">BizzAuto</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 text-center sm:text-left">BizzAuto Solutions</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 md:p-8">
              <button onClick={handleBack} className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 sm:mb-6">
                <ArrowLeft size={16} /> Back to login
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Forgot Password?</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-5 sm:mb-6">Enter your email and we'll send you a verification code.</p>
              <form onSubmit={handleSendOTP} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="you@company.com" required />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Send Code <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Enter Verification Code</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-5 sm:mb-6">We sent a 6-digit code to <strong className="break-all">{email}</strong></p>
              <form onSubmit={handleVerifyOTP} className="space-y-3 sm:space-y-4">
                <div className="flex gap-1.5 sm:gap-2 justify-center">
                  {otp.map((digit, i) => (
                    <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required />
                  ))}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Verify Code <ArrowRight size={18} /></>}
                </button>
                <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">Didn't receive code? <button type="button" onClick={handleSendOTP} className="text-blue-600 hover:underline font-medium">Resend</button></p>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Set New Password</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-5 sm:mb-6">Create a strong password for your account.</p>
              <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Min. 8 characters" required minLength={8} />
                  </div>
                  {newPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                  className="w-full py-2.5 sm:py-3 bg-green-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Reset Password <CheckCircle size={18} /></>}
                </button>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-6 md:p-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CheckCircle size={32} className="sm:w-9 sm:h-9 text-green-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Password Reset!</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-5 sm:mb-6">Your password has been changed successfully.</p>
              <button onClick={handleBack}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;