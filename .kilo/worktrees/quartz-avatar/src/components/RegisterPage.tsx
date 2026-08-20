import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Building2, Eye, EyeOff, ArrowRight, Check, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';

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
      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const passwordStrength = form.password.length >= 12 ? 'Strong' : form.password.length >= 8 ? 'Medium' : form.password.length > 0 ? 'Weak' : '';
  const passwordColor = form.password.length >= 12 ? 'text-green-600' : form.password.length >= 8 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              BizzAuto Solutions
            </h1>
          </div>

          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-2 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
              <p className="text-gray-600 mb-6">Start your 14-day free trial</p>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Rahul Sharma" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@company.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => handleChange('password', e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Min. 8 characters" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                  Continue <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
              <p className="text-gray-600 mb-6">This helps us customize your experience</p>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.businessName} onChange={(e) => handleChange('businessName', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your Business Name" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                  <select value={form.businessType} onChange={(e) => handleChange('businessType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mumbai" />
                </div>

                <button type="button" onClick={() => setStep(3)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                  Continue <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost done!</h2>
              <p className="text-gray-600 mb-6">Review and confirm your details</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{form.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Business</span><span className="font-medium">{form.businessName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium capitalize">{form.businessType}</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={form.agreeTerms} onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                    className="w-4 h-4 mt-1 text-blue-600 rounded" required />
                  <label className="text-sm text-gray-600">
                    I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={form.receiveUpdates} onChange={(e) => handleChange('receiveUpdates', e.target.checked)}
                    className="w-4 h-4 mt-1 text-blue-600 rounded" />
                  <label className="text-sm text-gray-600">
                    Send me product updates, tips, and offers via email
                  </label>
                </div>

                <button type="submit" disabled={isLoading || !form.agreeTerms}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Create Account <Check size={18} /></>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-blue-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-6">Everything you need to grow</h2>
          <div className="space-y-4">
            {['WhatsApp Business API', 'CRM & Lead Management', 'AI-Powered Content', 'Marketing Automation', 'Analytics & Reports', 'Team Collaboration'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={20} className="text-green-300" />
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-white/10 rounded-lg">
            <p className="text-sm font-medium">Free 14-day trial</p>
            <p className="text-xs text-green-100 mt-1">No credit card required. Full features. Cancel anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;