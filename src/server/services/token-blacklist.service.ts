/**
 * Token Blacklist Service — Redis-backed JWT revocation
 * Invalidates refresh tokens on password change, logout, or security events.
 * Uses JWT ID (jti) as the key, stored in Redis with TTL matching token expiry.
 */
import { createRedisConnection } from '../utils/redis-connection.js';

const redis = createRedisConnection();

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh:valid:';

function redisReady(): boolean {
  return redis !== null && redis.status === 'ready';
}

export function blacklistToken(jti: string, expiresInMs: number): void {
  if (!redisReady()) return;
  const r = redis!;
  try {
    const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`;
    const ttlSeconds = Math.ceil(expiresInMs / 1000);
    r.setex(key, ttlSeconds, '1').catch(() => {});
  } catch {}
}

export function isTokenBlacklisted(jti: string): boolean {
  if (!redisReady()) return false;
  const r = redis!;
  try {
    const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`;
    const result = r.get(key);
    return result !== null;
  } catch {
    return false;
  }
}

export async function blacklistRefreshToken(userId: string, expiresInMs: number): Promise<void> {
  if (!redisReady()) return;
  const r = redis!;
  try {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
    const ttlSeconds = Math.ceil(expiresInMs / 1000);
    await r.setex(key, ttlSeconds, 'revoked').catch(() => {});
  } catch {}
}

export async function isRefreshTokenRevoked(userId: string): Promise<boolean> {
  if (!redisReady()) return false;
  const r = redis!;
  try {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
    const val = await r.get(key);
    return val === 'revoked';
  } catch {
    return false;
  }
}

export function revokeAllUserTokens(userId: string): void {
  if (!redisReady()) return;
  try {
    blacklistRefreshToken(userId, 30 * 24 * 60 * 60 * 1000).catch(() => {});
  } catch {}
}