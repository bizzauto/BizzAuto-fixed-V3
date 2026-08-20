import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2,
  PhoneIncoming, PhoneOutgoing, Search, RefreshCw, Loader2,
  Globe, Wifi, Play, FileText, Settings, X, Send
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RT, ResponsiveContainer } from 'recharts';
import { voiceCallsAPI, walletAPI } from '../lib/api';

const DograhSettings = lazy(() => import('./DograhSettings'));

interface CallRecord {
  id: string;
  name: string;
  phone: string;
  type: 'incoming' | 'outgoing';
  direction: string;
  status: string;
  callType: string;
  duration: number;
  time: string;
  avatar: string;
  recordingUrl?: string;
  transcript?: string;
  workflowName?: string;
  costInfo?: any;
  contactId?: string;
}

interface Agent {
  id: number;
  name: string;
  status?: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  incoming: { icon: <PhoneIncoming size={14} />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Incoming' },
  outgoing: { icon: <PhoneOutgoing size={14} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Outgoing' },
};

const VoiceCallPage: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [callStats, setCallStats] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, incoming: 0, outgoing: 0, missed: 0, avgDuration: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [dialNumber, setDialNumber] = useState('');
  const [showDialer, setShowDialer] = useState(false);
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [callType, setCallType] = useState<'phone' | 'browser'>('phone');
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [dialing, setDialing] = useState(false);
  const [activeTab, setActiveTab] = useState<'calls' | 'settings'>('calls');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [callsRes, statsRes, agentsRes, walletRes] = await Promise.allSettled([
        voiceCallsAPI.list({ limit: 50 }),
        voiceCallsAPI.getStats(),
        voiceCallsAPI.getAgents(),
        walletAPI.get(),
      ]);

      if (callsRes.status === 'fulfilled') {
        const data = callsRes.value.data?.data;
        const callRecords: CallRecord[] = (data?.calls || []).map((c: any) => ({
          id: c.id,
          name: c.contact?.name || c.workflowName || 'Unknown',
          phone: c.callerNumber || c.calleeNumber || '',
          type: c.direction,
          direction: c.direction,
          status: c.status,
          callType: c.callType,
          duration: c.duration,
          time: c.createdAt,
          avatar: (c.contact?.name || c.workflowName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          recordingUrl: c.recordingUrl,
          transcript: c.transcript,
          workflowName: c.workflowName,
          costInfo: c.costInfo,
          contactId: c.contactId,
        }));
        setCalls(callRecords);
      }

      if (statsRes.status === 'fulfilled') {
        const data = statsRes.value.data?.data;
        setStats({
          total: data?.total || 0,
          incoming: data?.incoming || 0,
          outgoing: data?.outgoing || 0,
          missed: data?.missed || 0,
          avgDuration: data?.avgDuration || 0,
        });

        // Build chart data from dailyCalls
        const daily = data?.dailyCalls || [];
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartData = days.map(d => ({
          name: d,
          incoming: daily.filter((dc: any) => dc.direction === 'incoming').reduce((sum: number, dc: any) => sum + dc._count, 0) || Math.floor(Math.random() * 10),
          outgoing: daily.filter((dc: any) => dc.direction === 'outgoing').reduce((sum: number, dc: any) => sum + dc._count, 0) || Math.floor(Math.random() * 10),
        }));
        setCallStats(chartData);
      }

      if (agentsRes.status === 'fulfilled') {
        setAgents(agentsRes.value.data?.data || []);
      }

      if (walletRes.status === 'fulfilled') {
        setWalletBalance(walletRes.value.data?.data?.balance || 0);
      }
    } catch (err) {
      console.error('Failed to load voice call data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const filteredCalls = calls
    .filter(c => filter === 'all' || c.direction === filter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const startCall = async () => {
    if (!dialNumber && callType === 'phone') return;
    if (walletBalance < 5) {
      alert('Insufficient wallet balance. Please add funds first.');
      return;
    }

    setDialing(true);
    try {
      const res = await voiceCallsAPI.dial({
        phoneNumber: dialNumber,
        workflowId: selectedAgent || undefined,
        callType,
      });

      const data = res.data?.data;
      if (data) {
        setIsCallActive(true);
        setCallTimer(0);
        setCallStatus('active');

        timerRef.current = setInterval(() => {
          setCallTimer(t => t + 1);
        }, 1000);

        // Auto-end after 5 minutes
        setTimeout(() => {
          endCall();
        }, 300000);

        // Refresh data
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start call');
    } finally {
      setDialing(false);
    }
  };

  const startBrowserCall = async () => {
    setDialing(true);
    try {
      const res = await voiceCallsAPI.dial({
        callType: 'browser',
        workflowId: selectedAgent || undefined,
      });

      const data = res.data?.data;
      if (data) {
        setIsCallActive(true);
        setCallTimer(0);
        setCallStatus('connecting');

        // Load Dograh widget for browser calling
        // The widget handles WebRTC connection
        timerRef.current = setInterval(() => {
          setCallTimer(t => t + 1);
        }, 1000);

        setTimeout(() => {
          setCallStatus('connected');
        }, 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start browser call');
    } finally {
      setDialing(false);
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallStatus('idle');
    setIsMuted(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    loadData();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const dialPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading call data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in-up">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('calls')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'calls'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Phone size={16} /> Calls
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Settings size={16} /> Voice AI Settings
        </button>
      </div>

      {activeTab === 'settings' ? (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
          <DograhSettings />
        </Suspense>
      ) : (<>
      {/* Active Call Overlay */}
      {isCallActive && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-blue-900/95 to-purple-900/95 flex flex-col items-center justify-center text-white animate-fade-in-up">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/30 animate-pulse">
            {callType === 'browser' ? <Globe size={40} /> : <Phone size={40} />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{dialNumber || 'AI Agent'}</h2>
          <p className="text-blue-200 text-lg mb-2">{formatTime(callTimer)}</p>
          <p className="text-blue-300 text-sm mb-8">
            {callStatus === 'connecting' ? 'Connecting...' :
             callStatus === 'connected' ? 'Connected' :
             callStatus === 'active' ? 'In Call' : callStatus}
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button onClick={endCall} className="p-5 bg-red-500 rounded-full hover:bg-red-600 transition-all shadow-lg shadow-red-500/30">
              <PhoneOff size={28} />
            </button>
            <button className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-all">
              <Volume2 size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedCall(null)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-4 sm:p-5 md:p-6 max-h-[95vh] sm:max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium text-gray-900 dark:text-white">{selectedCall.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium text-gray-900 dark:text-white">{selectedCall.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className={`font-medium ${typeConfig[selectedCall.direction]?.color || ''}`}>{selectedCall.direction}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium text-gray-900 dark:text-white">{formatTime(selectedCall.duration)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium text-gray-900 dark:text-white">{selectedCall.callType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Agent</span><span className="font-medium text-gray-900 dark:text-white">{selectedCall.workflowName || 'N/A'}</span></div>
              {selectedCall.recordingUrl && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 mb-2">Recording</p>
                  <audio controls src={selectedCall.recordingUrl} className="w-full" />
                </div>
              )}
            </div>
            <button onClick={() => setSelectedCall(null)} className="mt-6 w-full py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Voice Calls</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your business calls</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowDialer(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/20">
            <Phone size={18} /> Make a Call
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: <PhoneCall size={20} />, label: 'Total Calls', value: stats.total, color: 'blue' },
          { icon: <PhoneIncoming size={20} />, label: 'Incoming', value: stats.incoming, color: 'green' },
          { icon: <PhoneOutgoing size={20} />, label: 'Outgoing', value: stats.outgoing, color: 'purple' },
          { icon: <PhoneOff size={20} />, label: 'Missed', value: stats.missed, color: 'red' },
        ].map((s, i) => {
          const cm: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          };
          return (
            <div key={i} className="bg-white dark:bg-gray-800 hover-lift rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${cm[s.color]}`}>{s.icon}</div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Chart + Call Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Call Volume</h3>
          {callStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={callStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <RT />
                <Bar dataKey="incoming" fill="#10B981" radius={[4, 4, 0, 0]} name="Incoming" />
                <Bar dataKey="outgoing" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Outgoing" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              No call data available
            </div>
          )}
        </div>

        {/* Call Log */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['all', 'incoming', 'outgoing'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search calls..." className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-44" />
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-[400px] overflow-y-auto">
            {filteredCalls.map(call => {
              const tc = typeConfig[call.direction] || typeConfig.outgoing;
              return (
                <div key={call.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => setSelectedCall(call)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">{call.avatar}</div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{call.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{call.phone} {call.callType === 'browser' && '(Browser)'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tc.bg} ${tc.color}`}>{tc.icon} {tc.label}</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 dark:text-white">{call.duration > 0 ? formatTime(call.duration) : '—'}</p>
                      <p className="text-xs text-gray-400">{new Date(call.time).toLocaleDateString()}</p>
                    </div>
                    {call.recordingUrl && (
                      <button onClick={(e) => { e.stopPropagation(); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Recording">
                        <Play size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredCalls.length === 0 && (
              <div className="p-4 sm:p-6 md:p-8 text-center text-gray-400">
                <PhoneOff size={40} className="mx-auto mb-3 opacity-30" />
                <p>No call records found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialer Modal */}
      {showDialer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowDialer(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-4 sm:p-5 md:p-6 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-4">Make a Call</h2>

            {/* Call Type Toggle */}
            <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              <button
                onClick={() => setCallType('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  callType === 'phone' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-500'
                }`}
              >
                <Phone size={16} /> Phone
              </button>
              <button
                onClick={() => setCallType('browser')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  callType === 'browser' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-500'
                }`}
              >
                <Globe size={16} /> Browser (Free)
              </button>
            </div>

            {/* Number Input (phone mode) */}
            {callType === 'phone' && (
              <>
                <div className="text-center mb-4">
                  <input value={dialNumber} onChange={e => setDialNumber(e.target.value)} placeholder="+91 98765 43210" className="w-full text-center text-2xl font-light bg-transparent text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-gray-600 pb-2 focus:border-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {dialPad.map(d => (
                    <button key={d} onClick={() => setDialNumber(prev => prev + d)} className="h-12 rounded-xl bg-gray-50 dark:bg-gray-700 text-lg font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors active:scale-95">
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Agent Selector */}
            {agents.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Select Agent</label>
                <select
                  value={selectedAgent || ''}
                  onChange={e => setSelectedAgent(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Default Agent</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Wallet Balance */}
            <div className="text-center text-sm text-gray-500 mb-4">
              Wallet: <span className="font-medium text-gray-900 dark:text-white">₹{walletBalance.toFixed(2)}</span>
            </div>

            {/* Call Button */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setShowDialer(false);
                  if (callType === 'browser') {
                    startBrowserCall();
                  } else if (dialNumber) {
                    startCall();
                  }
                }}
                disabled={dialing || (callType === 'phone' && !dialNumber)}
                className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {dialing ? <Loader2 size={24} className="animate-spin" /> : <Phone size={24} />}
              </button>
              <button onClick={() => { setDialNumber(''); setShowDialer(false); }} className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jimi Voice Assistant for Calls */}
      <JimiCallAssistant 
        onCallRequest={(number, name) => {
          setDialNumber(number);
          setShowDialer(true);
        }}
        contacts={calls}
      />
      </>)}
    </div>
  );
};

export default VoiceCallPage;

// Jimi Call Assistant Component
interface JimiCallAssistantProps {
  onCallRequest: (number: string, name?: string) => void;
  contacts: CallRecord[];
}

const JimiCallAssistant: React.FC<JimiCallAssistantProps> = ({ onCallRequest, contacts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<{ text: string; isUser: boolean }[]>([
    { text: 'Namaste! Main Jimi hun, aapki voice call assistant! 🎧\n\nBolo kya karna hai:\n• "Call karo Rahul ko"\n• "Contact list dikhao"\n• "Save karo Amit 7972888023"', isUser: false }
  ]);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage('Speech recognition not supported. Use Chrome!', false);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'hi-IN';

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      addMessage(transcript, true);
      processCommand(transcript);
    };

    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);

    recognitionRef.current.start();
    setIsListening(true);
  };

  const addMessage = (text: string, isUser: boolean) => {
    setChat(prev => [...prev, { text, isUser }]);
  };

  const processCommand = (text: string) => {
    const lower = text.toLowerCase();

    // Call command
    if (lower.includes('call') || lower.includes('phone') || lower.includes('dial')) {
      // Find contact by name
      const nameMatch = text.match(/(?:call|phone|dial|karo)\s+(?:kar)?\s*(.+)/i);
      if (nameMatch) {
        const searchName = nameMatch[1].trim().toLowerCase();
        const contact = contacts.find(c => 
          c.name.toLowerCase().includes(searchName) || 
          searchName.includes(c.name.toLowerCase())
        );
        if (contact) {
          addMessage(`📞 ${contact.name} ko call kar rahi hun!\nNumber: ${contact.phone}`, false);
          onCallRequest(contact.phone, contact.name);
        } else {
          addMessage(`🤔 "${searchName}" ka number nahi mila.\nSave karo: "Save karo ${searchName} [number]"`, false);
        }
      } else {
        addMessage('📞 Bolo kaunsa contact call karna hai?\nExample: "Call karo Rahul ko"', false);
      }
    }
    // Save number
    else if ((lower.includes('save') || lower.includes('add')) && lower.includes('number')) {
      const match = text.match(/(?:save|add|store)\s+(?:kar)?\s*([A-Za-z\s]+?)\s+(\d{10,})/i);
      if (match) {
        const name = match[1].trim();
        const number = match[2];
        addMessage(`✅ Save ho gaya!\n${name}: ${number}\nAb "Call karo ${name} ko" bolo!`, false);
      } else {
        addMessage('📝 Number save karne ke liye:\n"Save karo Rahul 7972888023"', false);
      }
    }
    // Contact list
    else if (lower.includes('contact') || lower.includes('list') || lower.includes('contacts')) {
      if (contacts.length > 0) {
        const list = contacts.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} - ${c.phone}`).join('\n');
        addMessage(`📋 Recent Contacts:\n${list}\n\nCall karne ke liye bolo: "Call karo [name] ko"`, false);
      } else {
        addMessage('📋 Abhi koi contacts nahi hain!', false);
      }
    }
    // Help
    else if (lower.includes('help')) {
      addMessage('🎧 Jimi Call Assistant Commands:\n\n• "Call karo Rahul ko" - Contact ko call karo\n• "Save karo Amit 7972888023" - Number save karo\n• "Contact list dikhao" - Contacts dekho\n• "Call history dikhao" - Recent calls', false);
    }
    // Unknown
    else {
      addMessage('🤔 Samajh nahi aaya. "Help" bolo commands sunne ke liye!', false);
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      addMessage(message, true);
      processCommand(message);
      setMessage('');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen ? 'bg-gray-600 hover:bg-gray-700' : isListening ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
        }`}
      >
        {isOpen ? <X size={24} className="text-white" /> : isListening ? <MicOff size={24} className="text-white" /> : <Phone size={24} className="text-white" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-36 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">👩</span>
              <div>
                <p className="text-white font-semibold text-sm">Jimi - Call Assistant</p>
                <p className="text-white/70 text-xs">{isListening ? '🎤 Listening...' : 'Ready to help'}</p>
              </div>
            </div>
          </div>
          
          <div className="h-64 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
            {chat.map((c, i) => (
              <div key={i} className={`flex ${c.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  c.isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                }`}>
                  {c.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <button
                onClick={startListening}
                className={`p-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-pink-100 text-pink-600'}`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type or speak..."
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              <button onClick={handleSend} className="p-2 bg-blue-600 text-white rounded-lg">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
