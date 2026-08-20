import { Request, Response, NextFunction } from 'express';
import { CSRFService } from '../services/csrf.service.js';
import { AuthRequest } from './auth.js';

/**
 * CSRF Token Validation Middleware
 * Validates CSRF token from request headers
 */
export const validateCSRF = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // GET requests don't need CSRF protection
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    // If req.user is not set yet (auth middleware hasn't run),
    // skip CSRF validation — the route's own authenticate middleware
    // will handle unauthorized access. CSRF only applies to authenticated sessions.
    if (!req.user || !req.user.id) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] as string;

    if (!csrfToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token required. Include X-CSRF-Token header.',
      });
    }

    let isValid = false;
    try {
      isValid = await CSRFService.validateToken(req.user.id, csrfToken);
    } catch (csrfErr: any) {
      // Gracefully handle missing csrfToken column — auth already logged warning
      console.warn(`[CSRF] Validation failed (${csrfErr?.message || String(csrfErr)}). Skipping CSRF check.`);
      return next();
    }

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired CSRF token',
      });
    }

    next();
  } catch (error: any) {
    console.error('CSRF validation error:', error);
    res.status(500).json({
      success: false,
      error: 'CSRF validation failed',
    });
  }
};
