import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from './auth.js';
import { validateCSRF } from './csrf.js';

/**
 * Combined authenticate + CSRF validation middleware.
 * Runs authenticate first (populates req.user), then validateCSRF.
 * Only applies CSRF for state-changing methods (POST, PUT, PATCH, DELETE).
 * GET/HEAD/OPTIONS pass through with just authenticate.
 */
export const authenticatedCsrf = (req: AuthRequest, res: Response, next: NextFunction) => {
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  if (isStateChanging) {
    authenticate(req, res, (err?: any) => {
      if (err || res.headersSent) return;
      validateCSRF(req, res, next);
    });
  } else {
    authenticate(req, res, next);
  }
};
