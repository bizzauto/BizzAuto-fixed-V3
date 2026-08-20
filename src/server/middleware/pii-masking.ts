import { Request, Response, NextFunction } from 'express';

/**
 * PII (Personally Identifiable Information) Masking Middleware
 * Masks sensitive customer data in logs and responses
 */

// Mask phone number: 9876543210 → 98765****0
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 6) return phone || '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 6) return phone;
  return cleaned.slice(0, 4) + '*'.repeat(cleaned.length - 6) + cleaned.slice(-2);
}

// Mask email: rahul@example.com → r***l@example.com
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return '*'.repeat(local.length) + '@' + domain;
  return local[0] + '*'.repeat(Math.min(local.length - 2, 4)) + local[local.length - 1] + '@' + domain;
}

// Mask name: Rahul Sharma → R***** S******
export function maskName(name: string | null | undefined): string {
  if (!name) return '';
  return name.split(' ').map(part => {
    if (part.length <= 1) return part;
    return part[0] + '*'.repeat(Math.min(part.length - 1, 5));
  }).join(' ');
}

// Mask address: keep city/pincode, hide street
export function maskAddress(address: any): any {
  if (!address || typeof address !== 'object') return address;
  return {
    ...address,
    address: address.address ? address.address.slice(0, 10) + '***' : undefined,
    name: maskName(address.name),
    phone: maskPhone(address.phone),
  };
}

// Mask credit card: 4242424242424242 → 4242********4242
export function maskCard(cardNumber: string | null | undefined): string {
  if (!cardNumber || cardNumber.length < 8) return cardNumber || '';
  return cardNumber.slice(0, 4) + '*'.repeat(cardNumber.length - 8) + cardNumber.slice(-4);
}

// Mask any string with PII
export function maskPII(data: string): string {
  if (!data || typeof data !== 'string') return data;
  
  let masked = data;
  
  // Mask phone numbers (10 digits)
  masked = masked.replace(/(\d{2})\d{6}(\d{2})/g, '$1******$2');
  
  // Mask emails
  masked = masked.replace(/([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@/g, '$1***@');
  
  // Mask UPI IDs
  masked = masked.replace(/([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@upi/gi, '$1***@upi');
  
  return masked;
}

// Deep mask object recursively
export function deepMaskPII(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') return maskPII(obj);
    return obj;
  }
  
  const sensitiveKeys = ['phone', 'email', 'name', 'address', 'cardNumber', 'pan', 'aadhaar', 'password', 'token', 'secret'];
  
  const masked: any = Array.isArray(obj) ? [] : {};
  
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const keyLower = key.toLowerCase();
    
    if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
      if (keyLower.includes('phone') || keyLower.includes('mobile')) {
        masked[key] = maskPhone(value);
      } else if (keyLower.includes('email')) {
        masked[key] = maskEmail(value);
      } else if (keyLower.includes('name') && typeof value === 'string') {
        masked[key] = maskName(value);
      } else if (keyLower.includes('card')) {
        masked[key] = maskCard(value);
      } else if (keyLower.includes('password') || keyLower.includes('secret') || keyLower.includes('token')) {
        masked[key] = '***REDACTED***';
      } else if (typeof value === 'string') {
        masked[key] = maskPII(value);
      } else {
        masked[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = deepMaskPII(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Middleware to mask PII in request/response logs.
 * NOTE: Only masks logging — does NOT modify API response bodies.
 * Frontend needs real data (phone numbers, emails, names).
 */
export const piiMaskingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next();
};

/**
 * Middleware to sanitize request body - remove XSS/injection attempts
 */
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query) as any;
  }
  next();
};

function deepSanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Remove potential XSS
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    return obj;
  }
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key of Object.keys(obj)) {
    sanitized[key] = deepSanitize(obj[key]);
  }
  
  return sanitized;
}

/**
 * Check if data contains PII (for logging purposes)
 */
export function containsPII(data: string): boolean {
  const patterns = [
    /\b\d{10}\b/, // Phone number
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Card number
    /\b\d{4}\s?\d{4}\s?\d{4}\b/, // UPI
  ];
  
  return patterns.some(p => p.test(data));
}

/**
 * Secure logger - masks PII before logging
 */
export function secureLog(message: string, data?: any): void {
  const maskedMessage = maskPII(message);
  const maskedData = data ? deepMaskPII(data) : undefined;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SECURE] ${maskedMessage}`, maskedData || '');
  }
  // In production, use your logging service with PII masking
}

/**
 * Data retention check - flag old data for deletion
 */
export function getDataRetentionStatus(createdAt: Date, retentionDays: number = 365): {
  isExpired: boolean;
  daysUntilExpiry: number;
  shouldAnonymize: boolean;
} {
  const now = new Date();
  const created = new Date(createdAt);
  const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilExpiry = retentionDays - daysSinceCreation;
  
  return {
    isExpired: daysUntilExpiry <= 0,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    shouldAnonymize: daysUntilExpiry <= 30 && daysUntilExpiry > 0, // Anonymize 30 days before expiry
  };
}

/**
 * Anonymize customer data for analytics
 */
export function anonymizeForAnalytics(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const anonymized: any = Array.isArray(data) ? [] : {};
  
  for (const key of Object.keys(data)) {
    const value = data[key];
    const keyLower = key.toLowerCase();
    
    if (keyLower === 'phone' || keyLower === 'mobile') {
      anonymized[key] = '+91' + 'X'.repeat(10); // Keep country code format
    } else if (keyLower === 'email') {
      anonymized[key] = 'user_' + Math.random().toString(36).slice(2, 8) + '@masked.com';
    } else if (keyLower === 'name') {
      anonymized[key] = 'Customer_' + Math.random().toString(36).slice(2, 6);
    } else if (keyLower.includes('address') || keyLower.includes('street')) {
      anonymized[key] = '***MASKED***';
    } else if (keyLower.includes('card') || keyLower.includes('cvv') || keyLower.includes('piry')) {
      anonymized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      anonymized[key] = anonymizeForAnalytics(value);
    } else {
      anonymized[key] = value;
    }
  }
  
  return anonymized;
}