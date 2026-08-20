import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Users, AlertCircle, Zap } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const navigate = useNavigate();
  const { login, demoLogin, isLoading } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  const handleDemoLogin = () => {
    setError('');
    setIsDemoMode(true);
    try {
      demoLogin();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError('Failed to start demo mode. Please try again.');
      setIsDemoMode(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">BizzAuto Solutions</h1>
            <p className="text-gray-500 mt-1">Business Automation Platform</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-600 mb-6">Enter your credentials to access your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@company.com" required />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="remember" className="text-sm text-gray-600">Remember me for 30 days</label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight size={18} /></>}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button type="button" onClick={handleDemoLogin} disabled={isDemoMode || isLoading}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {isDemoMode ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Zap size={18} /> Try Demo Mode</>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">Don't have an account? <Link to="/register" className="text-blue-600 font-medium hover:underline">Start free trial</Link></p>
          </div>
        </div>
      </div>

      {/* Right Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-6">Automate your business with AI</h2>
          <div className="space-y-6">
            {[
              { icon: <Zap size={24} />, title: 'AI-Powered Automation', desc: 'Smart replies, lead scoring, and content generation' },
              { icon: <Users size={24} />, title: 'CRM & Pipeline Management', desc: 'Track leads from first contact to closed deal' },
              { icon: <Shield size={24} />, title: 'Enterprise Security', desc: '256-bit encryption, role-based access, audit logs' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">{item.icon}</div>
                <div><h3 className="font-semibold text-lg mb-1">{item.title}</h3><p className="text-blue-100 text-sm">{item.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
