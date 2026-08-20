import { prisma } from '../db.js';
import { Request } from 'express';

/**
 * Centralized Audit Log Service
 *
 * Persists structured audit entries to the `AuditLog` table via Prisma.
 * Provides helper functions for common audit actions and an Express middleware
 * that automatically logs state-changing API requests.
 *
 * Usage:
 *   import { auditLog } from '../services/audit.service.js';
 *   await auditLog(req, { action: 'create', entity: 'contact', entityId: contact.id });
 */

export interface AuditLogEntry {
  action: string;           // create, update, delete, login, logout, export, import, etc.
  entity: string;           // contact, campaign, product, invoice, etc.
  entityId?: string;        // ID of the affected entity
  oldValues?: Record<string, unknown>;  // Previous state (for updates/deletes)
  newValues?: Record<string, unknown>;  // New state (for creates/updates)
  description?: string;     // Human-readable description
  businessId?: string;      // Business tenant (auto-extracted from req if not provided)
  userId?: string;          // Actor (auto-extracted from req if not provided)
  userEmail?: string;       // Actor email (auto-extracted from req if not provided)
  ipAddress?: string;       // Client IP (auto-extracted from req if not provided)
  userAgent?: string;       // Client user-agent (auto-extracted from req if not provided)
}

/**
 * Write an audit log entry to the database.
 * Automatically extracts businessId, userId, userEmail, ipAddress, userAgent from `req` if not provided.
 * Fire-and-forget: errors are logged but never thrown (audit should never block the request).
 */
export async function auditLog(
  req: Request | null | undefined,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const authReq = req as any;

    const businessId = entry.businessId || authReq?.user?.businessId;
    if (!businessId) {
      // Can't write audit log without a business context
      console.warn('Audit log skipped: no businessId available');
      return;
    }

    const ipAddress = entry.ipAddress
      || (req && (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim())
      || req?.ip
      || null;

    await prisma.auditLog.create({
      data: {
        businessId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        oldValues: (entry.oldValues as any) || undefined,
        newValues: (entry.newValues as any) || undefined,
        description: entry.description || null,
        userId: entry.userId || authReq?.user?.id || null,
        userEmail: entry.userEmail || authReq?.user?.email || null,
        ipAddress,
        userAgent: entry.userAgent || req?.headers['user-agent'] || null,
      },
    });
  } catch (error: any) {
    // Audit log is non-critical — never block the request
    console.error('Audit log write failed:', error.message);
  }
}

/**
 * Express middleware that automatically logs state-changing API requests (POST/PUT/PATCH/DELETE).
 *
 * Usage:
 *   import { auditMiddleware } from '../services/audit.service.js';
 *   app.use('/api', auditMiddleware);
 *
 * The middleware captures:
 * - Request method → action (POST→create, PUT/PATCH→update, DELETE→delete)
 * - URL path → entity (e.g., /contacts → contact, /campaigns → campaign)
 * - Request body → newValues (for create/update)
 * - Response status → only logs successful mutations (2xx)
 *
 * Routes that want custom audit entries can bypass this by setting `res.locals.skipAudit = true`.
 */
export function auditMiddleware(req: Request, res: any, next: () => void): void {
  // Only log state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip auth endpoints (login/register create tokens, not business data)
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  // Capture request data for audit (safe: runs before route handler)
  const method = req.method;
  const path = req.path;

  // Use res.on('finish') to safely capture status after response is sent
  // This avoids wrapping res.json and potential conflicts with other middleware
  res.on('finish', () => {
    if (res.locals?.skipAudit) return;

    // Only log successful mutations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = method === 'DELETE' ? 'delete'
        : method === 'POST' ? 'create'
        : 'update';

      // Extract entity name from path: /contacts → contact, /crm-invoices → crm-invoices
      const pathParts = path.split('/').filter(Boolean);
      const rawEntity = pathParts[0] || 'unknown';
      const entity = singularize(rawEntity);

      // Extract entity ID from path if present (e.g., /contacts/:id)
      const entityId = pathParts.length > 1 ? pathParts[1] : undefined;

      // Fire-and-forget audit write
      auditLog(req, {
        action,
        entity,
        entityId,
        newValues: action !== 'delete' ? sanitizeBody(req.body) : undefined,
        description: `${method} /api/${rawEntity}`,
      });
    }
  });

  next();
}

/**
 * Attempt to singularize a plural entity name for the audit log.
 * Handles hyphenated names like "sms-marketing" → "sms-marketing",
 * and simple plurals like "contacts" → "contact".
 */
function singularize(name: string): string {
  // Don't try to singularize hyphenated compound names
  if (name.includes('-')) return name;
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses')) return name.slice(0, -2);
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

/**
 * Sanitize request body for audit storage — strip sensitive fields and limit size.
 */
function sanitizeBody(body: any): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;

  const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken', 'otp'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Truncate very large values
    if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
