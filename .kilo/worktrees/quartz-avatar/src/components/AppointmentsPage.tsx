import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, User, MapPin, Phone, X, Check } from 'lucide-react';
import apiClient from '../lib/api';

interface Appointment {
  id: string;
  title: string;
  contactName: string;
  phone: string;
  date: string;
  time: string;
  duration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  type: 'call' | 'meeting' | 'demo' | 'follow-up';
  location?: string;
  notes?: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const typeIcons: Record<string, string> = {
  call: '📞',
  meeting: '🤝',
  demo: '💻',
  'follow-up': '🔄',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const appointmentsAPI = {
  list: (params?: any) => apiClient.get('/appointments', { params }),
  create: (data: any) => apiClient.post('/appointments', data),
  update: (id: string, data: any) => apiClient.put(`/appointments/${id}`, data),
  delete: (id: string) => apiClient.delete(`/appointments/${id}`),
};

const formatDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const getEndOfWeek = (date: Date): Date => {
  const end = new Date(date);
  end.setDate(end.getDate() + (6 - end.getDay()));
  return end;
};

const AppointmentsPage: React.FC = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(formatDateStr(today));
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.list();
      const data = response.data?.data?.appointments || response.data?.data || response.data || [];
      // Map backend data to frontend interface
      const mappedData = data.map((a: any) => ({
        id: a.id,
        title: a.title,
        contactName: a.contact?.name || 'Unknown',
        phone: a.contact?.phone || '',
        date: a.startTime ? new Date(a.startTime).toISOString().split('T')[0] : '',
        time: a.startTime ? new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        duration: a.startTime && a.endTime ? Math.round((new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60000) : 30,
        status: a.status || 'scheduled',
        type: a.service || 'meeting',
        location: a.location || a.meetingUrl || '',
        notes: a.notes || '',
      }));
      setAppointments(mappedData);
    } catch {
      // API not ready yet - keep empty array
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getAppointmentsForDate = (dateStr: string) =>
    appointments.filter(a => a.date === dateStr);

  const selectedAppts = getAppointmentsForDate(selectedDate);

  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);
  const startOfWeekStr = formatDateStr(startOfWeek);
  const endOfWeekStr = formatDateStr(endOfWeek);
  const todayStr = formatDateStr(today);

  const thisWeekCount = appointments.filter(a => a.date >= startOfWeekStr && a.date <= endOfWeekStr).length;

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const dateStrForDay = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const handleAddAppointment = async (apptData: Omit<Appointment, 'id'>) => {
    try {
      const res = await appointmentsAPI.create(apptData);
      const created = res.data?.data || res.data;
      setAppointments(prev => [created, ...prev]);
    } catch {
      // Fallback to local add if API fails
      const newAppt: Appointment = { ...apptData, id: `local-${Date.now()}` };
      setAppointments(prev => [newAppt, ...prev]);
    }
    setShowBookingModal(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Appointments</h1>
          <p className="text-gray-600 dark:text-gray-400">Schedule and manage your meetings & demos</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} /> Book Appointment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Today', count: appointments.filter(a => a.date === todayStr).length, icon: '📅', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          { label: 'This Week', count: thisWeekCount, icon: '📊', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
          { label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length, icon: '✅', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
          { label: 'Pending', count: appointments.filter(a => a.status === 'scheduled').length, icon: '⏳', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} border rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {view === 'calendar' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                  if (!day) return <div key={`empty-${i}`} />;
                  const dateStr = dateStrForDay(day);
                  const appts = getAppointmentsForDate(dateStr);
                  const isSelected = dateStr === selectedDate;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`relative p-2 rounded-lg text-sm transition-colors ${isSelected
                          ? 'bg-blue-600 text-white'
                          : isToday(day)
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {day}
                      {appts.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-1">
                          {appts.slice(0, 3).map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* List view */
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No appointments yet</p>
                </div>
              ) : (
                appointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map(appt => (
                  <div key={appt.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="text-2xl">{typeIcons[appt.type]}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{appt.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{appt.contactName} • {appt.date} at {appt.time}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[appt.status]}`}>
                      {appt.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{appt.duration}m</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected day appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
          </h3>
          {selectedAppts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No appointments for this day</p>
              <button onClick={() => setShowBookingModal(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                + Book one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppts.map(appt => (
                <div key={appt.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeIcons[appt.type]}</span>
                      <h4 className="font-medium text-gray-900 dark:text-white">{appt.title}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[appt.status]}`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <User size={14} /> {appt.contactName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} /> {appt.time} • {appt.duration} min
                    </div>
                    {appt.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} /> {appt.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone size={14} /> {appt.phone}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {appt.status === 'scheduled' && (
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
                        <Check size={12} /> Confirm
                      </button>
                    )}
                    <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          onClose={() => setShowBookingModal(false)}
          onAdd={handleAddAppointment}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
};

// Separate component for the Booking Modal to manage its own form state
const BookingModal: React.FC<{
  onClose: () => void;
  onAdd: (appt: Omit<Appointment, 'id'>) => void;
  defaultDate: string;
}> = ({ onClose, onAdd, defaultDate }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState<'call' | 'meeting' | 'demo' | 'follow-up'>('call');
  const [duration, setDuration] = useState(30);
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!title || !date || !time || !contactName) return;
    onAdd({
      title,
      contactName,
      phone: phone || 'N/A',
      date,
      time,
      duration,
      type,
      location: location || undefined,
      notes: notes || undefined,
      status: 'scheduled',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Book Appointment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Product Demo"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="call">📞 Call</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="demo">💻 Demo</option>
                <option value="follow-up">🔄 Follow-up</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location / Link</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Zoom link or office address"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !date || !time || !contactName}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;
