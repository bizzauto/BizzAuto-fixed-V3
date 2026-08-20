/**
 * Durable scheduled-send worker.
 *
 * The previous drip implementation wrote rows into `DripQueue` (one per
 * contact per step) but NOTHING ever consumed them, so drip campaigns never
 * actually sent. This worker makes that durable:
 *
 *   1. `ScheduledSendPoller` wakes on an interval and enqueues every
 *      `DripQueue` row whose `sendAt` is due and `status === 'pending'` onto
 *      the BullMQ `scheduled-sends` queue (with a BullMQ `delay` if it's
 *      slightly in the future, so the job fires exactly at sendAt).
 *   2. The `scheduled-sends` Worker reads each job, re-checks the business
 *      send-window (see send-window.service), and dispatches the WhatsApp
 *      message via the existing WhatsAppService, then marks the row `sent`
 *      (or `failed` with the error).
 *
 * This is durable across restarts (BullMQ + Redis), unlike the old
 * workflow `setTimeout` approach. It reuses WhatsAppService so the official
 * Meta Cloud API and proxy routing are preserved.
 */
import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../db.js';
import { createRedisConnection } from '../utils/redis-connection.js';
import { isWithinSendWindow, nextAllowedTime, getSendWindow } from '../services/send-window.service.js';
import { WhatsAppService } from '../services/whatsapp.service.js';

export const SCHEDULED_SEND_QUEUE = 'scheduled-sends';
const POLL_INTERVAL_MS = 15_000;

const redisConnection = createRedisConnection();
const redisAvailable = redisConnection !== null && redisConnection.status === 'ready';

export const scheduledSendQueue: Queue | null = redisAvailable
  ? new Queue(SCHEDULED_SEND_QUEUE, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86_400, count: 1000 },
        removeOnFail: { age: 604_800, count: 5000 },
      },
    })
  : null;

let scheduledSendWorker: Worker | null = null;
let pollTimer: NodeJS.Timeout | null = null;

/**
 * Enqueue a single DripQueue send. Resolves the BullMQ `delay` so the job
 * runs as close to `sendAt` as possible.
 */
export async function enqueueDripSend(dripId: string): Promise<void> {
  if (!scheduledSendQueue) return;
  const drip = await prisma.dripQueue.findUnique({ where: { id: dripId } });
  if (!drip || drip.status !== 'pending') return;

  const delay = Math.max(0, drip.sendAt.getTime() - Date.now());
  await scheduledSendQueue.add(
    'send-drip',
    { dripId },
    { delay: Math.min(delay, 7 * 24 * 60 * 60 * 1000), jobId: `drip:${dripId}` }
  );
}

/**
 * Scan for due DripQueue rows and enqueue them. Called by the poller and can
 * be triggered manually after a drip campaign is created.
 */
export async function pollDueDripSends(): Promise<number> {
  if (!scheduledSendQueue) return 0;
  const due = await prisma.dripQueue.findMany({
    where: { status: 'pending', sendAt: { lte: new Date() } },
    select: { id: true },
    take: 250,
  });
  for (const row of due) {
    await enqueueDripSend(row.id);
  }
  return due.length;
}

async function processDripSend(dripId: string): Promise<void> {
  const drip = await prisma.dripQueue.findUnique({
    where: { id: dripId },
    include: { campaign: true, contact: true },
  });

  if (!drip || drip.status !== 'pending') return;

  const businessId = drip.campaign?.businessId;
  if (!businessId) {
    await markFailed(dripId, 'Campaign or business missing');
    return;
  }

  // Respect business send-window: defer if outside allowed hours.
  const allowed = await isWithinSendWindow(businessId);
  if (!allowed) {
    const window = await getSendWindow(businessId);
    const deferred = nextAllowedTime(window, new Date());
    const delay = Math.max(0, deferred.getTime() - Date.now());
    // Re-enqueue with a fresh delay; mark row pending so the poller doesn't
    // re-pick it (we've already moved it to the queue).
    await prisma.dripQueue.update({
      where: { id: dripId },
      data: { sendAt: deferred },
    });
    if (scheduledSendQueue) {
      await scheduledSendQueue.add(
        'send-drip',
        { dripId },
        { delay: Math.min(delay, 7 * 24 * 60 * 60 * 1000), jobId: `drip:${dripId}` }
      );
    }
    return;
  }

  const phone = drip.contact?.phone;
  const message = buildDripMessage(drip);
  if (!phone || !message) {
    await markFailed(dripId, 'Missing contact phone or message content');
    return;
  }

  try {
    await WhatsAppService.sendTextMessage(businessId, phone, message, {
      messageId: drip.contactId,
    });
    await prisma.dripQueue.update({
      where: { id: dripId },
      data: { status: 'sent', sentAt: new Date() },
    });
  } catch (error: any) {
    await markFailed(dripId, error?.message || 'Send failed');
    throw error;
  }
}

function buildDripMessage(drip: { campaign?: { name?: string | null; content?: any } | null }): string {
  const content = drip.campaign?.content;
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object' && typeof content.message === 'string') {
    return content.message;
  }
  return drip.campaign?.name || 'Message from your business';
}

async function markFailed(dripId: string, error: string): Promise<void> {
  await prisma.dripQueue.update({
    where: { id: dripId },
    data: { status: 'failed', error: String(error).slice(0, 500) },
  });
}

export function startScheduledSendWorker(): void {
  if (!redisAvailable || !redisConnection) {
    console.log('[ScheduledSend] Redis unavailable — drip sends disabled.');
    return;
  }

  scheduledSendWorker = new Worker(
    SCHEDULED_SEND_QUEUE,
    async (job: Job) => {
      const { dripId } = job.data as { dripId: string };
      await processDripSend(dripId);
    },
    { connection: redisConnection, concurrency: 8 }
  );

  scheduledSendWorker.on('failed', (job, err) => {
    console.error(`[ScheduledSend] job ${job?.id} failed:`, err?.message);
  });

  // Initial sweep + recurring poll.
  pollDueDripSends().catch((e) => console.error('[ScheduledSend] initial poll error:', e.message));
  pollTimer = setInterval(() => {
    pollDueDripSends().catch((e) => console.error('[ScheduledSend] poll error:', e.message));
  }, POLL_INTERVAL_MS);

  console.log('[ScheduledSend] worker started (poll every 15s).');
}

export async function stopScheduledSendWorker(): Promise<void> {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  await scheduledSendWorker?.close();
  scheduledSendWorker = null;
}

export default { scheduledSendQueue, startScheduledSendWorker, stopScheduledSendWorker, enqueueDripSend, pollDueDripSends };
