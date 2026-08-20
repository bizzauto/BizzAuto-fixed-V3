import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { EmailService } from '../services/email.service.js';
import { GoogleSheetsService } from '../services/google-sheets.service.js';
import { prisma } from '../index.js';

// Redis connection
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

// Queues
export const queues = {
  whatsappMessages: new Queue('whatsapp-messages', { connection: redisConnection }),
  emails: new Queue('emails', { connection: redisConnection }),
  socialPublish: new Queue('social-publish', { connection: redisConnection }),
  googleSheetsSync: new Queue('google-sheets-sync', { connection: redisConnection }),
  leadProcessing: new Queue('lead-processing', { connection: redisConnection }),
  campaignScheduler: new Queue('campaign-scheduler', { connection: redisConnection }),
};

/**
 * Job Workers
 */

// WhatsApp Message Worker
const whatsappWorker = new Worker(
  'whatsapp-messages',
  async (job: Job) => {
    // Handle scheduled messages
    if (job.name === 'scheduled-message') {
      const { scheduledMessageId, businessId } = job.data;
      const scheduled = await prisma.scheduledMessage.findUnique({
        where: { id: scheduledMessageId },
      });

      if (!scheduled || scheduled.status !== 'pending') {
        return { skipped: true, reason: 'Message no longer pending' };
      }

      try {
        let result;
        if (scheduled.type === 'text') {
          result = await WhatsAppService.sendTextMessage(businessId, scheduled.phone, scheduled.content || '', {
            messageId: scheduled.contactId || undefined,
          });
        } else if (scheduled.type === 'template') {
          result = await WhatsAppService.sendTemplate(
            businessId, scheduled.phone, scheduled.templateName || '',
            scheduled.templateLanguage || 'en',
            scheduled.templateVars as string[] || [],
          );
        } else if (scheduled.type === 'media') {
          result = await WhatsAppService.sendMedia(
            businessId, scheduled.phone,
            scheduled.mediaUrl || '', scheduled.mediaType || 'image',
            scheduled.content || undefined,
          );
        }

        await prisma.scheduledMessage.update({
          where: { id: scheduledMessageId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            waMessageId: result?.messages?.[0]?.id || result?.messageId,
          },
        });

        return { success: true, scheduledMessageId };
      } catch (error: any) {
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessageId },
          data: {
            status: 'failed',
            error: error.message || 'Failed to send scheduled message',
          },
        });
        throw error;
      }
    }

    // Handle regular messages
    const { businessId, to, type, content, templateName, variables, contactId, useProxy } = job.data;

    if (type === 'text') {
      return await WhatsAppService.sendTextMessage(businessId, to, content, {
        messageId: contactId,
        useProxy,
      });
    } else if (type === 'template') {
      return await WhatsAppService.sendTemplate(businessId, to, templateName, 'en', variables, {
        useProxy,
      });
    } else if (type === 'media') {
      const { mediaUrl, mediaType, caption } = job.data;
      return await WhatsAppService.sendMedia(businessId, to, mediaUrl, mediaType, caption, {
        useProxy,
      });
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// Email Worker
const emailWorker = new Worker(
  'emails',
  async (job: Job) => {
    const { businessId, to, subject, text, html, attachments } = job.data;

    return await EmailService.sendEmail(businessId, {
      to,
      subject,
      text,
      html,
      attachments,
    });
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Social Media Publishing Worker
const socialPublishWorker = new Worker(
  'social-publish',
  async (job: Job) => {
    const { postId, businessId } = job.data;

    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.status !== 'scheduled') {
      throw new Error('Post not found or not scheduled');
    }

    // Publish to each platform
    const results: any = {};

    for (const platform of post.platforms) {
      try {
        if (platform === 'facebook') {
          results.facebook = await publishToFacebook(businessId, post);
        } else if (platform === 'instagram') {
          results.instagram = await publishToInstagram(businessId, post);
        } else if (platform === 'linkedin') {
          results.linkedin = await publishToLinkedIn(businessId, post);
        } else if (platform === 'twitter') {
          results.twitter = await publishToTwitter(businessId, post);
        } else if (platform === 'google_gbp') {
          results.google_gbp = await publishToGBP(businessId, post);
        }
      } catch (error: any) {
        results[platform] = { success: false, error: error.message };
      }
    }

    // Update post status
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        platformPostIds: results as any,
      },
    });

    return results;
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Google Sheets Sync Worker
const googleSheetsSyncWorker = new Worker(
  'google-sheets-sync',
  async (job: Job) => {
    const { businessId, type, options } = job.data;

    if (type === 'sync_contacts') {
      return await GoogleSheetsService.syncContacts(businessId, options);
    } else if (type === 'import_contacts') {
      return await GoogleSheetsService.importContacts(businessId, options);
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

// Lead Processing Worker
const leadProcessingWorker = new Worker(
  'lead-processing',
  async (job: Job) => {
    const { businessId, leadData, source } = job.data;

    // Process lead and send auto-replies
    // This is handled by LeadCaptureService directly in webhooks
    return { processed: true, source };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// Campaign Scheduler Worker
const campaignSchedulerWorker = new Worker(
  'campaign-scheduler',
  async (job: Job) => {
    const { campaignId } = job.data;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get target contacts
    const contacts = await prisma.contact.findMany({
      where: {
        businessId: campaign.businessId,
        ...(campaign.targetTags?.length > 0 && {
          tags: { hasSome: campaign.targetTags },
        }),
      },
    });

    // Queue messages
    for (const contact of contacts) {
      await queues.whatsappMessages.add(
        'send_message',
        {
          businessId: campaign.businessId,
          to: contact.phone,
          type: 'template',
          templateName: campaign.templateName,
          variables: campaign.templateVars || [],
          contactId: contact.id,
          campaignId: campaign.id,
        },
        {
          delay: campaign.scheduledAt
            ? new Date(campaign.scheduledAt).getTime() - Date.now()
            : 0,
        }
      );
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'active',
        startedAt: new Date(),
        totalSent: contacts.length,
      },
    });

    return { queued: contacts.length };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/**
 * Social Media Publishing Functions
 */

async function publishToFacebook(businessId: string, post: any) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { fbPageId: true, fbAccessToken: true },
  });

  if (!business?.fbPageId || !business?.fbAccessToken) {
    throw new Error('Facebook not configured');
  }

  const axios = await import('axios');
  const { decrypt } = await import('../utils/auth.js');
  const accessToken = decrypt(business.fbAccessToken);

  const response = await axios.default.post(
    `https://graph.facebook.com/v18.0/${business.fbPageId}/feed`,
    {
      message: post.content,
      access_token: accessToken,
      ...(post.mediaUrls?.length > 0 && {
        attached_media: post.mediaUrls.map((url: string) => JSON.stringify({ url })),
      }),
    }
  );

  return { success: true, postId: response.data.id };
}

async function publishToInstagram(businessId: string, post: any) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { igUserId: true, igAccessToken: true },
  });

  if (!business?.igUserId || !business?.igAccessToken) {
    throw new Error('Instagram not configured');
  }

  const axios = await import('axios');
  const { decrypt } = await import('../utils/auth.js');
  const accessToken = decrypt(business.igAccessToken);
  const igBusinessId = business.igUserId;

  // Instagram requires two-step process: create container, then publish
  let creationId: string;

  if (post.mediaUrls && post.mediaUrls.length > 0) {
    const mediaUrl = post.mediaUrls[0];
    
    // Step 1: Create media container
    const containerRes = await axios.default.post(
      `https://graph.facebook.com/v18.0/${igBusinessId}/media`,
      {
        image_url: mediaUrl,
        caption: post.content || '',
        access_token: accessToken,
      }
    );
    
    creationId = containerRes.data.id;
    
    // Wait for media processing (Instagram needs time)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Publish the container
    const publishRes = await axios.default.post(
      `https://graph.facebook.com/v18.0/${igBusinessId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );
    
    return { success: true, instagramPostId: publishRes.data.id };
  } else {
    throw new Error('Instagram requires media (image/video). Text-only posts not supported.');
  }
}

async function publishToLinkedIn(businessId: string, post: any) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { linkedinPageId: true, linkedinAccessToken: true },
  });

  if (!business?.linkedinPageId || !business?.linkedinAccessToken) {
    throw new Error('LinkedIn not configured');
  }

  const axios = await import('axios');
  const { decrypt } = await import('../utils/auth.js');
  const accessToken = decrypt(business.linkedinAccessToken);

  const response = await axios.default.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author: `urn:li:organization:${business.linkedinPageId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: post.content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );

  return { success: true, postId: response.data.id };
}

async function publishToTwitter(businessId: string, post: any) {
  // Twitter API v2 implementation
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { twitterUserId: true, twitterAccessToken: true },
  });

  if (!business?.twitterUserId || !business?.twitterAccessToken) {
    throw new Error('Twitter not configured');
  }

  const axios = await import('axios');
  const { decrypt } = await import('../utils/auth.js');
  const accessToken = decrypt(business.twitterAccessToken);

  const response = await axios.default.post(
    'https://api.twitter.com/2/tweets',
    { text: post.content },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { success: true, tweetId: response.data.data.id };
}

async function publishToGBP(businessId: string, post: any) {
  // Google Business Profile publishing
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { gbpAccountId: true, gbpLocationId: true, gbpAccessToken: true },
  });

  if (!business?.gbpAccountId || !business?.gbpAccessToken) {
    throw new Error('Google Business Profile not configured');
  }

  const axios = await import('axios');
  const { decrypt } = await import('../utils/auth.js');
  const accessToken = decrypt(business.gbpAccessToken);

  // GBP Posts API
  const response = await axios.default.post(
    `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/localPosts`,
    {
      languageCode: 'en',
      summary: post.content.substring(0, 200),
      state: 'LIVE',
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { success: true, postId: response.data.name };
}

/**
 * Export workers
 */
export const workers = {
  whatsapp: whatsappWorker,
  email: emailWorker,
  socialPublish: socialPublishWorker,
  googleSheetsSync: googleSheetsSyncWorker,
  leadProcessing: leadProcessingWorker,
  campaignScheduler: campaignSchedulerWorker,
};

/**
 * Graceful shutdown
 */
export async function shutdownWorkers() {
  console.log('Shutting down workers...');
  
  await Promise.all([
    whatsappWorker.close(),
    emailWorker.close(),
    socialPublishWorker.close(),
    googleSheetsSyncWorker.close(),
    leadProcessingWorker.close(),
    campaignSchedulerWorker.close(),
  ]);

  await redisConnection.quit();
  console.log('All workers shut down successfully');
}

// Handle process termination
process.on('SIGTERM', shutdownWorkers);
process.on('SIGINT', shutdownWorkers);

export default { queues, workers };
