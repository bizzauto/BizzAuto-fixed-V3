/**
 * Redis-backed API Response Cache — replaces in-memory Map cache.
 * Shared across all app replicas via Redis.
 */
import { createRedisConnection } from '../utils/redis-connection.js';

const redis = createRedisConnection();
const CACHE_PREFIX = 'cache:resp:';
const CACHE_TTL_DEFAULT = 30; // seconds

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

function redisReady(): boolean {
  return redis !== null && redis.status === 'ready';
}

export function cacheResponse(ttlSeconds: number = CACHE_TTL_DEFAULT) {
  return (req: any, res: any, next: any): void => {
    if (req.method !== 'GET' || !redisReady()) {
      return next();
    }

    const businessId = req.user?.businessId || 'anon';
    const userId = req.user?.id || 'anon';
    const url = req.originalUrl || req.url;
    const cacheKey = `${CACHE_PREFIX}${businessId}:${userId}:${url}`;

    const checkCache = async () => {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (entry.expiresAt > Date.now()) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('X-Cache-TTL', Math.ceil((entry.expiresAt - Date.now()) / 1000).toString());
            res.json(entry.data);
            return true;
          }
        }
      } catch {}
      return false;
    };

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        const entry: CacheEntry = {
          data: body,
          expiresAt: Date.now() + ttlSeconds * 1000,
        };
        redis.setex(cacheKey, ttlSeconds, JSON.stringify(entry)).catch(() => {});
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    (async () => {
      if (await checkCache()) return;
      next();
    })();
  };
}

export async function invalidateCache(businessId?: string): Promise<void> {
  if (!redis) return;
  if (!businessId) return;
  const pattern = `${CACHE_PREFIX}${businessId}:*`;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}

export function getCacheStats(): { size: number; hitRate: string } {
  return { size: 0, hitRate: 'N/A (Redis-backed, use Redis INFO for metrics)' };
}