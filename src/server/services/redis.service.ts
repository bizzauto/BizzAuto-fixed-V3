import IORedis from 'ioredis';

let redisClient: IORedis | null = null;
let isConnected = false;
let redisDisabled = false;

export async function initRedis(): Promise<IORedis | null> {
  if (redisDisabled) return null;
  if (redisClient && isConnected) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  const password = process.env.REDIS_PASSWORD || undefined;
  const redisEnabled = process.env.REDIS_ENABLED;
  // Coolify sometimes injects the full Redis URL into REDIS_USERNAME by mistake
  const redisUsername = process.env.REDIS_USERNAME;

  console.log(`[Redis Service] REDIS_URL: ${redisUrl ? 'SET' : 'NOT SET'}, REDIS_PASSWORD: ${password ? 'SET' : 'NOT SET'}, REDIS_ENABLED: ${redisEnabled || 'NOT SET'}`);

  // NUCLEAR: Redis is completely disabled unless REDIS_ENABLED=true
  // This prevents Coolify auto-injected env vars from causing connection timeouts
  if (!redisEnabled) {
    console.log('[Redis Service] REDIS_ENABLED not set to true — Redis disabled entirely. Set REDIS_ENABLED=true in env to enable.');
    redisDisabled = true;
    return null;
  }

  // Check if REDIS_USERNAME contains a full Redis URL (Coolify quirk)
  const effectiveUrl = (redisUrl && redisUrl.includes('@')) ? redisUrl
    : (redisUsername && redisUsername.startsWith('redis://')) ? redisUsername
    : null;

  // Require credentials for security
  if (!password && !effectiveUrl && !process.env.REDIS_HOST) {
    console.log('[Redis Service] REDIS_ENABLED but no Redis credentials provided.');
    redisDisabled = true;
    return null;
  }

  if (!effectiveUrl && !password) {
    console.log('[Redis Service] No credentials - skipping');
    redisDisabled = true;
    return null;
  }

  if (effectiveUrl && !effectiveUrl.includes('@')) {
    console.log('[Redis Service] REDIS_URL has no password (no @) — Redis disabled');
    redisDisabled = true;
    return null;
  }

  if (effectiveUrl) {
    const schemeFree = effectiveUrl.replace(/^rediss?:\/\//, '');
    const passwordPart = schemeFree.split('@')[0];
    if (!passwordPart || passwordPart === ':' || passwordPart === '') {
      console.log('[Redis Service] REDIS_URL has empty password — Redis disabled');
      redisDisabled = true;
      return null;
    }
  }

  if (!redisUrl && !process.env.REDIS_HOST) {
    console.log('[Redis Service] No URL or host — Redis disabled');
    redisDisabled = true;
    return null;
  }

  try {
    const host = process.env.REDIS_HOST || 'coolify-redis';
    const port = process.env.REDIS_PORT || '6379';

    const finalUrl = effectiveUrl || `redis://:${password}@${host}:${port}`;
    console.log(`[Redis Service] Connecting to ${host}:${port}...`);

    redisClient = new IORedis(finalUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (redisDisabled || times > 10) return null;
        return Math.min(times * 200, 5000);
      },
      enableOfflineQueue: false,
      connectTimeout: 5000,
      commandTimeout: 5000,
      lazyConnect: true,
    });

    redisClient.on('error', (err: any) => {
      if (err.message?.includes('NOAUTH') || err.message?.includes('AUTH')) {
        console.error('[Redis Service] NOAUTH — credentials rejected. Redis permanently disabled.');
        redisDisabled = true;
        isConnected = false;
        try { redisClient?.destroy(); } catch {}
        redisClient = null;
        return;
      }
      console.error(`[Redis Service] Error: ${err.message}`);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis Service] Connected');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    redisClient.connect().catch((err: any) => {
      if (err.message?.includes('NOAUTH') || err.message?.includes('AUTH')) {
        console.error('[Redis Service] NOAUTH on connect — Redis permanently disabled.');
        redisDisabled = true;
      } else {
        console.error(`[Redis Service] Connect failed: ${err.message}`);
      }
      isConnected = false;
      try { redisClient?.destroy(); } catch {}
      redisClient = null;
    });

    return redisClient;
  } catch (err: any) {
    console.error(`[Redis Service] Failed: ${err.message}`);
    redisDisabled = true;
    return null;
  }
}

export function getRedisClient(): IORedis | null {
  return redisClient;
}

// Cache helpers
export const cacheHelpers = {
  // Get with expiration
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    expirationSeconds: number = 300
  ): Promise<T> {
    if (!redisClient || !isConnected) {
      return callback();
    }

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }

      const data = await callback();
      if (data) {
        await redisClient.setex(key, expirationSeconds, JSON.stringify(data));
      }
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return callback();
    }
  },

  // Invalidate pattern
  async invalidatePattern(pattern: string): Promise<void> {
    if (!redisClient || !isConnected) return;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`🗑️ Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  // User-specific cache
  async cacheUserData<T>(userId: string, key: string, data: T, ttl: number = 3600): Promise<void> {
    if (!redisClient || !isConnected) return;

    try {
      await redisClient.setex(`user:${userId}:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('User cache error:', error);
    }
  },

  async getUserData<T>(userId: string, key: string): Promise<T | null> {
    if (!redisClient || !isConnected) return null;

    try {
      const data = await redisClient.get(`user:${userId}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('User cache get error:', error);
      return null;
    }
  },

  // Business-specific cache
  async cacheBusinessData<T>(businessId: string, key: string, data: T, ttl: number = 600): Promise<void> {
    if (!redisClient || !isConnected) return;

    try {
      await redisClient.setex(`business:${businessId}:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Business cache error:', error);
    }
  },

  async getBusinessData<T>(businessId: string, key: string): Promise<T | null> {
    if (!redisClient || !isConnected) return null;

    try {
      const data = await redisClient.get(`business:${businessId}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Business cache get error:', error);
      return null;
    }
  },

  // Rate limiting with Redis
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!redisClient || !isConnected) return true;

    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      return current <= limit;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true;
    }
  },
};

export default redisClient;
