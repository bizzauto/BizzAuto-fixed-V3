/**
 * Environment Validator
 * Validates all required environment variables on startup
 * Prevents runtime errors from missing config
 */

const REQUIRED_VARS = {
  DATABASE_URL: { description: 'PostgreSQL connection string', pattern: /^postgresql:\/\// },
  JWT_SECRET: { description: 'JWT signing secret (min 32 chars)', minLength: 32 },
  JWT_REFRESH_SECRET: { description: 'JWT refresh secret (min 32 chars)', minLength: 32 },
  ENCRYPTION_KEY: { description: 'AES-256 encryption key (64 hex chars)', pattern: /^[a-f0-9]{64}$/i },
};

const RECOMMENDED_VARS = {
  REDIS_URL: 'Caching & job queues (optional but recommended)',
  CORS_ORIGIN: 'Allowed CORS origin',
  FRONTEND_URL: 'Frontend application URL',
  SMTP_HOST: 'Email delivery',
  SMTP_PORT: 'Email port',
  SMTP_USER: 'Email username',
  SMTP_PASS: 'Email password',
  OPENROUTER_API_KEY: 'AI features (text generation fallback)',
  NVIDIA_NIM_API_KEY: 'AI features (free — primary text generation)',
  GEMINI_API_KEY: 'AI features (image generation)',
  RAZORPAY_KEY_ID: 'Payment processing',
  RAZORPAY_KEY_SECRET: 'Payment processing',
  SENTRY_DSN: 'Error monitoring',
  N8N_URL: 'Workflow automation',
  EVOLUTION_API_URL: 'WhatsApp via Evolution API',
  SUPER_ADMIN_BOOTSTRAP_TOKEN: 'Super admin creation',
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];

    if (!value) {
      errors.push(`❌ MISSING: ${key} — ${config.description}`);
      continue;
    }

    if ((config as any).minLength && value.length < (config as any).minLength) {
      errors.push(`❌ TOO SHORT: ${key} — minimum ${(config as any).minLength} chars, got ${value.length}`);
      continue;
    }

    if ((config as any).pattern && !(config as any).pattern.test(value)) {
      errors.push(`❌ INVALID FORMAT: ${key} — ${config.description}`);
      continue;
    }
  }

  // Check recommended vars
  for (const [key, description] of Object.entries(RECOMMENDED_VARS)) {
    if (!process.env[key]) {
      warnings.push(`⚠️  OPTIONAL: ${key} — ${description} (not configured)`);
    }
  }

  // Security checks — catch placeholder values that don't meet minimum length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('❌ SECURITY: JWT_SECRET is too short — must be at least 32 characters');
  }

  if (process.env.ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY)) {
    errors.push('❌ SECURITY: ENCRYPTION_KEY must be exactly 64 hex characters');
  }

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    warnings.push(`⚠️  NODE_ENV is "${process.env.NODE_ENV}" — expected "production" or "development"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function printValidationResult(result: ValidationResult): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Environment Configuration Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(w => console.log(`  ${w}`));
  }

  if (result.errors.length > 0) {
    console.log('\nErrors (server will NOT start):');
    result.errors.forEach(e => console.log(`  ${e}`));
    console.log('\n💡 Fix these in your .env file and restart.');
  } else {
    console.log('\n✅ All required environment variables are configured correctly.');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
