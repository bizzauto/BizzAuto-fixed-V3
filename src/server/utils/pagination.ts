/**
 * Pagination utility — enforces safe defaults and hard limits on page/limit params.
 *
 * Usage:
 *   import { parsePagination } from '../utils/pagination.js';
 *   const { skip, take, page, limit } = parsePagination(req.query);
 *
 * Guarantees:
 *   - page >= 1
 *   - limit between 1 and MAX_LIMIT (default 100)
 *   - skip is correctly computed from page and limit
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Parse and validate pagination query parameters.
 * Rejects NaN, negative, and excessively large values.
 */
export function parsePagination(
  query: Record<string, any>,
  options?: { maxLimit?: number }
): PaginationParams {
  const maxLimit = options?.maxLimit ?? MAX_LIMIT;

  let page = parseInt(query.page as string, 10);
  let limit = parseInt(query.limit as string, 10);

  // Sanitize: NaN → defaults, negative → 1
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;

  // Cap to hard limit
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Build a standard paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) {
  return {
    data,
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}
