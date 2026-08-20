import { prisma } from '../db.js';
import { encrypt, decrypt } from '../utils/auth.js';

export interface GBPAutoPostTemplate {
  id: string;
  name: string;
  content: string;
  mediaUrl?: string;
  callToAction?: {
    type: 'CALL_NOW' | 'LEARN_MORE' | 'SHOP_NOW' | 'SIGN_UP' | 'BOOK' | 'ORDER_ONLINE';
    url?: string;
  };
  tags?: string[];
}

export interface GBPAutoPostConfig {
  enabled: boolean;
  time: string; // HH:mm
  timezone: string;
  days: string[]; // monday, tuesday, etc.
  templates: GBPAutoPostTemplate[];
}

export class GBPAutoPostService {
  /**
   * Get auto-post configuration for a business
   */
  static async getConfig(businessId: string): Promise<GBPAutoPostConfig> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        gbpAutoPostEnabled: true,
        gbpAutoPostTime: true,
        gbpAutoPostTimezone: true,
        gbpAutoPostDays: true,
        gbpAutoPostTemplates: true,
        gbpAutoPostLastPosted: true,
      },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    return {
      enabled: business.gbpAutoPostEnabled,
      time: business.gbpAutoPostTime,
      timezone: business.gbpAutoPostTimezone,
      days: (business.gbpAutoPostDays as string[]) || [],
      templates: (business.gbpAutoPostTemplates as unknown as GBPAutoPostTemplate[]) || [],
    };
  }

  /**
   * Update auto-post configuration
   */
  static async updateConfig(businessId: string, config: Partial<GBPAutoPostConfig>): Promise<GBPAutoPostConfig> {
    const updateData: any = {};

    if (config.enabled !== undefined) {
      updateData.gbpAutoPostEnabled = config.enabled;
    }
    if (config.time) {
      updateData.gbpAutoPostTime = config.time;
    }
    if (config.timezone) {
      updateData.gbpAutoPostTimezone = config.timezone;
    }
    if (config.days) {
      updateData.gbpAutoPostDays = config.days;
    }
    if (config.templates) {
      updateData.gbpAutoPostTemplates = config.templates;
    }

    await prisma.business.update({
      where: { id: businessId },
      data: updateData,
    });

    return this.getConfig(businessId);
  }

  /**
   * Add a new post template
   */
  static async addTemplate(businessId: string, template: Omit<GBPAutoPostTemplate, 'id'>): Promise<GBPAutoPostTemplate> {
    const config = await this.getConfig(businessId);
    
    const newTemplate: GBPAutoPostTemplate = {
      ...template,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    config.templates.push(newTemplate);
    await this.updateConfig(businessId, { templates: config.templates });

    return newTemplate;
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    businessId: string,
    templateId: string,
    updates: Partial<Omit<GBPAutoPostTemplate, 'id'>>
  ): Promise<GBPAutoPostTemplate> {
    const config = await this.getConfig(businessId);
    const index = config.templates.findIndex(t => t.id === templateId);

    if (index === -1) {
      throw new Error('Template not found');
    }

    config.templates[index] = {
      ...config.templates[index],
      ...updates,
    };

    await this.updateConfig(businessId, { templates: config.templates });

    return config.templates[index];
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(businessId: string, templateId: string): Promise<void> {
    const config = await this.getConfig(businessId);
    config.templates = config.templates.filter(t => t.id !== templateId);
    await this.updateConfig(businessId, { templates: config.templates });
  }

  /**
   * Get next template to post (round-robin)
   */
  static async getNextTemplate(businessId: string): Promise<GBPAutoPostTemplate | null> {
    const config = await this.getConfig(businessId);

    if (config.templates.length === 0) {
      return null;
    }

    // Simple round-robin based on last posted time
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { gbpAutoPostLastPosted: true },
    });

    if (!business?.gbpAutoPostLastPosted) {
      return config.templates[0];
    }

    // Find the last posted template index
    const lastPostedIndex = config.templates.findIndex(
      t => t.content === (business as any).lastPostedContent
    );

    const nextIndex = (lastPostedIndex + 1) % config.templates.length;
    return config.templates[nextIndex];
  }

  /**
   * Create a post on Google Business Profile
   */
  static async createPost(
    businessId: string,
    template: GBPAutoPostTemplate
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        gbpAccessToken: true,
        gbpAccountId: true,
        gbpLocationId: true,
      },
    });

    if (!business?.gbpAccessToken || !business?.gbpAccountId || !business?.gbpLocationId) {
      return { success: false, error: 'Google Business Profile not configured' };
    }

    try {
      const axios = await import('axios');
      const accessToken = decrypt(business.gbpAccessToken);

      const postData: any = {
        languageCode: 'en',
        summary: template.content.substring(0, 200),
        state: 'LIVE',
      };

      if (template.mediaUrl) {
        postData.media = [{ mediaFormat: 'PHOTO', sourceUrl: template.mediaUrl }];
      }

      if (template.callToAction) {
        postData.action = {
          actionType: template.callToAction.type,
          url: template.callToAction.url,
        };
      }

      const response = await axios.default.post(
        `https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/localPosts`,
        postData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update last posted time
      await prisma.business.update({
        where: { id: businessId },
        data: { gbpAutoPostLastPosted: new Date() },
      });

      return { success: true, postId: response.data.name };
    } catch (error: any) {
      console.error('GBP auto-post error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute auto-post for a business
   */
  static async executeAutoPost(businessId: string): Promise<{
    success: boolean;
    message: string;
    postId?: string;
  }> {
    const config = await this.getConfig(businessId);

    if (!config.enabled) {
      return { success: false, message: 'Auto-posting is disabled' };
    }

    // Check if today is a posting day
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!config.days.includes(today)) {
      return { success: false, message: `Today (${today}) is not a posting day` };
    }

    // Get next template
    const template = await this.getNextTemplate(businessId);
    if (!template) {
      return { success: false, message: 'No post templates configured' };
    }

    // Create the post
    const result = await this.createPost(businessId, template);

    if (result.success) {
      return {
        success: true,
        message: 'Auto-post created successfully',
        postId: result.postId,
      };
    } else {
      return {
        success: false,
        message: `Failed to create post: ${result.error}`,
      };
    }
  }

  /**
   * Check if it's time to auto-post for a business
   */
  static async shouldAutoPost(businessId: string): Promise<boolean> {
    const config = await this.getConfig(businessId);

    if (!config.enabled) {
      return false;
    }

    // Get current time in business timezone
    const now = new Date();
    const businessTime = new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    // Check if current time matches configured time (within 5 minute window)
    const [configHour, configMin] = config.time.split(':').map(Number);
    const [currentHour, currentMin] = businessTime.split(':').map(Number);

    const configMinutes = configHour * 60 + configMin;
    const currentMinutes = currentHour * 60 + currentMin;

    return Math.abs(configMinutes - currentMinutes) <= 5;
  }
}

export default GBPAutoPostService;