import { Request, Response, NextFunction } from 'express';

/**
 * IP Whitelist - Allow only specific IPs (for admin panel)
 * Configure in environment variables
 */
export const ipWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const whitelist = process.env.IP_WHITELIST?.split(',') || [];
  
  // If no whitelist configured, allow all
  if (whitelist.length === 0) {
    return next();
  }
  
  const clientIP = req.ip || req.socket.remoteAddress || '';
  
  if (whitelist.includes(clientIP)) {
    return next();
  }
  
  // Check for X-Forwarded-For header (if behind proxy)
  const forwardedIP = req.headers['x-forwarded-for'];
  if (forwardedIP) {
    const firstIP = (forwardedIP as string).split(',')[0].trim();
    if (whitelist.includes(firstIP)) {
      return next();
    }
  }
  
  console.warn(`[Security] Blocked request from non-whitelisted IP: ${clientIP}`);
  
  res.status(403).json({
    success: false,
    error: 'Access denied',
    code: 'IP_NOT_WHITELISTED'
  });
};

/**
 * Block Suspicious IPs
 * Maintains a list of blocked IPs
 */
class IPBlocker {
  private blockedIPs: Map<string, { count: number; blockedUntil: number }> = new Map();
  private readonly THRESHOLD = 50; // Block after 50 failed requests
  private readonly BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes
  
  block(ip: string) {
    this.blockedIPs.set(ip, {
      count: 0,
      blockedUntil: Date.now() + this.BLOCK_DURATION
    });
  }
  
  increment(ip: string) {
    const record = this.blockedIPs.get(ip);
    if (record) {
      record.count++;
      if (record.count >= this.THRESHOLD) {
        record.blockedUntil = Date.now() + this.BLOCK_DURATION;
      }
    } else {
      this.blockedIPs.set(ip, { count: 1, blockedUntil: 0 });
    }
  }
  
  isBlocked(ip: string): boolean {
    const record = this.blockedIPs.get(ip);
    if (!record) return false;
    if (record.blockedUntil > Date.now()) return true;
    
    // Cleanup expired records
    this.blockedIPs.delete(ip);
    return false;
  }
  
  cleanup() {
    const now = Date.now();
    this.blockedIPs.forEach((record, ip) => {
      if (record.blockedUntil < now) {
        this.blockedIPs.delete(ip);
      }
    });
  }
}

export const ipBlocker = new IPBlocker();

// Run cleanup every 5 minutes
setInterval(() => ipBlocker.cleanup(), 5 * 60 * 1000);

/**
 * IP Blocking Middleware
 */
export const ipBlockMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  
  if (ipBlocker.isBlocked(ip)) {
    return res.status(403).json({
      success: false,
      error: 'Your IP has been temporarily blocked due to suspicious activity',
      code: 'IP_BLOCKED',
      retryAfter: '30 minutes'
    });
  }
  
  next();
};

/**
 * Admin Route Protection
 * Extra security for admin-only endpoints
 */
export const adminRouteProtection = (req: Request, res: Response, next: NextFunction) => {
  // In production, ensure this is actually an admin
  if (process.env.NODE_ENV === 'production') {
    const adminIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
    const clientIP = req.ip || '';
    
    if (adminIPs.length > 0 && !adminIPs.includes(clientIP)) {
      console.warn(`[Security] Admin route accessed from non-admin IP: ${clientIP}`);
      // Don't block, but log for monitoring
    }
  }
  
  next();
};

/**
 * Geo-Blocking (Optional)
 * Block requests from specific countries
 */
export const geoBlocker = (req: Request, res: Response, next: NextFunction) => {
  const blockedCountries = process.env.BLOCKED_COUNTRIES?.split(',') || [];
  
  if (blockedCountries.length === 0) {
    return next();
  }
  
  // Note: In production, use a GeoIP database
  // For now, just a placeholder
  const country = req.headers['cf-ipcountry']; // Cloudflare header
  
  if (country && blockedCountries.includes(country as string)) {
    return res.status(451).json({
      success: false,
      error: 'Service not available in your region',
      code: 'GEO_BLOCKED'
    });
  }
  
  next();
};