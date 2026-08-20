/**
 * @jest-environment node
 *
 * Tests for the shared pagination utility.
 * Validates hard limits, defaults, and edge cases.
 */

import { parsePagination, paginatedResponse } from '../src/server/utils/pagination';

// ==================== parsePagination ====================

describe('Shared Pagination - parsePagination', () => {
  it('should return defaults when no query params', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('should parse valid page and limit', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.take).toBe(10);
    expect(result.skip).toBe(20); // (3-1) * 10
  });

  it('should cap limit at MAX_LIMIT (100)', () => {
    const result = parsePagination({ limit: '500' });
    expect(result.limit).toBe(100);
    expect(result.take).toBe(100);
  });

  it('should enforce custom maxLimit', () => {
    const result = parsePagination({ limit: '100' }, { maxLimit: 50 });
    expect(result.limit).toBe(50);
  });

  it('should floor limit at 1', () => {
    // limit 0 is < 1, so it falls back to DEFAULT_LIMIT (20)
    const result = parsePagination({ limit: '0' });
    expect(result.limit).toBe(20);
  });

  it('should floor page at 1', () => {
    const result = parsePagination({ page: '0' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('should handle negative page', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('should handle NaN page', () => {
    const result = parsePagination({ page: 'abc' });
    expect(result.page).toBe(1);
  });

  it('should handle NaN limit', () => {
    const result = parsePagination({ limit: 'xyz' });
    expect(result.limit).toBe(20); // default
  });

  it('should handle negative limit by falling back to default', () => {
    // -10 < 1, so it falls back to DEFAULT_LIMIT (20)
    const result = parsePagination({ limit: '-10' });
    expect(result.limit).toBe(20);
  });

  it('should compute correct skip for large pages', () => {
    const result = parsePagination({ page: '100', limit: '50' });
    expect(result.skip).toBe(4950); // (100-1) * 50
  });

  it('should handle page 1 with limit 1', () => {
    const result = parsePagination({ page: '1', limit: '1' });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(1);
  });
});

// ==================== paginatedResponse ====================

describe('Shared Pagination - paginatedResponse', () => {
  it('should build a standard paginated response', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = paginatedResponse(data, 50, { skip: 0, take: 20, page: 1, limit: 20 });
    expect(result.data).toEqual(data);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.totalPages).toBe(3); // ceil(50/20)
  });

  it('should handle empty data', () => {
    const result = paginatedResponse([], 0, { skip: 0, take: 20, page: 1, limit: 20 });
    expect(result.data).toEqual([]);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('should compute totalPages correctly for exact division', () => {
    const result = paginatedResponse([1, 2, 3], 9, { skip: 0, take: 3, page: 1, limit: 3 });
    expect(result.pagination.totalPages).toBe(3);
  });

  it('should compute totalPages correctly for partial last page', () => {
    const result = paginatedResponse([1, 2], 7, { skip: 0, take: 3, page: 1, limit: 3 });
    expect(result.pagination.totalPages).toBe(3); // ceil(7/3)
  });

  it('should handle single item pages', () => {
    const result = paginatedResponse([{ id: '5' }], 100, { skip: 4, take: 1, page: 5, limit: 1 });
    expect(result.pagination.totalPages).toBe(100);
    expect(result.pagination.page).toBe(5);
  });
});
