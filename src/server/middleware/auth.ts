import { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '../db.js';
import { CSRFService } from '../services/csrf.service.js';
import { verifyToken } from '../utils/auth.js';
import { ipBlocker } from './ipSecurity.js';

export interface AuthRequest extends Request {
  user?: any;
  id?: string;
  [key: string]: any;
}

/**
 * N8N_API_KEY-based authentication for service-to-service calls.
 * n8n workflows send x-n8n-api-key header to authenticate with the App API.
 * Falls through to normal JWT auth if no API key is present.
 *
 * SECURITY: businessId from x-business-id header is HMAC-signed to prevent
 * tenant breakout. The n8n API key is used as the HMAC key.
 */
async function authenticateViaN8nApiKey(req: AuthRequest): Promise<boolean> {
  const apiKey = req.headers['x-n8n-api-key'] as string | undefined;
  if (!apiKey) return false;

  const configuredKey = process.env.N8N_API_KEY;
  if (!configuredKey) return false;

  if (apiKey !== configuredKey) {
    return false;
  }

  // Validate HMAC-signed businessId to prevent tenant breakout
  const rawBusinessId = req.headers['x-business-id'] as string | undefined;
  const signature = req.headers['x-business-signature'] as string | undefined;

  if (!rawBusinessId || !signature) {
    console.warn('[n8nAuth] Missing x-business-id or x-business-signature header');
    return false; // Let the calling authenticate middleware handle the 401
  }

        // Verify HMAC signature: HMAC-SHA256(apiKey, businessId) === signature
        const expectedSignature = createHmac('sha256', configuredKey)
            .update(rawBusinessId)
            .digest('hex');

  // Check buffer lengths match before timingSafeEqual to prevent crash
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
    console.warn('[n8nAuth] Invalid business signature — possible tenant breakout attempt');
    return false; // Let the calling authenticate middleware handle the 403
  }

  // Create a system-level user context for n8n automation
  req.user = {
    id: 'n8n-automation',
    email: 'n8n@system',
    businessId: rawBusinessId,
    role: 'ADMIN',
    isServiceAccount: true,
  };

  return true;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    // If no Bearer token, try n8n API key auth
    if (!token) {
      const n8nAuthed = await authenticateViaN8nApiKey(req);
      if (n8nAuthed) {
        return next();
      }

      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    let decoded: any;
    try {
      decoded = verifyToken(token) as any;
    } catch (verifyError: any) {
      // Track failed auth attempts for IP blocking
      ipBlocker.increment(req.ip || req.socket.remoteAddress || 'unknown');
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { business: true },
    });

    if (!user) {
      ipBlocker.increment(req.ip || req.socket.remoteAddress || 'unknown');
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.isActive) {
      ipBlocker.increment(req.ip || req.socket.remoteAddress || 'unknown');
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Contact support.',
      });
    }

    // Only generate CSRF token if not exists or expired (max once per session)
    let csrfToken: string | null = null;
    try {
      csrfToken = await CSRFService.getToken(user.id);
      if (!csrfToken) {
        csrfToken = await CSRFService.generateToken(user.id);
      }
    } catch (csrfErr: any) {
      // Gracefully handle missing csrfToken column in production DB
      // This can happen when Prisma migration hasn't been properly baselined
      console.warn(`[Auth] CSRF token generation failed (${csrfErr?.message || String(csrfErr)}). Auth continues without CSRF.`);
      csrfToken = null;
    }
    if (csrfToken) {
      res.setHeader('X-CSRF-Token', csrfToken);
    }

    req.user = {
      id: user.id,
      email: user.email,
      businessId: user.businessId || null,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }
    next(error);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

export const requireBusinessOwner = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      error: 'Only business owners can perform this action',
    });
  }

  next();
};

export const requireBusinessAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // SECURITY: Never trust businessId from request body or params.
    // Always use the businessId from the authenticated JWT token.
    // The only exception is for super admin who may manage multiple businesses.
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // businessId is ALWAYS sourced from JWT, never from request body
    const userBusinessId = req.user.businessId;

    if (!userBusinessId) {
      return res.status(403).json({
        success: false,
        error: 'No business associated with this account',
      });
    }

    // If the route has a businessId param, verify it matches the JWT
    const requestBusinessId = req.params.businessId;
    if (requestBusinessId && requestBusinessId !== userBusinessId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this business',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a webhook secret for lead capture endpoints
 */
export function generateWebhookSecret(): string {
  return 'wh_' + randomBytes(24).toString('hex');
}

/**
 * Validate webhook request by checking x-webhook-secret header
 * against the business's leadWebhookSecret
 */
export async function validateWebhook(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.params.businessId || req.body?.businessId;
    if (!businessId) {
      res.status(400).json({ success: false, error: 'Business ID is required' });
      return;
    }

    const webhookSecret = req.headers['x-webhook-secret'] as string;
    if (!webhookSecret) {
      res.status(401).json({ success: false, error: 'Missing x-webhook-secret header' });
      return;
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { leadWebhookSecret: true },
    });

    if (!business || !business.leadWebhookSecret) {
      res.status(401).json({ success: false, error: 'Webhook not configured for this business. Generate a webhook secret in Settings > Integrations.' });
      return;
    }

    // Constant-time comparison to prevent timing attacks
    const expected = Buffer.from(business.leadWebhookSecret);
    const received = Buffer.from(webhookSecret);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      res.status(403).json({ success: false, error: 'Invalid webhook secret' });
      return;
    }

    req.user = { businessId, isWebhook: true };
    next();
  } catch (error: any) {
    console.error('Webhook validation error:', error.message);
    res.status(500).json({ success: false, error: 'Webhook validation failed' });
  }
}

export const checkPlanLimits = (resource: string, limit: number) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          error: 'Business not found',
        });
      }

      const planLimits: any = {
        FREE: { contacts: 500, messages: 100, posts: 10, posters: 20 },
        STARTER: { contacts: 2000, messages: 1000, posts: 50, posters: 100 },
        GROWTH: { contacts: 10000, messages: 5000, posts: 200, posters: 500 },
        PRO: { contacts: 50000, messages: 20000, posts: 1000, posters: 2000 },
        AGENCY: { contacts: 100000, messages: 100000, posts: 10000, posters: 10000 },
      };

      const currentLimit = planLimits[business.plan]?.[resource] || 0;

      if (currentLimit < limit) {
        return res.status(429).json({
          success: false,
          error: `Plan limit exceeded. Upgrade your plan to send more ${resource}.`,
          currentLimit,
          requested: limit,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
