/**
 * Circuit Breaker Service
 *
 * Prevents cascading failures when external APIs (Evolution, Dograh, WhatsApp,
 * Instagram, Razorpay, etc.) are down or slow. Tracks per-service failure rates
 * and automatically stops calling failing services.
 *
 * States:
 *   CLOSED   → normal operation, requests flow through
 *   OPEN     → service is down, requests are immediately rejected
 *   HALF_OPEN → cooldown expired, allowing a probe request through
 *
 * Usage:
 *   import { circuitBreaker } from '../services/circuit-breaker.service.js';
 *   const result = await circuitBreaker.execute('evolution-api', async () => {
 *     return await axios.post(url, data);
 *   });
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// ==================== TYPES ====================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before trying HALF_OPEN */
  cooldownMs: number;
  /** Number of successful probes in HALF_OPEN before closing */
  halfOpenSuccessThreshold: number;
  /** Slow request threshold in ms (counts as a failure) */
  slowRequestThresholdMs: number;
  /** Time window in ms for counting failures */
  windowMs: number;
  /** Maximum consecutive failures before forcing longer cooldown */
  maxConsecutiveFailures: number;
}

interface CircuitState_ {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  lastStateChange: number;
  halfOpenAttempts: number;
  /** Rolling window of recent request timestamps for rate calculation */
  recentRequests: number[];
}

export interface CircuitBreakerStats {
  service: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  uptime: number; // percentage
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 60_000,         // 1 minute
  halfOpenSuccessThreshold: 2,
  slowRequestThresholdMs: 10_000, // 10s = slow
  windowMs: 300_000,          // 5 minute window
  maxConsecutiveFailures: 20, // trigger extended cooldown after 20
};

const EXTENDED_COOLDOWN_MS = 5 * 60_000; // 5 minutes after max consecutive failures

// ==================== CIRCUIT BREAKER CLASS ====================

class CircuitBreakerService {
  private circuits: Map<string, CircuitState_> = new Map();
  private configs: Map<string, CircuitBreakerConfig> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup stale request timestamps every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000);
  }

  /**
   * Register a service with optional custom config.
   * Call this at startup for each external service you depend on.
   */
  register(service: string, config?: Partial<CircuitBreakerConfig>): void {
    this.configs.set(service, { ...DEFAULT_CONFIG, ...config });
    if (!this.circuits.has(service)) {
      this.circuits.set(service, this.newState());
    }
  }

  /**
   * Execute a request through the circuit breaker.
   * Returns the result if the circuit allows, or throws CircuitOpenError if blocked.
   */
  async execute<T>(
    service: string,
    fn: () => Promise<T>,
    options?: { timeoutMs?: number }
  ): Promise<T> {
    // Auto-register if not already
    if (!this.circuits.has(service)) {
      this.register(service);
    }

    const circuit = this.circuits.get(service)!;
    const config = this.configs.get(service)!;
    const now = Date.now();

    // Check state transitions
    this.maybeTransition(service, now);

    // If still OPEN after transition check, reject immediately
    if (circuit.state === 'OPEN') {
      throw new CircuitOpenError(service, circuit);
    }

    // Execute the request
    const startTime = now;
    try {
      let result: T;

      if (options?.timeoutMs) {
        // Apply external timeout
        result = await this.executeWithTimeout(fn, options.timeoutMs);
      } else {
        result = await fn();
      }

      const elapsed = Date.now() - startTime;

      // Check if response was slow (counts as failure)
      if (elapsed > config.slowRequestThresholdMs) {
        this.recordFailure(service, 'slow_request');
      } else {
        this.recordSuccess(service);
      }

      return result;
    } catch (error: any) {
      this.recordFailure(service, error.message || 'unknown');
      throw error;
    }
  }

  /**
   * Execute an HTTP request through the circuit breaker.
   * Convenience wrapper for axios calls.
   */
  async executeHttp<T = any>(
    service: string,
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.execute(service, async () => {
      return axios[method](url, config);
    });
  }

  /**
   * Get current state of a circuit.
   */
  getState(service: string): CircuitState {
    if (!this.circuits.has(service)) return 'CLOSED';
    return this.circuits.get(service)!.state;
  }

  /**
   * Get stats for a specific service.
   */
  getStats(service: string): CircuitBreakerStats | null {
    const circuit = this.circuits.get(service);
    if (!circuit) return null;

    const total = circuit.failureCount + circuit.successCount;
    return {
      service,
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      consecutiveFailures: circuit.consecutiveFailures,
      lastFailureAt: circuit.lastFailureAt || null,
      lastSuccessAt: circuit.lastSuccessAt || null,
      uptime: total > 0 ? (circuit.successCount / total) * 100 : 100,
    };
  }

  /**
   * Get stats for all registered services.
   */
  getAllStats(): CircuitBreakerStats[] {
    const stats: CircuitBreakerStats[] = [];
    for (const service of this.circuits.keys()) {
      const s = this.getStats(service);
      if (s) stats.push(s);
    }
    return stats;
  }

  /**
   * Manually reset a circuit to CLOSED (e.g., after confirming service is back).
   */
  reset(service: string): void {
    if (this.circuits.has(service)) {
      const circuit = this.circuits.get(service)!;
      circuit.state = 'CLOSED';
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.consecutiveFailures = 0;
      circuit.halfOpenAttempts = 0;
      circuit.lastStateChange = Date.now();
      console.log(`[CircuitBreaker] ${service} manually reset to CLOSED`);
    }
  }

  /**
   * Shutdown cleanup.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ==================== PRIVATE ====================

  private newState(): CircuitState_ {
    return {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      consecutiveFailures: 0,
      lastFailureAt: 0,
      lastSuccessAt: 0,
      lastStateChange: Date.now(),
      halfOpenAttempts: 0,
      recentRequests: [],
    };
  }

  private maybeTransition(service: string, now: number): void {
    const circuit = this.circuits.get(service)!;
    const config = this.configs.get(service)!;

    if (circuit.state === 'OPEN') {
      const cooldownMs = circuit.consecutiveFailures >= config.maxConsecutiveFailures
        ? EXTENDED_COOLDOWN_MS
        : config.cooldownMs;

      if (now - circuit.lastStateChange >= cooldownMs) {
        circuit.state = 'HALF_OPEN';
        circuit.halfOpenAttempts = 0;
        circuit.lastStateChange = now;
        console.log(`[CircuitBreaker] ${service} → HALF_OPEN (cooldown expired)`);
      }
    }
  }

  private recordSuccess(service: string): void {
    const circuit = this.circuits.get(service)!;
    const config = this.configs.get(service)!;

    circuit.successCount++;
    circuit.lastSuccessAt = Date.now();
    circuit.recentRequests.push(Date.now());

    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenAttempts++;
      if (circuit.halfOpenAttempts >= config.halfOpenSuccessThreshold) {
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        circuit.consecutiveFailures = 0;
        circuit.halfOpenAttempts = 0;
        circuit.lastStateChange = Date.now();
        console.log(`[CircuitBreaker] ${service} → CLOSED (recovered)`);
      }
    } else {
      // In CLOSED state, reset consecutive failures on success
      circuit.consecutiveFailures = 0;
    }
  }

  private recordFailure(service: string, reason: string): void {
    const circuit = this.circuits.get(service)!;
    const config = this.configs.get(service)!;

    circuit.failureCount++;
    circuit.consecutiveFailures++;
    circuit.lastFailureAt = Date.now();
    circuit.recentRequests.push(Date.now());

    if (circuit.state === 'HALF_OPEN') {
      // Failed during probe → back to OPEN
      circuit.state = 'OPEN';
      circuit.lastStateChange = Date.now();
      circuit.halfOpenAttempts = 0;
      console.log(`[CircuitBreaker] ${service} → OPEN (probe failed: ${reason})`);
    } else if (circuit.consecutiveFailures >= config.failureThreshold) {
      // CLOSED → OPEN after threshold
      circuit.state = 'OPEN';
      circuit.lastStateChange = Date.now();
      const isExtended = circuit.consecutiveFailures >= config.maxConsecutiveFailures;
      console.log(
        `[CircuitBreaker] ${service} → OPEN (failures: ${circuit.consecutiveFailures}${isExtended ? ', EXTENDED cooldown' : ''}: ${reason})`
      );
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Circuit breaker timeout: ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Remove request timestamps outside the tracking window to prevent memory leaks.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const circuit of this.circuits.values()) {
      circuit.recentRequests = circuit.recentRequests.filter(
        ts => now - ts < DEFAULT_CONFIG.windowMs
      );
    }
  }
}

// ==================== CUSTOM ERROR ====================

export class CircuitOpenError extends Error {
  public readonly service: string;
  public readonly circuitState: CircuitState_;
  public readonly retryAfterMs: number;

  constructor(service: string, circuit: CircuitState_) {
    const cooldownRemaining = circuit.lastStateChange + 60_000 - Date.now();
    super(`Circuit breaker OPEN for "${service}" — retry after ${Math.max(0, cooldownRemaining)}ms`);
    this.name = 'CircuitOpenError';
    this.service = service;
    this.circuitState = circuit;
    this.retryAfterMs = Math.max(0, cooldownRemaining);
  }
}

// ==================== SINGLETON ====================

export const circuitBreaker = new CircuitBreakerService();

// Register known external services with tuned configs
circuitBreaker.register('evolution-api', {
  failureThreshold: 3,
  cooldownMs: 30_000,       // 30s for WhatsApp API (high priority)
  slowRequestThresholdMs: 15_000,
});

circuitBreaker.register('dograh', {
  failureThreshold: 3,
  cooldownMs: 60_000,
  slowRequestThresholdMs: 30_000, // Voice calls can be slow
});

circuitBreaker.register('razorpay', {
  failureThreshold: 2,       // Payment — fail fast
  cooldownMs: 120_000,       // 2 minute cooldown for payment service
  slowRequestThresholdMs: 10_000,
});

circuitBreaker.register('instagram-graph-api', {
  failureThreshold: 5,
  cooldownMs: 60_000,
  slowRequestThresholdMs: 10_000,
});

circuitBreaker.register('whatsapp-cloud-api', {
  failureThreshold: 3,
  cooldownMs: 30_000,
  slowRequestThresholdMs: 10_000,
});

circuitBreaker.register('msg91', {
  failureThreshold: 3,
  cooldownMs: 60_000,
  slowRequestThresholdMs: 10_000,
});

circuitBreaker.register('openrouter', {
  failureThreshold: 5,
  cooldownMs: 30_000,
  slowRequestThresholdMs: 30_000, // AI requests can be slow
});

export default circuitBreaker;
