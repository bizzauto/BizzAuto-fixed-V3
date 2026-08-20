import { prisma } from '../db.js';
import { FollowUpEngineService } from './followup-engine.service.js';
import { outreachQueue } from '../workers/outreach.worker.js';
import { startAutoPostScheduler } from '../workers/gbp-auto-post.worker.js';
import { createRedisConnection } from '../utils/redis-connection.js';

/**
 * Scheduler Service
 * Central coordinator for all background automation:
 * - Follow-up scheduling & processing (outreach campaigns)
 * - Drip campaign queue processing
 * - GBP auto-post checks
 *
 * This replaces manual API buttons with true automatic execution.
 */
export class SchedulerService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  private static dripIntervalId: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;
  private static lastRun = 0;

  /**
   * Start all schedulers
   * Call once at worker process boot
   */
  static async start(): Promise<void> {
    if (SchedulerService.isRunning) {
      console.log('[Scheduler] Already running, skipping duplicate start');
      return;
    }

    console.log('[Scheduler] 🚀 Starting auto-pilot engine...');

    // 1. Start GBP auto-post scheduler (runs every minute via BullMQ repeat)
    try {
      await startAutoPostScheduler();
      console.log('[Scheduler] ✅ GBP auto-post scheduler started');
    } catch (error: any) {
      console.error('[Scheduler] ❌ GBP auto-post scheduler failed to start:', error.message);
    }

    // 2. Start follow-up/drip cron (every 5 minutes)
    SchedulerService.intervalId = setInterval(async () => {
      await SchedulerService.runFollowUpCron();
    }, 5 * 60 * 1000); // 5 minutes

    // 3. Start drip queue processor (every 1 minute)
    SchedulerService.dripIntervalId = setInterval(async () => {
      await SchedulerService.processDripQueue();
    }, 60 * 1000); // 1 minute

    // 4. Run immediately on start
    await SchedulerService.runFollowUpCron();
    await SchedulerService.processDripQueue();

    SchedulerService.isRunning = true;
    console.log('[Scheduler] ✅ Auto-pilot engine running (follow-up: 5min, drip: 1min)');
  }

  /**
   * Stop all schedulers gracefully
   */
  static async stop(): Promise<void> {
    if (SchedulerService.intervalId) {
      clearInterval(SchedulerService.intervalId);
      SchedulerService.intervalId = null;
    }
    if (SchedulerService.dripIntervalId) {
      clearInterval(SchedulerService.dripIntervalId);
      SchedulerService.dripIntervalId = null;
    }
    SchedulerService.isRunning = false;
    console.log('[Scheduler] 🛑 Auto-pilot engine stopped');
  }

  /**
   * Follow-up cron: schedule & process follow-ups for all active campaigns
   * Runs every 5 minutes
   */
  static async runFollowUpCron(): Promise<{ scheduled: number; sent: number; errors: number }> {
    const start = Date.now();
    SchedulerService.lastRun = start;

    try {
      // Find businesses with active outreach campaigns
      const activeCampaigns = await prisma.outreachCampaign.findMany({
        where: { status: 'active' },
        select: { id: true, businessId: true },
      });

      let totalScheduled = 0;
      let totalSent = 0;
      let totalErrors = 0;

      for (const campaign of activeCampaigns) {
        try {
          // Schedule follow-ups for this campaign
          const scheduleResult = await FollowUpEngineService.scheduleFollowUps({
            businessId: campaign.businessId,
            campaignId: campaign.id,
          });
          totalScheduled += scheduleResult.scheduled;

          // Process pending follow-ups (worker also does this, but cron ensures coverage)
          const processResult = await FollowUpEngineService.processFollowUps(campaign.businessId);
          totalSent += processResult.sent;
          totalErrors += processResult.errors;
        } catch (error: any) {
          console.error(`[Scheduler] Campaign ${campaign.id} follow-up error:`, error.message);
          totalErrors++;
        }
      }

      const duration = Date.now() - start;
      console.log(`[Scheduler] Follow-up cron done: scheduled=${totalScheduled}, sent=${totalSent}, errors=${totalErrors}, ${duration}ms`);

      return { scheduled: totalScheduled, sent: totalSent, errors: totalErrors };
    } catch (error: any) {
      console.error('[Scheduler] Follow-up cron failed:', error.message);
      return { scheduled: 0, sent: 0, errors: 1 };
    }
  }

  /**
   * Process drip queue: send scheduled drip messages that are due
   * Runs every 1 minute for near-real-time delivery
   */
  static async processDripQueue(): Promise<{ sent: number; errors: number }> {
    try {
      const now = new Date();

      // Find due drip messages
      const dueDrips = await prisma.dripQueue.findMany({
        where: {
          status: 'pending',
          sendAt: { lte: now },
        },
        include: {
          campaign: { select: { id: true, businessId: true, content: true } },
          contact: { select: { id: true, phone: true, name: true } },
        },
        take: 50,
      });

      if (dueDrips.length === 0) return { sent: 0, errors: 0 };

      let sent = 0;
      let errors = 0;

      for (const drip of dueDrips) {
        try {
          if (!drip.contact?.phone) {
            await prisma.dripQueue.update({
              where: { id: drip.id },
              data: { status: 'failed', error: 'Contact phone missing' },
            });
            errors++;
            continue;
          }

          // Use outreachQueue for reliable delivery with retries
          if (outreachQueue) {
            const messageContent = (drip.campaign.content as any)?.message ||
              drip.campaign.name || '';

            await outreachQueue.add('send-single', {
              businessId: drip.campaign.businessId,
              campaignId: drip.campaign.id,
              contactId: drip.contact.id,
              messageType: `drip_${drip.step}`,
              message: messageContent,
            }, {
              delay: Math.floor(Math.random() * 2000) + 1000, // 1-3s jitter
            });
          }

          await prisma.dripQueue.update({
            where: { id: drip.id },
            data: { status: 'queued' },
          });
          sent++;
        } catch (error: any) {
          await prisma.dripQueue.update({
            where: { id: drip.id },
            data: { status: 'failed', error: error.message },
          });
          errors++;
        }
      }

      if (sent > 0 || errors > 0) {
        console.log(`[Scheduler] Drip queue: sent=${sent}, errors=${errors}`);
      }

      return { sent, errors };
    } catch (error: any) {
      console.error('[Scheduler] Drip queue processor failed:', error.message);
      return { sent: 0, errors: 1 };
    }
  }

  /**
   * Get scheduler status for monitoring
   */
  static getStatus(): { running: boolean; lastRun: number } {
    return { running: SchedulerService.isRunning, lastRun: SchedulerService.lastRun };
  }

  /**
   * Manual trigger for follow-up cron (useful for testing)
   */
  static async triggerFollowUpCron(): Promise<{ scheduled: number; sent: number; errors: number }> {
    return SchedulerService.runFollowUpCron();
  }

  /**
   * Manual trigger for drip queue (useful for testing)
   */
  static async triggerDripQueue(): Promise<{ sent: number; errors: number }> {
    return SchedulerService.processDripQueue();
  }
}

export default SchedulerService;