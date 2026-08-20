import { google } from 'googleapis';
import { prisma } from '../index.js';
import { decrypt } from '../utils/auth.js';

/**
 * Google Sheets Integration Service
 * Sync contacts, leads, and custom data
 */
export class GoogleSheetsService {
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

    // Get spreadsheet URL
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      synced: contacts.length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
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
        headers.forEach((header, index) => {
          contactData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
        });

        // Map common fields
        await prisma.contact.upsert({
          where: {
            phone_businessId: {
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
}

export default GoogleSheetsService;
