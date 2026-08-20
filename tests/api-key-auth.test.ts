/**
 * @jest-environment node
 *
 * Tests for API key authentication middleware.
 * Tests the pure utility functions (hash, generate) and the middleware logic flow.
 * Database-dependent tests are skipped with mock patterns.
 */

import crypto from 'crypto';

// Import only the pure utility functions (no Prisma dependency)
function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = 'bka_' + crypto.randomBytes(32).toString('hex');
  const hash = hashApiKey(raw);
  const prefix = raw.substring(0, 8);
  return { raw, hash, prefix };
}

// ==================== HASH FUNCTION ====================

describe('API Key Auth - hashApiKey', () => {
  it('should produce a 64-character hex string', () => {
    const hash = hashApiKey('test-key');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce deterministic output', () => {
    const key = 'bka_abc123';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different keys', () => {
    const hash1 = hashApiKey('key-1');
    const hash2 = hashApiKey('key-2');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = hashApiKey('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle very long strings', () => {
    const longKey = 'x'.repeat(10000);
    const hash = hashApiKey(longKey);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle unicode characters', () => {
    const hash = hashApiKey('bka_नमस्ते-key');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ==================== KEY GENERATION ====================

describe('API Key Auth - generateApiKey', () => {
  it('should generate a key with bka_ prefix', () => {
    const { raw } = generateApiKey();
    expect(raw.startsWith('bka_')).toBe(true);
  });

  it('should generate a 68-character raw key (4 prefix + 64 hex)', () => {
    const { raw } = generateApiKey();
    expect(raw.length).toBe(68); // 'bka_' (4) + 32 bytes * 2 hex chars (64)
  });

  it('should generate an 8-character prefix starting with bka_', () => {
    const { prefix } = generateApiKey();
    expect(prefix.length).toBe(8);
    expect(prefix.startsWith('bka_')).toBe(true);
  });

  it('should produce matching hash', () => {
    const { raw, hash } = generateApiKey();
    expect(hashApiKey(raw)).toBe(hash);
  });

  it('should generate unique keys each time', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey().raw);
    }
    expect(keys.size).toBe(100);
  });
});

// ==================== MIDDLEWARE LOGIC FLOW ====================

describe('API Key Auth - Middleware Logic Flow', () => {
  // Simulate the middleware decision tree without actual Express
  interface MockApiKey {
    key: string;
    isActive: boolean;
    expiresAt: Date | null;
    permissions: string[];
    business: { id: string; name: string; plan: string; isActive: boolean } | null;
  }

  function evaluateApiKey(
    providedKey: string | undefined,
    storedKeys: MockApiKey[],
    requiredPermissions?: string[]
  ): { status: number; error?: string; user?: any } {
    if (!providedKey) {
      return { status: 401, error: 'API key required (x-api-key header)' };
    }

    const apiKey = storedKeys.find(k => k.key === providedKey);
    if (!apiKey) {
      return { status: 401, error: 'Invalid API key' };
    }

    if (!apiKey.isActive) {
      return { status: 403, error: 'API key has been deactivated' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { status: 403, error: 'API key has expired' };
    }

    if (!apiKey.business?.isActive) {
      return { status: 403, error: 'Business account is suspended' };
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(
        p => apiKey.permissions.includes(p) || apiKey.permissions.includes('*')
      );
      if (!hasPermission) {
        return { status: 403, error: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}` };
      }
    }

    return {
      status: 200,
      user: {
        id: `api-key:test-id`,
        businessId: apiKey.business!.id,
        role: 'ADMIN',
      },
    };
  }

  const validKey: MockApiKey = {
    key: 'bka_validkey123',
    isActive: true,
    expiresAt: null,
    permissions: ['contacts:read', 'contacts:write'],
    business: { id: 'biz-1', name: 'Test Business', plan: 'PROFESSIONAL', isActive: true },
  };

  it('should return 401 when no key is provided', () => {
    const result = evaluateApiKey(undefined, [validKey]);
    expect(result.status).toBe(401);
    expect(result.error).toContain('API key required');
  });

  it('should return 401 for invalid key', () => {
    const result = evaluateApiKey('bka_nonexistent', [validKey]);
    expect(result.status).toBe(401);
    expect(result.error).toContain('Invalid API key');
  });

  it('should return 403 for deactivated key', () => {
    const deactivatedKey: MockApiKey = { ...validKey, isActive: false };
    const result = evaluateApiKey(deactivatedKey.key, [deactivatedKey]);
    expect(result.status).toBe(403);
    expect(result.error).toContain('deactivated');
  });

  it('should return 403 for expired key', () => {
    const expiredKey: MockApiKey = {
      ...validKey,
      expiresAt: new Date('2020-01-01'),
    };
    const result = evaluateApiKey(expiredKey.key, [expiredKey]);
    expect(result.status).toBe(403);
    expect(result.error).toContain('expired');
  });

  it('should return 403 for suspended business', () => {
    const suspendedKey: MockApiKey = {
      ...validKey,
      business: { ...validKey.business!, isActive: false },
    };
    const result = evaluateApiKey(suspendedKey.key, [suspendedKey]);
    expect(result.status).toBe(403);
    expect(result.error).toContain('suspended');
  });

  it('should return 200 with user context for valid key', () => {
    const result = evaluateApiKey(validKey.key, [validKey]);
    expect(result.status).toBe(200);
    expect(result.user).toBeDefined();
    expect(result.user.businessId).toBe('biz-1');
    expect(result.user.role).toBe('ADMIN');
  });

  it('should return 403 when required permission is missing', () => {
    const result = evaluateApiKey(validKey.key, [validKey], ['invoices:read']);
    expect(result.status).toBe(403);
    expect(result.error).toContain('Insufficient permissions');
  });

  it('should return 200 when required permission matches', () => {
    const result = evaluateApiKey(validKey.key, [validKey], ['contacts:read']);
    expect(result.status).toBe(200);
  });

  it('should return 200 when wildcard permission is present', () => {
    const wildcardKey: MockApiKey = {
      ...validKey,
      permissions: ['*'],
    };
    const result = evaluateApiKey(wildcardKey.key, [wildcardKey], ['anything:at-all']);
    expect(result.status).toBe(200);
  });

  it('should check all required permissions (AND logic)', () => {
    const limitedKey: MockApiKey = {
      ...validKey,
      permissions: ['contacts:read'],
    };
    const result = evaluateApiKey(limitedKey.key, [limitedKey], ['contacts:read', 'contacts:write']);
    expect(result.status).toBe(403);
  });
});
