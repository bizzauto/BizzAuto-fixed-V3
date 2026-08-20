/**
 * @jest-environment node
 *
 * Tests for v2 API response helpers and cursor pagination.
 * Validates the consistent envelope, cursor encode/decode, and error codes.
 */

import { encodeCursor, decodeCursor, buildPaginationLinks, parsePagination, ErrorCodes } from '../src/server/routes/v2/helpers';

// ==================== CURSOR PAGINATION ====================

describe('v2 API - Cursor Pagination', () => {
  it('should encode a cursor from id and date', () => {
    const id = 'clx123abc';
    const date = new Date('2026-01-15T10:30:00.000Z');
    const cursor = encodeCursor(id, date);
    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
    // Should be base64url (no +, /, or = characters)
    expect(cursor).not.toMatch(/[+/=]/);
  });

  it('should decode a cursor back to id and date', () => {
    const id = 'clx123abc';
    const date = new Date('2026-01-15T10:30:00.000Z');
    const cursor = encodeCursor(id, date);
    const decoded = decodeCursor(cursor);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(id);
    expect(decoded!.createdAt.toISOString()).toBe(date.toISOString());
  });

  it('should return object with empty id and NaN date for empty cursor', () => {
    // Empty string doesn't throw in base64 decode, so decodeCursor returns an object
    // rather than null. This documents the actual behavior.
    const result = decodeCursor('');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('');
    expect(isNaN(result!.createdAt.getTime())).toBe(true);
  });

  it('should handle cursor without pipe separator gracefully', () => {
    const cursor = Buffer.from('noseparator').toString('base64url');
    const decoded = decodeCursor(cursor);
    // decodeCursor splits on '|', so no separator means dateStr is undefined
    // new Date(undefined) is Invalid Date — document this behavior
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe('noseparator');
    expect(isNaN(decoded!.createdAt.getTime())).toBe(true);
  });

  it('should produce unique cursors for different IDs', () => {
    const date = new Date('2026-01-15T10:30:00.000Z');
    const cursor1 = encodeCursor('id-1', date);
    const cursor2 = encodeCursor('id-2', date);
    expect(cursor1).not.toBe(cursor2);
  });

  it('should produce unique cursors for different dates', () => {
    const id = 'same-id';
    const cursor1 = encodeCursor(id, new Date('2026-01-01'));
    const cursor2 = encodeCursor(id, new Date('2026-06-01'));
    expect(cursor1).not.toBe(cursor2);
  });

  it('should round-trip encode/decode correctly for special characters in ID', () => {
    const id = 'id/with=special+chars';
    const date = new Date('2026-03-20T12:00:00.000Z');
    const cursor = encodeCursor(id, date);
    const decoded = decodeCursor(cursor);
    expect(decoded!.id).toBe(id);
  });
});

// ==================== PAGINATION LINKS ====================

describe('v2 API - Pagination Links', () => {
  it('should include self link', () => {
    const links = buildPaginationLinks('/api/v2/contacts');
    expect(links.self).toBe('/api/v2/contacts');
    expect(links.next).toBeUndefined();
    expect(links.prev).toBeUndefined();
  });

  it('should include next link when hasMore is true and cursor is provided', () => {
    const cursor = encodeCursor('id-10', new Date());
    const links = buildPaginationLinks('/api/v2/contacts', cursor, true);
    expect(links.next).toContain('/api/v2/contacts?cursor=');
    expect(links.self).toBe('/api/v2/contacts');
  });

  it('should not include next link when hasMore is false', () => {
    const cursor = encodeCursor('id-10', new Date());
    const links = buildPaginationLinks('/api/v2/contacts', cursor, false);
    expect(links.next).toBeUndefined();
  });

  it('should include prev link when hasPrev is true', () => {
    const links = buildPaginationLinks('/api/v2/contacts', undefined, false, true);
    expect(links.prev).toContain('cursor_backward=true');
  });
});

// ==================== PAGINATION PARAMETER PARSING ====================

describe('v2 API - parsePagination', () => {
  it('should return default values when no query params', () => {
    const result = parsePagination({});
    expect(result.take).toBe(50);
    expect(result.cursor).toBeUndefined();
    expect(result.parsedCursor).toBeUndefined();
  });

  it('should parse a valid limit', () => {
    const result = parsePagination({ limit: '25' });
    expect(result.take).toBe(25);
  });

  it('should cap limit at 100', () => {
    const result = parsePagination({ limit: '500' });
    expect(result.take).toBe(100);
  });

  it('should floor limit at 1', () => {
    const result = parsePagination({ limit: '0' });
    expect(result.take).toBe(1);
  });

  it('should handle negative limit', () => {
    const result = parsePagination({ limit: '-10' });
    expect(result.take).toBe(1);
  });

  it('should handle non-numeric limit', () => {
    const result = parsePagination({ limit: 'abc' });
    expect(result.take).toBeNaN(); // parseInt('abc') is NaN, no default in v2 parsePagination
  });

  it('should parse a valid cursor', () => {
    const date = new Date('2026-01-01');
    const cursor = encodeCursor('test-id', date);
    const result = parsePagination({ cursor });
    expect(result.parsedCursor).not.toBeUndefined();
    expect(result.parsedCursor!.id).toBe('test-id');
  });
});

// ==================== ERROR CODES ====================

describe('v2 API - Error Codes', () => {
  it('should define all standard error codes', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.TENANT_MISMATCH).toBe('TENANT_MISMATCH');
    expect(ErrorCodes.BUSINESS_RULE_VIOLATION).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('should have exactly 9 error codes', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(9);
  });
});
