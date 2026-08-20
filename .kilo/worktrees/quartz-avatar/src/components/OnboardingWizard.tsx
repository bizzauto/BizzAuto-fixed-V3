import React, { useState } from 'react';
import { Check, ArrowRight, ArrowLeft, Building2, MessageSquare, Zap, Star } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';

const OnboardingWizard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const totalSteps = 4;
  const { user, business, setOnboardingCompleted } = useAuthStore();

  const steps = [
    { title: 'Welcome', icon: <Star size={24} /> },
    { title: 'Business', icon: <Building2 size={24} /> },
    { title: 'Connect', icon: <MessageSquare size={24} /> },
    { title: 'Done!', icon: <Check size={24} /> },
  ];

  const handleComplete = () => {
    setOnboardingCompleted(true);
    onComplete?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-8 pt-8">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((_, i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-colors ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  {i + 1 < step ? <Check size={16} /> : i + 1}
                </div>
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.max(0, ((step - 1) / (totalSteps - 1))) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-8">
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6"><Zap size={40} /></div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to BizzAuto Solutions!</h2>
              <p className="text-gray-600 mb-4 text-lg">Hey {user?.name || 'there'}! Let's get your business set up in under 2 minutes.</p>
              <p className="text-gray-500">We'll help you connect WhatsApp, add contacts, and create your first automation.</p>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your business</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {['Salon & Spa', 'Restaurant', 'Gym & Fitness', 'Real Estate', 'Education', 'E-Commerce', 'Healthcare', 'Agency'].map(type => (
                  <button key={type} onClick={() => setSelectedType(type)}
                    className={`p-4 border-2 rounded-lg transition-colors text-sm font-medium ${
                      selectedType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-blue-50'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
              {business && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <span className="text-gray-500">Current: </span>
                  <span className="font-medium">{business.name}</span>
                  <span className="text-gray-500"> ({business.type})</span>
                </div>
              )}
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect your tools</h2>
              <div className="space-y-3 mb-6">
                {[
                  { name: 'WhatsApp Business API', desc: 'Send automated messages', icon: '💬', connected: false },
                  { name: 'Google Sheets', desc: 'Sync contacts automatically', icon: '📊', connected: false },
                  { name: 'Razorpay', desc: 'Accept payments', icon: '💳', connected: false },
                ].map(tool => (
                  <div key={tool.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tool.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{tool.name}</p>
                        <p className="text-sm text-gray-500">{tool.desc}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Connect</button>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">You can also connect these later in Settings</p>
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6"><Check size={40} /></div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">You're all set!</h2>
              <p className="text-gray-600 mb-8 text-lg">Your business is configured and ready. Start automating your growth!</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[{ label: 'Contacts', value: '0' }, { label: 'Automations', value: '0' }, { label: 'Messages', value: '0' }].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-6 py-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft size={18} /> Back
            </button>
          ) : <div />}
          <button onClick={() => step < totalSteps ? setStep(step + 1) : handleComplete()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
            {step < totalSteps ? 'Continue' : 'Get Started'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;