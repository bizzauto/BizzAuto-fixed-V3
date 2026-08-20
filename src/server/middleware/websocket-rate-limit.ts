import { Socket } from 'socket.io';

/**
 * WebSocket Rate Limiter
 *
 * Provides per-connection and per-user message rate limiting for Socket.IO.
 * Uses sliding window counters stored in-memory (resets on restart — acceptable).
 *
 * Limits:
 * - Connection events: 5 per minute per IP (prevents connection flooding)
 * - Messages per socket: 30 per 10 seconds (prevents spam from single client)
 * - Messages per user: 60 per 10 seconds (prevents abuse across reconnects)
 * - Join rooms: 10 per minute (prevents room flooding)
 */

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const CONNECTION_LIMITS = { maxRequests: 5, windowMs: 60_000 };
const MESSAGE_LIMITS = { maxRequests: 30, windowMs: 10_000 };
const USER_MESSAGE_LIMITS = { maxRequests: 60, windowMs: 10_000 };
const JOIN_LIMITS = { maxRequests: 10, windowMs: 60_000 };

// Per-IP connection tracking
const connectionCounts = new Map<string, RateLimitBucket>();
// Per-socket message tracking
const socketMessageCounts = new Map<string, RateLimitBucket>();
// Per-user message tracking (across reconnects)
const userMessageCounts = new Map<string, RateLimitBucket>();
// Per-socket join tracking
const socketJoinCounts = new Map<string, RateLimitBucket>();

function isInWindow(bucket: RateLimitBucket | undefined, windowMs: number): boolean {
  return !!bucket && Date.now() - bucket.windowStart < windowMs;
}

function checkLimit(
  store: Map<string, RateLimitBucket>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || !isInWindow(bucket, windowMs)) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  bucket.count++;

  if (bucket.count > maxRequests) {
    const retryAfterMs = windowMs - (now - bucket.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Check if a new connection from this IP is allowed.
 * Call this in the Socket.IO connection event BEFORE processing.
 */
export function checkConnectionLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  return checkLimit(connectionCounts, ip, CONNECTION_LIMITS.maxRequests, CONNECTION_LIMITS.windowMs);
}

/**
 * Check if a message from this socket is allowed.
 * Call this on each 'send:message', 'typing:start', 'typing:stop', etc. event.
 */
export function checkMessageLimit(socketId: string, userId: string): { allowed: boolean; retryAfterMs: number } {
  const socketResult = checkLimit(
    socketMessageCounts,
    socketId,
    MESSAGE_LIMITS.maxRequests,
    MESSAGE_LIMITS.windowMs
  );
  if (!socketResult.allowed) return socketResult;

  return checkLimit(
    userMessageCounts,
    userId,
    USER_MESSAGE_LIMITS.maxRequests,
    USER_MESSAGE_LIMITS.windowMs
  );
}

/**
 * Check if a room join from this socket is allowed.
 */
export function checkJoinLimit(socketId: string): { allowed: boolean; retryAfterMs: number } {
  return checkLimit(
    socketJoinCounts,
    socketId,
    JOIN_LIMITS.maxRequests,
    JOIN_LIMITS.windowMs
  );
}

/**
 * Clean up rate limit state when a socket disconnects.
 */
export function cleanupSocketLimits(socketId: string): void {
  socketMessageCounts.delete(socketId);
  socketJoinCounts.delete(socketId);
}

/**
 * Periodic cleanup of expired buckets to prevent memory leaks.
 * Call this once at startup.
 */
export function startRateLimitCleanup(intervalMs: number = 60_000): void {
  setInterval(() => {
    const now = Date.now();
    const maxWindow = Math.max(
      CONNECTION_LIMITS.windowMs,
      MESSAGE_LIMITS.windowMs,
      USER_MESSAGE_LIMITS.windowMs,
      JOIN_LIMITS.windowMs
    );

    for (const [key, bucket] of connectionCounts) {
      if (now - bucket.windowStart > maxWindow) connectionCounts.delete(key);
    }
    for (const [key, bucket] of socketMessageCounts) {
      if (now - bucket.windowStart > maxWindow) socketMessageCounts.delete(key);
    }
    for (const [key, bucket] of userMessageCounts) {
      if (now - bucket.windowStart > maxWindow) userMessageCounts.delete(key);
    }
    for (const [key, bucket] of socketJoinCounts) {
      if (now - bucket.windowStart > maxWindow) socketJoinCounts.delete(key);
    }
  }, intervalMs);
}

/**
 * Get current rate limit stats (for monitoring).
 */
export function getRateLimitStats() {
  return {
    activeConnections: connectionCounts.size,
    activeSocketCounters: socketMessageCounts.size,
    activeUserCounters: userMessageCounts.size,
    limits: {
      connectionsPerIp: CONNECTION_LIMITS,
      messagesPerSocket: MESSAGE_LIMITS,
      messagesPerUser: USER_MESSAGE_LIMITS,
      joinsPerSocket: JOIN_LIMITS,
    },
  };
}
