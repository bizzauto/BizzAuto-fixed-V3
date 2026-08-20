import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Building2, Eye, EyeOff, ArrowRight, Check, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import GoogleLoginButton from './GoogleLoginButton';
import AppleLogin from './AppleLogin';

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    businessName: '', businessType: 'general', city: '',
    agreeTerms: false, receiveUpdates: true,
  });

  const handleChange = (key: string, value: any) => { setError(''); setForm({ ...form, [key]: value }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        businessName: form.businessName,
        businessType: form.businessType,
      });
      // Redirect to ResorPay board for plan selection after registration
      navigate('/resorpay', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const passwordStrength = form.password.length >= 12 ? 'Strong' : form.password.length >= 8 ? 'Medium' : form.password.length > 0 ? 'Weak' : '';
  const passwordColor = form.password.length >= 12 ? 'text-green-600' : form.password.length >= 8 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-4 sm:mb-6">
            <img src="/logo.svg" alt="BizzAuto Ai Logo" className="h-24 w-auto" />
          </div>

          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1.5 sm:h-2 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>

          {error && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Create your account</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">Start your 7-day free trial</p>

              <form className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Rahul Sharma" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="you@company.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => handleChange('password', e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Min. 8 characters" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          form.password.length >= 12 ? 'w-full bg-green-500' :
                          form.password.length >= 8 ? 'w-2/3 bg-yellow-500' : 'w-1/3 bg-red-500'
                        }`} />
                      </div>
                      <span className={`text-xs font-medium ${passwordColor}`}>{passwordStrength}</span>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => setStep(2)}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                  Continue <ArrowRight size={18} />
                </button>
              </form>

              <div className="relative my-5 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <GoogleLoginButton
                  text="signup_with"
                  label="Sign up with Google"
                  onError={(msg) => setError(msg)}
                />
                <AppleLogin
                  onError={(err) => setError(err)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-3 sm:mb-4">
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Tell us about your business</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">This helps us customize your experience</p>

              <form className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.businessName} onChange={(e) => handleChange('businessName', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Your Business Name" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type</label>
                  <select value={form.businessType} onChange={(e) => handleChange('businessType', e.target.value)}
                    className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white">
                    <option value="general">General Business</option>
                    <option value="salon">Salon & Spa</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="gym">Gym & Fitness</option>
                    <option value="realestate">Real Estate</option>
                    <option value="education">Education & Coaching</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="agency">Marketing Agency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    placeholder="Mumbai" />
                </div>

                <button type="button" onClick={() => setStep(3)}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                  Continue <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-3 sm:mb-4">
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Almost done!</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">Review and confirm your details</p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Name</span><span className="font-medium text-gray-900 dark:text-white truncate text-right">{form.name}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Email</span><span className="font-medium text-gray-900 dark:text-white truncate text-right">{form.email}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Business</span><span className="font-medium text-gray-900 dark:text-white truncate text-right">{form.businessName}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Type</span><span className="font-medium text-gray-900 dark:text-white capitalize truncate text-right">{form.businessType}</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <input type="checkbox" checked={form.agreeTerms} onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                    className="w-4 h-4 mt-0.5 sm:mt-1 text-blue-600 rounded flex-shrink-0" required />
                  <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                  </label>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <input type="checkbox" checked={form.receiveUpdates} onChange={(e) => handleChange('receiveUpdates', e.target.checked)}
                    className="w-4 h-4 mt-0.5 sm:mt-1 text-blue-600 rounded flex-shrink-0" />
                  <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Send me product updates, tips, and offers via email
                  </label>
                </div>

                <button type="submit" disabled={isLoading || !form.agreeTerms}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Create Account <Check size={18} /></>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-blue-700 items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-white">
          <h2 className="text-3xl xl:text-4xl font-bold mb-4 xl:mb-6">Everything you need to grow</h2>
          <div className="space-y-3 xl:space-y-4">
            {['WhatsApp Business API', 'CRM & Lead Management', 'AI-Powered Content', 'Marketing Automation', 'Analytics & Reports', 'Team Collaboration'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={20} className="text-green-300 flex-shrink-0" />
                <span className="text-base xl:text-lg">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 xl:mt-8 p-3 xl:p-4 bg-white/10 rounded-lg">
            <p className="text-sm font-medium">Free 7-day trial</p>
            <p className="text-xs text-green-100 mt-1">No credit card required. Full features. Cancel anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;