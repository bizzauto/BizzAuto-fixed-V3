import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../db.js';
import { GBPAutoPostService } from '../services/gbp-auto-post.service.js';
import { createRedisConnection } from '../utils/redis-connection.js';

// Redis connection
const redisConnection = createRedisConnection();

if (!redisConnection) {
  console.log('[GBP Auto-Post] Redis not available — worker disabled');
}

// Queue for GBP auto-posts (only if Redis available)
export const gbpAutoPostQueue = redisConnection ? new Queue('gbp-auto-post', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
}) : null;

/**
 * GBP Auto-Post Worker
 * Runs every minute to check if any business needs an auto-post
 */
const gbpAutoPostWorker = redisConnection ? new Worker(
  'gbp-auto-post',
  async (job: Job) => {
    const { type, businessId } = job.data;

    if (type === 'check-and-post') {
      // Get all businesses with GBP auto-post enabled
      const businesses = await prisma.business.findMany({
        where: {
          gbpAutoPostEnabled: true,
          gbpAccessToken: { not: null },
          gbpAccountId: { not: null },
          gbpLocationId: { not: null },
        },
        select: {
          id: true,
          name: true,
          gbpAutoPostTime: true,
          gbpAutoPostTimezone: true,
          gbpAutoPostDays: true,
        },
      });

      const results: any[] = [];

      for (const business of businesses) {
        try {
          // Check if it's time to post for this business
          const shouldPost = await GBPAutoPostService.shouldAutoPost(business.id);

          if (shouldPost) {
            console.log(`⏰ Auto-post time for business: ${business.name} (${business.id})`);
            const result = await GBPAutoPostService.executeAutoPost(business.id);
            results.push({
              businessId: business.id,
              businessName: business.name,
              ...result,
            });

            if (result.success) {
              console.log(`✅ Auto-post created for ${business.name}: ${result.postId}`);
            } else {
              console.log(`❌ Auto-post failed for ${business.name}: ${result.message}`);
            }
          }
        } catch (error: any) {
          console.error(`Error processing auto-post for business ${business.id}:`, error.message);
          results.push({
            businessId: business.id,
            businessName: business.name,
            success: false,
            message: error.message,
          });
        }
      }

      return {
        checked: businesses.length,
        posted: results.filter(r => r.success).length,
        results,
      };
    }

    // Handle single business post
    if (type === 'post-business' && businessId) {
      const result = await GBPAutoPostService.executeAutoPost(businessId);
      return result;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
) : null;

/**
 * Schedule recurring check every minute
 */
export async function startAutoPostScheduler() {
  if (!gbpAutoPostQueue) {
    console.log('[GBP Auto-Post] Redis not available — scheduler disabled');
    return;
  }
  // Add initial check job
  await gbpAutoPostQueue.add(
    'check-all-businesses',
    { type: 'check-and-post' },
    {
      repeat: {
        every: 60000, // Every minute
      },
      jobId: 'gbp-auto-post-scheduler',
    }
  );

  console.log('📅 GBP Auto-Post Scheduler started (checks every minute)');
}

/**
 * Stop the auto-post scheduler
 */
export async function stopAutoPostScheduler() {
  if (!gbpAutoPostQueue) return;
  const repeatableJobs = await gbpAutoPostQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await (gbpAutoPostQueue as any).removeRepeatable(job.key);
  }
  console.log('📅 GBP Auto-Post Scheduler stopped');
}

// Worker event handlers
gbpAutoPostWorker?.on('completed', (job) => {
  if (job.data.type === 'check-and-post') {
    console.log(`✅ Auto-post check completed: ${job.returnvalue?.posted || 0} posts created`);
  }
});

gbpAutoPostWorker?.on('failed', (job, err) => {
  console.error(`❌ Auto-post job failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await stopAutoPostScheduler();
  await gbpAutoPostWorker?.close();
  await gbpAutoPostQueue?.close();
  await redisConnection?.quit();
});

process.on('SIGINT', async () => {
  await stopAutoPostScheduler();
  await gbpAutoPostWorker?.close();
  await gbpAutoPostQueue?.close();
  await redisConnection?.quit();
});

export default {
  queue: gbpAutoPostQueue,
  worker: gbpAutoPostWorker,
  start: startAutoPostScheduler,
  stop: stopAutoPostScheduler,
};