import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Phone, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { useToast } from './Toast';

export default function ResellerAuthPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login' && (!form.email || !form.password)) {
      toast.error('Email and password required'); return;
    }
    if (mode === 'register' && (!form.name || !form.email || !form.password)) {
      toast.error('Name, email and password required'); return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/wl/auth/login' : '/api/wl/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, company: form.company, phone: form.phone };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Request failed');
        setLoading(false);
        return;
      }

      if (mode === 'login' && data.data?.token) {
        localStorage.setItem('rp-token', data.data.token);
        toast.success('Logged in successfully!');
        navigate('/reseller-hub');
      } else if (mode === 'register') {
        toast.success('Registered! Please login.');
        setMode('login');
        setForm(f => ({ ...f, email: form.email }));
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Reseller Hub</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'login' ? 'Sign in to your reseller account' : 'Create your reseller account'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Your Company" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="+91 98765 43210" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
