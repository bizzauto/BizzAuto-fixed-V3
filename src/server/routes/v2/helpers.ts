import { Response } from 'express';

/**
 * V2 API Response Helpers
 * 
 * Breaking changes from v1:
 * 1. Consistent response envelope: { data, meta, links }
 * 2. Cursor-based pagination instead of offset
 * 3. Standard error format: { error: { code, message, details? } }
 * 4. All dates returned as ISO 8601 strings
 * 5. Null fields explicitly included (no omitted keys)
 * 6. Rate limit headers on every response
 */

// ==================== RESPONSE ENVELOPE ====================

interface PaginationMeta {
  cursor?: string;
  hasMore: boolean;
  limit: number;
}

interface ResponseLinks {
  self: string;
  next?: string;
  prev?: string;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    requestId?: string;
    pagination?: PaginationMeta;
    version: string;
  };
  links?: ResponseLinks;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    requestId?: string;
    version: string;
  };
}

/**
 * Send a successful response with v2 envelope.
 */
export function sendSuccess<T>(res: Response, data: T, options?: {
  pagination?: PaginationMeta;
  links?: ResponseLinks;
  requestId?: string;
  statusCode?: number;
}): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: options?.requestId,
      version: 'v2',
      ...(options?.pagination && { pagination: options.pagination }),
    },
    ...(options?.links && { links: options.links }),
  };

  res.status(options?.statusCode || 200).json(response);
}

/**
 * Send a created response (201).
 */
export function sendCreated<T>(res: Response, data: T, options?: {
  requestId?: string;
}): void {
  sendSuccess(res, data, { statusCode: 201, ...options });
}

/**
 * Send a no-content response (204).
 */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/**
 * Send a standard error response.
 */
export function sendError(res: Response, options: {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
  requestId?: string;
}): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: options.code,
      message: options.message,
      ...(options.details && { details: options.details }),
    },
    meta: {
      requestId: options.requestId,
      version: 'v2',
    },
  };

  res.status(options.statusCode || 500).json(response);
}

// ==================== CURSOR PAGINATION ====================

/**
 * Encode a cursor from an ID and timestamp.
 * Cursors are opaque strings — clients should not parse them.
 */
export function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(`${id}|${createdAt.toISOString()}`).toString('base64url');
}

/**
 * Decode a cursor back to ID and timestamp.
 */
export function decodeCursor(cursor: string): { id: string; createdAt: Date } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [id, dateStr] = decoded.split('|');
    return { id, createdAt: new Date(dateStr) };
  } catch {
    return null;
  }
}

/**
 * Build pagination links for cursor-based pagination.
 */
export function buildPaginationLinks(
  basePath: string,
  cursor?: string,
  hasMore?: boolean,
  hasPrev?: boolean
): ResponseLinks {
  const links: ResponseLinks = { self: basePath };
  if (hasMore && cursor) {
    links.next = `${basePath}?cursor=${cursor}`;
  }
  if (hasPrev) {
    links.prev = `${basePath}?cursor_backward=true`;
  }
  return links;
}

/**
 * Parse and validate pagination parameters.
 */
export function parsePagination(query: {
  cursor?: string;
  limit?: string;
}): { cursor?: string; take: number; parsedCursor?: { id: string; createdAt: Date } } {
  const take = Math.min(Math.max(parseInt(query.limit || '50'), 1), 100);
  const cursor = query.cursor;
  const parsedCursor = cursor ? decodeCursor(cursor) ?? undefined : undefined;
  return { cursor, take, parsedCursor };
}

// ==================== STANDARD ERROR CODES ====================

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
} as const;
