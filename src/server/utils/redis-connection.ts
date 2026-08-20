import IORedis from 'ioredis';

let redisDisabled = false;

export function isRedisDisabled(): boolean {
  return redisDisabled;
}

export function createRedisConnection() {
  if (redisDisabled) return null;

  const redisUrl = process.env.REDIS_URL;
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisHost = process.env.REDIS_HOST;
  // Coolify sometimes injects the full Redis URL into REDIS_USERNAME by mistake
  const redisUsername = process.env.REDIS_USERNAME;
  const redisEnabled = process.env.REDIS_ENABLED;

  console.log(`[Redis] REDIS_URL: ${redisUrl ? 'SET' : 'NOT SET'}, REDIS_PASSWORD: ${redisPassword ? 'SET' : 'NOT SET'}, REDIS_HOST: ${redisHost || 'NOT SET'}, REDIS_USERNAME: ${redisUsername ? `SET (prefix: ${redisUsername.slice(0, 8)}...)` : 'NOT SET'}, REDIS_ENABLED: ${redisEnabled || 'NOT SET'}`);

  // Check if REDIS_USERNAME contains a full Redis URL (Coolify quirk)
  const effectiveUrl = (redisUrl && redisUrl.includes('@')) ? redisUrl
    : (redisUsername && redisUsername.startsWith('redis://')) ? redisUsername
    : null;

  // NUCLEAR: Redis is completely disabled unless REDIS_ENABLED=true
  // This prevents Coolify auto-injected env vars from causing connection floods
  if (!redisEnabled) {
    console.log('[Redis] REDIS_ENABLED not set to true — Redis disabled entirely. Set REDIS_ENABLED=true in env to enable.');
    redisDisabled = true;
    return null;
  }

  // If enabled, still require password for security
  if (!redisPassword && !redisUrl && !redisHost) {
    console.log('[Redis] REDIS_ENABLED but no Redis credentials provided.');
    redisDisabled = true;
    return null;
  }

  if (effectiveUrl) {
    const hasAt = effectiveUrl.includes('@');
    if (!hasAt) {
      console.log('[Redis] REDIS_URL has no @ (no auth) — Redis disabled.');
      redisDisabled = true;
      return null;
    }
    const schemeFree = effectiveUrl.replace(/^rediss?:\/\//, '');
    const passwordPart = schemeFree.split('@')[0];
    if (!passwordPart || passwordPart === ':' || passwordPart === '') {
      console.log('[Redis] REDIS_URL has empty password — Redis disabled.');
      redisDisabled = true;
      return null;
    }
    console.log('[Redis] Connecting via REDIS_URL...');
    return connectToRedis(effectiveUrl);
  }

  if (redisPassword) {
    const host = process.env.REDIS_HOST || 'coolify-redis';
    const port = process.env.REDIS_PORT || '6379';
    const url = `redis://:${redisPassword}@${host}:${port}`;
    console.log(`[Redis] Connecting via password to ${host}:${port}...`);
    return connectToRedis(url);
  }

  if (redisHost) {
    console.log('[Redis] REDIS_HOST set but no password — Redis disabled.');
    redisDisabled = true;
    return null;
  }

  return null;
}

function connectToRedis(url: string) {
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (redisDisabled || times > 2) return null;
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 3000,
    lazyConnect: true,
  });

  function handleNoAuth(ctx: string) {
    return (err: any) => {
      if (err?.message?.includes('NOAUTH') || err?.message?.includes('AUTH') || err?.message?.includes('ERR')) {
        console.warn(`[Redis] Auth failed (${ctx}), retrying in 10s...`);
        redisDisabled = true;
        setTimeout(() => { redisDisabled = false; }, 10000);
        return true;
      }
      return false;
    };
  }

  client.on('error', (err: any) => {
    if (handleNoAuth('error event')(err)) return;
    console.error(`[Redis] Connection error: ${err.message}`);
  });

  client.on('connect', () => {
    console.log('[Redis] TCP connected, waiting for ready...');
  });

  client.on('ready', () => {
    console.log('[Redis] Connected successfully');
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  client.on('reconnected', () => {
    console.log('[Redis] Reconnected successfully — queues are operational again');
  });

  client.connect().catch((err: any) => {
    if (handleNoAuth('on connect')(err)) return;
    console.error(`[Redis] Connect failed: ${err.message}`);
    redisDisabled = true;
    try { client.quit(); } catch {}
  });

  return client;
}
