/**
 * Environment Hardening Middleware
 * Validates critical environment variables at startup and blocks
 * insecure configurations from running in production.
 */

interface EnvCheck {
  name: string;
  required: boolean;
  minLength?: number;
  disallowedValues?: string[];
  productionOnly?: boolean;
}

const ENV_CHECKS: EnvCheck[] = [
  { name: 'JWT_SECRET', required: true, minLength: 32, disallowedValues: ['your-jwt-secret-min-32-chars-long', 'secret', 'change-me'] },
  { name: 'JWT_REFRESH_SECRET', required: true, minLength: 32, disallowedValues: ['your-jwt-secret-min-32-chars-long', 'secret', 'change-me'] },
  { name: 'ENCRYPTION_KEY', required: true, minLength: 64, disallowedValues: ['your-aes-256-encryption-key-64-hex-chars'] },
  { name: 'DATABASE_URL', required: true },
  { name: 'CORS_ORIGIN', required: false, disallowedValues: ['*'] },
  { name: 'SMTP_USER', required: false, productionOnly: true },
  { name: 'SMTP_PASS', required: false, productionOnly: true },
  { name: 'RAZORPAY_KEY_SECRET', required: false, productionOnly: true },
];

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnvironment(): EnvironmentValidationResult {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const check of ENV_CHECKS) {
    const value = process.env[check.name];

    // Skip production-only checks in development
    if (check.productionOnly && !isProduction) continue;

    // Check if required
    if (check.required && !value) {
      errors.push(`Missing required environment variable: ${check.name}`);
      continue;
    }

    if (!value) continue;

    // Check minimum length
    if (check.minLength && value.length < check.minLength) {
      errors.push(`${check.name} must be at least ${check.minLength} characters (got ${value.length})`);
    }

    // Check disallowed values
    if (check.disallowedValues && check.disallowedValues.includes(value)) {
      errors.push(`${check.name} is using an insecure default value. Please set a strong, unique value.`);
    }
  }

  // Production-specific warnings
  if (isProduction) {
    if (!process.env.SMTP_HOST) warnings.push('SMTP_HOST not configured — transactional emails will fail');
    if (!process.env.RAZORPAY_KEY_ID) warnings.push('RAZORPAY_KEY_ID not configured — payments will not work');
    if (!process.env.N8N_API_KEY) warnings.push('N8N_API_KEY not configured — automation integrations limited');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function printEnvironmentReport(result: EnvironmentValidationResult): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`\n🔧 Environment Hardening Report (${nodeEnv})`);

  if (result.valid) {
    console.log('✅ All security checks passed');
  } else {
    console.log('❌ Security issues found:');
    for (const err of result.errors) {
      console.log(`   ❌ ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    for (const warn of result.warnings) {
      console.log(`   ⚠️ ${warn}`);
    }
  }

  if (nodeEnv === 'production' && !result.valid) {
    console.log('\n🚫 BLOCKING: Server will NOT start with security issues in production!');
    process.exit(1);
  }
}
