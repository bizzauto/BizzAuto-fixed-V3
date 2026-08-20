import { encrypt, decrypt } from '../utils/auth.js';

/**
 * Sensitive fields on the Business model that must be encrypted at rest.
 * These fields store API tokens, access tokens, and webhook secrets.
 */
const SENSITIVE_FIELDS = [
  'waAccessToken',
  'fbAccessToken',
  'igAccessToken',
  'linkedinAccessToken',
  'twitterAccessToken',
  'gbpAccessToken',
  'dograhApiKey',
  'waWebhookSecret',
  'leadWebhookSecret',
];

/**
 * Prefix used to identify encrypted values.
 * Values without this prefix are treated as plaintext (legacy data).
 */
const ENCRYPTED_PREFIX = 'enc:';

/**
 * Encrypt a single sensitive field value before saving to database.
 * Returns the encrypted string with the `enc:` prefix.
 * Skips if already encrypted or empty.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value || value.startsWith(ENCRYPTED_PREFIX)) return value || null;
  return ENCRYPTED_PREFIX + encrypt(value);
}

/**
 * Decrypt a single sensitive field value after reading from database.
 * Handles both encrypted (enc:...) and legacy plaintext values.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value; // Legacy plaintext
  try {
    return decrypt(value.slice(ENCRYPTED_PREFIX.length));
  } catch {
    console.error('[SecretsService] Failed to decrypt field');
    return null;
  }
}

/**
 * Encrypt all sensitive fields in a Business object before saving to DB.
 * Returns a new object with encrypted values.
 */
export function encryptBusinessData(data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && result[field] !== undefined) {
      result[field] = encryptField(result[field]);
    }
  }
  return result;
}

/**
 * Decrypt all sensitive fields in a Business object after reading from DB.
 * Returns a new object with decrypted values.
 */
export function decryptBusinessData(data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && result[field] !== undefined) {
      result[field] = decryptField(result[field]);
    }
  }
  return result;
}

/**
 * Get a safe copy of business data for API responses.
 * Masks sensitive fields instead of decrypting them.
 */
export function maskBusinessSecrets(data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && result[field]) {
      const val = result[field] as string;
      result[field] = val.length > 8
        ? val.slice(0, 4) + '****' + val.slice(-4)
        : '****';
    }
  }
  return result;
}
