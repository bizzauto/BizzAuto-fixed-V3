/**
 * @jest-environment node
 *
 * Tests for WebSocket rate limiting logic.
 * Tests the sliding window algorithm, limit enforcement, and cleanup.
 */

// Mirror the exact rate limit logic from websocket-rate-limit.ts
interface RateLimitBucket {
  count: number;
  windowStart: number;
}

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

function cleanup(
  store: Map<string, RateLimitBucket>,
  maxWindow: number
): void {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now - bucket.windowStart > maxWindow) {
      store.delete(key);
    }
  }
}

// ==================== SLIDING WINDOW ====================

describe('WebSocket Rate Limit - Sliding Window', () => {
  let store: Map<string, RateLimitBucket>;

  beforeEach(() => {
    store = new Map();
  });

  it('should allow first request', () => {
    const result = checkLimit(store, 'conn-1', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(store.get('conn-1')?.count).toBe(1);
  });

  it('should allow requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkLimit(store, 'conn-1', 5, 60_000);
      expect(result.allowed).toBe(true);
    }
    expect(store.get('conn-1')?.count).toBe(5);
  });

  it('should reject requests exceeding the limit', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit(store, 'conn-1', 5, 60_000);
    }
    const result = checkLimit(store, 'conn-1', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('should reset counter after window expires', () => {
    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      checkLimit(store, 'conn-1', 5, 100); // 100ms window
    }
    expect(checkLimit(store, 'conn-1', 5, 100).allowed).toBe(false);

    // Wait for window to expire
    // Manually expire the bucket
    const bucket = store.get('conn-1')!;
    bucket.windowStart = Date.now() - 200;

    const result = checkLimit(store, 'conn-1', 5, 100);
    expect(result.allowed).toBe(true);
    expect(store.get('conn-1')?.count).toBe(1);
  });

  it('should track different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit(store, 'conn-1', 5, 60_000);
    }
    expect(checkLimit(store, 'conn-1', 5, 60_000).allowed).toBe(false);
    expect(checkLimit(store, 'conn-2', 5, 60_000).allowed).toBe(true);
  });

  it('should start new window on first request after expiry', () => {
    checkLimit(store, 'conn-1', 3, 100);
    checkLimit(store, 'conn-1', 3, 100);
    checkLimit(store, 'conn-1', 3, 100);
    expect(checkLimit(store, 'conn-1', 3, 100).allowed).toBe(false);

    // Simulate window expiry
    store.get('conn-1')!.windowStart = Date.now() - 200;

    const result = checkLimit(store, 'conn-1', 3, 100);
    expect(result.allowed).toBe(true);
    expect(store.get('conn-1')?.count).toBe(1);
  });
});

// ==================== CLEANUP ====================

describe('WebSocket Rate Limit - Cleanup', () => {
  let store: Map<string, RateLimitBucket>;

  beforeEach(() => {
    store = new Map();
  });

  it('should remove expired buckets', () => {
    store.set('old-key', { count: 5, windowStart: Date.now() - 200_000 });
    store.set('new-key', { count: 1, windowStart: Date.now() });

    cleanup(store, 100_000);

    expect(store.has('old-key')).toBe(false);
    expect(store.has('new-key')).toBe(true);
  });

  it('should handle empty store', () => {
    expect(() => cleanup(store, 60_000)).not.toThrow();
    expect(store.size).toBe(0);
  });

  it('should not remove buckets within window', () => {
    store.set('active', { count: 3, windowStart: Date.now() - 1000 });
    cleanup(store, 60_000);
    expect(store.has('active')).toBe(true);
  });

  it('should remove all expired buckets', () => {
    for (let i = 0; i < 10; i++) {
      store.set(`key-${i}`, { count: i, windowStart: Date.now() - 200_000 });
    }
    cleanup(store, 100_000);
    expect(store.size).toBe(0);
  });
});

// ==================== PER-IP CONNECTION LIMIT ====================

describe('WebSocket Rate Limit - Connection Limit', () => {
  let store: Map<string, RateLimitBucket>;
  const CONNECTION_MAX = 5;
  const CONNECTION_WINDOW = 60_000;

  beforeEach(() => {
    store = new Map();
  });

  it('should allow 5 connections from same IP', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkLimit(store, '192.168.1.1', CONNECTION_MAX, CONNECTION_WINDOW).allowed).toBe(true);
    }
  });

  it('should block 6th connection from same IP', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit(store, '192.168.1.1', CONNECTION_MAX, CONNECTION_WINDOW);
    }
    expect(checkLimit(store, '192.168.1.1', CONNECTION_MAX, CONNECTION_WINDOW).allowed).toBe(false);
  });

  it('should allow unlimited connections from different IPs', () => {
    for (let i = 0; i < 20; i++) {
      expect(checkLimit(store, `192.168.1.${i}`, CONNECTION_MAX, CONNECTION_WINDOW).allowed).toBe(true);
    }
  });
});

// ==================== RETRY-AFTER CALCULATION ====================

describe('WebSocket Rate Limit - Retry-After', () => {
  let store: Map<string, RateLimitBucket>;

  beforeEach(() => {
    store = new Map();
  });

  it('should return positive retryAfterMs when rate limited', () => {
    for (let i = 0; i < 3; i++) {
      checkLimit(store, 'key', 3, 10_000);
    }
    const result = checkLimit(store, 'key', 3, 10_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(10_000);
  });

  it('should return 0 retryAfterMs when allowed', () => {
    const result = checkLimit(store, 'key', 5, 10_000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });
});
