import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../db.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { EvolutionApiService } from '../services/evolution.service.js';
import { FollowUpEngineService } from '../services/followup-engine.service.js';
import { createRedisConnection } from '../utils/redis-connection.js';

/**
 * Smart send: detects which WhatsApp channel is configured and routes accordingly.
 */
async function smartSendText(businessId: string, to: string, message: string): Promise<any> {
  const evoIntegration = await prisma.integration.findFirst({
    where: { businessId, type: 'evolution_api', isActive: true },
  });
  if (evoIntegration) {
    try {
      return await EvolutionApiService.sendText(businessId, to, message);
    } catch (e) {
      console.warn('[Worker] Evolution API failed, falling back to Meta');
    }
  }
  return await WhatsAppService.sendTextMessage(businessId, to, message);
}

const redisConnection = createRedisConnection();

async function withCampaignLock<T>(
  campaignId: string,
  fn: () => Promise<T>,
  lockTimeoutSeconds = 120
): Promise<T> {
  if (!redisConnection) return fn();

  const lockKey = `outreach:lock:${campaignId}`;
  const lockValue = Date.now().toString();

  const acquired = await redisConnection.set(lockKey, lockValue, 'EX', lockTimeoutSeconds, 'NX');
  if (!acquired) {
    throw new Error(`Campaign ${campaignId} is already being processed by another worker`);
  }

  try {
    return await fn();
  } finally {
    const current = await redisConnection.get(lockKey);
    if (current === lockValue) {
      await redisConnection.del(lockKey);
    }
  }
}

if (!redisConnection) {
  console.log('[Outreach Worker] Redis not available — worker disabled');
}

// Queue for outreach messages
export const outreachQueue = redisConnection ? new Queue('outreach-messages', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
}) : null;

// Queue for follow-up processing
export const followUpQueue = redisConnection ? new Queue('followup-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
  },
}) : null;

// Outreach message worker
const outreachWorker = redisConnection ? new Worker(
  'outreach-messages',
  async (job: Job) => {
    const { type } = job.data;

    if (type === 'send-single') {
      const { businessId, campaignId, contactId, messageType } = job.data;
      const contact = await prisma.contact.findFirst({ where: { id: contactId, businessId } });
      if (!contact?.phone) throw new Error('Contact phone not found');

      const outreachLog = await prisma.outreachLog.findFirst({
        where: { campaignId, contactId, messageType: messageType || 'initial' },
      });
      if (!outreachLog) throw new Error('Outreach log not found');

      if (outreachLog.status !== 'pending') {
        return { skipped: true, reason: `Already ${outreachLog.status}` };
      }

      let result;
      try {
        result = await smartSendText(businessId, contact.phone, outreachLog.message);
      } catch (error: any) {
        if (error.response?.status === 429) {
          await new Promise(r => setTimeout(r, 30000));
          result = await smartSendText(businessId, contact.phone, outreachLog.message);
        } else {
          throw error;
        }
      }

      await prisma.outreachLog.update({
        where: { id: outreachLog.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          whatsappMsgId: result?.messages?.[0]?.id || result?.messageId || null,
        },
      });

      await prisma.outreachCampaign.update({
        where: { id: campaignId },
        data: { sent: { increment: 1 } },
      });

      const pendingCount = await prisma.outreachLog.count({
        where: { campaignId, status: { in: ['pending', 'processing'] } }
      });
      if (pendingCount === 0) {
        await prisma.outreachCampaign.update({
          where: { id: campaignId },
          data: { status: 'completed' }
        });
      }

      return { success: true, contactId };
    }

    if (type === 'send-bulk') {
      const { businessId, campaignId, messageType, maxMessages = 30 } = job.data;

      try {
        return await withCampaignLock(campaignId, async () => {
          const pendingLogs = await prisma.outreachLog.findMany({
            where: { campaignId, messageType: messageType || 'initial', status: 'pending' },
            include: { contact: true },
            take: Math.min(maxMessages, 50),
          });

          const logIds = pendingLogs.map(l => l.id);
          if (logIds.length > 0) {
            await prisma.outreachLog.updateMany({
              where: { id: { in: logIds } },
              data: { status: 'processing' },
            });
          }

          let sent = 0;
          let errors = 0;
          const CONCURRENCY_LIMIT = 3;

          async function processBatch(logs: typeof pendingLogs) {
            const results = await Promise.allSettled(
              logs.map(async (log) => {
                if (!log.contact?.phone) return;
                let result;
                try {
                  result = await smartSendText(businessId, log.contact.phone, log.message);
                } catch (error: any) {
                  if (error.response?.status === 429) {
                    await new Promise(r => setTimeout(r, 30000));
                    result = await smartSendText(businessId, log.contact.phone, log.message);
                  } else {
                    throw error;
                  }
                }
                await prisma.outreachLog.update({
                  where: { id: log.id },
                  data: { status: 'sent', sentAt: new Date(), whatsappMsgId: result?.messages?.[0]?.id || result?.messageId || null },
                });
                return true;
              })
            );

            for (const r of results) {
              if (r.status === 'fulfilled' && r.value) {
                sent++;
              } else {
                errors++;
              }
            }
          }

          for (let i = 0; i < pendingLogs.length; i += CONCURRENCY_LIMIT) {
            const campaignCheck = await prisma.outreachCampaign.findUnique({ where: { id: campaignId } });
            if (campaignCheck?.status === 'paused') break;

            const batch = pendingLogs.slice(i, i + CONCURRENCY_LIMIT);
            await processBatch(batch);

            if (i + CONCURRENCY_LIMIT < pendingLogs.length) {
              await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
            }
          }

          await prisma.outreachCampaign.update({
            where: { id: campaignId },
            data: { sent: { increment: sent } },
          });

          const remaining = await prisma.outreachLog.count({
            where: { campaignId, status: { in: ['pending', 'processing'] } },
          });
          if (remaining === 0) {
            await prisma.outreachCampaign.update({
              where: { id: campaignId },
              data: { status: 'completed' },
            });
          }

          return { sent, errors };
        });
      } catch (error: any) {
        if (error.message?.includes('already being processed')) {
          return { skipped: true, reason: 'Campaign already being processed' };
        }
        throw error;
      }
    }

    if (type === 'process-followups') {
      const { businessId } = job.data;
      return await FollowUpEngineService.processFollowUps(businessId);
    }
  },
  { connection: redisConnection, concurrency: 5 }
) : null;

// Follow-up scheduler worker (runs periodically)
const followUpWorker = redisConnection ? new Worker(
  'followup-processing',
  async (job: Job) => {
    const { type, businessId, campaignId } = job.data;

    if (type === 'schedule-followups') {
      return await FollowUpEngineService.scheduleFollowUps({ businessId, campaignId });
    }

    if (type === 'process-pending-followups') {
      return await FollowUpEngineService.processFollowUps(businessId);
    }
  },
  { connection: redisConnection, concurrency: 3 }
) : null;

// Export workers
export const workers = {
  outreach: outreachWorker,
  followUp: followUpWorker,
};

// Graceful shutdown
export async function shutdownOutreachWorkers() {
  if (!redisConnection) return;
  await Promise.all([
    outreachWorker?.close(),
    followUpWorker?.close(),
  ]);
  await redisConnection?.quit();
}

process.on('SIGTERM', shutdownOutreachWorkers);
process.on('SIGINT', shutdownOutreachWorkers);

export default { queue: outreachQueue, followUpQueue, workers };
