/**
 * Account Lockout Service — Redis-backed per-email brute-force protection.
 * Tracks failed login attempts per email and locks account after threshold.
 */
import { createRedisConnection } from '../utils/redis-connection.js';

const redis = createRedisConnection();

const ATTEMPT_PREFIX = 'lockout:attempts:';
const LOCKOUT_PREFIX = 'lockout:locked:';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const LOCKOUT_DURATION_SECONDS = 30 * 60; // 30 minutes

export interface LockoutStatus {
  locked: boolean;
  attemptsRemaining: number;
  lockedUntil: number | null;
}

function redisReady(): boolean {
  return redis !== null && redis.status === 'ready';
}

export async function recordFailedLoginAttempt(email: string): Promise<LockoutStatus> {
  if (!redisReady()) return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS, lockedUntil: null };
  const r = redis!;

  try {
    const attemptKey = `${ATTEMPT_PREFIX}${email.toLowerCase()}`;
    const lockKey = `${LOCKOUT_PREFIX}${email.toLowerCase()}`;

    const currentAttempts = await r.incr(attemptKey);
    if (currentAttempts === 1) {
      await r.expire(attemptKey, LOCKOUT_WINDOW_SECONDS);
    }

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      await r.setex(lockKey, LOCKOUT_DURATION_SECONDS, '1');
      await r.del(attemptKey);
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil: Date.now() + LOCKOUT_DURATION_SECONDS * 1000,
      };
    }

    return {
      locked: false,
      attemptsRemaining: MAX_FAILED_ATTEMPTS - currentAttempts,
      lockedUntil: null,
    };
  } catch {
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS, lockedUntil: null };
  }
}

export async function clearFailedLoginAttempts(email: string): Promise<void> {
  if (!redisReady()) return;
  const r = redis!;
  try {
    const attemptKey = `${ATTEMPT_PREFIX}${email.toLowerCase()}`;
    await r.del(attemptKey);
  } catch {}
}

export async function getLockoutStatus(email: string): Promise<LockoutStatus> {
  if (!redisReady()) return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS, lockedUntil: null };
  const r = redis!;

  try {
    const lockKey = `${LOCKOUT_PREFIX}${email.toLowerCase()}`;
    const ttl = await r.ttl(lockKey);

    if (ttl > 0) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil: Date.now() + ttl * 1000,
      };
    }
  } catch {}

  return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS, lockedUntil: null };
}