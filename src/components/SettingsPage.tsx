import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { businessAPI, authAPI, settingsAPI } from '../lib/api';
import TwoFactorSetupModal from './TwoFactorSetupModal';
import { Save, Building, Phone, Mail, MapPin, Globe, Clock, Palette, Image, Shield, Lock, Loader2, ArrowRight, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SettingsPage() {
  const { business, user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ enabled: boolean; setupPending: boolean }>({ enabled: false, setupPending: false });
  const [loading2FA, setLoading2FA] = useState(true);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [whiteLabelActive, setWhiteLabelActive] = useState<boolean | null>(null);
  const [loadingWhiteLabel, setLoadingWhiteLabel] = useState(true);

  const [formData, setFormData] = useState({
    name: business?.name || '',
    type: business?.type || 'general',
    phone: business?.phone || '',
    email: business?.email || '',
    city: business?.city || '',
    address: business?.address || '',
    website: business?.website || '',
    timezone: 'Asia/Kolkata',
    primaryColor: business?.brandColors?.primary || '#4F46E5',
    secondaryColor: business?.brandColors?.secondary || '#10B981',
    logoUrl: business?.logoUrl || '',
  });

  // Fetch 2FA status
  useEffect(() => {
    const fetch2FAStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/two-factor/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setTwoFactorStatus(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch 2FA status:', error);
      } finally {
        setLoading2FA(false);
      }
    };

    fetch2FAStatus();
    fetchWhiteLabelStatus();
  }, []);

  const fetchWhiteLabelStatus = async () => {
    try {
      const res = await settingsAPI.getWhiteLabel();
      if (res.data?.success && res.data?.data) {
        setWhiteLabelActive(res.data.data.isActive === true);
      }
    } catch {
      // silently fail — status indicator is non-critical
    } finally {
      setLoadingWhiteLabel(false);
    }
  };

  const handle2FASetupComplete = () => {
    setTwoFactorStatus({ enabled: true, setupPending: false });
    toast.success('Two-factor authentication enabled');
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/two-factor/disable', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await response.json();
      if (data.success) {
        setTwoFactorStatus({ enabled: false, setupPending: false });
        setShowDisableConfirm(false);
        setDisablePassword('');
        toast.success('Two-factor authentication disabled');
      } else {
        toast.error(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      const result = await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (result.data?.success) {
        toast.success('Password changed successfully');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(result.data?.error || 'Failed to change password');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        brandColors: { primary: formData.primaryColor, secondary: formData.secondaryColor }
      };
      await businessAPI.update(payload);
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const res = await authAPI.googleLinkUrl();
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Failed to generate Google auth URL');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to connect Google');
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect Google account? You may not be able to sign in with Google anymore.')) return;
    try {
      await authAPI.googleUnlink();
      // Update local user state
      useAuthStore.setState((state: any) => ({
        user: { ...state.user, googleId: null }
      }));
      toast.success('Google account disconnected');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disconnect Google');
    }
  };

  // Check URL params for Google link result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'google_linked') {
      toast.success('Google account linked successfully!');
      // Refresh user data
      authAPI.getProfile().then(res => {
        if (res.data?.user) {
          useAuthStore.setState((state: any) => ({
            user: { ...state.user, ...res.data.user }
          }));
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      const errors: Record<string, string> = {
        google_already_linked: 'This Google account is already linked to another user',
        email_already_used: 'This email is already used by another account',
        link_token_expired: 'Link session expired. Please try again.',
        google_not_configured: 'Google OAuth is not configured',
      };
      toast.error(errors[params.get('error')!] || 'Google connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Business Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your business information and preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Building className="text-blue-600" size={20} />
            Business Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="restaurant">Restaurant</option>
                <option value="salon">Salon</option>
                <option value="gym">Gym</option>
                <option value="real_estate">Real Estate</option>
                <option value="coaching">Coaching</option>
                <option value="retail">Retail</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="inline mr-1" size={14} />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="inline mr-1" size={14} />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="business@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="inline mr-1" size={14} />
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mumbai"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="inline mr-1" size={14} />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://www.example.com"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Full address..."
            />
          </div>
        </div>

        {/* Branding & White-label */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Palette className="text-blue-600" size={20} />
                Branding & White-label
              </h3>
              {loadingWhiteLabel ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                    whiteLabelActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      whiteLabelActive ? 'bg-indigo-500' : 'bg-gray-400'
                    }`}
                  />
                  {whiteLabelActive ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings/white-label')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium shadow-lg shadow-indigo-500/25"
            >
              <ExternalLink size={14} />
              Open Full White-Label Settings
              <ArrowRight size={14} />
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Quick branding fields below. For full customization (custom domain, CSS, favicon, and more), open the dedicated White-Label settings page.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Image className="inline mr-1" size={14} />
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/logo.png"
              />
              {formData.logoUrl && (
                <img src={formData.logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="#4F46E5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="#10B981"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            Preferences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security - 2FA Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Shield className="text-green-600" size={20} />
            Security
          </h3>

          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                    {twoFactorStatus.enabled ? (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                        Enabled
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Add an extra layer of security by requiring a code from your authenticator app.
                  </p>
                </div>
                <div className="ml-4">
                  {loading2FA ? (
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  ) : twoFactorStatus.enabled ? (
                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => setShow2FAModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>

              {twoFactorStatus.enabled && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Your account is protected.</strong> You'll need your authenticator app to log in.
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                      Supported apps: Google Authenticator, Authy, 1Password, Microsoft Authenticator
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Password Change */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Last updated: Never
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2FA Setup Modal */}
        <TwoFactorSetupModal
          isOpen={show2FAModal}
          onClose={() => setShow2FAModal(false)}
          onComplete={handle2FASetupComplete}
        />

        {/* Disable 2FA Confirm Modal */}
        {showDisableConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <Shield className="w-8 h-8" />
                <h3 className="text-xl font-bold">Disable Two-Factor Authentication?</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This will remove the extra layer of security from your account. You'll only need your password to log in.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Your current password"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDisableConfirm(false);
                    setDisablePassword('');
                  }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={!disablePassword || loading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-3 text-blue-600 mb-4">
                <Lock className="w-8 h-8" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordLoading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Social Media Connections */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Globe className="text-blue-600" size={20} />
          Social Media Connections
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Connect your social media accounts to manage them from BizzAuto.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'WhatsApp Business', icon: '💬', color: 'green', connected: !!(business as any)?.waAccessToken, desc: 'Send messages, auto-replies, campaigns' },
            { name: 'Facebook', icon: '📘', color: 'blue', connected: !!(business as any)?.fbAccessToken, desc: 'Post to pages, lead ads' },
            { name: 'Instagram', icon: '📷', color: 'pink', connected: !!(business as any)?.igAccessToken, desc: 'Post, stories, reels' },
            { name: 'LinkedIn', icon: '💼', color: 'blue', connected: !!(business as any)?.linkedinAccessToken, desc: 'Professional posts' },
            { name: 'Twitter/X', icon: '🐦', color: 'sky', connected: !!(business as any)?.twitterAccessToken, desc: 'Tweets and threads' },
            { name: 'Google Business', icon: '🏢', color: 'red', connected: !!(business as any)?.gbpAccessToken, desc: 'Reviews, posts, insights' },
            { name: 'YouTube', icon: '📺', color: 'red', connected: !!(business as any)?.youtubeAccessToken, desc: 'Channel management, videos' },
            { name: 'Apple Sign-In', icon: '🍎', color: 'gray', connected: !!(user as any)?.appleId, desc: 'Sign in with Apple' },
          ].map((social) => (
            <div key={social.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{social.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{social.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{social.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {social.connected ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span> Not Connected
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Google OAuth - Interactive */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔐</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Google OAuth</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sign in with Google</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(user as any)?.googleId ? (
                <>
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Connected
                  </span>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  disabled={connectingGoogle}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {connectingGoogle ? <Loader2 size={12} className="animate-spin" /> : null}
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Deletion Section (GDPR) */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-red-200 dark:border-red-900">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
          ⚠️ Danger Zone
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        <AccountDeletionSection />
      </div>
    </div>
  );
}

function AccountDeletionSection() {
  const { user } = useAuthStore();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, confirmText }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Account deleted successfully');
        localStorage.removeItem('token');
        window.location.href = '/';
      } else {
        toast.error(data.error || 'Failed to delete account');
      }
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Account
        </button>
      ) : (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-4">
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>Warning:</strong> This will permanently delete:
          </p>
          <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
            <li>Your account and profile</li>
            <li>All business data (contacts, conversations, campaigns)</li>
            <li>All AI-generated content and automations</li>
            <li>All integrations and connected accounts</li>
            <li>All subscription and billing data</li>
          </ul>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enter your password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Your password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type <span className="font-bold">DELETE MY ACCOUNT</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="DELETE MY ACCOUNT"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirm(false);
                setPassword('');
                setConfirmText('');
              }}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!password || confirmText !== 'DELETE MY ACCOUNT' || deleting}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
