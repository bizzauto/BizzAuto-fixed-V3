/**
 * @jest-environment node
 *
 * End-to-end integration tests for the Auth API (login & register flows).
 *
 * These tests use supertest to make real HTTP requests against the Express
 * router with the full middleware stack (JSON parsing, etc.) while mocking
 * Prisma, auth utilities, and ancillary services to isolate the auth logic.
 *
 * Auth endpoints tested:
 *   POST /api/auth/register  — user registration with business creation
 *   POST /api/auth/login     — email/password login with optional 2FA
 *   GET  /api/auth/me        — authenticated profile retrieval (via JWT)
 */

import express from 'express';
import request from 'supertest';

// ─── Mock Dependencies ───────────────────────────────────────────────────────
// All jest.mock calls MUST be at the top level so Jest hoists them above imports.

const mockUserFixture = {
  id: 'user-abc-123',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed_password_xyz',
  role: 'OWNER',
  businessId: 'biz-456',
  twoFactorEnabled: false,
  isActive: true,
  image: null,
  googleId: null,
  appleId: null,
  lastLoginAt: null,
  phone: null,
  emailVerified: null,
  isVerified: false,
  twoFactorSecret: null,
  twoFactorBackupCodes: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockBusinessFixture = {
  id: 'biz-456',
  name: "Test User's Business",
  type: 'general',
  plan: 'FREE',
  planStartedAt: new Date('2025-01-01'),
  planExpiresAt: new Date('2025-01-15'),
  phone: null,
  city: null,
  aiCreditsUsed: 0,
  aiCreditsLimit: 100,
};

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  business: {
    create: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('../src/server/db', () => ({
  prisma: mockPrisma,
}));

// ── Auth utilities mock ──────────────────────────────────────────────────────
jest.mock('../src/server/utils/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password_xyz'),
  comparePassword: jest.fn(),
  generateToken: jest.fn().mockReturnValue('mock_jwt_token_abc123'),
  generateRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
  verifyToken: jest.fn().mockReturnValue({
    id: 'user-abc-123',
    email: 'test@example.com',
    businessId: 'biz-456',
    role: 'OWNER',
  }),
  getJwtSecret: jest.fn().mockReturnValue('test-secret'),
  encrypt: jest.fn().mockReturnValue('encrypted_data'),
  decrypt: jest.fn().mockReturnValue('decrypted_data'),
}));

// ── Disable rate limiting for tests ──────────────────────────────────────────
jest.mock('express-rate-limit', () => ({
  default: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  __esModule: true,
}));

// ── JSON Web Token mock (used by authenticate middleware) ────────────────────
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({
    id: 'user-abc-123',
    email: 'test@example.com',
    businessId: 'biz-456',
    role: 'OWNER',
  }),
  sign: jest.fn().mockReturnValue('mock_jwt_token_abc123'),
  decode: jest.fn(),
}));

// ── TwoFactorService mock (dynamically imported in login handler) ─────────────
jest.mock('../src/server/services/twoFactor.service', () => ({
  TwoFactorService: {
    verifyToken: jest.fn().mockResolvedValue(true),
    generateSecret: jest.fn(),
    verifyAndEnable: jest.fn(),
    getStatus: jest.fn(),
    disable: jest.fn(),
  },
}));

// ── CSRF Service mock (dynamically imported in authenticate middleware) ──────
jest.mock('../src/server/services/csrf.service', () => ({
  CSRFService: {
    generateToken: jest.fn().mockResolvedValue('csrf-token-xyz'),
    getToken: jest.fn().mockResolvedValue('csrf-token-xyz'),
  },
}));

// ── Trap setInterval calls (auth.ts OTP cleanup) so we can clean them up ─────
const intervalIds: ReturnType<typeof setInterval>[] = [];
const originalSetInterval = global.setInterval;
global.setInterval = ((fn: any, ms: number, ...args: any[]) => {
  const id = originalSetInterval(fn, ms, ...args);
  intervalIds.push(id);
  return id;
}) as typeof global.setInterval;

// Import the router AFTER all mocks are set up
import authRoutes from '../src/server/routes/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

function resetMocks(): void {
  jest.clearAllMocks();

  // Re-apply default mock implementations
  const {
    hashPassword, comparePassword, generateToken, verifyToken,
  } = jest.requireMock('../src/server/utils/auth');
  hashPassword.mockResolvedValue('hashed_password_xyz');
  comparePassword.mockReset();
  generateToken.mockReturnValue('mock_jwt_token_abc123');
  verifyToken.mockReturnValue({
    id: 'user-abc-123',
    email: 'test@example.com',
    businessId: 'biz-456',
    role: 'OWNER',
  });

  const { TwoFactorService } =
    jest.requireMock('../src/server/services/twoFactor.service');
  TwoFactorService.verifyToken.mockResolvedValue(true);

  const { CSRFService } =
    jest.requireMock('../src/server/services/csrf.service');
  CSRFService.generateToken.mockResolvedValue('csrf-token-xyz');
  CSRFService.getToken.mockResolvedValue('csrf-token-xyz');
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

afterAll(() => {
  // Clear the OTP cleanup interval from auth.ts so Jest can exit cleanly
  for (const id of intervalIds) {
    clearInterval(id);
  }
  intervalIds.length = 0;
  global.setInterval = originalSetInterval;
});

// ─── REGISTER FLOW ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    resetMocks();
  });

  const validPayload = {
    email: 'newuser@example.com',
    password: 'StrongPass1',
    name: 'New User',
    businessName: 'New Business',
    businessType: 'general',
  };

  it('should register a new user and create a business', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.business.create.mockResolvedValue(mockBusinessFixture);
    mockPrisma.user.create.mockResolvedValue({
      ...mockUserFixture,
      email: 'newuser@example.com',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token', 'mock_jwt_token_abc123');
    expect(res.body.data.user).toMatchObject({
      email: 'newuser@example.com',
      role: 'OWNER',
    });
    expect(res.body.data.business).toMatchObject({
      name: mockBusinessFixture.name,
      plan: 'FREE',
    });

    // Verify business was created with FREE plan + 14-day trial
    expect(mockPrisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Business',
          plan: 'FREE',
        }),
      }),
    );
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('should reject registration with missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@example.com' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  it('should reject registration with missing business name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nobiz@example.com', password: 'Test1234', name: 'No Biz' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(mockPrisma.business.create).not.toHaveBeenCalled();
  });

  it('should reject duplicate email registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUserFixture);

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User already exists');
    expect(mockPrisma.business.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('should default businessType to "general" when not provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.business.create.mockResolvedValue(mockBusinessFixture);
    mockPrisma.user.create.mockResolvedValue({
      ...mockUserFixture,
      email: 'newuser@example.com',
    });

    const payload = { ...validPayload };
    delete (payload as any).businessType;

    await request(app)
      .post('/api/auth/register')
      .send(payload)
      .expect(201);

    expect(mockPrisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'general',
        }),
      }),
    );
  });

  it('should hash the password before storing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.business.create.mockResolvedValue(mockBusinessFixture);
    mockPrisma.user.create.mockResolvedValue({
      ...mockUserFixture,
      email: 'newuser@example.com',
    });

    await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(201);

    const { hashPassword } = jest.requireMock('../src/server/utils/auth');
    expect(hashPassword).toHaveBeenCalledWith('StrongPass1');

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: 'hashed_password_xyz',
        }),
      }),
    );
  });

  it('should assign OWNER role to the registered user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.business.create.mockResolvedValue(mockBusinessFixture);
    mockPrisma.user.create.mockResolvedValue({
      ...mockUserFixture,
      email: 'newuser@example.com',
    });

    await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(201);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'OWNER',
        }),
      }),
    );
  });

  it('should return 500 when database create fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.business.create.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Failed to register');
  });
});

// ─── LOGIN FLOW ──────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    resetMocks();
    // Default: user exists, password matches
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      business: mockBusinessFixture,
    });
    const { comparePassword } = jest.requireMock('../src/server/utils/auth');
    comparePassword.mockResolvedValue(true);
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'CorrectPass1' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token', 'mock_jwt_token_abc123');
    expect(res.body.data.user).toMatchObject({
      email: 'test@example.com',
      role: 'OWNER',
      twoFactorEnabled: false,
    });
    expect(res.body.data.business).toMatchObject({
      name: mockBusinessFixture.name,
      plan: 'FREE',
    });

    // Verify lastLoginAt was updated
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-abc-123' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should reject login with wrong password', async () => {
    const { comparePassword } = jest.requireMock('../src/server/utils/auth');
    comparePassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPass1' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('should reject login with non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'SomePass1' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('should reject login with missing email or password', async () => {
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ password: 'SomePass1' })
      .expect(400);
    expect(res1.body.error).toBe('Validation failed');

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' })
      .expect(400);
    expect(res2.body.error).toBe('Validation failed');

    const res3 = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);
    expect(res3.body.error).toBe('Validation failed');
  });

  it('should return 401 if user has no password set (social-only account)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      password: null,
      business: mockBusinessFixture,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'social@example.com', password: 'AnyPass1' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('should require 2FA when user has twoFactorEnabled', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      twoFactorEnabled: true,
      business: mockBusinessFixture,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'CorrectPass1' })
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.requiresTwoFactor).toBe(true);
    expect(res.body).toHaveProperty('userId');
    expect(res.body.message).toContain('Two-factor authentication required');
    // Token should NOT be issued when 2FA is pending
    expect(res.body.data).toBeUndefined();
  });

  it('should proceed with login when valid 2FA token is provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      twoFactorEnabled: true,
      business: mockBusinessFixture,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'CorrectPass1',
        twoFactorToken: '123456',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');

    const { TwoFactorService } =
      jest.requireMock('../src/server/services/twoFactor.service');
    expect(TwoFactorService.verifyToken).toHaveBeenCalledWith('user-abc-123', '123456');
  });

  it('should reject login with invalid 2FA token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      twoFactorEnabled: true,
      business: mockBusinessFixture,
    });

    const { TwoFactorService } =
      jest.requireMock('../src/server/services/twoFactor.service');
    TwoFactorService.verifyToken.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'CorrectPass1',
        twoFactorToken: '000000',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid two-factor');
  });

  it('should handle suspended/blocked accounts at the authn level', async () => {
    // Login route checks authentication (password correctness), not authorization.
    // Suspension is enforced by the `authenticate` middleware on protected routes.
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      isActive: false,
      business: mockBusinessFixture,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'suspended@example.com', password: 'CorrectPass1' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should pass correct payload to generateToken on success', async () => {
    const { generateToken } = jest.requireMock('../src/server/utils/auth');

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'CorrectPass1' })
      .expect(200);

    expect(generateToken).toHaveBeenCalledWith({
      id: 'user-abc-123',
      email: 'test@example.com',
      businessId: 'biz-456',
      role: 'OWNER',
    });
  });

  it('should return 500 when database query fails during login', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB timeout'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'CorrectPass1' })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Failed to login');
  });
});

// ─── AUTHENTICATED PROFILE ───────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let app: express.Application;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    resetMocks();
  });

  it('should return 401 without authentication token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Authentication required');
  });

  it('should return the authenticated user profile with a valid JWT', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      business: mockBusinessFixture,
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid_jwt_token_string')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: 'test@example.com',
      role: 'OWNER',
    });
    expect(res.body.data.business).toMatchObject({
      name: mockBusinessFixture.name,
      plan: 'FREE',
    });
  });

  it('should reject expired JWT token', async () => {
    const { verifyToken } = jest.requireMock('../src/server/utils/auth');
    verifyToken.mockImplementation(() => {
      const err: any = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer expired_jwt_token')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid token');
  });

  it('should reject invalid JWT token', async () => {
    const { verifyToken } = jest.requireMock('../src/server/utils/auth');
    verifyToken.mockImplementation(() => {
      const err: any = new Error('invalid signature');
      err.name = 'JsonWebTokenError';
      throw err;
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid token');
  });

  it('should include CSRF token header on successful auth', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUserFixture,
      business: mockBusinessFixture,
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid_jwt_token_string')
      .expect(200);

    expect(res.headers['x-csrf-token']).toBe('csrf-token-xyz');
  });
});
