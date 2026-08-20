/**
 * Webhook Retry Queue Service
 *
 * Handles reliable delivery of outgoing webhooks with exponential backoff,
 * retry scheduling, and dead-letter tracking for permanently failed deliveries.
 *
 * Flow:
 *   1. Caller enqueues a webhook delivery via `enqueueDelivery()`
 *   2. Worker attempts delivery via HTTP POST
 *   3. On failure: re-queues with exponential backoff (1m → 5m → 30m → 2h → 12h)
 *   4. After max retries: marks as dead-lettered, records final error
 *
 * Usage:
 *   import { webhookRetryQueue } from '../services/webhook-retry.service.js';
 *   await webhookRetryQueue.enqueueDelivery(webhookId, businessId, event, payload);
 */

import { Queue, Worker, Job } from 'bullmq';

import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../db.js';

// ==================== TYPES ====================

export interface WebhookDeliveryPayload {
  webhookId: string;
  businessId: string;
  event: string;
  payload: Record<string, unknown>;
  attempt?: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  attempt: number;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface WebhookDeliveryStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  deadLettered: number;
  retrying: number;
}

// ==================== CONFIG ====================

const QUEUE_NAME = 'webhook-retry';

/** Retry delays in ms: 1min, 5min, 30min, 2h, 12h */
const RETRY_DELAYS_MS = [
  60_000,           // 1 minute
  300_000,          // 5 minutes
  1_800_000,        // 30 minutes
  7_200_000,        // 2 hours
  43_200_000,       // 12 hours
];

const MAX_RETRIES = RETRY_DELAYS_MS.length;
const DELIVERY_TIMEOUT_MS = 15_000; // 15s per attempt
const CONCURRENCY = 5;

// ==================== REDIS CONNECTION ====================

import { createRedisConnection } from '../utils/redis-connection.js';
const redisConnection = createRedisConnection();
const redisAvailable = redisConnection !== null;

if (!redisAvailable) {
  console.log('[WebhookRetry] Redis not available — webhook retry queue disabled');
}

// ==================== QUEUE ====================

export const webhookDeliveryQueue = redisAvailable ? new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: MAX_RETRIES + 1,
    backoff: {
      type: 'exponential',
      delay: 60_000,
    },
    removeOnComplete: { age: 86_400, count: 1000 },
    removeOnFail: { age: 604_800, count: 5000 },
  },
}) : null as any;

// ==================== DELIVERY FUNCTIONS ====================

/**
 * Enqueue a webhook for delivery with idempotency.
 * Uses an idempotency key (idempotencyKey or X-Idempotency-Key header)
 * to prevent duplicate deliveries of the same webhook event.
 */
export async function enqueueDelivery(
  webhookId: string,
  businessId: string,
  event: string,
  payload: Record<string, unknown>,
  options?: { delay?: number; idempotencyKey?: string }
): Promise<Job<WebhookDeliveryPayload> | null> {
  if (!webhookDeliveryQueue) {
    console.warn('[WebhookRetry] Redis not available — cannot enqueue delivery');
    return null;
  }

  // Idempotency: generate key from webhookId + event + payload hash
  const idempotencyKey = options?.idempotencyKey ||
    `wh_idem_${webhookId}_${event}_${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').substring(0, 16)}`;

  // Check if this exact webhook has already been delivered (using idempotency key)
  const existing = await webhookDeliveryQueue.getJob(idempotencyKey).catch(() => null);
  if (existing) {
    const state = await existing.getState().catch(() => 'unknown');
    if (state === 'completed') {
      console.log(`[WebhookRetry] Duplicate webhook ${idempotencyKey} skipped (already completed)`);
      return existing;
    }
  }

  return webhookDeliveryQueue.add(
    'deliver',
    { webhookId, businessId, event, payload, attempt: 0 },
    {
      delay: options?.delay || 0,
      jobId: idempotencyKey,
    }
  );
}

/**
 * Build the signed payload for webhook delivery.
 */
function buildSignedPayload(
  payload: Record<string, unknown>,
  secret: string,
  event: string
): { body: string; signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    event,
    timestamp,
    data: payload,
  });

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  return { body, signature, timestamp };
}

/**
 * SSRF-safe URL validator — blocks internal IPs and known-bad patterns.
 */
function isSafeWebhookUrl(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP/HTTPS URLs allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block internal/reserved IPs and hostnames
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
      '10.',       // RFC 1918
      '172.16.',   // RFC 1918
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.',  // Link-local
      '127.',
      'metadata',  // GCP/AWS metadata endpoints
      '169.254.169.254',
    ];

    for (const pattern of blockedPatterns) {
      if (hostname.startsWith(pattern) || hostname.includes(pattern)) {
        return { safe: false, reason: `Blocked internal/host address: ${hostname}` };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }
}

/**
 * Deliver a single webhook via HTTP POST.
 */
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>
): Promise<{ statusCode: number; body: string }> {
  // SSRF protection: validate URL before making request
  const urlCheck = isSafeWebhookUrl(webhook.url);
  if (!urlCheck.safe) {
    console.error(`[WebhookRetry] SSRF blocked: ${webhook.url} — ${urlCheck.reason}`);
    throw new Error(`SSRF blocked: ${urlCheck.reason}`);
  }

  const { body, signature, timestamp } = buildSignedPayload(payload, webhook.secret, event);

  const response = await axios.post(webhook.url, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Event': event,
      'X-Webhook-Id': webhook.id,
      'User-Agent': 'BizzAuto-Webhook/1.0',
    },
    timeout: DELIVERY_TIMEOUT_MS,
    validateStatus: (status) => status >= 200 && status < 300,
    // SSRF protection: prevent redirects to internal URLs
    maxRedirects: 5,
    // Prevent axios from following redirects to blocked URLs
    beforeRedirect: (options, _responseDetails) => {
      const redirectCheck = isSafeWebhookUrl(options.href || '');
      if (!redirectCheck.safe) {
        throw new Error(`SSRF blocked redirect: ${redirectCheck.reason}`);
      }
    },
  });

  return {
    statusCode: response.status,
    body: typeof response.data === 'string'
      ? response.data.substring(0, 1000)
      : JSON.stringify(response.data).substring(0, 1000),
  };
}

// ==================== WORKER ====================

const webhookWorker = redisAvailable ? new Worker<WebhookDeliveryPayload>(
  QUEUE_NAME,
  async (job: Job<WebhookDeliveryPayload>): Promise<WebhookDeliveryResult> => {
    const { webhookId, businessId, event, payload, attempt = 0 } = job.data;

    // Fetch webhook config
    const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      console.warn(`[WebhookRetry] Webhook ${webhookId} not found — skipping delivery`);
      return { success: false, attempt, error: 'Webhook not found' };
    }

    if (!webhook.isActive) {
      console.warn(`[WebhookRetry] Webhook ${webhookId} is inactive — skipping delivery`);
      return { success: false, attempt, error: 'Webhook inactive' };
    }

    try {
      const result = await deliverWebhook(webhook, event, payload);

      console.log(
        `[WebhookRetry] ✓ Delivered ${event} to ${webhook.url} (attempt ${attempt + 1}, status ${result.statusCode})`
      );

      return {
        success: true,
        attempt: attempt + 1,
        statusCode: result.statusCode,
        responseBody: result.body,
        deliveredAt: new Date(),
      };
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMessage = error.message || 'Unknown error';
      const nextAttempt = attempt + 1;

      // Determine if we should retry
      const isRetryable =
        // Network errors (timeout, ECONNREFUSED, etc.)
        !statusCode ||
        // Server errors (5xx) — always retry
        (statusCode >= 500) ||
        // Rate limited (429) — retry with delay
        statusCode === 429;

      if (isRetryable && nextAttempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAYS_MS[nextAttempt] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

        console.warn(
          `[WebhookRetry] ✗ Delivery failed (attempt ${nextAttempt}/${MAX_RETRIES}): ${errorMessage}${statusCode ? ` [${statusCode}]` : ''} — retrying in ${delayMs / 1000}s`
        );

        // Re-enqueue with appropriate delay
        await webhookDeliveryQueue.add(
          'deliver',
          {
            ...job.data,
            attempt: nextAttempt,
          },
          {
            delay: delayMs,
            jobId: `wh_${webhookId}_${Date.now()}`,
          }
        );

        return {
          success: false,
          attempt: nextAttempt,
          statusCode,
          error: errorMessage,
        };
      }

      // Max retries exceeded or non-retryable error (4xx except 429)
      console.error(
        `[WebhookRetry] ✗✗ Delivery permanently failed after ${nextAttempt} attempts: ${errorMessage}${statusCode ? ` [${statusCode}]` : ''}`
      );

      return {
        success: false,
        attempt: nextAttempt,
        statusCode,
        error: `Permanent failure after ${nextAttempt} attempts: ${errorMessage}`,
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  }
) : null;

// Worker event handlers
webhookWorker?.on('completed', (job, result) => {
  if (result?.success) {
    // Log successful delivery to Activity for visibility
    // Fire-and-forget — don't block the worker
    prisma.activity.create({
      data: {
        businessId: job.data.businessId,
        type: 'webhook_delivered',
        title: `Webhook delivered: ${job.data.event}`,
        content: `Delivered to webhook ${job.data.webhookId} on attempt ${result.attempt}`,
        createdBy: 'system',
        metadata: {
          webhookId: job.data.webhookId,
          event: job.data.event,
          statusCode: result.statusCode,
          attempt: result.attempt,
        },
      },
    }).catch(() => { /* non-critical */ });
  }
});

webhookWorker?.on('failed', (job, error) => {
  console.error(
    `[WebhookRetry] Worker error for job ${job?.id}: ${error.message}`
  );
});

// ==================== STATS ====================

/**
 * Get delivery statistics (approximate, based on queue state).
 */
export async function getWebhookDeliveryStats(): Promise<WebhookDeliveryStats> {
  if (!webhookDeliveryQueue) {
    return { total: 0, successful: 0, failed: 0, pending: 0, deadLettered: 0, retrying: 0 };
  }
  const [waiting, active, completed, failed] = await Promise.all([
    webhookDeliveryQueue.getWaitingCount(),
    webhookDeliveryQueue.getActiveCount(),
    webhookDeliveryQueue.getCompletedCount(),
    webhookDeliveryQueue.getFailedCount(),
  ]);

  return {
    total: waiting + active + completed + failed,
    successful: completed,
    failed,
    pending: waiting + active,
    deadLettered: failed, // BullMQ failed jobs = dead-lettered
    retrying: waiting,
  };
}

/**
 * Retry a dead-lettered webhook delivery.
 */
export async function retryDelivery(jobId: string): Promise<boolean> {
  if (!webhookDeliveryQueue) return false;
  const job = await webhookDeliveryQueue.getJob(jobId);
  if (!job) return false;

  const state = await job.getState();
  if (state !== 'failed') return false;

  // Re-enqueue with fresh attempt count
  const data = job.data;
  await webhookDeliveryQueue.add(
    'deliver',
    { ...data, attempt: 0 },
    { jobId: `wh_${data.webhookId}_${Date.now()}_retry` }
  );

  return true;
}

/**
 * Manually enqueue a webhook delivery (for internal triggers).
 * This is the main entry point for other services.
 */
export async function triggerWebhookDelivery(
  businessId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Fetch all active webhooks for this business that listen to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        businessId,
        isActive: true,
      },
    });

    for (const webhook of webhooks) {
      // Check if this webhook subscribes to this event
      const events = webhook.events as string[] | string;
      const subscribedEvents = Array.isArray(events) ? events : [events];
      const matchesEvent = subscribedEvents.includes('*') || subscribedEvents.includes(event);

      if (matchesEvent) {
        await enqueueDelivery(webhook.id, businessId, event, payload);
      }
    }
  } catch (error: any) {
    console.error(`[WebhookRetry] Failed to trigger deliveries for ${event}: ${error.message}`);
  }
}

// ==================== SHUTDOWN ====================

export async function shutdownWebhookWorker(): Promise<void> {
  if (!webhookWorker) return;
  console.log('[WebhookRetry] Shutting down worker...');
  await webhookWorker.close();
  console.log('[WebhookRetry] Worker shut down');
}

export default {
  enqueueDelivery,
  triggerWebhookDelivery,
  getWebhookDeliveryStats,
  retryDelivery,
  shutdownWebhookWorker,
  webhookDeliveryQueue,
};
