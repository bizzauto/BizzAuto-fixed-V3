import { Request, Response, NextFunction } from 'express';
import { incrementCounter, setGauge, getGauge } from '../routes/monitoring.js';

/**
 * Request-counting middleware — feeds /api/metrics with real traffic data.
 *
 * Mount on '/api' to count all API requests. Tracks:
 * - Per-route counters: `{METHOD}:{basePath}` (e.g. `GET:/contacts`)
 * - Status class counters: `status:2xx`, `status:4xx`, `status:5xx`
 * - Per-route error counters: `errors:{basePath}`
 * - Per-route rolling average response time gauges
 *
 * Skips health checks and /metrics to avoid self-counting.
 */
export function requestCounting(req: Request, res: Response, next: NextFunction): void {
  // Skip health checks and metrics themselves
  if (req.path.startsWith('/health') || req.path === '/metrics') {
    return next();
  }

  // Normalize route: strip query params and IDs for grouping
  // e.g., /contacts/abc123 → /contacts, /deals/stats → /deals/stats
  const basePath = '/' + (req.path.split('/').filter(Boolean)[0] || 'unknown');
  const method = req.method;

  // Increment request counter: method + route
  incrementCounter(`${method}:${basePath}`);

  // Track response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Count by status class (2xx, 4xx, 5xx)
    const statusClass = `${Math.floor(status / 100)}xx`;
    incrementCounter(`status:${statusClass}`);

    // Count errors specifically
    if (status >= 400) {
      incrementCounter(`errors:${basePath}`);
    }

    // Update response time gauge (rolling average)
    const currentAvg = getGauge(`${basePath}_avg_ms`);
    const currentCount = getGauge(`${basePath}_count`);
    const newCount = currentCount + 1;
    const newAvg = currentAvg + (duration - currentAvg) / newCount;
    setGauge(`${basePath}_avg_ms`, Math.round(newAvg));
    setGauge(`${basePath}_count`, newCount);
  });

  next();
}
