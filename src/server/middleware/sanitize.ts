import { Request, Response, NextFunction } from 'express';

/**
 * HTML Entity Encoding Map for XSS Prevention
 * Converts dangerous characters to their safe HTML entity equivalents.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const DANGEROUS_PATTERN = /[<>"'`/]/g;

/**
 * Check if a string looks like it contains XSS vectors.
 * Returns true if the string contains potentially dangerous content.
 */
function containsXSSVector(value: string): boolean {
  // Check for common XSS patterns
  const xssPatterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,       // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i,
    /<form[\s>]/i,
    /expression\s*\(/i,
    /vbscript:/i,
    /<svg[\s>]/i,
    /<link[\s>]/i,
    /<meta[\s>]/i,
    /<base[\s>]/i,
    /<!--/,              // HTML comments (can be used in injection)
    /-->/,
  ];

  return xssPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize a single string value.
 * If the string contains XSS vectors, HTML-encode all dangerous characters.
 * Otherwise, return as-is to avoid corrupting legitimate data (e.g. JSON with < signs).
 */
function sanitizeString(value: string): string {
  // Only sanitize if we detect XSS patterns — avoid over-sanitization
  if (containsXSSVector(value)) {
    return value.replace(DANGEROUS_PATTERN, (char) => HTML_ESCAPE_MAP[char] || char);
  }
  return value;
}

/**
 * Deep-sanitize any value (string, array, object, or primitive).
 * Recursively walks the data structure and sanitizes all string values.
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  // Numbers, booleans, null, undefined — pass through
  return value;
}

/**
 * Input Sanitization Middleware
 * Sanitizes all incoming request body, query parameters, and URL parameters
 * to prevent XSS attacks. Only sanitates strings that contain XSS vectors
 * to avoid corrupting legitimate data.
 *
 * This middleware is safe to apply globally — it does not modify data that
 * doesn't contain dangerous patterns.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize request body (POST/PUT/PATCH)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as any;
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as any;
  }

  next();
}

/**
 * Strict Sanitization Middleware (for specific routes)
 * More aggressive — strips ALL HTML tags from string values.
 * Use for fields that should never contain HTML (names, phone numbers, etc.)
 */
export function stripHtml(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = stripAllHtml(req.body);
  }
  next();
}

function stripAllHtml(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(item => stripAllHtml(item));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = stripAllHtml(val);
    }
    return result;
  }
  return value;
}
