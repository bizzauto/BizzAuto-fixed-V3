import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Clock, Webhook, Trash2, Play, Zap, Shield, Database
} from 'lucide-react';
import { adminInfrastructureAPI } from '../lib/api';

interface CircuitBreakerService {
  service: string;
  state: string;
  failureCount: number;
  successCount: number;
  lastFailure: string | null;
  lastSuccess: string | null;
}

interface WebhookQueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  deadLetter: number;
  total: number;
}

interface AuditPruneStatus {
  isActive: boolean;
  lastRunAt: string | null;
  lastRunDeleted: number;
  lastRunDurationMs: number;
  retention?: {
    totalCount: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    storageEstimate: string;
  };
}

interface InfrastructureStatus {
  circuitBreaker: {
    totalServices: number;
    healthy: number;
    degraded: number;
    down: number;
    openServices: string[];
    stats: CircuitBreakerService[];
  };
  webhookQueue: WebhookQueueStats;
  auditPrune: AuditPruneStatus;
  healthy: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  CLOSED: 'text-green-500 bg-green-50 border-green-200',
  HALF_OPEN: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  OPEN: 'text-red-500 bg-red-50 border-red-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  CLOSED: <CheckCircle size={14} />,
  HALF_OPEN: <AlertTriangle size={14} />,
  OPEN: <XCircle size={14} />,
};

export default function InfrastructureHealthTab() {
  const [status, setStatus] = useState<InfrastructureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminInfrastructureAPI.getStatus();
      if (res.data?.success) setStatus(res.data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleResetCircuitBreaker = async (service: string) => {
    setResetting(service);
    try {
      await adminInfrastructureAPI.resetCircuitBreaker(service);
      fetchStatus();
    } catch { /* silent */ }
    finally { setResetting(null); }
  };

  const handleRunAuditPrune = async () => {
    try {
      await adminInfrastructureAPI.runAuditPrune(90);
      fetchStatus();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={32} className="text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Server size={48} className="mx-auto mb-4 text-gray-300" />
        <p>Infrastructure status unavailable. Backend may be disconnected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Banner */}
      <div className={`rounded-xl p-4 border ${status.healthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3">
          {status.healthy ? (
            <CheckCircle size={24} className="text-green-600" />
          ) : (
            <XCircle size={24} className="text-red-600" />
          )}
          <div className="flex-1">
            <p className={`font-semibold ${status.healthy ? 'text-green-800' : 'text-red-800'}`}>
              {status.healthy ? 'All Systems Healthy' : 'Degraded Performance'}
            </p>
            <p className="text-sm text-gray-600">
              {status.circuitBreaker.healthy}/{status.circuitBreaker.totalServices} services healthy
              {status.circuitBreaker.down > 0 && ` · ${status.circuitBreaker.down} down`}
              {status.circuitBreaker.degraded > 0 && ` · ${status.circuitBreaker.degraded} degraded`}
            </p>
          </div>
          <button onClick={fetchStatus} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Circuit Breaker Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" /> Circuit Breakers
          </h3>
          <div className="space-y-3">
            {status.circuitBreaker.stats.map((svc) => {
              const stateColor = STATUS_COLORS[svc.state] || 'text-gray-500 bg-gray-50 border-gray-200';
              return (
                <div key={svc.service} className={`p-3 rounded-lg border ${stateColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {STATUS_ICONS[svc.state] || <Activity size={14} />}
                    <span className="font-mono text-sm font-medium truncate">{svc.service}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white/60`}>
                      {svc.state === 'HALF_OPEN' ? 'Half-Open' : svc.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span title="Failures">{svc.failureCount} ❌</span>
                    <span title="Successes">{svc.successCount} ✅</span>
                    {svc.state !== 'CLOSED' && (
                      <button onClick={() => handleResetCircuitBreaker(svc.service)}
                        disabled={resetting === svc.service}
                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        title="Reset Circuit Breaker">
                        <RefreshCw size={14} className={resetting === svc.service ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {status.circuitBreaker.stats.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No circuit breakers registered</p>
            )}
          </div>
        </div>

        {/* Webhook Queue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Webhook size={18} className="text-blue-500" /> Webhook Queue
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Pending</p>
              <p className="text-xl font-bold text-blue-700">{status.webhookQueue.pending}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-600 mb-1">Processing</p>
              <p className="text-xl font-bold text-yellow-700">{status.webhookQueue.processing}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 mb-1">Failed</p>
              <p className="text-xl font-bold text-red-700">{status.webhookQueue.failed}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Dead Letter</p>
              <p className="text-xl font-bold text-gray-700">{status.webhookQueue.deadLetter}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Total: <strong>{status.webhookQueue.total}</strong></span>
            <span>Completed: <strong>{status.webhookQueue.completed}</strong></span>
          </div>
        </div>
      </div>

      {/* Audit Prune Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-purple-500" /> Audit Log Pruning
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Activity size={20} className={status.auditPrune.isActive ? 'text-green-500' : 'text-gray-400'} />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className={`font-semibold ${status.auditPrune.isActive ? 'text-green-700' : 'text-gray-600'}`}>
                {status.auditPrune.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock size={20} className="text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Last Run</p>
              <p className="font-semibold text-gray-900">
                {status.auditPrune.lastRunAt
                  ? new Date(status.auditPrune.lastRunAt).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Trash2 size={20} className="text-red-400" />
            <div>
              <p className="text-xs text-gray-500">Last Deleted</p>
              <p className="font-semibold text-gray-900">
                {status.auditPrune.lastRunDeleted?.toLocaleString() || 0} entries
                {status.auditPrune.lastRunDurationMs
                  ? ` (${(status.auditPrune.lastRunDurationMs / 1000).toFixed(1)}s)`
                  : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleRunAuditPrune}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors">
            <Play size={14} /> Run Prune Now
          </button>
        </div>
      </div>
    </div>
  );
}
