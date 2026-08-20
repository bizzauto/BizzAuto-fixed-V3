import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { hashPassword, comparePassword, generateToken, verifyToken, verifyRefreshToken, getJwtSecret } from '../utils/auth.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { generateRefreshToken } from '../utils/auth.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/auth.js';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validations/schemas.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { revokeAllUserTokens } from '../services/token-blacklist.service.js';
import { recordFailedLoginAttempt, clearFailedLoginAttempts, getLockoutStatus } from '../services/account-lockout.service.js';

const router = Router();

// ==================== RATE LIMITERS ====================
// These must be defined before any route that uses them (const is not hoisted)

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, error: 'Too many login attempts. Please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: { success: false, error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many OTP verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const socialAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Google OAuth Client for verifying ID tokens
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==================== GOOGLE OAUTH REDIRECT FLOW ====================
// GET /api/auth/google/url - Generate Google OAuth URL for redirect
router.get('/google/url', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URL || `https://bizzautoai.com/api/auth/google/callback`;
  const frontendUrl = (req.query.redirect as string) || `${process.env.FRONTEND_URL || 'https://bizzautoai.com'}`;

  if (!clientId) {
    console.warn('[WARN] GOOGLE_CLIENT_ID is not set — Google OAuth login will not work.');
    return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
  }

  const scopes = ['openid', 'email', 'profile'].join(' ');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', frontendUrl);

  res.redirect(url.toString());
});

// GET /api/auth/google/link-url - Generate Google OAuth URL for linking to existing account
router.get('/google/link-url', authenticate, (req: AuthRequest, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URL || `https://bizzautoai.com/api/auth/google/callback`;
  const frontendUrl = (req.query.redirect as string) || `${process.env.FRONTEND_URL || 'https://bizzautoai.com'}`;

  if (!clientId) {
    console.warn('[WARN] GOOGLE_CLIENT_ID is not set — Google OAuth linking will not work.');
    return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.' });
  }

  // Create a JWT with the user's ID and mode=link
  const linkToken = jwt.sign(
    { userId: req.userId, mode: 'link' },
    getJwtSecret(),
    { expiresIn: '10m' }
  );

  const scopes = ['openid', 'email', 'profile'].join(' ');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  // Use base64url encoding for state to avoid : splitting issues
  const statePayload = JSON.stringify({ mode: 'link', token: linkToken, redirect: frontendUrl });
  url.searchParams.set('state', Buffer.from(statePayload).toString('base64url'));

  res.json({ url: url.toString() });
});

// POST /api/auth/google/unlink - Unlink Google account from current user
router.post('/google/unlink', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { googleId: null },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlink Google account' });
  }
});

// GET /api/auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  console.log('[DEBUG] Google callback hit, state:', (req.query.state as string)?.substring(0, 50));
  const stateRaw = req.query.state as string || '';
  const frontendUrlDefault = process.env.FRONTEND_URL || 'https://bizzautoai.com';
  let frontendUrl: string = frontendUrlDefault;
  let linkUserId: string | null = null;
  let isLinkMode = false;

  // Try to parse state as base64url JSON (new format)
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
    if (decoded.mode === 'link' && decoded.token) {
      isLinkMode = true;
      frontendUrl = decoded.redirect || frontendUrlDefault;
      const jwtPayload = jwt.verify(decoded.token, getJwtSecret()) as any;
      linkUserId = jwtPayload.userId;
    }
  } catch {
    // Fallback: not a link-mode state, treat as frontendUrl (login mode)
    frontendUrl = stateRaw || frontendUrlDefault;
  }

  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URL || `https://bizzautoai.com/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error('Google token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenData.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    const { email, name, sub: googleId, picture } = payload;

    // LINK MODE: Link Google account to already logged-in user
    if (isLinkMode && linkUserId) {
      // Check if this Google account is already linked to another user
      const existingGoogleUser = await prisma.user.findFirst({
        where: { googleId, id: { not: linkUserId } },
      });
      if (existingGoogleUser) {
        return res.redirect(`${frontendUrl}/settings?error=google_already_linked`);
      }

      // Check if this email belongs to a different user
      const emailUser = await prisma.user.findFirst({
        where: { email, id: { not: linkUserId } },
      });
      if (emailUser) {
        return res.redirect(`${frontendUrl}/settings?error=email_already_used`);
      }

      // Link Google ID to the current user
      await prisma.user.update({
        where: { id: linkUserId },
        data: { googleId, image: picture || undefined },
      });

      return res.redirect(`${frontendUrl}/settings?success=google_linked`);
    }

    // Find or create user (login/signup mode)
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { business: true },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, image: picture || user.image },
          include: { business: true },
        });
      }
      if (!user.image && picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { image: picture },
          include: { business: true },
        });
      }
    } else {
      const userName = name || email.split('@')[0];
      user = await prisma.user.create({
        data: {
          email,
          name: userName,
          googleId,
          image: picture || null,
          emailVerified: new Date(),
          password: await hashPassword(crypto.randomBytes(32).toString('hex')),
          role: 'OWNER',
        },
        include: { business: true },
      }) as any;

      const business = await prisma.business.create({
        data: {
          name: `${userName}'s Business`,
          type: 'SERVICE',
        },
      });
      user = await prisma.user.update({
        where: { id: user!.id },
        data: { businessId: business.id },
        include: { business: true },
      });
    }

    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      token,
      refreshToken,
      userId: user.id,
      role: user.role || 'OWNER',
      name: user.name || '',
      email: user.email || '',
    });
    if (user.businessId) params.set('businessId', user.businessId);

    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
});

// Apple's JWKS endpoint for token verification
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

// Cache Apple public keys (refreshed on demand)
let appleKeysCache: { keys: any[]; fetchedAt: number } | null = null;

async function getApplePublicKeys(): Promise<any[]> {
  if (appleKeysCache && Date.now() - appleKeysCache.fetchedAt < 3600000) {
    return appleKeysCache.keys;
  }
  try {
    const res = await fetch(APPLE_KEYS_URL);
    const data: any = await res.json();
    appleKeysCache = { keys: data.keys, fetchedAt: Date.now() };
    return data.keys;
  } catch (err) {
    if (appleKeysCache) return appleKeysCache.keys;
    throw err;
  }
}

// POST /api/auth/apple - Apple Sign-In/Sign-Up
router.post('/apple', socialAuthLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Apple credential is required',
      });
    }

    // Decode the token header to get the key ID (kid)
    const decodedHeader: any = jwt.decode(credential, { complete: true })?.header;
    if (!decodedHeader || !decodedHeader.kid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Apple token: missing key ID',
      });
    }

    // Fetch Apple's public keys and find the matching one
    const keys = await getApplePublicKeys();
    const key = keys.find((k: any) => k.kid === decodedHeader.kid);
    if (!key) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Apple token: no matching public key',
      });
    }

    // Build the public key from JWK
    const publicKey = crypto.createPublicKey({
      key: {
        kty: key.kty,
        kid: key.kid,
        alg: key.alg,
        n: key.n,
        e: key.e,
      },
      format: 'jwk',
    });

    // Verify the JWT
    const payload = jwt.verify(credential, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID,
    }) as jwt.JwtPayload;

    const email = payload.email || `${payload.sub}@privaterelay.appleid.com`;
    const name = req.body.name || email.split('@')[0];
    const appleId = payload.sub;

    // Check if user exists by appleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { appleId },
          { email },
        ],
      },
      include: { business: true },
    });

    if (user) {
      // Link appleId if not already linked
      if (!user.appleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appleId },
          include: { business: true },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your account has been suspended. Contact support.',
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        businessId: user.businessId || 'super-admin',
        role: user.role,
      });

      return res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId },
          business: user.business ? { id: user.business.id, name: user.business.name, type: user.business.type, plan: user.business.plan } : null,
          token,
        },
      });
    }

    // Create new account with Apple
    const business = await prisma.business.create({
      data: {
        name: `${name}'s Business`,
        type: 'general',
        plan: 'FREE',
        planStartedAt: new Date(),
        planExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days free trial
      },
    });

    user = await prisma.user.create({
      data: {
        email,
        appleId,
        name,
        businessId: business.id,
        role: 'OWNER',
        emailVerified: new Date(),
        isVerified: true,
      },
      include: { business: true },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId },
        business: { id: business.id, name: business.name, type: business.type, plan: business.plan },
        token,
      },
    });
  } catch (error: any) {
    console.error('Apple auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Apple',
      details: error.message,
    });
  }
});

// POST /api/auth/google - Google Sign-In/Sign-Up
router.post('/google', socialAuthLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google credential is required',
      });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Google token',
      });
    }

    const { email, name, sub: googleId, picture } = payload;

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email },
        ],
      },
      include: { business: true },
    });

    if (user) {
      // Link googleId if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, image: picture || user.image },
          include: { business: true },
        });
      }

      // Update profile picture if not set
      if (picture && !user.image) {
        await prisma.user.update({
          where: { id: user.id },
          data: { image: picture },
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your account has been suspended. Contact support.',
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        businessId: user.businessId || 'super-admin',
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        businessId: user.businessId || 'super-admin',
        role: user.role,
      });

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            businessId: user.businessId,
            image: user.image,
          },
          business: user.business ? {
            id: user.business.id,
            name: user.business.name,
            type: user.business.type,
            plan: user.business.plan,
          } : null,
          token,
          refreshToken,
        },
      });
    }

    // User doesn't exist — create a new account with Google
    const business = await prisma.business.create({
      data: {
        name: name ? `${name}'s Business` : 'My Business',
        type: 'general',
        plan: 'FREE',
        planStartedAt: new Date(),
        planExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days free trial
      },
    });

    user = await prisma.user.create({
      data: {
        email,
        googleId,
        name: name || email.split('@')[0],
        image: picture,
        businessId: business.id,
        role: 'OWNER',
        emailVerified: new Date(),
        isVerified: true,
      },
      include: { business: true },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          image: user.image,
        },
        business: {
          id: business.id,
          name: business.name,
          type: business.type,
          plan: business.plan,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google',
      details: error.message,
    });
  }
});

// Register
router.post('/register', registerLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name, businessName, businessType, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create business first
    const business = await prisma.business.create({
      data: {
        name: businessName,
        type: businessType || 'general',
        phone,
        plan: 'FREE',
        planStartedAt: new Date(),
        planExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days free trial
      },
    });

    // First user of a business is always the OWNER
    const userRole = 'OWNER';
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        businessId: business.id,
        role: userRole,
      },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
        },
        business: {
          id: business.id,
          name: business.name,
          type: business.type,
          plan: business.plan,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
      details: error.message,
    });
  }
});

// Login
router.post('/login', loginLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorToken } = req.body;
    const { TwoFactorService } = await import('../services/twoFactor.service.js');

    // Check if account is locked
    const lockStatus = await getLockoutStatus(email);
    if (lockStatus.locked) {
      return res.status(423).json({
        success: false,
        error: `Account temporarily locked. Try again after ${Math.ceil((lockStatus.lockedUntil! - Date.now()) / 60000)} minutes.`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true },
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      const lockout = await recordFailedLoginAttempt(email);
      return res.status(401).json({
        success: false,
        error: lockout.locked
          ? `Account temporarily locked. Try again after ${Math.ceil((lockout.lockedUntil! - Date.now()) / 60000)} minutes.`
          : 'Invalid email or password',
        attemptsRemaining: lockout.attemptsRemaining,
      });
    }

    // Clear failed attempts on successful password verify
    await clearFailedLoginAttempts(email);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(202).json({
          success: true,
          requiresTwoFactor: true,
          userId: user.id,
          message: 'Two-factor authentication required',
        });
      }

      // Verify 2FA token
      const verified = await TwoFactorService.verifyToken(user.id, twoFactorToken);
      if (!verified) {
        const lockout = await recordFailedLoginAttempt(email);
        return res.status(401).json({
          success: false,
          error: 'Invalid two-factor authentication code',
          attemptsRemaining: lockout.attemptsRemaining,
        });
      }
    }

    // Clear failed attempts on full success
    await clearFailedLoginAttempts(email);

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });

    // Generate refresh token for token rotation
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });

    // Update last login and clear CSRF token
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          twoFactorEnabled: user.twoFactorEnabled,
          onboardingCompleted: user.business?.onboardingCompleted ?? false,
          admissionCompleted: user.business?.admissionCompleted ?? false,
        },
        business: user.business ? {
          id: user.business.id,
          name: user.business.name,
          type: user.business.type,
          plan: user.business.plan,
        } : undefined,
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { business: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          businessId: user.businessId,
          image: user.image,
        },
        business: user.business ? {
          id: user.business.id,
          name: user.business.name,
          type: user.business.type,
          city: user.business.city,
          plan: user.business.plan,
          aiCreditsUsed: user.business.aiCreditsUsed,
          aiCreditsLimit: user.business.aiCreditsLimit,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      details: error.message,
    });
  }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message,
    });
  }
});

// Change password
router.put('/change-password', authenticate, validate(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    await revokeAllUserTokens(req.user.id);

    res.json({
      success: true,
      message: 'Password updated successfully. All sessions have been invalidated.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      details: error.message,
    });
  }
});

// ==================== SUPER ADMIN SEED ====================
// POST /api/auth/create-super-admin
// Usage: curl -X POST http://localhost:4000/api/auth/create-super-admin
//   -H "Content-Type: application/json"
//   -H "x-bootstrap-token: YOUR_SUPER_ADMIN_BOOTSTRAP_TOKEN"
//   -d '{"email": "admin@example.com", "password": "SuperAdmin123!", "name": "Super Admin"}'
router.post('/create-super-admin', async (req: Request, res: Response) => {
  try {
    // Bootstrap token verification - required for creating first super admin
    const bootstrapToken = req.headers['x-bootstrap-token'];
    const expectedToken = process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN;

    if (!expectedToken) {
      return res.status(503).json({
        success: false,
        error: 'Super admin creation is not configured. Set SUPER_ADMIN_BOOTSTRAP_TOKEN in environment.',
      });
    }

    if (!bootstrapToken || bootstrapToken !== expectedToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid bootstrap token',
      });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // Check if super admin already exists — allow multiple
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Promote existing user to SUPER_ADMIN
      const updated = await prisma.user.update({
        where: { email },
        data: { role: 'SUPER_ADMIN' },
      });
      return res.status(200).json({
        success: true,
        message: 'User promoted to Super Admin',
        data: { id: updated.id, email: updated.email, name: updated.name, role: updated.role },
      });
    }

    const hashedPassword = await hashPassword(password);

    const superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
    });
  } catch (error: any) {
    console.error('Create super admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create super admin',
      details: error.message,
    });
  }
});

// ==================== ROLE MANAGEMENT ====================
// PUT /api/auth/role — Change user role (SUPER_ADMIN/OWNER only)
router.put('/role', authenticate, requireRole('SUPER_ADMIN', 'OWNER'), async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ success: false, error: 'userId and role are required' });
    }

    const validRoles = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const currentUser = (req as any).user;
    // Only SUPER_ADMIN can assign SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Only Super Admin can assign Super Admin role' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // OWNER can only manage users in their own business
    if (currentUser.role === 'OWNER' && targetUser.businessId !== currentUser.businessId) {
      return res.status(403).json({ success: false, error: 'Cannot manage users outside your business' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.json({
      success: true,
      data: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
    });
  } catch (error: any) {
    console.error('Role change error:', error);
    res.status(500).json({ success: false, error: 'Failed to change role', details: error.message });
  }
});

// GET /api/auth/users — List users in business (SUPER_ADMIN/OWNER/ADMIN)
router.get('/users', authenticate, requireRole('SUPER_ADMIN', 'OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    let whereClause: any = {};

    if (currentUser.role === 'SUPER_ADMIN') {
      whereClause = {}; // Super admin sees all
    } else {
      whereClause = { businessId: currentUser.businessId };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { users } });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

// In-memory OTP store with cleanup interval
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
const OTP_RATE_LIMIT = 3; // max OTP requests per email per window
const OTP_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup of expired OTPs (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) otpStore.delete(key);
  }
}, 5 * 60 * 1000);

router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    // Rate limiting: max 3 OTP requests per email per 15 minutes
    const existing = otpStore.get(email);
    if (existing) {
      const requestsInWindow = existing.attempts;
      if (requestsInWindow >= OTP_RATE_LIMIT) {
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
      }
    }

    // Evict stale entries if store grows too large
    if (otpStore.size > 10000) {
      const now = Date.now();
      for (const [key, val] of otpStore) {
        if (now - val.expiresAt > 300000) otpStore.delete(key);
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const attempts = (existing?.attempts || 0) + 1;
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts });

    // Send OTP via email (fire-and-forget)
    try {
      const { EmailService } = await import('../services/email.service.js');
      await EmailService.sendEmail(
        email,
        'Password Reset OTP - BizzAuto',
        `<h2>Password Reset</h2><p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP expires in 10 minutes.</p><p>If you did not request this, please ignore this email.</p>`
      );
    } catch (emailErr: any) {
      console.error('Failed to send OTP email:', emailErr.message);
    }

    // Log the request for audit trail
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.businessId) {
        await prisma.activity.create({
          data: {
            businessId: user.businessId,
            type: 'password_reset_requested',
            title: 'Password reset requested',
            content: `OTP sent to ${email}`,
            createdBy: user.id,
          },
        });
      }
    } catch { /* audit log is non-critical */ }

    res.json({ success: true, message: 'If an account exists, an OTP has been sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

router.post('/verify-otp', verifyOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

    const stored = otpStore.get(email);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }
    const otpBuf = Buffer.from(otp.padStart(6, '0').slice(0, 6));
    const storedBuf = Buffer.from(stored.otp.padStart(6, '0').slice(0, 6));
    const match = otpBuf.length === storedBuf.length && crypto.timingSafeEqual(otpBuf, storedBuf);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

router.post('/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, error: 'All fields are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });

    const stored = otpStore.get(email);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }
    const otpBuf = Buffer.from(otp.padStart(6, '0').slice(0, 6));
    const storedBuf = Buffer.from(stored.otp.padStart(6, '0').slice(0, 6));
    const match = otpBuf.length === storedBuf.length && crypto.timingSafeEqual(otpBuf, storedBuf);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    otpStore.delete(email);

    // Log successful password reset
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.businessId) {
        await prisma.activity.create({
          data: {
            businessId: user.businessId,
            type: 'password_reset_completed',
            title: 'Password reset completed',
            content: `Password reset for ${email}`,
            createdBy: user.id,
          },
        });
      }
    } catch { /* audit log is non-critical */ }

    // Send confirmation email
    try {
      const { EmailService } = await import('../services/email.service.js');
      await EmailService.sendEmail(
        email,
        'Your password has been changed - BizzAuto',
        `<h2>Password Changed</h2><p>Your password has been successfully changed.</p><p>If you did not make this change, please contact support immediately.</p>`
      );
    } catch { /* non-critical */ }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// Refresh access token using refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Verify the refresh token
    let decoded: any;
    try {
      decoded = verifyRefreshToken(refreshToken) as any;
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
      });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or account suspended',
      });
    }

    // Check if this refresh token has been revoked (token reuse detection)
    try {
      const { isRefreshTokenRevoked } = await import('../services/token-blacklist.service.js');
      const revoked = await isRefreshTokenRevoked(user.id).catch(() => false);
      if (revoked) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token reuse detected. Please log in again.',
        });
      }
    } catch { /* Redis unavailable — skip check */ }

    // Blacklist the old refresh token to prevent reuse (refresh token rotation)
    try {
      const { blacklistRefreshToken } = await import('../services/token-blacklist.service.js');
      const expiresIn = (parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '2592000', 10)) * 1000;
      await blacklistRefreshToken(user.id, expiresIn).catch(() => {});
    } catch { /* Redis unavailable — skip blacklist */ }

    // Issue new token pair (rotation)
    const newToken = generateToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      businessId: user.businessId || 'super-admin',
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
});

// ==================== EMAIL VERIFICATION ====================

// POST /api/auth/send-verification - Send verification email
router.post('/send-verification', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, error: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken,
        tokenExpiry,
      },
    });

    // Send verification email
    const { EmailService } = await import('../services/email.service.js');
    await EmailService.sendVerificationEmail(user.email, user.name || 'User', verificationToken);

    res.json({ success: true, message: 'Verification email sent' });
  } catch (error: any) {
    console.error('Send verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification email' });
  }
});

// GET /api/auth/verify-email?token=xxx - Verify email with token
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        tokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    // Update user - verify email and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify email' });
  }
});

// GET /api/auth/verification-status - Check verification status
router.get('/verification-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: { verified: user.emailVerified },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to check verification status' });
  }
});

// DIAGNOSTIC ENDPOINT - test JWT sign/verify in the same process
router.get('/jwt-test', (req: Request, res: Response) => {
  const secret = getJwtSecret();
  const testPayload = { id: 'test-123', email: 'test@test.com', role: 'SUPER_ADMIN', businessId: 'test-biz' };
  const token = generateToken(testPayload);
  try {
    const decoded = verifyToken(token);
    res.json({
      success: true,
      data: {
        secretLen: secret.length,
        secretFirst4: secret.slice(0, 4),
        tokenLen: token.length,
        tokenParts: token.split('.').length,
        payload: decoded,
        match: decoded.id === 'test-123',
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      secretLen: secret.length,
      secretFirst4: secret.slice(0, 4),
    });
  }
});

export default router;
