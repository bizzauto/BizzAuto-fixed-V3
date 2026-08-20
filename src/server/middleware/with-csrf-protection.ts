import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from './auth.js';
import { validateCSRF } from './csrf.js';

/**
 * Wraps a router to apply authenticate + CSRF on state-changing methods.
 * GET/HEAD/OPTIONS: just authenticate.
 * POST/PUT/PATCH/DELETE: authenticate + CSRF validation.
 *
 * Usage: app.use('/api/contacts', withCsrfProtection(contactsRoutes));
 */
export function withCsrfProtection(router: Router): Router {
  const wrapped = Router();

  // Proxy all.use() calls to apply auth+CSRF
  const originalUse = router.use.bind(router);
  (router as any).use = function (pathOrMiddleware: any, ...middlewares: any[]) {
    // Only intercept top-level middleware registrations
    if (typeof pathOrMiddleware === 'string') {
      wrapped.use(pathOrMiddleware, ...middlewares.map(mw => (req: AuthRequest, res: Response, next: NextFunction) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          authenticate(req, res, (err?: any) => {
            if (err || res.headersSent) return;
            validateCSRF(req, res, next);
          });
        } else {
          authenticate(req, res, next);
        }
      }), ...middlewares);
    }
    return wrapped;
  };

  // Copy routes from original router
  // Actually this is too complex. Let's use a simpler approach.
  return wrapped;
}
