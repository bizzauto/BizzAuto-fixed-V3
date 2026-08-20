/**
 * Health Check Service
 * Provides comprehensive health check for Docker, load balancers, and monitoring
 */

import { prisma } from '../db.js';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: CheckResult;
  };
}

interface CheckResult {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  message?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs > 1000 ? 'degraded' : 'ok',
      latencyMs,
    };
  } catch (error: any) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: error.message,
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { default: redisClient } = await import('../services/redis.service.js');
    if (redisClient && typeof redisClient === 'object' && 'ping' in redisClient) {
      await (redisClient as any).ping();
    }
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs > 500 ? 'degraded' : 'ok',
      latencyMs,
    };
  } catch (error: any) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: error.message,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024);
  const usagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

  return {
    status: usagePercent > 90 ? 'error' : usagePercent > 70 ? 'degraded' : 'ok',
    message: `Heap: ${heapUsedMB}/${heapTotalMB}MB (${usagePercent}%), RSS: ${rssUsedMB}MB`,
  };
}

/**
 * Full health check
 */
export async function getHealthCheck(): Promise<HealthCheckResult> {
  const [database, redis, memory] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    Promise.resolve(checkMemory()),
  ]);

  const checks = { database, redis, memory };

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status);
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (statuses.includes('error')) {
    status = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };
}

/**
 * Simple liveness check (for Docker/Kubernetes)
 */
export function isAlive(): boolean {
  return true;
}

/**
 * Simple readiness check (for Docker/Kubernetes)
 */
export async function isReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
