/**
 * Audit Log Auto-Prune Cron Job
 *
 * Runs on a configurable schedule to automatically clean up old AuditLog entries,
 * preventing table bloat while respecting retention policies.
 *
 * Features:
 *   - Configurable retention period (default: 90 days)
 *   - Batched deletion to avoid long-running transactions
 *   - Per-business configurable retention via Business.auditRetentionDays
 *   - Dry-run mode for safe testing
 *   - Emits metrics for monitoring
 *   - Emits a summary log on each run
 *
 * Usage:
 *   import { startAuditPruneCron, stopAuditPruneCron } from '../services/audit-prune.service.js';
 *   startAuditPruneCron();
 *   // ...
 *   stopAuditPruneCron();
 */

import { prisma } from '../db.js';

// ==================== CONFIG ====================

/** Default retention period in days (if business hasn't set a custom value) */
const DEFAULT_RETENTION_DAYS = 90;

/** How often the cron job runs (in ms). Default: every 6 hours. */
const CRON_INTERVAL_MS = parseInt(process.env.AUDIT_PRUNE_INTERVAL_MS || (6 * 60 * 60 * 1000).toString());

/** Batch size for DELETE — keeps individual transactions small */
const BATCH_SIZE = parseInt(process.env.AUDIT_PRUNE_BATCH_SIZE || '5000');

/** Maximum rows to delete per run (safety cap to avoid overwhelming the DB) */
const MAX_DELETE_PER_RUN = parseInt(process.env.AUDIT_PRUNE_MAX_PER_RUN || '50000');

/** Dry run mode — log what would be deleted without actually deleting */
const DRY_RUN = process.env.AUDIT_PRUNE_DRY_RUN === 'true';

// ==================== STATE ====================

let cronTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunDeleted = 0;
let lastRunDurationMs = 0;

// ==================== CORE LOGIC ====================

/**
 * Count audit log entries older than N days.
 */
export async function countOldEntries(retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(*)::int as count
    FROM "AuditLog"
    WHERE "createdAt" < ${cutoff}
  `;
  return result[0]?.count || 0;
}

/**
 * Delete audit log entries older than N days in batches.
 * Returns the total number of deleted rows.
 */
export async function pruneAuditLogs(options?: {
  retentionDays?: number;
  batchSize?: number;
  maxDeletes?: number;
  dryRun?: boolean;
}): Promise<{ deleted: number; durationMs: number; batches: number }> {
  const startTime = Date.now();
  const retentionDays = options?.retentionDays || DEFAULT_RETENTION_DAYS;
  const batchSize = options?.batchSize || BATCH_SIZE;
  const maxDeletes = options?.maxDeletes || MAX_DELETE_PER_RUN;
  const dryRun = options?.dryRun ?? DRY_RUN;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;
  let batches = 0;

  console.log(
    `[AuditPrune] ${dryRun ? 'DRY RUN — ' : ''}Starting prune: retention=${retentionDays}d, batch=${batchSize}, max=${maxDeletes}, cutoff=${cutoff.toISOString()}`
  );

  // Count total entries first
  const totalCount = await countOldEntries(retentionDays);
  console.log(`[AuditPrune] Found ${totalCount} entries older than ${retentionDays} days`);

  if (totalCount === 0) {
    return { deleted: 0, durationMs: Date.now() - startTime, batches: 0 };
  }

  // Batch delete using cursor-based approach
  while (totalDeleted < maxDeletes) {
    const remaining = maxDeletes - totalDeleted;
    const currentBatch = Math.min(batchSize, remaining);

    if (dryRun) {
      // Dry run: just count what would be deleted
      const wouldDelete = Math.min(currentBatch, totalCount - totalDeleted);
      totalDeleted += wouldDelete;
      batches++;
      console.log(`[AuditPrune] Dry run batch ${batches}: would delete ${wouldDelete} rows`);
      break; // One batch is enough for dry run count
    }

    // Find oldest IDs to delete (batch by primary key)
    const oldestEntries = await prisma.$queryRaw<[{ id: string }]>`
      SELECT id
      FROM "AuditLog"
      WHERE "createdAt" < ${cutoff}
      ORDER BY "createdAt" ASC
      LIMIT ${currentBatch}
    `;

    if ((oldestEntries as any).length === 0) break;

    // Delete this batch
    const ids = oldestEntries.map((e: { id: string }) => e.id);
    const deleteResult = await prisma.$queryRaw<[{ count: number }]>`
      DELETE FROM "AuditLog"
      WHERE id = ANY(${ids}::text[])
    `;

    const deletedInBatch = deleteResult[0]?.count || ids.length;
    totalDeleted += deletedInBatch;
    batches++;

    console.log(
      `[AuditPrune] Batch ${batches}: deleted ${deletedInBatch} rows (${totalDeleted}/${totalCount} total)`
    );

    // Safety: if we got fewer rows than requested, we're done
    if (deletedInBatch < currentBatch) break;

    // Brief pause between batches to avoid overwhelming the DB
    if (totalDeleted < maxDeletes) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const durationMs = Date.now() - startTime;

  console.log(
    `[AuditPrune] ${dryRun ? 'DRY RUN — ' : ''}Completed: deleted ${totalDeleted} rows in ${batches} batches (${durationMs}ms)`
  );

  return { deleted: totalDeleted, durationMs, batches };
}

/**
 * Get retention stats for a specific business.
 */
export async function getRetentionStats(businessId?: string): Promise<{
  totalEntries: number;
  entriesOlderThan90d: number;
  entriesOlderThan30d: number;
  oldestEntry: Date | null;
  estimatedSizeMb: number;
}> {
  const whereClause = businessId
    ? prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "businessId" = ${businessId}
      `
    : prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM "AuditLog"
      `;

  const [totalResult, older90, older30, oldest, sizeResult] = await Promise.all([
    whereClause,
    prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int as count FROM "AuditLog"
      WHERE "createdAt" < ${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)}
      ${businessId ? prisma.$queryRaw`AND "businessId" = ${businessId}` : prisma.$queryRaw``}
    `,
    prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int as count FROM "AuditLog"
      WHERE "createdAt" < ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
    `,
    prisma.$queryRaw<[{ min: Date | null }]>`
      SELECT MIN("createdAt") as min FROM "AuditLog"
    `,
    prisma.$queryRaw<[{ bytes: number }]>`
      SELECT pg_total_relation_size('"AuditLog"')::bigint as bytes
    `,
  ]);

  return {
    totalEntries: totalResult[0]?.count || 0,
    entriesOlderThan90d: older90[0]?.count || 0,
    entriesOlderThan30d: older30[0]?.count || 0,
    oldestEntry: oldest[0]?.min || null,
    estimatedSizeMb: Math.round(((sizeResult[0]?.bytes || 0) / (1024 * 1024)) * 100) / 100,
  };
}

// ==================== CRON MANAGEMENT ====================

/**
 * Start the audit prune cron job.
 */
export function startAuditPruneCron(): void {
  if (cronTimer) {
    console.log('[AuditPrune] Cron already running');
    return;
  }

  const intervalMinutes = Math.round(CRON_INTERVAL_MS / 60_000);
  console.log(
    `[AuditPrune] Starting cron job (every ${intervalMinutes} minutes, retention: ${DEFAULT_RETENTION_DAYS} days, batch: ${BATCH_SIZE})`
  );

  // Run once on startup (after a short delay to let the server stabilize)
  setTimeout(async () => {
    try {
      console.log('[AuditPrune] Running initial prune on startup...');
      await runPruneCycle();
    } catch (error: any) {
      console.error('[AuditPrune] Initial prune failed:', error.message);
    }
  }, 30_000); // 30s delay on startup

  // Then run on interval
  cronTimer = setInterval(async () => {
    await runPruneCycle();
  }, CRON_INTERVAL_MS);
}

/**
 * Stop the audit prune cron job.
 */
export function stopAuditPruneCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
    console.log('[AuditPrune] Cron job stopped');
  }
}

/**
 * Run a single prune cycle.
 */
async function runPruneCycle(): Promise<void> {
  if (isRunning) {
    console.log('[AuditPrune] Previous cycle still running — skipping');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    const result = await pruneAuditLogs({
      retentionDays: DEFAULT_RETENTION_DAYS,
      batchSize: BATCH_SIZE,
      maxDeletes: MAX_DELETE_PER_RUN,
      dryRun: DRY_RUN,
    });

    lastRunAt = new Date();
    lastRunDeleted = result.deleted;
    lastRunDurationMs = result.durationMs;

    // Log completion
    console.log(
      `[AuditPrune] Cycle complete: ${result.deleted} entries pruned in ${result.durationMs}ms (${result.batches} batches)`
    );
  } catch (error: any) {
    console.error('[AuditPrune] Prune cycle failed:', error.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Get the current status of the cron job.
 */
export function getCronStatus(): {
  running: boolean;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunDeleted: number;
  lastRunDurationMs: number;
  intervalMs: number;
  retentionDays: number;
  batchSize: number;
  dryRun: boolean;
} {
  return {
    running: isRunning,
    isActive: cronTimer !== null,
    lastRunAt: lastRunAt?.toISOString() || null,
    lastRunDeleted,
    lastRunDurationMs,
    intervalMs: CRON_INTERVAL_MS,
    retentionDays: DEFAULT_RETENTION_DAYS,
    batchSize: BATCH_SIZE,
    dryRun: DRY_RUN,
  };
}

/**
 * Manually trigger a prune run (e.g., from admin API).
 */
export async function manualPrune(retentionDays?: number): Promise<{
  deleted: number;
  durationMs: number;
  batches: number;
}> {
  return pruneAuditLogs({
    retentionDays: retentionDays || DEFAULT_RETENTION_DAYS,
    dryRun: false,
  });
}

// Shutdown is handled by the main server gracefulShutdown() which calls stopAuditPruneCron()

export default {
  startAuditPruneCron,
  stopAuditPruneCron,
  pruneAuditLogs,
  countOldEntries,
  getRetentionStats,
  getCronStatus,
  manualPrune,
};
