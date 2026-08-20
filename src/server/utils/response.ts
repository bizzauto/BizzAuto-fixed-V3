import { Response } from 'express';

/**
 * Standardized API response helpers
 * Use these consistently across all routes for uniform response format
 */

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Send success response
 */
export function success(res: Response, data: any, message?: string): void {
  const response: any = { success: true, data };
  if (message) response.message = message;
  res.json(response);
}

/**
 * Send error response
 */
export function error(res: Response, statusCode: number, message: string, details?: string): void {
  const response: any = { success: false, error: message };
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  res.status(statusCode).json(response);
}

/**
 * Send paginated success response
 */
export function paginate(res: Response, data: any, pagination: PaginationMeta): void {
  res.json({ success: true, data, pagination });
}

/**
 * Build pagination meta from query params and total count
 */
export function buildPagination(total: number, page: number | string, limit: number | string): PaginationMeta {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

/**
 * Parse and validate pagination params from request query
 */
export function getPaginationParams(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
