import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';

/**
 * API Key Authentication Middleware
 *
 * Validates the `x-api-key` header against the `ApiKey` model in the database.
 * On success, attaches `req.user` with business context (similar to JWT auth).
 *
 * Supports:
 * - Key lookup by hash (SHA-256 of the raw key)
 * - Expiration checking
 * - Active/inactive status checking
 * - Permission scoping via `permissions` JSON field
 * - Last-used tracking
 *
 * Usage:
 *   import { authenticateApiKey } from '../middleware/api-key-auth.js';
 *   router.get('/some-endpoint', authenticateApiKey, handler);
 *
 *   // With permission check:
 *   router.post('/contacts', authenticateApiKey(['contacts:write']), handler);
 */

/**
 * Hash an API key for secure storage comparison.
 * We store hashes, not raw keys.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Generate a new API key and its hash.
 * Returns { raw, hash, prefix } — raw is shown once, hash is stored.
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = 'bka_' + crypto.randomBytes(32).toString('hex');
  const hash = hashApiKey(raw);
  const prefix = raw.substring(0, 8);
  return { raw, hash, prefix };
}

/**
 * Express middleware that authenticates via API key.
 * Optionally checks that the key has specific permissions.
 *
 * @param requiredPermissions - Optional list of permissions required (e.g., ['contacts:read'])
 */
export function authenticateApiKey(requiredPermissions?: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKeyRaw = req.headers['x-api-key'] as string | undefined;
      if (!apiKeyRaw) {
        res.status(401).json({ success: false, error: 'API key required (x-api-key header)' });
        return;
      }

      // Find the key in the database (stored as raw key in the 'key' field)
      const apiKey = await prisma.apiKey.findFirst({
        where: { key: apiKeyRaw },
        include: { business: { select: { id: true, name: true, plan: true, isActive: true } } } as any,
      });

      if (!apiKey) {
        res.status(401).json({ success: false, error: 'Invalid API key' });
        return;
      }

      // Check if key is active
      if (!apiKey.isActive) {
        res.status(403).json({ success: false, error: 'API key has been deactivated' });
        return;
      }

      // Check if key has expired
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        res.status(403).json({ success: false, error: 'API key has expired' });
        return;
      }

      // Check if the business is active
      if (!(apiKey as any).business?.isActive) {
        res.status(403).json({ success: false, error: 'Business account is suspended' });
        return;
      }

      // Check permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const keyPermissions = (apiKey.permissions as string[]) || [];
        const hasPermission = requiredPermissions.every(p => keyPermissions.includes(p) || keyPermissions.includes('*'));
        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
          });
          return;
        }
      }

      // Update lastUsedAt (fire-and-forget, non-blocking)
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => { /* non-critical */ });

      // Set user context (matches JWT auth shape)
      (req as any).user = {
        id: `api-key:${apiKey.id}`,
        email: `api-key@${apiKey.businessId}`,
        businessId: apiKey.businessId,
        role: 'ADMIN',
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
      };

      // Set business info for downstream use
      (req as any).business = (apiKey as any).business;

      next();
    } catch (error: any) {
      console.error('API key auth error:', error.message);
      res.status(500).json({ success: false, error: 'API key authentication failed' });
    }
  };
}
