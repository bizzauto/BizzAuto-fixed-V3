import { prisma } from '../db.js';
import axios from 'axios';
import { decrypt } from '../utils/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'instagram');
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

// ── Helpers ──

async function getInstagramCredentials(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { igUserId: true, igAccessToken: true },
  });

  if (!business?.igUserId || !business?.igAccessToken) {
    throw new Error('Instagram not configured. Connect your Instagram account first.');
  }

  return {
    igBusinessId: business.igUserId,
    accessToken: decrypt(business.igAccessToken),
  };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class InstagramService {
  /**
   * Get Instagram Business Account info (profile, follower count, media count)
   */
  static async getAccountInfo(businessId: string) {
    const { igBusinessId, accessToken } = await getInstagramCredentials(businessId);

    const { data } = await axios.get(`${GRAPH_API_BASE}/${igBusinessId}`, {
      params: {
        fields: 'id,username,name,profile_picture_url,followers_count,media_count',
        access_token: accessToken,
      },
    });

    return data;
  }

  /**
   * Upload a media file to the server's local storage
   * Returns the public URL for the uploaded file
   */
  static async uploadMediaFile(businessId: string, file: Express.Multer.File): Promise<string> {
    // Ensure upload directory exists
    const businessDir = path.join(UPLOADS_DIR, businessId);
    if (!fs.existsSync(businessDir)) {
      fs.mkdirSync(businessDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filepath = path.join(businessDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // Return a URL path that can be served
    return `/uploads/instagram/${businessId}/${filename}`;
  }

  /**
   * Upload media to Instagram via Graph API using a URL
   * For video: media_type=VIDEO, video_url=url
   * For image: image_url=url
   */
  static async createMediaContainer(
    businessId: string,
    options: {
      mediaUrl: string;
      caption: string;
      mediaType?: 'IMAGE' | 'VIDEO';
      isCarouselChild?: boolean;
    }
  ) {
    const { igBusinessId, accessToken } = await getInstagramCredentials(businessId);
    const { mediaUrl, caption, mediaType = 'IMAGE', isCarouselChild = false } = options;

    const params: Record<string, any> = {
      access_token: accessToken,
    };

    if (mediaType === 'VIDEO') {
      params.media_type = 'VIDEO';
      params.video_url = mediaUrl;
    } else {
      params.image_url = mediaUrl;
    }

    // Only set caption for non-carousel children
    if (!isCarouselChild && caption) {
      params.caption = caption;
    }

    const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media`, params);
    return data; // { id: "creation_id" }
  }

  /**
   * Create a carousel container (for multiple media items in one post)
   * Step 1: Create children containers
   * Step 2: Create parent carousel container
   */
  static async createCarouselContainer(
    businessId: string,
    options: {
      children: Array<{ mediaUrl: string; mediaType?: 'IMAGE' | 'VIDEO' }>;
      caption: string;
    }
  ) {
    const { igBusinessId, accessToken } = await getInstagramCredentials(businessId);
    const { children, caption } = options;

    // Step 1: Create individual child containers
    const childIds: string[] = [];
    for (const child of children) {
      const result = await InstagramService.createMediaContainer(businessId, {
        mediaUrl: child.mediaUrl,
        caption: '', // Children don't get captions
        mediaType: child.mediaType || 'IMAGE',
        isCarouselChild: true,
      });
      childIds.push(result.id);

      // Small delay between child creations
      await delay(1000);
    }

    // Step 2: Create carousel container
    // Wait a moment for children to be processed
    await delay(2000);

    const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media`, {
      media_type: 'CAROUSEL',
      children: childIds,
      caption,
      access_token: accessToken,
    });

    return {
      creationId: data.id,
      childIds,
    };
  }

  /**
   * Check if a media container is ready to publish
   * Instagram returns status "FINISHED" when ready
   */
  static async checkContainerStatus(businessId: string, creationId: string) {
    const { accessToken } = await getInstagramCredentials(businessId);

    const { data } = await axios.get(`${GRAPH_API_BASE}/${creationId}`, {
      params: {
        fields: 'id,status,error_code,error_message',
        access_token: accessToken,
      },
    });

    return data;
  }

  /**
   * Wait for container to be ready (poll until FINISHED or FAILED)
   */
  static async waitForContainer(
    businessId: string,
    creationId: string,
    maxRetries = 10,
    pollIntervalMs = 3000
  ) {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.checkContainerStatus(businessId, creationId);

      if (status.status === 'FINISHED') {
        return { ready: true, status };
      }

      if (status.status === 'ERROR' || status.error_code) {
        throw new Error(`Container processing failed: ${status.error_message || 'Unknown error'}`);
      }

      if (i < maxRetries - 1) {
        await delay(pollIntervalMs);
      }
    }

    throw new Error('Container did not finish processing in time. Try again later.');
  }

  /**
   * Publish a media container to Instagram
   */
  static async publishContainer(businessId: string, creationId: string) {
    const { igBusinessId, accessToken } = await getInstagramCredentials(businessId);

    const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });

    return data; // { id: "ig_media_id" }
  }

  /**
   * Full single-media publish flow:
   * 1. Create container → 2. Wait for processing → 3. Publish
   */
  static async publishMedia(
    businessId: string,
    options: {
      mediaUrl: string;
      caption: string;
      mediaType?: 'IMAGE' | 'VIDEO';
    }
  ) {
    const { mediaUrl, caption, mediaType = 'IMAGE' } = options;

    // Step 1: Create media container
    const container = await this.createMediaContainer(businessId, {
      mediaUrl,
      caption,
      mediaType,
    });

    // Step 2: Wait for container to be ready
    await this.waitForContainer(businessId, container.id);

    // Step 3: Publish
    const result = await this.publishContainer(businessId, container.id);

    return {
      containerId: container.id,
      mediaId: result.id,
    };
  }

  /**
   * Full carousel publish flow:
   * 1. Create child containers → 2. Create carousel container → 3. Wait → 4. Publish
   */
  static async publishCarousel(
    businessId: string,
    options: {
      children: Array<{ mediaUrl: string; mediaType?: 'IMAGE' | 'VIDEO' }>;
      caption: string;
    }
  ) {
    // Step 1 & 2: Create carousel (children + parent)
    const carousel = await this.createCarouselContainer(businessId, options);

    // Step 3: Wait for carousel container to be ready
    await this.waitForContainer(businessId, carousel.creationId);

    // Step 4: Publish
    const result = await this.publishContainer(businessId, carousel.creationId);

    return {
      childIds: carousel.childIds,
      containerId: carousel.creationId,
      mediaId: result.id,
    };
  }

  /**
   * Publish from an existing Post record (with mediaUrls)
   * Detects single vs carousel and handles accordingly
   */
  static async publishPost(
    businessId: string,
    post: {
      id: string;
      content: string;
      mediaUrls: string[];
    }
  ) {
    const { content, mediaUrls } = post;

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram requires at least one image or video. Add media to your post first.');
    }

    let publishResult;

    if (mediaUrls.length === 1) {
      // Single media
      const isVideo = mediaUrls[0].match(/\.(mp4|mov|avi|mkv|webm)$/i);
      publishResult = await this.publishMedia(businessId, {
        mediaUrl: mediaUrls[0],
        caption: content,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      });
    } else {
      // Carousel (multiple media items)
      const children = mediaUrls.map(url => ({
        mediaUrl: url,
        mediaType: url.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? 'VIDEO' as const : 'IMAGE' as const,
      }));
      publishResult = await this.publishCarousel(businessId, {
        children,
        caption: content,
      });
    }

    // Update the Post record with published Instagram ID
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedIds: {
          instagram: publishResult.mediaId,
        },
      },
    });

    return publishResult;
  }

  /**
   * Get media insights (likes, comments, reach, etc.)
   */
  static async getMediaInsights(businessId: string, mediaId: string) {
    const { accessToken } = await getInstagramCredentials(businessId);

    const { data } = await axios.get(`${GRAPH_API_BASE}/${mediaId}/insights`, {
      params: {
        metric: 'engagement,impressions,reach,saved,video_views',
        access_token: accessToken,
      },
    });

    return data;
  }

  /**
   * Get recent media from the Instagram account
   */
  static async getRecentMedia(businessId: string, limit = 20) {
    const { igBusinessId, accessToken } = await getInstagramCredentials(businessId);

    const { data } = await axios.get(`${GRAPH_API_BASE}/${igBusinessId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count',
        limit,
        access_token: accessToken,
      },
    });

    return data.data || [];
  }

  /**
   * Test if Instagram credentials are valid
   */
  static async testConnection(businessId: string) {
    try {
      const { igBusinessId, accessToken } = await getInstagramCredentials(businessId);

      await axios.get(`${GRAPH_API_BASE}/${igBusinessId}`, {
        params: {
          fields: 'id,username',
          access_token: accessToken,
        },
      });

      return { connected: true };
    } catch (error: any) {
      return {
        connected: false,
        error: error?.response?.data?.error?.message || error.message,
      };
    }
  }
}
