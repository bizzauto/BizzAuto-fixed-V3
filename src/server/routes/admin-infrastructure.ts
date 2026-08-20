/**
 * Enterprise Infrastructure Admin Routes
 *
 * SUPER_ADMIN endpoints for:
 *   - Circuit breaker status, reset, and stats
 *   - Webhook retry queue stats and dead-letter management
 *   - Audit prune cron status and manual trigger
 *
 * Mounted at /api/admin/infrastructure
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { circuitBreaker } from '../services/circuit-breaker.service.js';
import { getWebhookDeliveryStats, retryDelivery } from '../services/webhook-retry.service.js';
import { getCronStatus, manualPrune, getRetentionStats } from '../services/audit-prune.service.js';
import { qs } from '../utils/query.js';

const router = Router();

// All routes require SUPER_ADMIN
router.use(authenticate, requireRole('SUPER_ADMIN'));

// ==================== CIRCUIT BREAKER ====================

/**
 * GET /api/admin/infrastructure/circuit-breaker
 * Get circuit breaker status for all registered services.
 */
router.get('/circuit-breaker', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = circuitBreaker.getAllStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/infrastructure/circuit-breaker/:service
 * Get circuit breaker status for a specific service.
 */
router.get('/circuit-breaker/:service', async (req: AuthRequest, res: Response) => {
  try {
    const stats = circuitBreaker.getStats(qs(req.params.service));
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Service not registered' });
    }
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/infrastructure/circuit-breaker/:service/reset
 * Manually reset a circuit breaker to CLOSED.
 */
router.post('/circuit-breaker/:service/reset', async (req: AuthRequest, res: Response) => {
  try {
    const service = qs(req.params.service);
    circuitBreaker.reset(service);
    const stats = circuitBreaker.getStats(service);
    res.json({ success: true, data: stats, message: `Circuit breaker for "${service}" reset to CLOSED` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WEBHOOK RETRY QUEUE ====================

/**
 * GET /api/admin/infrastructure/webhook-queue
 * Get webhook delivery queue stats.
 */
router.get('/webhook-queue', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await getWebhookDeliveryStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/infrastructure/webhook-queue/:jobId/retry
 * Retry a dead-lettered webhook delivery.
 */
router.post('/webhook-queue/:jobId/retry', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = qs(req.params.jobId);
    const retried = await retryDelivery(jobId);
    if (!retried) {
      return res.status(404).json({ success: false, error: 'Job not found or not in failed state' });
    }
    res.json({ success: true, message: `Job ${jobId} re-enqueued for delivery` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUDIT PRUNE CRON ====================

/**
 * GET /api/admin/infrastructure/audit-prune
 * Get audit prune cron job status.
 */
router.get('/audit-prune', async (_req: AuthRequest, res: Response) => {
  try {
    const status = getCronStatus();
    const retention = await getRetentionStats();
    res.json({ success: true, data: { ...status, retention } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/infrastructure/audit-prune/run
 * Manually trigger an audit log prune cycle.
 * Query param: ?retentionDays=90 (optional)
 */
router.post('/audit-prune/run', async (req: AuthRequest, res: Response) => {
  try {
    const retentionDays = req.query.retentionDays
      ? parseInt(req.query.retentionDays as string)
      : undefined;

    const result = await manualPrune(retentionDays);
    res.json({
      success: true,
      data: result,
      message: `Pruned ${result.deleted} audit log entries in ${result.durationMs}ms`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== COMBINED STATUS ====================

/**
 * GET /api/admin/infrastructure/status
 * Combined infrastructure health summary.
 */
router.get('/status', async (_req: AuthRequest, res: Response) => {
  try {
    const [circuitStats, webhookStats, pruneStatus] = await Promise.all([
      circuitBreaker.getAllStats(),
      getWebhookDeliveryStats(),
      getCronStatus(),
    ]);

    const openCircuits = circuitStats.filter(s => s.state !== 'CLOSED');

    res.json({
      success: true,
      data: {
        circuitBreaker: {
          totalServices: circuitStats.length,
          healthy: circuitStats.filter(s => s.state === 'CLOSED').length,
          degraded: circuitStats.filter(s => s.state === 'HALF_OPEN').length,
          down: circuitStats.filter(s => s.state === 'OPEN').length,
          openServices: openCircuits.map(s => s.service),
          stats: circuitStats,
        },
        webhookQueue: webhookStats,
        auditPrune: {
          isActive: pruneStatus.isActive,
          lastRunAt: pruneStatus.lastRunAt,
          lastRunDeleted: pruneStatus.lastRunDeleted,
          lastRunDurationMs: pruneStatus.lastRunDurationMs,
        },
        healthy: openCircuits.length === 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
