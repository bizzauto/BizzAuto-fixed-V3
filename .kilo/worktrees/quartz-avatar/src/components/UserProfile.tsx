import React, { useState } from 'react';
import {
  User, Mail, Phone, Shield, Key, Camera,
  CheckCircle, AlertCircle, Save, Clock, Building2, Loader2
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';
import { authAPI } from '../lib/api';

const UserProfile: React.FC = () => {
  const { user, business, updateProfile } = useAuthStore();
  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: profile.name, phone: profile.phone });
      showToast('Profile updated successfully!');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (passwords.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully!');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);

  const roleName = user?.role === 'OWNER' ? 'Owner' : user?.role === 'ADMIN' ? 'Admin' : user?.role || 'Member';

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full object-cover mx-auto" />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto">
                  {getInitials(profile.name || 'U')}
                </div>
              )}
              <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 border border-gray-200">
                <Camera size={16} className="text-gray-600" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{profile.name || 'User'}</h2>
            <p className="text-gray-500 text-sm mb-4">{profile.email}</p>

            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Shield size={16} className="text-blue-600" />
                <span className="font-medium">{roleName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Building2 size={16} className="text-green-600" />
                <span>{business?.name || 'No Business'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock size={16} className="text-purple-600" />
                <span>Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800">{business?.plan || 'Free'} Plan</p>
                <p className="text-xs text-blue-600 mt-1">
                  {business?.plan === 'pro' ? '₹1499/month' : business?.plan === 'starter' ? '₹499/month' : 'Free tier'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex gap-2">
            {[
              { id: 'profile', label: 'Profile', icon: <User size={16} /> },
              { id: 'security', label: 'Security', icon: <Key size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                Personal Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail size={14} className="inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Change Password */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Key size={20} className="text-blue-600" />
                  Change Password
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Min. 8 characters"
                    />
                    {passwords.newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full ${
                                passwords.newPassword.length >= i * 3
                                  ? passwords.newPassword.length >= 12
                                    ? 'bg-green-500'
                                    : passwords.newPassword.length >= 8
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          {passwords.newPassword.length < 8
                            ? 'Weak - Add more characters'
                            : passwords.newPassword.length < 12
                            ? 'Medium - Add numbers & symbols'
                            : 'Strong'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Re-enter new password"
                    />
                    {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Update Password
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-green-600" />
                  Active Sessions
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Current Session</p>
                        <p className="text-xs text-gray-500">Active now</p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Active Now</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delete Account</p>
                    <p className="text-xs text-gray-500">Permanently delete your account and all data</p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
