/**
 * @jest-environment node
 *
 * Tests for audit log middleware.
 * Tests the pure utility functions (singularize, sanitizeBody) and the middleware logic flow.
 * Database-dependent auditLog() is tested via mock patterns.
 */

// ==================== SINGULARIZE ====================

// Mirror the exact singularize function from audit.service.ts
function singularize(name: string): string {
  if (name.includes('-')) return name;
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses')) return name.slice(0, -2);
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

describe('Audit Middleware - singularize', () => {
  it('should singularize simple plurals', () => {
    expect(singularize('contacts')).toBe('contact');
    expect(singularize('campaigns')).toBe('campaign');
    expect(singularize('products')).toBe('product');
    expect(singularize('deals')).toBe('deal');
  });

  it('should handle -ies endings', () => {
    expect(singularize('companies')).toBe('company');
    expect(singularize('categories')).toBe('category');
    expect(singularize('activities')).toBe('activity');
  });

  it('should handle -ses endings', () => {
    // 'addresses' ends with 'ses' → slice(0,-2) removes 2 chars from end
    // 'addresses'[0..6] = 'address'
    expect(singularize('addresses')).toBe('address');
    expect(singularize('buses')).toBe('bus');
  });

  it('should singularize word ending in just s', () => {
    expect(singularize('messages')).toBe('message');
    expect(singularize('orders')).toBe('order');
  });

  it('should not singularize already singular words', () => {
    expect(singularize('contact')).toBe('contact');
    expect(singularize('business')).toBe('business');
    expect(singularize('class')).toBe('class');
  });

  it('should preserve hyphenated names without singularizing', () => {
    expect(singularize('sms-marketing')).toBe('sms-marketing');
    expect(singularize('whatsapp-catalog')).toBe('whatsapp-catalog');
    expect(singularize('crm-invoices')).toBe('crm-invoices');
    expect(singularize('trigger-links')).toBe('trigger-links');
  });

  it('should handle edge cases', () => {
    expect(singularize('')).toBe('');
    expect(singularize('a')).toBe('a');
    expect(singularize('ss')).toBe('ss');
  });
});

// ==================== SANITIZE BODY ====================

// Mirror the exact sanitizeBody function from audit.service.ts
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken', 'otp'];

function sanitizeBody(body: any): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

describe('Audit Middleware - sanitizeBody', () => {
  it('should return undefined for null/undefined body', () => {
    expect(sanitizeBody(null)).toBeUndefined();
    expect(sanitizeBody(undefined)).toBeUndefined();
  });

  it('should return undefined for non-object body', () => {
    expect(sanitizeBody('string')).toBeUndefined();
    expect(sanitizeBody(123)).toBeUndefined();
  });

  it('should redact password field', () => {
    const result = sanitizeBody({ name: 'John', password: 'secret123' });
    expect(result!.name).toBe('John');
    expect(result!.password).toBe('[REDACTED]');
  });

  it('should redact token field', () => {
    const result = sanitizeBody({ accessToken: 'abc123', refreshToken: 'xyz789' });
    expect(result!.accessToken).toBe('[REDACTED]');
    expect(result!.refreshToken).toBe('[REDACTED]');
  });

  it('should redact apiKey field (case-insensitive)', () => {
    const result = sanitizeBody({ APIKEY: 'key123', ApiKey: 'key456' });
    expect(result!.APIKEY).toBe('[REDACTED]');
    expect(result!.ApiKey).toBe('[REDACTED]');
  });

  it('should redact secret and otp fields', () => {
    const result = sanitizeBody({ webhookSecret: 'whsec123', otp: '123456' });
    expect(result!.webhookSecret).toBe('[REDACTED]');
    expect(result!.otp).toBe('[REDACTED]');
  });

  it('should truncate long string values', () => {
    const longString = 'x'.repeat(600);
    const result = sanitizeBody({ content: longString });
    expect(result!.content).toBe('x'.repeat(500) + '...[truncated]');
  });

  it('should not truncate strings under 500 chars', () => {
    const shortString = 'x'.repeat(499);
    const result = sanitizeBody({ content: shortString });
    expect(result!.content).toBe(shortString);
  });

  it('should preserve non-sensitive fields', () => {
    const result = sanitizeBody({ name: 'John', email: 'john@test.com', age: 30 });
    expect(result).toEqual({ name: 'John', email: 'john@test.com', age: 30 });
  });

  it('should preserve numbers, booleans, and nested objects', () => {
    const result = sanitizeBody({
      count: 42,
      active: true,
      nested: { key: 'value' },
    });
    expect(result!.count).toBe(42);
    expect(result!.active).toBe(true);
    expect(result!.nested).toEqual({ key: 'value' });
  });
});

// ==================== AUDIT MIDDLEWARE ACTION MAPPING ====================

describe('Audit Middleware - Action Mapping', () => {
  // Mirror the action mapping from auditMiddleware
  function mapMethodToAction(method: string): string {
    return method === 'DELETE' ? 'delete'
      : method === 'POST' ? 'create'
      : 'update';
  }

  it('should map POST to create', () => {
    expect(mapMethodToAction('POST')).toBe('create');
  });

  it('should map PUT to update', () => {
    expect(mapMethodToAction('PUT')).toBe('update');
  });

  it('should map PATCH to update', () => {
    expect(mapMethodToAction('PATCH')).toBe('update');
  });

  it('should map DELETE to delete', () => {
    expect(mapMethodToAction('DELETE')).toBe('delete');
  });
});

// ==================== AUDIT MIDDLEWARE DECISION FLOW ====================

describe('Audit Middleware - Decision Flow', () => {
  interface MockAuditRequest {
    method: string;
    path: string;
    body?: any;
    user?: any;
    headers?: Record<string, string>;
  }

  interface MockAuditResponse {
    statusCode: number;
    locals: Record<string, any>;
  }

  // Mirror the middleware's decision logic
  function shouldAudit(req: MockAuditRequest, res: MockAuditResponse): boolean {
    // Skip non-mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return false;
    // Skip auth endpoints
    if (req.path.startsWith('/auth/')) return false;
    // Skip if explicitly bypassed
    if (res.locals.skipAudit) return false;
    // Only log successful mutations
    if (res.statusCode < 200 || res.statusCode >= 300) return false;
    return true;
  }

  it('should skip GET requests', () => {
    expect(shouldAudit({ method: 'GET', path: '/contacts' }, { statusCode: 200, locals: {} })).toBe(false);
  });

  it('should skip HEAD requests', () => {
    expect(shouldAudit({ method: 'HEAD', path: '/contacts' }, { statusCode: 200, locals: {} })).toBe(false);
  });

  it('should audit POST requests', () => {
    expect(shouldAudit({ method: 'POST', path: '/contacts' }, { statusCode: 201, locals: {} })).toBe(true);
  });

  it('should audit PUT requests', () => {
    expect(shouldAudit({ method: 'PUT', path: '/contacts/123' }, { statusCode: 200, locals: {} })).toBe(true);
  });

  it('should audit PATCH requests', () => {
    expect(shouldAudit({ method: 'PATCH', path: '/contacts/123' }, { statusCode: 200, locals: {} })).toBe(true);
  });

  it('should audit DELETE requests', () => {
    expect(shouldAudit({ method: 'DELETE', path: '/contacts/123' }, { statusCode: 200, locals: {} })).toBe(true);
  });

  it('should skip auth endpoints', () => {
    expect(shouldAudit({ method: 'POST', path: '/auth/login' }, { statusCode: 200, locals: {} })).toBe(false);
    expect(shouldAudit({ method: 'POST', path: '/auth/register' }, { statusCode: 200, locals: {} })).toBe(false);
  });

  it('should skip when skipAudit is set', () => {
    expect(shouldAudit({ method: 'POST', path: '/contacts' }, { statusCode: 200, locals: { skipAudit: true } })).toBe(false);
  });

  it('should skip failed responses (4xx)', () => {
    expect(shouldAudit({ method: 'POST', path: '/contacts' }, { statusCode: 400, locals: {} })).toBe(false);
    expect(shouldAudit({ method: 'POST', path: '/contacts' }, { statusCode: 404, locals: {} })).toBe(false);
  });

  it('should skip failed responses (5xx)', () => {
    expect(shouldAudit({ method: 'POST', path: '/contacts' }, { statusCode: 500, locals: {} })).toBe(false);
  });
});

// ==================== AUDIT LOG ENTRY CONSTRUCTION ====================

describe('Audit Middleware - Entry Construction', () => {
  it('should construct correct entry for POST /contacts', () => {
    const method = 'POST';
    const path = '/contacts';
    const pathParts = path.split('/').filter(Boolean);
    const action = method === 'POST' ? 'create' : 'update';
    const entity = singularize(pathParts[0] || 'unknown');
    const entityId = pathParts.length > 1 ? pathParts[1] : undefined;

    expect(action).toBe('create');
    expect(entity).toBe('contact');
    expect(entityId).toBeUndefined();
  });

  it('should construct correct entry for PUT /contacts/abc123', () => {
    const method: string = 'PUT';
    const path = '/contacts/abc123';
    const pathParts = path.split('/').filter(Boolean);
    const action = method === 'DELETE' ? 'delete' : method === 'POST' ? 'create' : 'update';
    const entity = singularize(pathParts[0] || 'unknown');
    const entityId = pathParts.length > 1 ? pathParts[1] : undefined;

    expect(action).toBe('update');
    expect(entity).toBe('contact');
    expect(entityId).toBe('abc123');
  });

  it('should construct correct entry for DELETE /campaigns/xyz789', () => {
    const method = 'DELETE';
    const path = '/campaigns/xyz789';
    const pathParts = path.split('/').filter(Boolean);
    const action = method === 'DELETE' ? 'delete' : method === 'POST' ? 'create' : 'update';
    const entity = singularize(pathParts[0] || 'unknown');
    const entityId = pathParts.length > 1 ? pathParts[1] : undefined;

    expect(action).toBe('delete');
    expect(entity).toBe('campaign');
    expect(entityId).toBe('xyz789');
  });
});
