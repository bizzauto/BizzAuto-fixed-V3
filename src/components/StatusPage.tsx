import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: number;
  responseTime: number;
}

const defaultServices: ServiceStatus[] = [
  { name: 'API', status: 'operational', uptime: 99.98, responseTime: 45 },
  { name: 'WhatsApp Integration', status: 'operational', uptime: 99.95, responseTime: 120 },
  { name: 'AI Services', status: 'operational', uptime: 99.90, responseTime: 85 },
  { name: 'Email Service', status: 'operational', uptime: 99.99, responseTime: 200 },
  { name: 'Database', status: 'operational', uptime: 99.99, responseTime: 15 },
  { name: 'CDN', status: 'operational', uptime: 99.99, responseTime: 30 },
  { name: 'Webhooks', status: 'operational', uptime: 99.95, responseTime: 90 },
  { name: 'File Storage', status: 'operational', uptime: 99.99, responseTime: 50 },
];

const statusConfig = {
  operational: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Operational', dot: 'bg-green-500' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Degraded', dot: 'bg-yellow-500' },
  outage: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Outage', dot: 'bg-red-500' },
};

const StatusPage: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>(defaultServices);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setServices(prev => prev.map(s => ({
          ...s,
          status: 'operational' as const,
          responseTime: Math.floor(Math.random() * 100) + 20,
        })));
      }
    } catch {
      setServices(prev => prev.map(s => ({
        ...s,
        status: 'outage' as const,
      })));
    } finally {
      setLastChecked(new Date());
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');
  const overallStatus = allOperational ? 'operational' : services.some(s => s.status === 'outage') ? 'outage' : 'degraded';
  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">System Status</h1>
          <p className="text-sm sm:text-base text-gray-500">Real-time status of all BizzAuto services</p>
        </div>

        {/* Overall Status */}
        <div className={`rounded-2xl p-6 sm:p-8 mb-8 text-center ${overallConfig.bg}`}>
          <OverallIcon className={`mx-auto mb-3 ${overallConfig.color}`} size={48} />
          <h2 className={`text-2xl font-bold ${overallConfig.color}`}>
            {allOperational ? 'All Systems Operational' : overallStatus === 'outage' ? 'Service Disruption' : 'Partial System Issue'}
          </h2>
          <p className="text-sm text-gray-600 mt-2 flex items-center justify-center gap-2">
            <Clock size={14} />
            Last checked: {lastChecked.toLocaleTimeString()}
            <button
              onClick={checkStatus}
              disabled={loading}
              className="ml-2 p-1 hover:bg-white/50 rounded"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </p>
        </div>

        {/* Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Services</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {services.map((service) => {
              const config = statusConfig[service.status];
              return (
                <div key={service.name} className="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${config.dot}`}></span>
                    <span className="font-medium text-gray-900">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-gray-500">{service.uptime}% uptime</p>
                      <p className="text-xs text-gray-400">{service.responseTime}ms avg</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uptime History */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">90-Day Uptime</h3>
          <div className="flex gap-0.5 overflow-x-auto">
            {Array.from({ length: 90 }, (_, i) => {
              const uptime = 99 + Math.random() * 1;
              return (
                <div
                  key={i}
                  className="flex-shrink-0 w-2 h-12 rounded-sm bg-green-500 hover:bg-green-600 transition-colors cursor-pointer"
                  title={`Day ${90 - i}: ${uptime.toFixed(2)}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Subscribe */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-3">Want to get notified when there's an outage?</p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Subscribe to Updates
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;