import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Audit Log Retention Management
 *
 * Provides endpoints to manage audit log lifecycle:
 * - GET /api/admin/audit-retention/stats — View audit log statistics and storage impact
 * - DELETE /api/admin/audit-retention/prune — Delete audit logs older than N days
 * - POST /api/admin/audit-retention/export — Export audit logs before pruning
 *
 * All endpoints require SUPER_ADMIN role.
 */

// GET /api/admin/audit-retention/stats — Audit log statistics
router.get('/stats', authenticate, requireRole('SUPER_ADMIN'), async (_req: AuthRequest, res: any) => {
  try {
    const [totalCount, oldestEntry, newestEntry, storageEstimate] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.$queryRaw`
        SELECT
          pg_total_relation_size('"AuditLog"') as total_bytes,
          pg_relation_size('"AuditLog"') as table_bytes,
          pg_indexes_size('"AuditLog"') as index_bytes
      `,
    ]);

    // Count by age buckets
    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [count7d, count30d, count90d, countOlder] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(30) } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(90) } } }),
      prisma.auditLog.count({ where: { createdAt: { lt: daysAgo(90) } } }),
    ]);

    const storage = (storageEstimate as any)[0] || {};
    const totalBytes = parseInt(storage.total_bytes || '0');
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      data: {
        totalEntries: totalCount,
        dateRange: {
          oldest: oldestEntry?.createdAt || null,
          newest: newestEntry?.createdAt || null,
        },
        ageBuckets: {
          last7Days: count7d,
          last30Days: count30d,
          last90Days: count90d,
          olderThan90Days: countOlder,
        },
        storage: {
          totalMB,
          tableBytes: parseInt(storage.table_bytes || '0'),
          indexBytes: parseInt(storage.index_bytes || '0'),
        },
        recommendation: countOlder > 10000
          ? `Consider pruning ${countOlder.toLocaleString()} entries older than 90 days.`
          : 'No pruning needed.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/audit-retention/prune — Delete audit logs older than N days
router.delete('/prune', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const { olderThanDays = '90', dryRun = 'false', batchSize = '1000' } = req.query;
    const days = parseInt(olderThanDays as string);
    const isDryRun = dryRun === 'true';
    const batch = parseInt(batchSize as string);

    if (days < 30) {
      return res.status(400).json({
        success: false,
        error: 'Cannot prune logs younger than 30 days (safety limit)',
      });
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Count entries to be deleted
    const countToDelete = await prisma.auditLog.count({
      where: { createdAt: { lt: cutoffDate } },
    });

    if (isDryRun) {
      return res.json({
        success: true,
        data: {
          dryRun: true,
          entriesToDelete: countToDelete,
          cutoffDate: cutoffDate.toISOString(),
          olderThanDays: days,
        },
      });
    }

    // Delete in batches to avoid long-running transactions
    let deletedTotal = 0;
    const cutoffDateForBatch = new Date(cutoffDate);

    while (deletedTotal < countToDelete) {
      const batchIds = await prisma.auditLog.findMany({
        where: { createdAt: { lt: cutoffDateForBatch } },
        take: batch,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (batchIds.length === 0) break;

      await prisma.auditLog.deleteMany({
        where: { id: { in: batchIds.map(b => b.id) } },
      });

      deletedTotal += batchIds.length;

      // Small delay between batches to avoid overwhelming the DB
      if (deletedTotal < countToDelete) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      data: {
        deleted: deletedTotal,
        cutoffDate: cutoffDate.toISOString(),
        olderThanDays: days,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
