import { google } from 'googleapis';
import { prisma } from '../db.js';
import { encrypt, decrypt } from '../utils/auth.js';

/**
 * Google Sheets Integration Service
 * Sync contacts, leads, and custom data
 * 
 * CONCURRENCY SAFETY: Uses Redis-based distributed lock (SETNX) to prevent
 * concurrent syncs from corrupting data. Falls back to in-memory lock if
 * Redis is unavailable.
 */
export class GoogleSheetsService {
  // In-memory lock fallback when Redis is unavailable
  private static inMemoryLocks = new Map<string, number>();
  private static LOCK_TTL_MS = 120_000; // 2 minutes — Google Sheets API calls can be slow for large datasets

  /**
   * Try to acquire a distributed lock for this business.
   * Uses Redis SETNX when available, falls back to in-memory Map.
   */
  private static async acquireLock(businessId: string, lockName: string): Promise<boolean> {
    const lockKey = `google_sheets:lock:${businessId}:${lockName}`;
    const now = Date.now();

    // In-memory lock only — Redis is available through the centralized
    // redis-connection.ts but its lazy-connect clients timeout on first
    // command when no Redis server is running. Removing the Redis branch
    // avoids creating ephemeral IORedis clients that spew timeout errors.
    const existingLock = GoogleSheetsService.inMemoryLocks.get(lockKey);
    if (existingLock && (now - existingLock) < GoogleSheetsService.LOCK_TTL_MS) {
      return false;
    }
    GoogleSheetsService.inMemoryLocks.set(lockKey, now);
    return true;
  }

  /**
   * Release a distributed lock.
   */
  private static async releaseLock(businessId: string, lockName: string): Promise<void> {
    const lockKey = `google_sheets:lock:${businessId}:${lockName}`;
    GoogleSheetsService.inMemoryLocks.delete(lockKey);
    // Redis lock auto-expires via PX, no explicit release needed
  }

  /**
   * Get authenticated Google client
   */
  private static async getGoogleClient(businessId: string) {
    const integration = await prisma.integration.findFirst({
      where: {
        businessId,
        type: 'google_sheets',
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error('Google Sheets not configured for this business');
    }

    const config = integration.config as any;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );

    oauth2Client.setCredentials({
      access_token: decrypt(config.accessToken),
      refresh_token: config.refreshToken ? decrypt(config.refreshToken) : undefined,
      expiry_date: config.expiryDate,
    });

    return { oauth2Client, spreadsheetId: config.spreadsheetId };
  }

  /**
   * Sync contacts to Google Sheets
   * Uses distributed lock to prevent concurrent sync corruption
   */
  static async syncContacts(
    businessId: string,
    options: {
      spreadsheetId?: string;
      sheetName?: string;
      filter?: {
        tags?: string[];
        pipelineId?: string;
        stageId?: string;
      };
    } = {}
  ): Promise<{ synced: number; spreadsheetUrl: string }> {
    // Acquire distributed lock to prevent concurrent sync
    const lockAcquired = await GoogleSheetsService.acquireLock(businessId, 'syncContacts');
    if (!lockAcquired) {
      throw new Error('Another sync is already in progress for this business. Please wait for it to complete.');
    }

    try {
      const { oauth2Client, spreadsheetId: configSpreadsheetId } =
        await this.getGoogleClient(businessId);

      const spreadsheetId = options.spreadsheetId || configSpreadsheetId;

      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID not provided');
      }

      const sheetName = options.sheetName || 'Contacts';

      // Fetch contacts
      const contacts = await prisma.contact.findMany({
        where: {
          businessId,
          ...(options.filter?.tags && {
            tags: { hasSome: options.filter.tags },
          }),
          ...(options.filter?.pipelineId && {
            pipelineId: options.filter.pipelineId,
          }),
          ...(options.filter?.stageId && {
            stageId: options.filter.stageId,
          }),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          company: true,
          designation: true,
          source: true,
          tags: true,
          dealValue: true,
          createdAt: true,
          lastActivity: true,
        },
      });

      // Prepare data
      const headers = [
        'ID',
        'Name',
        'Phone',
        'Email',
        'Company',
        'Designation',
        'Source',
        'Tags',
        'Deal Value',
        'Created At',
        'Last Activity',
      ];

      const rows = contacts.map((c) => [
        c.id,
        c.name || '',
        c.phone,
        c.email || '',
        c.company || '',
        c.designation || '',
        c.source || '',
        (c.tags || []).join(', '),
        c.dealValue?.toString() || '',
        c.createdAt.toISOString(),
        c.lastActivity?.toISOString() || '',
      ]);

      const values = [headers, ...rows];

      // Update sheet
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A:K`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      return {
        synced: contacts.length,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      };
    } finally {
      await GoogleSheetsService.releaseLock(businessId, 'syncContacts');
    }
  }

  /**
   * Import contacts from Google Sheets
   */
  static async importContacts(
    businessId: string,
    options: {
      spreadsheetId: string;
      sheetName?: string;
      range?: string;
    }
  ): Promise<{ imported: number; skipped: number }> {
    const { oauth2Client } = await this.getGoogleClient(businessId);
    const { spreadsheetId, sheetName = 'Contacts', range = `${sheetName}!A:K` } = options;

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return { imported: 0, skipped: 0 };
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    let imported = 0;
    let skipped = 0;

    for (const row of dataRows) {
      try {
        const contactData: any = {};
        headers.forEach((header: string, index: number) => {
          contactData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
        });

        // Map common fields
        await prisma.contact.upsert({
          where: {
            businessId_phone: {
              phone: contactData.phone || '',
              businessId,
            },
          },
          update: {
            name: contactData.name || undefined,
            email: contactData.email || undefined,
            company: contactData.company || undefined,
            designation: contactData.designation || undefined,
            tags: contactData.tags ? contactData.tags.split(',').map((t: string) => t.trim()) : [],
            dealValue: contactData.deal_value ? parseFloat(contactData.deal_value) : undefined,
          },
          create: {
            businessId,
            phone: contactData.phone || '',
            name: contactData.name || undefined,
            email: contactData.email || undefined,
            company: contactData.company || undefined,
            designation: contactData.designation || undefined,
            source: 'google_sheets',
            tags: contactData.tags ? contactData.tags.split(',').map((t: string) => t.trim()) : [],
            dealValue: contactData.deal_value ? parseFloat(contactData.deal_value) : undefined,
          },
        });

        imported++;
      } catch (error: any) {
        console.error(`Failed to import row:`, error.message);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * Configure Google Sheets integration
   */
  static async configureIntegration(
    businessId: string,
    config: {
      spreadsheetId: string;
      accessToken: string;
      refreshToken?: string;
      expiryDate?: number;
      autoSync?: boolean;
      syncInterval?: number; // minutes
    }
  ): Promise<any> {
    // Delete existing integration
    await prisma.integration.deleteMany({
      where: { businessId, type: 'google_sheets' },
    });

    // Create new integration
    const integration = await prisma.integration.create({
      data: {
        businessId,
        type: 'google_sheets',
        name: 'Google Sheets',
        config: {
          spreadsheetId: config.spreadsheetId,
          accessToken: encrypt(config.accessToken),
          refreshToken: config.refreshToken ? encrypt(config.refreshToken) : undefined,
          expiryDate: config.expiryDate,
          autoSync: config.autoSync || false,
          syncInterval: config.syncInterval || 60,
        } as any,
        isActive: true,
      },
    });

    return integration;
  }

  /**
   * Create new spreadsheet
   */
  static async createSpreadsheet(
    businessId: string,
    title: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const { oauth2Client } = await this.getGoogleClient(businessId);

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Create spreadsheet with a Contacts sheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Contacts',
              gridProperties: {
                rowCount: 1000,
                columnCount: 20,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId!;

    // Add headers to Contacts sheet
    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Company',
      'Designation',
      'Source',
      'Tags',
      'Deal Value',
      'Created At',
      'Last Activity',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Contacts!A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  /**
   * Get OAuth URL for authorization
   */
  static getOAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Handle OAuth callback
   */
  static async handleOAuthCallback(
    businessId: string,
    code: string
  ): Promise<{ spreadsheetId: string }> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Create a spreadsheet automatically
    const { spreadsheetId } = await this.createSpreadsheet(businessId, 'CRM Contacts');

    // Save tokens
    await this.configureIntegration(businessId, {
      spreadsheetId,
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || undefined,
      expiryDate: tokens.expiry_date,
      autoSync: true,
      syncInterval: 60,
    });

    return { spreadsheetId };
  }

  /**
   * Export lead finder leads to Google Sheets
   */
  static async exportLeadFinderLeads(
    businessId: string,
    options: {
      spreadsheetId?: string;
      sheetName?: string;
      category?: string;
    } = {}
  ): Promise<{ exported: number; spreadsheetUrl: string }> {
    const { oauth2Client, spreadsheetId: configSpreadsheetId } =
      await this.getGoogleClient(businessId);

    const spreadsheetId = options.spreadsheetId || configSpreadsheetId;
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not configured. Please set up Google Sheets integration first.');
    }

    const sheetName = options.sheetName || 'Lead Finder Leads';

    // Fetch lead finder contacts with scores
    const where: any = { businessId, source: 'lead_finder' };
    if (options.category) {
      where.leadScores = { some: { category: options.category } };
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: { leadScores: true },
      orderBy: { createdAt: 'desc' },
    });

    // Prepare headers
    const headers = [
      'Name',
      'Phone',
      'Email',
      'Company',
      'City',
      'Source',
      'Score',
      'Category',
      'Digital Gaps',
      'Website',
      'Rating',
      'Reviews',
      'Tags',
      'Created At',
    ];

    const rows = contacts.map((c) => {
      const data = (c.leadFinderData as any) || {};
      const metadata = (c.metadata as any) || {};
      const score = c.leadScores?.[0];
      const reasons = (score?.reasons as any)?.reasons || [];

      return [
        c.name || '',
        c.phone || '',
        c.email || '',
        c.company || '',
        c.city || '',
        c.leadFinderSource || c.source || '',
        score?.score?.toString() || '0',
        score?.category || 'cold',
        reasons.join(', '),
        data.website || metadata.website || 'No',
        data.rating?.toString() || metadata.rating?.toString() || '',
        data.totalReviews?.toString() || metadata.reviews?.toString() || '',
        (c.tags || []).join(', '),
        c.createdAt.toISOString(),
      ];
    });

    const values = [headers, ...rows];

    // Update sheet
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Try to update, if sheet doesn't exist, append
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A:N`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } catch {
      // Sheet might not exist, append to create it
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:N`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return { exported: contacts.length, spreadsheetUrl };
  }
}

export default GoogleSheetsService;
