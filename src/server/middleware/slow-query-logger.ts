import { prisma } from '../db.js';

/**
 * Slow Query Logger
 *
 * Monitors Prisma query performance and logs queries that exceed
 * a configurable threshold. Uses Prisma's `$on` event system.
 *
 * Usage:
 *   import { startSlowQueryLogger } from '../middleware/slow-query-logger.js';
 *   startSlowQueryLogger(); // Call once at server startup
 *
 * Configuration:
 *   SLOW_QUERY_THRESHOLD_MS=500  (default: 500ms)
 *   SLOW_QUERY_LOG_ENABLED=true  (default: true in production)
 */

const DEFAULT_THRESHOLD_MS = 500;

let queryCount = 0;
let slowQueryCount = 0;
const recentSlowQueries: Array<{
  query: string;
  duration: number;
  timestamp: string;
}> = [];

// Keep only the last 50 slow queries in memory (ring buffer)
const MAX_RECENT_SLOW_QUERIES = 50;

/**
 * Start the slow query logger.
 * Attaches a Prisma event listener that logs queries exceeding the threshold.
 */
export function startSlowQueryLogger(): void {
  const thresholdMs = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || `${DEFAULT_THRESHOLD_MS}`);
  const enabled = process.env.SLOW_QUERY_LOG_ENABLED !== 'false';

  if (!enabled) {
    console.log('Slow query logger disabled via SLOW_QUERY_LOG_ENABLED=false');
    return;
  }

  console.log(`Slow query logger started (threshold: ${thresholdMs}ms)`);

  (prisma as any).$on('query', (event: any) => {
    queryCount++;
    const duration = parseFloat(event.duration);

    if (duration > thresholdMs) {
      slowQueryCount++;

      const entry = {
        query: event.query?.substring(0, 500) || 'unknown',
        duration: Math.round(duration),
        timestamp: new Date().toISOString(),
      };

      // Add to ring buffer
      recentSlowQueries.push(entry);
      if (recentSlowQueries.length > MAX_RECENT_SLOW_QUERIES) {
        recentSlowQueries.shift();
      }

      // Log to console in development, structured in production
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`🐌 SLOW QUERY (${Math.round(duration)}ms):`, event.query?.substring(0, 200));
      } else {
        console.warn(JSON.stringify({
          level: 'warn',
          message: 'slow_query',
          duration: Math.round(duration),
          query: event.query?.substring(0, 200),
          params: event.params?.substring(0, 200),
          timestamp: entry.timestamp,
        }));
      }
    }
  });
}

/**
 * Get slow query statistics for the monitoring endpoint.
 */
export function getSlowQueryStats() {
  return {
    enabled: process.env.SLOW_QUERY_LOG_ENABLED !== 'false',
    thresholdMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || `${DEFAULT_THRESHOLD_MS}`),
    totalQueries: queryCount,
    slowQueries: slowQueryCount,
    slowQueryRate: queryCount > 0
      ? Math.round((slowQueryCount / queryCount) * 10000) / 100
      : 0,
    recentSlowQueries: [...recentSlowQueries].reverse(), // newest first
  };
}
