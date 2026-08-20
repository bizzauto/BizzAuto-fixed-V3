import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const PLAN_LIMITS: Record<string, RateLimitConfig> = {
  FREE: { windowMs: 60000, maxRequests: 10 },      // 10 req/min
  STARTER: { windowMs: 60000, maxRequests: 50 },   // 50 req/min
  GROWTH: { windowMs: 60000, maxRequests: 200 },   // 200 req/min
  PRO: { windowMs: 60000, maxRequests: 500 },      // 500 req/min
  AGENCY: { windowMs: 60000, maxRequests: 1000 },  // 1000 req/min
  ENTERPRISE: { windowMs: 60000, maxRequests: 2000 }, // 2000 req/min
};

const messageRateLimitStore = new Map<string, { count: number; resetTime: number }>();

const messageRateLimits: Record<string, number> = {
  FREE: 80,        // 80 messages/min
  STARTER: 200,   // 200 messages/min
  GROWTH: 500,    // 500 messages/min
  PRO: 1000,      // 1000 messages/min
  AGENCY: 3000,   // 3000 messages/min
  ENTERPRISE: 3000, // 3000 messages/min
};

export function getPlanLimit(plan: string): RateLimitConfig {
  return PLAN_LIMITS[plan?.toUpperCase()] || PLAN_LIMITS.FREE;
}

export function getMessageRateLimit(plan: string): number {
  return messageRateLimits[plan?.toUpperCase()] || messageRateLimits.FREE;
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const businessId = (req as any).user?.businessId || req.ip;
  const plan = (req as any).user?.business?.plan || 'FREE';
  
  const limit = getPlanLimit(plan);
  const now = Date.now();
  
  const key = `ratelimit:${businessId}`;
  const record = messageRateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    messageRateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
    });
    next();
    return;
  }
  
  if (record.count >= limit.maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${limit.maxRequests} requests per ${limit.windowMs / 1000} seconds. Upgrade your plan for higher limits.`,
      plan: plan,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
    return;
  }
  
  record.count++;
  next();
}

export function checkWhatsAppRateLimit(businessId: string, plan: string, messageCount: number): { allowed: boolean; currentRate: number; limit: number; waitSeconds?: number } {
  const limit = getMessageRateLimit(plan);
  return {
    allowed: messageCount <= limit,
    currentRate: messageCount,
    limit: limit,
  };
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}