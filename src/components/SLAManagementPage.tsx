import { useState } from 'react';
import { useToast } from '../components/Toast';
import { Clock, AlertTriangle, CheckCircle2, TrendingUp, Plus, Settings, Bell } from 'lucide-react';

interface SLAPolicy {
  id: string;
  name: string;
  channel: string;
  responseTime: number;
  resolutionTime: number;
  priority: string;
  breached: number;
  met: number;
}

export default function SLAManagementPage() {
  const toast = useToast();
  const [policies] = useState<SLAPolicy[]>([
    { id: '1', name: 'WhatsApp - High Priority', channel: 'WhatsApp', responseTime: 15, resolutionTime: 60, priority: 'High', breached: 3, met: 47 },
    { id: '2', name: 'Email - Standard', channel: 'Email', responseTime: 240, resolutionTime: 1440, priority: 'Medium', breached: 8, met: 192 },
    { id: '3', name: 'Phone - Critical', channel: 'Phone', responseTime: 5, resolutionTime: 30, priority: 'Critical', breached: 1, met: 29 },
  ]);

  const totalBreached = policies.reduce((s, p) => s + p.breached, 0);
  const totalMet = policies.reduce((s, p) => s + p.met, 0);
  const complianceRate = totalMet > 0 ? ((totalMet / (totalMet + totalBreached)) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="text-cyan-600" /> SLA Management
        </h1>
        <p className="text-gray-600 mt-1">Set and track service level agreements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className={`text-2xl font-bold ${parseFloat(complianceRate) >= 90 ? 'text-green-600' : 'text-red-600'}`}>{complianceRate}%</div>
          <div className="text-sm text-gray-500">Compliance Rate</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600">{totalMet}</div>
          <div className="text-sm text-gray-500">SLAs Met</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-red-600">{totalBreached}</div>
          <div className="text-sm text-gray-500">SLAs Breached</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">{policies.length}</div>
          <div className="text-sm text-gray-500">Active Policies</div>
        </div>
      </div>

      {/* Policies */}
      <div className="space-y-4 mb-6">
        {policies.map((policy) => {
          const compliance = policy.met + policy.breached > 0
            ? ((policy.met / (policy.met + policy.breached)) * 100).toFixed(1) : '0';
          return (
            <div key={policy.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{policy.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Response: {policy.responseTime >= 60 ? `${policy.responseTime / 60}h` : `${policy.responseTime}m`} •
                    Resolution: {policy.resolutionTime >= 60 ? `${policy.resolutionTime / 60}h` : `${policy.resolutionTime}m`} •
                    Priority: <span className={`font-medium ${
                      policy.priority === 'Critical' ? 'text-red-600' :
                      policy.priority === 'High' ? 'text-orange-600' : 'text-blue-600'
                    }`}>{policy.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{policy.met} met</div>
                    <div className="text-sm text-red-500">{policy.breached} breached</div>
                  </div>
                  <div className="w-16 text-center">
                    <div className={`text-lg font-bold ${parseFloat(compliance) >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                      {compliance}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className={`h-2 rounded-full ${parseFloat(compliance) >= 90 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${compliance}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Breaches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" /> Recent SLA Breaches
        </h3>
        <div className="space-y-3">
          {[
            { ticket: '#TK-1847', customer: 'Rahul Mehta', channel: 'WhatsApp', breached: 'Response time exceeded by 8 min', time: '2 hours ago' },
            { ticket: '#TK-1832', customer: 'Sneha Corp', channel: 'Email', breached: 'Resolution time exceeded by 4 hours', time: '5 hours ago' },
            { ticket: '#TK-1829', customer: 'Amit Solutions', channel: 'Phone', breached: 'Response time exceeded by 3 min', time: '1 day ago' },
          ].map((breach, i) => (
            <div key={i} className="flex items-center gap-4 bg-red-50 rounded-lg p-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium">{breach.ticket} - {breach.customer}</div>
                <div className="text-xs text-gray-500">{breach.breached}</div>
              </div>
              <div className="text-xs text-gray-400">{breach.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}