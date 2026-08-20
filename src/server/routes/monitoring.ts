import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { getSlowQueryStats } from '../middleware/slow-query-logger.js';
import { getRateLimitStats } from '../middleware/websocket-rate-limit.js';
import { circuitBreaker } from '../services/circuit-breaker.service.js';

const router = Router();

/**
 * Prometheus-compatible metrics endpoint + enhanced health check.
 * No authentication required (used by load balancers and monitoring tools).
 */

// Simple in-process counters (resets on restart — acceptable for basic monitoring)
const counters: Record<string, number> = {};
const gauges: Record<string, number> = {};

export function incrementCounter(name: string, value: number = 1): void {
  counters[name] = (counters[name] || 0) + value;
}

export function setGauge(name: string, value: number): void {
  gauges[name] = value;
}

export function getGauge(name: string): number {
  return gauges[name] || 0;
}

// GET /metrics — Prometheus text format
router.get('/metrics', async (req: Request, res: Response) => {
  const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  const hasKey = req.headers['x-monitor-key'] === process.env.MONITOR_KEY;
  if (!isLocal && !hasKey) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const lines: string[] = [];

  // Process metrics
  lines.push(`# HELP node_process_uptime_seconds Process uptime in seconds`);
  lines.push(`# TYPE node_process_uptime_seconds gauge`);
  lines.push(`node_process_uptime_seconds ${process.uptime().toFixed(2)}`);

  lines.push(`# HELP node_memory_usage_bytes Memory usage`);
  lines.push(`# TYPE node_memory_usage_bytes gauge`);
  const mem = process.memoryUsage();
  lines.push(`node_memory_usage_bytes{type="rss"} ${mem.rss}`);
  lines.push(`node_memory_usage_bytes{type="heap_used"} ${mem.heapUsed}`);
  lines.push(`node_memory_usage_bytes{type="heap_total"} ${mem.heapTotal}`);
  lines.push(`node_memory_usage_bytes{type="external"} ${mem.external}`);

  lines.push(`# HELP node_cpu_usage_ratio CPU usage ratio`);
  lines.push(`# TYPE node_cpu_usage_ratio gauge`);
  const cpu = process.cpuUsage();
  lines.push(`node_cpu_usage_ratio ${(cpu.user + cpu.system) / 1000000}`);

  // Application counters
  lines.push(`# HELP http_requests_total Total HTTP requests`);
  lines.push(`# TYPE http_requests_total counter`);
  for (const [key, value] of Object.entries(counters)) {
    lines.push(`http_requests_total{route="${key}"} ${value}`);
  }

  // Application gauges
  lines.push(`# HELP app_gauge Application gauge metrics`);
  lines.push(`# TYPE app_gauge gauge`);
  for (const [key, value] of Object.entries(gauges)) {
    lines.push(`app_gauge{name="${key}"} ${value}`);
  }

  // Circuit breaker states
  lines.push(`# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)`);
  lines.push(`# TYPE circuit_breaker_state gauge`);
  const cbStats = circuitBreaker.getAllStats();
  for (const stat of cbStats) {
    const stateValue = stat.state === 'CLOSED' ? 0 : stat.state === 'HALF_OPEN' ? 1 : 2;
    lines.push(`circuit_breaker_state{service="${stat.service}"} ${stateValue}`);
  }

  // BullMQ queue metrics
  lines.push(`# HELP bull_queue_waiting Jobs waiting in queue`);
  lines.push(`# TYPE bull_queue_waiting gauge`);
  lines.push(`# HELP bull_queue_active Active jobs being processed`);
  lines.push(`# TYPE bull_queue_active gauge`);
  lines.push(`# HELP bull_queue_completed Completed jobs`);
  lines.push(`# TYPE bull_queue_completed counter`);
  lines.push(`# HELP bull_queue_failed Failed jobs`);
  lines.push(`# TYPE bull_queue_failed counter`);
  try {
    const { queues } = await import('../workers/index.js');
    const queueNames = ['whatsapp-messages', 'emails', 'social-publish', 'google-sheets-sync', 'lead-processing', 'campaign-scheduler', 'gbp-auto-post', 'webhook-retry'] as const;
    for (const name of queueNames) {
      const queue = (queues as any)[name];
      if (queue && typeof queue.getJobCounts === 'function') {
        const counts = await queue.getJobCounts();
        lines.push(`bull_queue_waiting{queue="${name}"} ${counts.waiting || 0}`);
        lines.push(`bull_queue_active{queue="${name}"} ${counts.active || 0}`);
        lines.push(`bull_queue_completed{queue="${name}"} ${counts.completed || 0}`);
        lines.push(`bull_queue_failed{queue="${name}"} ${counts.failed || 0}`);
      }
    }
  } catch { /* Workers may not be initialized */ }

  // Database health
  let dbUp = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = 1;
  } catch { /* */ }
  lines.push(`# HELP app_database_up Database connectivity`);
  lines.push(`# TYPE app_database_up gauge`);
  lines.push(`app_database_up ${dbUp}`);

  // Slow query stats
  const slowQueryStats = getSlowQueryStats();
  lines.push(`# HELP app_slow_queries_total Total slow queries detected`);
  lines.push(`# TYPE app_slow_queries_total counter`);
  lines.push(`app_slow_queries_total ${slowQueryStats.slowQueries}`);
  lines.push(`# HELP app_total_queries_total Total queries executed`);
  lines.push(`# TYPE app_total_queries_total counter`);
  lines.push(`app_total_queries_total ${slowQueryStats.totalQueries}`);
  lines.push(`# HELP app_slow_query_threshold_ms Slow query threshold`);
  lines.push(`# TYPE app_slow_query_threshold_ms gauge`);
  lines.push(`app_slow_query_threshold_ms ${slowQueryStats.thresholdMs}`);

  // WebSocket rate limit stats
  const wsStats = getRateLimitStats();
  lines.push(`# HELP app_ws_active_connections Active WebSocket connections tracked`);
  lines.push(`# TYPE app_ws_active_connections gauge`);
  lines.push(`app_ws_active_connections ${wsStats.activeConnections}`);

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(lines.join('\n'));
});

// GET /health/enhanced — Detailed health check with component status
router.get('/health/enhanced', async (req: Request, res: Response) => {
  const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  const hasKey = req.headers['x-monitor-key'] === process.env.MONITOR_KEY;
  if (!isLocal && !hasKey) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch (error: any) {
    checks.database = { status: 'unhealthy', error: error.message };
  }

  // SMTP check (if configured)
  if (process.env.SMTP_HOST) {
    try {
      // @ts-ignore - email service may not exist yet
      const { EmailService } = await import('./email.service.js');
      const smtpResult = await EmailService.testConnection();
      checks.smtp = smtpResult.success
        ? { status: 'healthy' }
        : { status: 'unhealthy', error: smtpResult.error };
    } catch (error: any) {
      checks.smtp = { status: 'unhealthy', error: error.message };
    }
  } else {
    checks.smtp = { status: 'not_configured' };
  }

  // Redis check (if configured)
  if (process.env.REDIS_URL) {
    checks.redis = { status: 'not_implemented' };
  } else {
    checks.redis = { status: 'not_configured' };
  }

  // Environment variables check
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.environment = missingEnvVars.length > 0
    ? { status: 'degraded', error: `Missing: ${missingEnvVars.join(', ')}` }
    : { status: 'healthy' };

  // Overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy' || c.status === 'not_configured');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '12.0.1',
    uptime: process.uptime(),
    checks,
  });
});

export default router;
