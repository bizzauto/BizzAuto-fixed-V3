import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, Building2, MessageSquare, Zap, Star, CheckCircle, RefreshCw, Upload, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { whatsappAPI, googleBusinessAPI, subscriptionsAPI } from '../lib/api';
import AutoSetupWizard from './AutoSetupWizard';

type ConnectionState = 'loading' | 'connected' | 'disconnected';

const OnboardingWizard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0 = Quick Setup choice
  const [selectedType, setSelectedType] = useState('');
  const [waStatus, setWaStatus] = useState<ConnectionState>('loading');
  const [gbpStatus, setGbpStatus] = useState<ConnectionState>('loading');
  const [razorpayStatus, setRazorpayStatus] = useState<ConnectionState>('loading');
  const [setupMode, setSetupMode] = useState<'choice' | 'auto' | 'manual'>('choice');
  const totalSteps = 4;
  const { user, business, setOnboardingCompleted } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch WhatsApp status
    whatsappAPI.getStatus()
      .then(res => setWaStatus(res.data?.data?.connected ? 'connected' : 'disconnected'))
      .catch(() => setWaStatus('disconnected'));

    // Fetch Google Business status
    googleBusinessAPI.getStatus()
      .then(res => setGbpStatus(res.data?.data?.connected ? 'connected' : 'disconnected'))
      .catch(() => setGbpStatus('disconnected'));

    // Fetch subscription to check Razorpay payment setup
    subscriptionsAPI.getCurrent()
      .then(res => {
        const sub = res.data?.data;
        if (sub && sub.plan && sub.plan !== 'FREE' && sub.plan !== 'TRIAL') {
          setRazorpayStatus('connected');
        } else {
          setRazorpayStatus('disconnected');
        }
      })
      .catch(() => setRazorpayStatus('disconnected'));
  }, []);

  const steps = [
    { title: 'Setup', icon: <Sparkles size={20} className="sm:w-6 sm:h-6" /> },
    { title: 'Business', icon: <Building2 size={20} className="sm:w-6 sm:h-6" /> },
    { title: 'Connect', icon: <MessageSquare size={20} className="sm:w-6 sm:h-6" /> },
    { title: 'Done!', icon: <Check size={20} className="sm:w-6 sm:h-6" /> },
  ];

  const handleComplete = (navigateTo?: string) => {
    setOnboardingCompleted(true);
    if (navigateTo) {
      navigate(navigateTo);
    } else {
      navigate('/dashboard');
    }
    onComplete?.();
  };

  const tools = [
    { name: 'WhatsApp Business API', desc: 'Send automated messages', icon: '💬', status: waStatus, action: () => handleComplete('/whatsapp') },
    { name: 'Google Business Profile', desc: 'Manage on Search & Maps', icon: '🏪', status: gbpStatus, action: () => handleComplete('/google-business') },
    { name: 'Google Sheets', desc: 'Sync contacts automatically', icon: '📊', status: 'disconnected' as ConnectionState, action: () => handleComplete('/settings') },
    { name: 'Razorpay', desc: 'Accept payments', icon: '💳', status: razorpayStatus, action: () => handleComplete('/settings') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            {steps.map((_, i) => (
              <div key={i} className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold transition-colors flex-shrink-0 ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  {i + 1 < step ? <Check size={14} className="sm:w-4 sm:h-4" /> : i + 1}
                </div>
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden min-w-0">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.max(0, ((step - 1) / (totalSteps - 1))) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8">
          {step === 1 && setupMode === 'choice' && (
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white mx-auto mb-4 sm:mb-6">
                <Sparkles size={32} className="sm:w-10 sm:h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                Welcome to BizzAuto! 🎉
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-2">
                Hey {user?.name || 'there'}! Choose how you want to set up your business:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                {/* Quick Setup Option */}
                <button
                  onClick={() => {
                    setSetupMode('auto');
                    setStep(1);
                  }}
                  className="p-6 border-2 border-blue-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">⚡ Quick Setup</h3>
                  <p className="text-sm text-gray-500">
                    Upload business card/document - we'll auto-fill everything!
                  </p>
                </button>

                {/* Manual Setup Option */}
                <button
                  onClick={() => {
                    setSetupMode('manual');
                    setStep(2);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-3 group-hover:scale-110 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">✍️ Manual Setup</h3>
                  <p className="text-sm text-gray-500">
                    Enter details manually - full control over everything.
                  </p>
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-6">
                Don't worry, you can always change details later in Settings
              </p>
            </div>
          )}

          {step === 1 && setupMode === 'auto' && (
            <AutoSetupWizard onComplete={(data) => {
              console.log('Setup data:', data);
              setStep(2);
            }} />
          )}
          {step === 2 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                {setupMode === 'auto' ? '✅ Details saved! Choose your category' : 'Tell us about your business'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                {['Salon & Spa', 'Restaurant', 'Gym & Fitness', 'Real Estate', 'Education', 'E-Commerce', 'Healthcare', 'Agency'].map(type => (
                  <button key={type} onClick={() => setSelectedType(type)}
                    className={`p-3 sm:p-4 border-2 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                      selectedType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-blue-50'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
              {business && (
                <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm">
                  <span className="text-gray-500">Current: </span>
                  <span className="font-medium">{business.name}</span>
                  <span className="text-gray-500"> ({business.type})</span>
                </div>
              )}
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Connect your tools</h2>
              <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                {tools.map(tool => (
                  <div key={tool.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="text-xl sm:text-2xl flex-shrink-0">{tool.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{tool.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{tool.desc}</p>
                      </div>
                    </div>
                    {tool.status === 'connected' ? (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-green-700 bg-green-50 rounded-lg text-xs sm:text-sm font-medium self-start sm:self-auto">
                        <CheckCircle size={14} className="sm:w-4 sm:h-4" /> Connected
                      </div>
                    ) : tool.status === 'loading' ? (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-400 bg-gray-100 rounded-lg text-xs sm:text-sm self-start sm:self-auto">
                        <RefreshCw size={12} className="sm:w-3.5 sm:h-3.5 animate-spin" /> Checking...
                      </div>
                    ) : (
                      <button onClick={tool.action} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto">
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-500">You can also connect these later in Settings</p>
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-4 sm:py-6 md:py-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4 sm:mb-6"><Check size={32} className="sm:w-10 sm:h-10" /></div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">You're all set!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-2">Your business is configured and ready. Start automating your growth!</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
                {[{ label: 'Contacts', value: '0' }, { label: 'Automations', value: '0' }, { label: 'Messages', value: '0' }].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          {step > 1 && setupMode !== 'auto' ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Back</span>
            </button>
          ) : step > 1 && setupMode === 'auto' ? (
            <button onClick={() => setSetupMode('choice')} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Back</span>
            </button>
          ) : <div />}
          {setupMode === 'auto' && step === 1 ? (
            <div />
          ) : (
            <button onClick={() => step < totalSteps ? setStep(step + 1) : handleComplete()}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              {step < totalSteps ? 'Continue' : 'Get Started'} <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
