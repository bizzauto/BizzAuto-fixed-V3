import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import { Bell, Mail, MessageSquare, Save, Loader2 } from 'lucide-react';

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  newLeadAlert: boolean;
  appointmentReminder: boolean;
  campaignUpdate: boolean;
  supportTicketUpdate: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
}

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  whatsappNotifications: false,
  newLeadAlert: true,
  appointmentReminder: true,
  campaignUpdate: true,
  supportTicketUpdate: true,
  weeklyReport: true,
  monthlyReport: true,
  securityAlerts: true,
  marketingEmails: false,
};

export default function NotificationPreferencesPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/user/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPreferences({ ...defaultPreferences, ...data.data });
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Notification preferences saved');
      } else {
        toast.error(data.error || 'Failed to save preferences');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="text-blue-600" /> Notification Preferences
        </h1>
        <p className="text-gray-600 mt-1">Choose how you want to be notified</p>
      </div>

      <div className="space-y-6">
        {/* Channels */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail size={18} /> Notification Channels
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <ToggleSwitch
                checked={preferences.emailNotifications}
                onChange={(v) => setPreferences({ ...preferences, emailNotifications: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Browser push notifications</p>
              </div>
              <ToggleSwitch
                checked={preferences.pushNotifications}
                onChange={(v) => setPreferences({ ...preferences, pushNotifications: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">WhatsApp Notifications</p>
                <p className="text-sm text-gray-500">Get alerts on WhatsApp</p>
              </div>
              <ToggleSwitch
                checked={preferences.whatsappNotifications}
                onChange={(v) => setPreferences({ ...preferences, whatsappNotifications: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive text messages for critical alerts</p>
              </div>
              <ToggleSwitch
                checked={preferences.smsNotifications}
                onChange={(v) => setPreferences({ ...preferences, smsNotifications: v })}
              />
            </div>
          </div>
        </div>

        {/* Business Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} /> Business Alerts
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">New Lead Alert</p>
                <p className="text-sm text-gray-500">When a new lead is captured</p>
              </div>
              <ToggleSwitch
                checked={preferences.newLeadAlert}
                onChange={(v) => setPreferences({ ...preferences, newLeadAlert: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Appointment Reminders</p>
                <p className="text-sm text-gray-500">Upcoming appointment notifications</p>
              </div>
              <ToggleSwitch
                checked={preferences.appointmentReminder}
                onChange={(v) => setPreferences({ ...preferences, appointmentReminder: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Campaign Updates</p>
                <p className="text-sm text-gray-500">Campaign status and completion alerts</p>
              </div>
              <ToggleSwitch
                checked={preferences.campaignUpdate}
                onChange={(v) => setPreferences({ ...preferences, campaignUpdate: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Support Ticket Updates</p>
                <p className="text-sm text-gray-500">When a ticket is updated or replied to</p>
              </div>
              <ToggleSwitch
                checked={preferences.supportTicketUpdate}
                onChange={(v) => setPreferences({ ...preferences, supportTicketUpdate: v })}
              />
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Reports & Marketing</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Weekly Report</p>
                <p className="text-sm text-gray-500">Weekly business summary</p>
              </div>
              <ToggleSwitch
                checked={preferences.weeklyReport}
                onChange={(v) => setPreferences({ ...preferences, weeklyReport: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Monthly Report</p>
                <p className="text-sm text-gray-500">Monthly analytics and insights</p>
              </div>
              <ToggleSwitch
                checked={preferences.monthlyReport}
                onChange={(v) => setPreferences({ ...preferences, monthlyReport: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Security Alerts</p>
                <p className="text-sm text-gray-500">Login and security-related notifications</p>
              </div>
              <ToggleSwitch
                checked={preferences.securityAlerts}
                onChange={(v) => setPreferences({ ...preferences, securityAlerts: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Marketing Emails</p>
                <p className="text-sm text-gray-500">Product updates and tips</p>
              </div>
              <ToggleSwitch
                checked={preferences.marketingEmails}
                onChange={(v) => setPreferences({ ...preferences, marketingEmails: v })}
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}