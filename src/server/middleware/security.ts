import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security Headers using Helmet.js
 * Comprehensive protection against common attacks
 */
export const securityHeaders = helmet({
  // Content Security Policy - Prevents XSS
  // NOTE: This is the SOLE helmet/CSP configuration. The duplicate in server/index.ts was removed.
  // Google OAuth (GIS), Razorpay, Google Fonts, and React/Vite all need these directives.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://fonts.googleapis.com", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https://accounts.google.com", "https://*.google.com", "https://*.googleapis.com", "https://checkout.razorpay.com", "https://api.razorpay.com", "https://*.razorpay.com"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  
  // Allow Google OAuth iframes while preventing clickjacking
  frameguard: { action: 'sameorigin' },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent XSS
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Cross-Origin-Opener-Policy: Required for Google Identity Services popup
  // Default 'same-origin' blocks the GIS popup at accounts.google.com/gsi/transform
  // from sending postMessage back to the parent window, causing white screen.
  crossOriginOpenerPolicy: {
    policy: 'same-origin-allow-popups'
  }
});

/**
 * Additional security headers (beyond Helmet)
 */
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Prevent caching of sensitive data
  if (req.path.includes('/api/') && req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Remove sensitive headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CSP violation reporting endpoint
  res.setHeader('Content-Security-Policy-Report-Only', 'report-uri /api/security/csp-report');
  
  next();
};

/**
 * CORS Configuration
 * Restricts which domains can access the API
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://bizzauto.com',
      // Add your production domains
    ];
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // In production, check origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Request-Id', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
  maxAge: 86400 // 24 hours
};

/**
 * Request Sanitization Middleware
 * Cleans user input to prevent injection attacks
 */
export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Remove potential script tags
        obj[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    }
    
    return obj;
  };
  
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  
  next();
};

/**
 * SQL Injection Prevention Headers
 */
export const sqlInjectionHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious patterns in query
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--|;|\/\*|\*\/|@@|@)/,
    /(OR|AND)\s+\d+\s*=\s*\d+/i
  ];
  
  const checkString = (str: string) => {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(str)) {
        console.warn(`[Security] Suspicious pattern detected: ${pattern} in ${str}`);
        return false;
      }
    }
    return true;
  };
  
  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);
  
  if (!checkString(queryString) || !checkString(bodyString)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request format',
      code: 'INVALID_REQUEST'
    });
  }
  
  next();
};

/**
 * Security Monitoring Middleware
 * Logs suspicious activities
 */
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousIndicators = [
    { pattern: /\.\.\//g, name: 'Path Traversal' },
    { pattern: /<[^>]*>/g, name: 'XSS Attempt' },
    { pattern: /\x00/g, name: 'Null Bytes' },
    { pattern: /eval\s*\(/g, name: 'Eval Usage' },
    { pattern: /base64_decode\s*\(/g, name: 'Base64 Decode' }
  ];
  
  const checkRequest = () => {
    const checks = [
      req.originalUrl,
      JSON.stringify(req.query),
      JSON.stringify(req.body)
    ];
    
    for (const check of checks) {
      for (const indicator of suspiciousIndicators) {
        if (indicator.pattern.test(check)) {
          console.warn(`[Security Alert] ${indicator.name} detected from IP: ${req.ip}`);
          // Log for admin review but don't block immediately
          return false;
        }
      }
    }
    return true;
  };
  
  checkRequest();
  next();
};

/**
 * Timeout Middleware
 * Prevents long-running requests
 */
export const requestTimeout = (req: Request, res: Response, next: NextFunction) => {
  // Set timeout to 30 seconds
  req.setTimeout(30000, () => {
    console.warn(`[Security] Request timeout: ${req.path} from ${req.ip}`);
    res.status(408).json({
      success: false,
      error: 'Request timeout',
      code: 'REQUEST_TIMEOUT'
    });
  });
  
  next();
};

/**
 * API-specific security headers (for /api/* routes)
 */
export function apiSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // API response format
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-API-Version', '1.0');

  // Rate limit info header
  res.setHeader('X-Response-Time', Date.now().toString());

  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};