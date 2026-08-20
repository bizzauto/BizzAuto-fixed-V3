import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// JWT Token Management with Rotation
interface TokenPayload {
  userId: string;
  businessId: string;
  plan: string;
  role: string;
  type?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days

export function generateTokenPair(payload: TokenPayload): TokenPair {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'bizzauto',
    subject: payload.userId,
  });

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: REFRESH_TOKEN_EXPIRY, issuer: 'bizzauto' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'bizzauto',
    }) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      issuer: 'bizzauto',
    }) as TokenPayload & { type: string };
    
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function refreshAccessToken(refreshToken: string): TokenPair | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return null;

  // Remove refresh-specific fields
  const { type, ...tokenPayload } = payload;
  
  return generateTokenPair(tokenPayload);
}

// Middleware for token rotation
export function tokenRotationMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    if (payload) {
      // Add user info to request
      (req as any).user = payload;
      
      // Check if token is about to expire (within 2 minutes)
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const timeUntilExpiry = decoded.exp - Date.now() / 1000;
        if (timeUntilExpiry < 120) {
          // Token needs rotation - add header to signal client
          res.set('X-Token-Needs-Refresh', 'true');
        }
      }
    }
  }
  
  next();
}

// API Version Check Middleware
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const version = req.headers['x-api-version'] as string;
  
  if (version && version !== API_VERSION) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported API version',
      currentVersion: API_VERSION,
      supportedVersions: [API_VERSION],
    });
  }
  
  next();
}

// Deprecation notice for old endpoints
export function deprecationNotice(deprecatedIn: string, sunsetDate: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Deprecation', ` Sunset on ${sunsetDate}`);
    res.set('Link', `<${API_PREFIX}${req.path}>; rel="successor-version"`);
    next();
  };
}

// Response wrapper for consistent API format
export function apiResponse<T>(
  res: Response,
  statusCode: number,
  data?: T,
  message?: string,
  meta?: Record<string, any>
) {
  const response: Record<string, any> = {
    success: statusCode >= 200 && statusCode < 300,
    timestamp: new Date().toISOString(),
    version: API_VERSION,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

// Pagination helper
export interface PaginatedRequest extends Request {
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };
}

export function parsePagination(req: Request): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return apiResponse(res, 200, data, undefined, {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}