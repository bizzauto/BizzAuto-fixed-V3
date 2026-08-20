import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'crypto'
import os from 'os';
import path from 'path';
import fs from 'fs';
import { isTokenBlacklisted } from '../services/token-blacklist.service.js';

// ── JWT_SECRET (lazy resolution) ──
// NOTE: process.env is read at CALL TIME, not module eval time.
// This ensures dotenv.config() in index.ts has already run by the time
// any token sign/verify happens, preventing the "different secret" bug.
const DEV_JWT_FALLBACK = (() => {
   const seed = os.hostname() + '__' + process.cwd();
   return createHash('sha256').update(seed).digest('hex').slice(0, 32);
})();

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set. Server cannot start in production without a JWT_SECRET.');
    process.exit(1);
  }
  return DEV_JWT_FALLBACK;
}

// ── ENCRYPTION_KEY (AES-256) ──
// In production, this MUST be set. In dev, persist to .encryption.key file so encrypted data survives restarts.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
let DEV_ENC_FALLBACK: string | undefined;

function loadOrGenerateDevEncryptionKey(): string {
  const keyFile = path.resolve(process.cwd(), '.encryption.key');

  try {
    if (fs.existsSync(keyFile)) {
      const existing = fs.readFileSync(keyFile, 'utf8').trim();
      if (existing.length === 64) {
        console.log('[Auth] Loaded existing encryption key from .encryption.key');
        return existing;
      }
      console.warn('[Auth] Existing .encryption.key is invalid, generating new one...');
    }
  } catch (e) {
    // Ignore - will generate new
  }

  const newKey = randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(keyFile, newKey, 'utf8');
    console.log('[Auth] Generated new encryption key → .encryption.key (DO NOT COMMIT)');
    // Add to .gitignore if not already there
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      let gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignore.includes('.encryption.key')) {
        fs.writeFileSync(gitignorePath, gitignore + '\n# Dev encryption key (auto-generated)\n.encryption.key\n', 'utf8');
      }
    }
  } catch (e) {
    console.warn('[Auth] Could not persist encryption key to file. Data will be lost on restart.');
  }
  return newKey;
}

if (!ENCRYPTION_KEY) {
  const isProd = process.env.NODE_ENV === 'production';
  const msg = `CRITICAL: ENCRYPTION_KEY environment variable is not set.`;
  if (isProd) {
    console.error(msg + ' Server cannot start in production without an ENCRYPTION_KEY.');
    process.exit(1);
  }
  DEV_ENC_FALLBACK = loadOrGenerateDevEncryptionKey();
}
function getEncryptionKey(): string {
  return ENCRYPTION_KEY || DEV_ENC_FALLBACK!;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: object): string => {
  const secret = getJwtSecret();
  const token = jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
  return token;
};

export const verifyToken = (token: string): any => {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret) as any;

  // Check if token has been blacklisted (password change, logout, security event)
  if (decoded.jti) {
    try {
      if (isTokenBlacklisted(decoded.jti)) {
        throw new Error('Token has been revoked');
      }
    } catch (err: any) {
      if (err.message === 'Token has been revoked') throw err;
      // Redis unavailable — allow token (graceful degradation)
    }
  }

  return decoded;
};

export const verifyRefreshToken = (token: string): any => {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret();
  return jwt.verify(token, secret);
};

export const generateRefreshToken = (payload: object): string => {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'],
  });
};

// Encryption utilities for sensitive data (WhatsApp tokens, API keys)
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = randomBytes(16);
  const key = Buffer.from(getEncryptionKey(), 'hex');
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}
