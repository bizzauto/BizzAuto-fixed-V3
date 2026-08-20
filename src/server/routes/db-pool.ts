import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All db-pool endpoints require SUPER_ADMIN authentication
router.use(authenticate, requireRole('SUPER_ADMIN'));

/**
 * Database Connection Pool Monitoring
 *
 * Provides endpoints to inspect Prisma connection pool health,
 * query performance, and connection statistics.
 */

// GET /api/db-pool/status — Connection pool health check
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // Check if we can acquire a connection and run a query
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    // Get Prisma engine metrics (if available)
    const engineMetrics = (prisma as any).$metrics
      ? await (prisma as any).$metrics.json()
      : null;

    // Parse engine metrics into a usable format
    let poolMetrics = null;
    if (engineMetrics && engineMetrics.gauges) {
      const gauges = engineMetrics.gauges;
      poolMetrics = {
        activeConnections: getGaugeValue(gauges, 'prisma_client_queries_active'),
        idleConnections: getGaugeValue(gauges, 'prisma_client_queries_idle'),
        totalConnections: getGaugeValue(gauges, 'prisma_client_connections_total'),
        waitingRequests: getGaugeValue(gauges, 'prisma_client_queries_waiting'),
      };
    }

    res.json({
      success: true,
      data: {
        status: latencyMs < 1000 ? 'healthy' : latencyMs < 3000 ? 'degraded' : 'unhealthy',
        latencyMs,
        pool: poolMetrics || {
          status: 'metrics_unavailable',
          note: 'Enable PRISMA_METRICS=true to see pool stats',
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// GET /api/db-pool/query-stats — Recent query performance
router.get('/query-stats', async (_req: Request, res: Response) => {
  try {
    // Run several diagnostic queries to measure performance
    const queries = [
      { name: 'simple_select', query: prisma.$queryRaw`SELECT 1 as result` },
      { name: 'count_users', query: prisma.user.count() },
      { name: 'count_contacts', query: prisma.contact.count() },
      { name: 'count_activities', query: prisma.activity.count() },
      { name: 'count_audit_logs', query: prisma.auditLog.count() },
    ];

    const results: Record<string, { latencyMs: number; rowCount?: number; error?: string }> = {};

    for (const { name, query } of queries) {
      try {
        const start = Date.now();
        const result = await query;
        const latencyMs = Date.now() - start;
        results[name] = {
          latencyMs,
          ...(typeof result === 'number' ? { rowCount: result } : {}),
        };
      } catch (error: any) {
        results[name] = { latencyMs: -1, error: error.message };
      }
    }

    // Calculate average latency
    const latencies = Object.values(results)
      .filter(r => r.latencyMs >= 0)
      .map(r => r.latencyMs);
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    res.json({
      success: true,
      data: {
        queries: results,
        summary: {
          avgLatencyMs: avgLatency,
          totalQueries: Object.keys(results).length,
          failedQueries: Object.values(results).filter(r => r.error).length,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/db-pool/introspection — Database schema health
router.get('/introspection', async (_req: Request, res: Response) => {
  try {
    // Check table row counts for major tables
    const tableCounts = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "User"`,
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "Business"`,
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "Contact"`,
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "Message"`,
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "AuditLog"`,
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "Activity"`,
      prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "Campaign"`,
    ]);

    const tables = [
      { name: 'User', count: (tableCounts[0] as any)[0]?.count ?? 0 },
      { name: 'Business', count: (tableCounts[1] as any)[0]?.count ?? 0 },
      { name: 'Contact', count: (tableCounts[2] as any)[0]?.count ?? 0 },
      { name: 'Message', count: (tableCounts[3] as any)[0]?.count ?? 0 },
      { name: 'AuditLog', count: (tableCounts[4] as any)[0]?.count ?? 0 },
      { name: 'Activity', count: (tableCounts[5] as any)[0]?.count ?? 0 },
      { name: 'Campaign', count: (tableCounts[6] as any)[0]?.count ?? 0 },
    ];

    // Check for missing indexes (slow query detection)
    const slowQueries = await prisma.$queryRaw`
      SELECT schemaname, relname, seq_scan, idx_scan,
             CASE WHEN seq_scan > 0 AND idx_scan = 0 THEN 'no_index'
                  WHEN seq_scan > idx_scan * 10 THEN 'missing_index'
                  ELSE 'ok' END as status
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND seq_scan > 100
      ORDER BY seq_scan DESC
      LIMIT 10
    ` as any[];

    res.json({
      success: true,
      data: {
        tables,
        indexHealth: slowQueries.map((q: any) => ({
          table: q.relname,
          sequentialScans: q.seq_scan,
          indexScans: q.idx_scan,
          status: q.status,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Extract a gauge value from Prisma metrics.
 */
function getGaugeValue(gauges: any[], name: string): number | undefined {
  const gauge = gauges.find((g: any) => g.key === name);
  return gauge ? gauge.value : undefined;
}

export default router;
