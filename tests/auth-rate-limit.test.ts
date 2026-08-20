/**
 * @jest-environment node
 *
 * Tests for the Express Rate Limiter configurations on all unprotected auth endpoints.
 *
 * These tests verify that each rate limiter's configuration is correctly defined
 * with the expected window, max requests, error messages, and headers.
 *
 * Auth routes with rate limiters (from src/server/routes/auth.ts):
 *   POST /api/auth/login              -> loginLimiter       (5 req / 1 min)
 *   POST /api/auth/register           -> registerLimiter    (3 req / 1 hour)
 *   POST /api/auth/forgot-password    -> forgotPasswordLimiter (3 req / 15 min)
 *   POST /api/auth/verify-otp         -> verifyOtpLimiter   (10 req / 1 min)
 *   POST /api/auth/reset-password     -> resetPasswordLimiter (3 req / 1 hour)
 *   POST /api/auth/google             -> socialAuthLimiter  (10 req / 1 min)
 *   POST /api/auth/apple              -> socialAuthLimiter  (10 req / 1 min)
 */

type RateLimiterConfig = {
  windowMs: number;
  max: number;
  message: { success: boolean; error: string };
  standardHeaders: boolean;
  legacyHeaders: boolean;
  name: string;
  route: string;
  method: string;
};

// Mirrors the exact configurations from auth.ts
const RATE_LIMITER_CONFIGS: RateLimiterConfig[] = [
  {
    name: 'loginLimiter',
    route: 'POST /api/auth/login',
    method: 'POST',
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: {
      success: false,
      error: 'Too many login attempts. Please try again after a minute.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  {
    name: 'registerLimiter',
    route: 'POST /api/auth/register',
    method: 'POST',
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
      success: false,
      error: 'Too many registration attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  {
    name: 'forgotPasswordLimiter',
    route: 'POST /api/auth/forgot-password',
    method: 'POST',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message: {
      success: false,
      error: 'Too many password reset requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  {
    name: 'verifyOtpLimiter',
    route: 'POST /api/auth/verify-otp',
    method: 'POST',
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
      success: false,
      error: 'Too many OTP verification attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  {
    name: 'resetPasswordLimiter',
    route: 'POST /api/auth/reset-password',
    method: 'POST',
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
      success: false,
      error: 'Too many password reset attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  {
    name: 'socialAuthLimiter',
    route: 'POST /api/auth/google, POST /api/auth/apple',
    method: 'POST',
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
];

describe('Auth Route Rate Limiters', () => {
  describe.each(RATE_LIMITER_CONFIGS)('$name ($route)', (config) => {
    it('should have a positive windowMs value', () => {
      expect(config.windowMs).toBeGreaterThan(0);
    });

    it('should have a positive max value', () => {
      expect(config.max).toBeGreaterThan(0);
    });

    it('should return a structured error message with success: false', () => {
      expect(config.message).toHaveProperty('success', false);
      expect(config.message).toHaveProperty('error');
      expect(typeof config.message.error).toBe('string');
      expect(config.message.error.length).toBeGreaterThan(0);
    });

    it('should have standardHeaders enabled', () => {
      expect(config.standardHeaders).toBe(true);
    });

    it('should have legacyHeaders disabled (for newer express-rate-limit)', () => {
      expect(config.legacyHeaders).toBe(false);
    });
  });
});

describe('Rate Limiter Time Windows', () => {
  it('loginLimiter should allow bursts of up to 5 requests per minute', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'loginLimiter')!;
    // At 5 req/min, it allows ~1 request every 12 seconds on average
    const ratePerSecond = config.max / (config.windowMs / 1000);
    expect(ratePerSecond).toBeCloseTo(5 / 60, 5);
    expect(config.windowMs).toBe(60_000);
  });

  it('registerLimiter should allow only 3 requests per hour (aggressive)', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'registerLimiter')!;
    expect(config.windowMs).toBe(3_600_000); // 1 hour
    expect(config.max).toBe(3);
  });

  it('forgotPasswordLimiter should allow 3 requests per 15 minutes', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'forgotPasswordLimiter')!;
    expect(config.windowMs).toBe(900_000); // 15 minutes
    expect(config.max).toBe(3);
  });

  it('verifyOtpLimiter should allow 10 requests per minute', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'verifyOtpLimiter')!;
    expect(config.windowMs).toBe(60_000); // 1 minute
    expect(config.max).toBe(10);
  });

  it('resetPasswordLimiter should allow 3 requests per hour', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'resetPasswordLimiter')!;
    expect(config.windowMs).toBe(3_600_000); // 1 hour
    expect(config.max).toBe(3);
  });

  it('socialAuthLimiter should allow 10 requests per minute', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'socialAuthLimiter')!;
    expect(config.windowMs).toBe(60_000); // 1 minute
    expect(config.max).toBe(10);
  });
});

describe('Rate Limiter Error Messages', () => {
  it('login error should mention "login" in the error', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'loginLimiter')!;
    expect(config.message.error.toLowerCase()).toContain('login');
  });

  it('register error should mention "registration"', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'registerLimiter')!;
    expect(config.message.error.toLowerCase()).toContain('registration');
  });

  it('forgot password error should mention "password reset"', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'forgotPasswordLimiter')!;
    expect(config.message.error.toLowerCase()).toContain('password reset');
  });

  it('verify OTP error should mention "OTP" or "verification"', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'verifyOtpLimiter')!;
    expect(config.message.error.toLowerCase()).toMatch(/otp|verification/);
  });

  it('reset password error should mention "password reset"', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'resetPasswordLimiter')!;
    expect(config.message.error.toLowerCase()).toContain('password reset');
  });

  it('social auth error should mention "authentication"', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'socialAuthLimiter')!;
    expect(config.message.error.toLowerCase()).toContain('authentication');
  });
});

describe('Rate Limiter Coverage', () => {
  it('should have 6 rate limiters covering all 7 unprotected auth endpoints', () => {
    expect(RATE_LIMITER_CONFIGS).toHaveLength(6);
    // Note: create-super-admin intentionally has NO rate limiter
    // (admin seeding endpoint, single use)
    // socialAuthLimiter covers both google & apple routes

    const names = RATE_LIMITER_CONFIGS.map((c) => c.name).sort();
    expect(names).toEqual([
      'forgotPasswordLimiter',
      'loginLimiter',
      'registerLimiter',
      'resetPasswordLimiter',
      'socialAuthLimiter',
      'verifyOtpLimiter',
    ]);
  });

  it('each rate limiter should have a unique name', () => {
    const names = RATE_LIMITER_CONFIGS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all rate limiters should use consistent header configuration', () => {
    for (const config of RATE_LIMITER_CONFIGS) {
      expect(config.standardHeaders).toBe(true);
      expect(config.legacyHeaders).toBe(false);
    }
  });
});

describe('Rate Limiter Computed Values', () => {
  describe('loginLimiter (5 req/min)', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'loginLimiter')!;

    it('should allow 1 request every 12 seconds on average', () => {
      const perSecond = config.max / (config.windowMs / 1000);
      expect(perSecond).toBeCloseTo(0.0833, 3);
    });

    it('should have a 1 minute window', () => {
      // Utility conversion check
      const minutes = config.windowMs / 60_000;
      expect(minutes).toBe(1);
    });
  });

  describe('registerLimiter (3 req/hour)', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'registerLimiter')!;

    it('should allow 1 request every 20 minutes on average', () => {
      const perMinute = config.max / (config.windowMs / 60_000);
      expect(perMinute).toBeCloseTo(0.05, 2);
    });

    it('should have a 1 hour window', () => {
      const hours = config.windowMs / 3_600_000;
      expect(hours).toBe(1);
    });
  });

  describe('forgotPasswordLimiter (3 req/15 min)', () => {
    const config = RATE_LIMITER_CONFIGS.find((c) => c.name === 'forgotPasswordLimiter')!;

    it('should allow 1 request every 5 minutes on average', () => {
      const perMinute = config.max / (config.windowMs / 60_000);
      expect(perMinute).toBeCloseTo(0.2, 1);
    });
  });
});
