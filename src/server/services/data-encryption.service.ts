import crypto from 'crypto';

/**
 * Data Encryption Service
 * Encrypts/decrypts sensitive customer data at rest
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Use environment variable or generate a secure key
const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypt sensitive data (phone, email, address, etc.)
 */
export function encryptData(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted data
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) return ciphertext;
    
    const [saltHex, ivHex, tagHex, encrypted] = parts;
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    return ciphertext; // Return as-is if decryption fails
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 4 && 
         parts.every(p => /^[a-f0-9]+$/.test(p)) &&
         parts[0].length === SALT_LENGTH * 2;
}

/**
 * Encrypt sensitive fields in an object
 */
export function encryptFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const encrypted = { ...obj };
  
  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string' && !isEncrypted(encrypted[field])) {
      encrypted[field] = encryptData(encrypted[field]);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt sensitive fields in an object
 */
export function decryptFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const decrypted = { ...obj };
  
  for (const field of fields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && isEncrypted(decrypted[field])) {
      decrypted[field] = decryptData(decrypted[field]);
    }
  }
  
  return decrypted;
}

// Sensitive fields that should be encrypted in the database
export const SENSITIVE_CONTACT_FIELDS = ['phone', 'email'];
export const SENSITIVE_ORDER_FIELDS = ['gatewayData'];
export const SENSITIVE_ADDRESS_FIELDS = ['phone', 'address'];

/**
 * Hash sensitive data for comparison (one-way)
 */
export function hashData(data: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(data, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashed: string): boolean {
  const [salt, hash] = hashed.split(':');
  const verifyHash = crypto.scryptSync(data, salt, 64).toString('hex');
  return hash === verifyHash;
}

/**
 * Generate a secure token for GDPR data export
 */
export function generateExportToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sanitize phone number for storage (keep only digits)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Indian phone number
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(cleaned);
}