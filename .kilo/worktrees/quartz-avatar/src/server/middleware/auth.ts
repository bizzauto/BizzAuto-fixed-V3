import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    businessId: string;
    role: string;
  };
  id?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { business: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Contact support.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    req.user = {
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
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

    const businessId = req.params.businessId || req.body.businessId;

    if (!businessId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (user?.businessId !== businessId) {
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
