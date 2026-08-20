/**
 * Redis-backed API response cache for read-heavy endpoints.
 * Replaces in-memory Map with shared Redis cache for multi-replica support.
 */
export { cacheResponse, invalidateCache, getCacheStats } from '../services/redis-cache.service.js';
