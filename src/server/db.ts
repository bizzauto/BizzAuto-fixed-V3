import { PrismaClient } from '@prisma/client';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma with optimized connection pool
// connection_limit defaults to num_cpus * 2 + 1; pool_timeout controls wait time
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '0');
const baseUrl = process.env.DATABASE_URL || '';
const separator = baseUrl.includes('?') ? '&' : '?';
const poolUrl = POOL_SIZE > 0
  ? `${baseUrl}${separator}connection_limit=${POOL_SIZE}&pool_timeout=10`
  : baseUrl.includes('pool_timeout')
    ? baseUrl
    : `${baseUrl}${separator}pool_timeout=10`;

const slowQueryEnabled = process.env.SLOW_QUERY_LOG_ENABLED === 'true' && NODE_ENV === 'production';
export const prisma = new PrismaClient({
  log: [
    'error',
    'warn',
    ...(slowQueryEnabled ? ['query' as const] : []),
  ],
  datasources: {
    db: {
      url: poolUrl,
    },
  },
});

try {
  (prisma as any).$on('error', (e: { message: string }) => {
    console.error('[Prisma] Error:', e.message);
  });
} catch {}
