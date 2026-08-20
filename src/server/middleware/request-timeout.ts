import { Request, Response, NextFunction } from 'express';

/**
 * Request Timeout Middleware
 *
 * Prevents slow clients from holding server connections indefinitely.
 * If a request exceeds the timeout, the connection is terminated.
 *
 * Usage:
 *   import { requestTimeout } from '../middleware/request-timeout.js';
 *   app.use(requestTimeout());  // 30s default
 *   app.use(requestTimeout(60000));  // 60s for upload endpoints
 *
 * Configuration:
 *   REQUEST_TIMEOUT_MS=30000  (default: 30000ms = 30s)
 */

const DEFAULT_TIMEOUT_MS = 30_000;

export function requestTimeout(timeoutMs?: number) {
  const timeout = timeoutMs || parseInt(process.env.REQUEST_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Set server timeout for this connection
    req.socket.setTimeout(timeout);

    // Track if response has already been sent
    let responded = false;

    const handler = () => {
      if (!responded && !res.headersSent) {
        responded = true;
        console.warn(`Request timeout (${timeout}ms): ${req.method} ${req.path} from ${req.ip}`);
        res.status(408).json({
          success: false,
          error: 'Request timeout. The server took too long to process your request.',
        });
        req.socket.destroy();
      }
    };

    req.socket.on('timeout', handler);

    // Clean up timeout listener when response finishes to prevent socket leak
    res.on('finish', () => {
      responded = true;
      req.socket.removeListener('timeout', handler);
    });

    next();
  };
}
