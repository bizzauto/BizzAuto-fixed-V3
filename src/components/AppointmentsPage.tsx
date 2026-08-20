import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight, User, MapPin, Phone, X, Check,
  Settings, Bell, Repeat, Video, Mail, RefreshCw, AlertCircle, CheckCircle, Loader2, Globe
} from 'lucide-react';
import apiClient from '../lib/api';

interface Appointment {
  id: string;
  title: string;
  contactName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  type: 'call' | 'meeting' | 'demo' | 'follow-up' | 'consultation' | 'service';
  location?: string;
  meetingUrl?: string;
  notes?: string;
  serviceId?: string;
  reminderSent?: boolean;
  recurring?: { frequency: 'daily' | 'weekly' | 'monthly'; endDate?: string };
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  active: boolean;
}

interface AvailabilitySlot {
  day: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  no_show: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const typeIcons: Record<string, string> = {
  call: '📞', meeting: '🤝', demo: '💻', 'follow-up': '🔄', consultation: '💡', service: '🔧',
};

const SERVICE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const appointmentsAPI = {
  list: (params?: any) => apiClient.get('/appointments', { params }),
  create: (data: any) => apiClient.post('/appointments', data),
  update: (id: string, data: any) => apiClient.put(`/appointments/${id}`, data),
  delete: (id: string) => apiClient.delete(`/appointments/${id}`),
  confirm: (id: string) => apiClient.patch(`/appointments/${id}/confirm`),
  cancel: (id: string) => apiClient.patch(`/appointments/${id}/cancel`),
  complete: (id: string) => apiClient.patch(`/appointments/${id}/complete`),
  sendReminder: (id: string) => apiClient.post(`/appointments/${id}/remind`),
};

const formatDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AppointmentsPage: React.FC = () => {
  const today = new Date();
  const todayStr = formatDateStr(today);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<'calendar' | 'week' | 'day' | 'list' | 'services'>('calendar');
  const [bufferTime, setBufferTime] = useState(15); // minutes between appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      day: i, enabled: i > 0 && i < 6, startTime: '09:00', endTime: '18:00',
      breakStart: '13:00', breakEnd: '14:00',
    }))
  );
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [reminderConfig, setReminderConfig] = useState({ enabled: true, beforeMinutes: 60, method: 'whatsapp' as 'whatsapp' | 'email' | 'both' });

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, servicesRes] = await Promise.allSettled([
        appointmentsAPI.list(),
        apiClient.get('/appointments/services'),
      ]);

      if (apptRes.status === 'fulfilled') {
        const data = apptRes.value.data?.data?.appointments || apptRes.value.data?.data || [];
        const mapped = (Array.isArray(data) ? data : []).map((a: any) => ({
          id: a.id,
          title: a.title || a.service?.name || 'Appointment',
          contactName: a.contact?.name || a.contactName || 'Unknown',
          phone: a.contact?.phone || a.phone || '',
          email: a.contact?.email || a.email,
          date: a.startTime ? new Date(a.startTime).toISOString().split('T')[0] : a.date || '',
          time: a.startTime ? new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : a.time || '10:00',
          duration: a.duration || a.service?.duration || 30,
          status: a.status || 'scheduled',
          type: a.type || a.service?.type || 'meeting',
          location: a.location || a.meetingUrl || '',
          meetingUrl: a.meetingUrl,
          notes: a.notes || '',
          serviceId: a.serviceId,
          reminderSent: a.reminderSent || false,
          recurring: a.recurring,
        }));
        setAppointments(mapped);
      }

      if (servicesRes.status === 'fulfilled') {
        const srv = servicesRes.value.data?.data?.services || servicesRes.value.data?.data || [];
        setServices(Array.isArray(srv) && srv.length > 0 ? srv : []);
      }
    } catch {
      if (services.length === 0) {
        setServices([
          { id: 's1', name: 'General Consultation', description: 'Standard business consultation', duration: 30, price: 0, color: '#3B82F6', active: true },
          { id: 's2', name: 'Product Demo', description: 'Live product demonstration', duration: 45, price: 0, color: '#10B981', active: true },
          { id: 's3', name: 'Follow-up Meeting', description: 'Review progress and next steps', duration: 30, price: 0, color: '#F59E0B', active: true },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getAppointmentsForDate = (dateStr: string) => appointments.filter(a => a.date === dateStr);
  const selectedAppts = getAppointmentsForDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time));

  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
  const thisWeekCount = appointments.filter(a => {
    const d = new Date(a.date);
    return d >= startOfWeek && d <= endOfWeek;
  }).length;

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const dateStrForDay = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isToday = (day: number) => year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const handleAddAppointment = async (apptData: Omit<Appointment, 'id'>) => {
    try {
      const res = await appointmentsAPI.create(apptData);
      const created = res.data?.data || res.data;
      if (created?.id) {
        setAppointments(prev => [{ ...apptData, id: created.id }, ...prev]);
      }
      showToast('Appointment booked!');
    } catch {
      const newAppt: Appointment = { ...apptData, id: `local-${Date.now()}` };
      setAppointments(prev => [newAppt, ...prev]);
      showToast('Appointment booked (offline)');
    }
    setShowBookingModal(false);
  };

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    try {
      if (status === 'confirmed') await appointmentsAPI.confirm(id);
      else if (status === 'cancelled') await appointmentsAPI.cancel(id);
      else if (status === 'completed') await appointmentsAPI.complete(id);
      else await appointmentsAPI.update(id, { status });
    } catch { /* optimistic update */ }
  };

  const handleSendReminder = async (id: string) => {
    try {
      await appointmentsAPI.sendReminder(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, reminderSent: true } : a));
      showToast('Reminder sent!');
    } catch {
      showToast('Failed to send reminder', 'error');
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiClient.post('/appointments/settings', { availability, reminderConfig, services });
      showToast('Settings saved!');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-4 sm:p-6 md:p-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Schedule, manage, and automate your meetings & services</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Settings">
            <Settings size={18} />
          </button>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {([
              { key: 'calendar', label: 'Month' },
              { key: 'week', label: 'Week' },
              { key: 'day', label: 'Day' },
              { key: 'list', label: 'List' },
              { key: 'services', label: 'Services' },
            ] as const).map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v.key ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                {v.label}
              </button>
            ))}
          </div>
          {view !== 'services' && (
            <button onClick={() => setShowBookingModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm">
              <Plus size={18} /> Book
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Today', count: appointments.filter(a => a.date === todayStr).length, icon: '📅', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          { label: 'This Week', count: thisWeekCount, icon: '📊', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
          { label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length, icon: '✅', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
          { label: 'Pending', count: appointments.filter(a => a.status === 'scheduled').length, icon: '⏳', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} border rounded-xl p-3 md:p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-lg md:text-2xl">{stat.icon}</span>
              <span className="text-xl md:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</span>
            </div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const ds = dateStrForDay(day);
                const appts = getAppointmentsForDate(ds);
                const sel = ds === selectedDate;
                return (
                  <button key={day} onClick={() => setSelectedDate(ds)}
                    className={`relative p-1.5 md:p-2 rounded-lg text-xs md:text-sm transition-colors ${sel ? 'bg-blue-600 text-white' : isToday(day) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {day}
                    {appts.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5 md:mt-1">
                        {appts.slice(0, 3).map((_, idx) => (
                          <div key={idx} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${sel ? 'bg-white' : 'bg-blue-500'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Appointments */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm md:text-base">
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
            </h3>
            {selectedAppts.length === 0 ? (
              <div className="text-center py-4 sm:py-6 md:py-8">
                <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No appointments for this day</p>
                <button onClick={() => setShowBookingModal(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                  + Book one now
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {selectedAppts.map(appt => (
                  <div key={appt.id} className="p-3 md:p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeIcons[appt.type]}</span>
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm md:text-base">{appt.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusColors[appt.status]}`}>{appt.status}</span>
                    </div>
                    <div className="space-y-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2"><User size={12} /> {appt.contactName}</div>
                      <div className="flex items-center gap-2"><Clock size={12} /> {appt.time} • {appt.duration} min</div>
                      {appt.location && <div className="flex items-center gap-2"><MapPin size={12} /> {appt.location}</div>}
                      {appt.meetingUrl && (
                        <a href={appt.meetingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                          <Video size={12} /> Join Meeting
                        </a>
                      )}
                      <div className="flex items-center gap-2"><Phone size={12} /> {appt.phone}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {appt.status === 'scheduled' && (
                        <>
                          <button onClick={() => handleStatusChange(appt.id, 'confirmed')} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-[10px] md:text-xs rounded-lg hover:bg-green-700">
                            <Check size={12} /> Confirm
                          </button>
                          <button onClick={() => handleStatusChange(appt.id, 'cancelled')} className="flex items-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 text-[10px] md:text-xs rounded-lg hover:bg-red-50">
                            <X size={12} /> Cancel
                          </button>
                        </>
                      )}
                      {appt.status === 'confirmed' && (
                        <button onClick={() => handleStatusChange(appt.id, 'completed')} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-600 text-white text-[10px] md:text-xs rounded-lg hover:bg-gray-700">
                          <Check size={12} /> Complete
                        </button>
                      )}
                      {!appt.reminderSent && appt.status !== 'cancelled' && (
                        <button onClick={() => handleSendReminder(appt.id)} className="flex items-center gap-1 px-2.5 py-1.5 border border-blue-200 text-blue-600 text-[10px] md:text-xs rounded-lg hover:bg-blue-50">
                          <Bell size={12} /> Remind
                        </button>
                      )}
                      {appt.recurring && <span className="flex items-center gap-1 text-[10px] text-purple-600"><Repeat size={12} /> Recurring</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Week View</h3>
            <span className="text-sm text-gray-500">{bufferTime} min buffer between appointments</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const date = new Date();
              date.setDate(date.getDate() - date.getDay() + i + 1);
              const dateStr = date.toISOString().split('T')[0];
              const dayAppts = getAppointmentsForDate(dateStr);
              return (
                <div key={day} className="min-h-[200px]">
                  <div className={`text-center py-2 rounded-t-lg ${date.toDateString() === new Date().toDateString() ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    <p className="text-xs font-medium">{day}</p>
                    <p className="text-lg font-bold">{date.getDate()}</p>
                  </div>
                  <div className="space-y-1 p-1">
                    {dayAppts.map(appt => (
                      <div key={appt.id} className="p-1.5 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 rounded text-xs">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{appt.title}</p>
                        <p className="text-gray-500 dark:text-gray-400">{appt.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Buffer: {bufferTime} min</span>
              <select
                value={bufferTime}
                onChange={(e) => setBufferTime(Number(e.target.value))}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value={0}>No buffer</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
              const hourAppts = getAppointmentsForDate(new Date().toISOString().split('T')[0])
                .filter(a => {
                  const h = parseInt(a.time.split(':')[0]);
                  return h === hour;
                });
              return (
                <div key={hour} className="flex gap-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="w-16 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{hour}:00</span>
                  <div className="flex-1 min-h-[40px]">
                    {hourAppts.map(appt => (
                      <div key={appt.id} className="p-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg mb-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{appt.title}</p>
                          <span className="text-xs text-gray-500">{appt.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(appt as any).contact}</p>
                      </div>
                    ))}
                    {hourAppts.length === 0 && <div className="h-8" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No appointments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {appointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map(appt => (
                <div key={appt.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-[80px]">
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(appt.date).getDate()}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{DAYS[new Date(appt.date).getDay()]}</p>
                    </div>
                    <p className="text-xs text-gray-500">{appt.time}</p>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xl">{typeIcons[appt.type]}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{appt.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{appt.contactName} • {appt.duration}m</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[appt.status]}`}>{appt.status}</span>
                    <button onClick={() => handleSendReminder(appt.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Remind">
                      <Bell size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SERVICES VIEW */}
      {view === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure the services you offer for booking</p>
            <button onClick={() => {
              setServices(prev => [...prev, {
                id: `s-${Date.now()}`, name: '', description: '', duration: 30, price: 0,
                color: SERVICE_COLORS[prev.length % SERVICE_COLORS.length], active: true,
              }]);
            }} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus size={16} /> Add Service
            </button>
          </div>

          {services.map((service, idx) => (
            <div key={service.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <input type="color" value={service.color} onChange={e => {
                    const updated = [...services];
                    updated[idx] = { ...updated[idx], color: e.target.value };
                    setServices(updated);
                  }} className="w-8 h-8 rounded cursor-pointer" />
                  <div className="flex-1">
                    <input type="text" value={service.name} onChange={e => {
                      const updated = [...services];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setServices(updated);
                    }} placeholder="Service name" className="w-full font-medium text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-sm" />
                    <input type="text" value={service.description} onChange={e => {
                      const updated = [...services];
                      updated[idx] = { ...updated[idx], description: e.target.value };
                      setServices(updated);
                    }} placeholder="Brief description" className="w-full text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Duration (min)</label>
                    <input type="number" value={service.duration} onChange={e => {
                      const updated = [...services];
                      updated[idx] = { ...updated[idx], duration: parseInt(e.target.value) || 30 };
                      setServices(updated);
                    }} className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Price (₹)</label>
                    <input type="number" value={service.price} onChange={e => {
                      const updated = [...services];
                      updated[idx] = { ...updated[idx], price: parseInt(e.target.value) || 0 };
                      setServices(updated);
                    }} className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700" />
                  </div>
                  <button onClick={() => {
                    const updated = [...services];
                    updated[idx] = { ...updated[idx], active: !updated[idx].active };
                    setServices(updated);
                  }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${service.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {service.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => setServices(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Appointment Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-6">
              {/* Availability */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" /> Availability Hours
                </h3>
                <div className="space-y-2">
                  {DAYS.map((day, idx) => {
                    const slot = availability[idx];
                    return (
                      <div key={day} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <label className="flex items-center gap-2 min-w-[60px]">
                          <input type="checkbox" checked={slot.enabled}
                            onChange={() => {
                              const updated = [...availability];
                              updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                              setAvailability(updated);
                            }}
                            className="rounded border-gray-300 text-blue-600 w-4 h-4" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{day}</span>
                        </label>
                        {slot.enabled && (
                          <>
                            <input type="time" value={slot.startTime} onChange={e => {
                              const updated = [...availability];
                              updated[idx] = { ...updated[idx], startTime: e.target.value };
                              setAvailability(updated);
                            }} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 w-24" />
                            <span className="text-gray-400">to</span>
                            <input type="time" value={slot.endTime} onChange={e => {
                              const updated = [...availability];
                              updated[idx] = { ...updated[idx], endTime: e.target.value };
                              setAvailability(updated);
                            }} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 w-24" />
                            <span className="text-xs text-gray-400 ml-2">Break: {slot.breakStart || '13:00'} - {slot.breakEnd || '14:00'}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reminders */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Bell size={18} className="text-purple-600" /> Automated Reminders
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <input type="checkbox" checked={reminderConfig.enabled}
                      onChange={() => setReminderConfig({ ...reminderConfig, enabled: !reminderConfig.enabled })}
                      className="rounded border-gray-300 text-blue-600 w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable automated reminders</p>
                      <p className="text-xs text-gray-500">Send reminders to customers before appointments</p>
                    </div>
                  </label>
                  {reminderConfig.enabled && (
                    <div className="grid grid-cols-2 gap-3 ml-8">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Send before</label>
                        <select value={reminderConfig.beforeMinutes} onChange={e => setReminderConfig({ ...reminderConfig, beforeMinutes: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700">
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={1440}>1 day</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Via</label>
                        <select value={reminderConfig.method} onChange={e => setReminderConfig({ ...reminderConfig, method: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700">
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar Sync */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Globe size={18} className="text-green-600" /> Calendar Sync
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Google Calendar</p>
                        <p className="text-xs text-gray-500">Sync appointments both ways</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      Connect
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">iC</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">iCal / Outlook</p>
                        <p className="text-xs text-gray-500">Import calendar via URL</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={saveSettings} disabled={savingSettings}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {savingSettings ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <BookingModal
          onClose={() => setShowBookingModal(false)}
          onAdd={handleAddAppointment}
          defaultDate={selectedDate}
          services={services}
        />
      )}
    </div>
  );
};

const BookingModal: React.FC<{
  onClose: () => void;
  onAdd: (appt: Omit<Appointment, 'id'>) => void;
  defaultDate: string;
  services: Service[];
}> = ({ onClose, onAdd, defaultDate, services }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState<Appointment['type']>('call');
  const [duration, setDuration] = useState(30);
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurringEnd, setRecurringEnd] = useState('');

  const handleServiceSelect = (s: Service) => {
    setSelectedService(s.id);
    setTitle(s.name);
    setDuration(s.duration);
    setType(s.name.toLowerCase().includes('demo') ? 'demo' : s.name.toLowerCase().includes('consult') ? 'consultation' : 'meeting');
  };

  const handleSubmit = () => {
    if (!title || !date || !time || !contactName) return;
    onAdd({
      title, contactName, phone: phone || 'N/A', email: email || undefined,
      date, time, duration, type,
      location: location || undefined, meetingUrl: meetingUrl || undefined,
      notes: notes || undefined, serviceId: selectedService || undefined,
      status: 'scheduled', reminderSent: false,
      recurring: isRecurring ? { frequency: recurringFreq, endDate: recurringEnd || undefined } : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">Book Appointment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Service Quick Select */}
        {services.length > 0 && (
          <div className="px-4 md:px-4 sm:px-5 md:px-6 pt-4">
            <p className="text-xs text-gray-500 mb-2">Quick select a service:</p>
            <div className="flex flex-wrap gap-2">
              {services.filter(s => s.active).map(s => (
                <button key={s.id} onClick={() => handleServiceSelect(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${selectedService === s.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                  {s.name} ({s.duration}m)
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 md:p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Product Demo" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="call">📞 Call</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="demo">💻 Demo</option>
                <option value="consultation">💡 Consultation</option>
                <option value="follow-up">🔄 Follow-up</option>
                <option value="service">🔧 Service</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Duration</label>
              <select value={duration} onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Contact Name *</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="John Doe" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Phone</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="john@example.com" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Meeting Link</label>
              <input type="text" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                placeholder="Zoom / Google Meet URL" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Office address" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Recurring */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={() => setIsRecurring(!isRecurring)} className="rounded border-gray-300 text-blue-600 w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Recurring appointment</span>
            </label>
            {isRecurring && (
              <div className="flex gap-3 mt-2 ml-6">
                <select value={recurringFreq} onChange={e => setRecurringFreq(e.target.value as any)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input type="date" value={recurringEnd} onChange={e => setRecurringEnd(e.target.value)}
                  placeholder="End date" className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-4 sm:p-5 md:p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!title || !date || !time || !contactName}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;
