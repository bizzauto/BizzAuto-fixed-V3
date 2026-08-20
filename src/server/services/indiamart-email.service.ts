import { simpleParser, EmailAddress } from 'mailparser';
import { prisma } from '../db.js';
import { LeadCaptureService } from './lead-capture.service.js';

/**
 * IndiaMART Email Integration Service
 * Fetches enquiry emails from user's email and extracts leads
 */
export class IndiaMARTEmailService {
  /**
   * Parse IndiaMART enquiry email content
   * Handles multiple IndiaMART email formats
   */
  static parseIndiaMARTEmail(html: string, text: string): {
    name: string;
    phone: string;
    email: string;
    product: string;
    requirement: string;
    city: string;
  } | null {
    const content = text || this.htmlToText(html);

    // IndiaMART email patterns - multiple formats supported
    const patterns = {
      // Name patterns - various IndiaMART formats
      name: /(?:Dear\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|Query\s+from\s+(.+?)(?:\n|$)|Buyer\s+Name[:\s]*(.+?)(?:\n|$))/i,
      // Phone patterns - multiple formats including +91, 0, spaces, dashes
      phone: /(?:\+?91[\s.-]?)?([6-9]\d{9})/g,
      // Email pattern
      email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      // Product pattern - multiple formats
      product: /(?:Requirement\s+for|Inquiry\s+for|Interested\s+in|Product|looking\s+for|Product\s+Name)[:\s]*(.+?)(?:\n|$)/i,
      // Requirement/Message pattern
      requirement: /(?:Requirement|Query|Details|Message|Description|Customer\s+Requirement)[:\s]*(.+?)(?:\n\n|$)/is,
      // City/Location pattern
      city: /(?:City|Location|From|Buyer\s+City)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
      // IndiaMART specific patterns
      indiamartBuyer: /Buyer\s+Details?:?\s*\n([\s\S]*?)(?:\n\n|Product)/i,
      indiamartProduct: /Product\s+Details?:?\s*\n([\s\S]*?)(?:\n\n|Buyer)/i,
    };

    const result = {
      name: '',
      phone: '',
      email: '',
      product: '',
      requirement: '',
      city: '',
    };

    // Extract name - try multiple patterns
    const nameMatch = content.match(patterns.name);
    if (nameMatch) {
      result.name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || '').trim();
    }

    // Extract phone (get first valid Indian mobile)
    const phones = content.match(patterns.phone);
    if (phones) {
      // Clean and validate phone
      for (const p of phones) {
        const cleanPhone = p.replace(/[\s.-]/g, '');
        if (cleanPhone.length >= 10) {
          result.phone = cleanPhone.slice(-10);
          break;
        }
      }
    }

    // Extract email
    const emails = content.match(patterns.email);
    if (emails) {
      // Filter out common non-person emails
      const validEmails = emails.filter(e =>
        !e.includes('indiamart.com') &&
        !e.includes('noreply') &&
        !e.includes('no-reply') &&
        !e.includes('support@')
      );
      if (validEmails.length > 0) {
        result.email = validEmails[0];
      }
    }

    // Extract product
    const productMatch = content.match(patterns.product);
    if (productMatch) {
      result.product = productMatch[1].trim().substring(0, 200);
    }

    // Extract requirement
    const reqMatch = content.match(patterns.requirement);
    if (reqMatch) {
      result.requirement = reqMatch[1].trim().substring(0, 500);
    }

    // Extract city
    const cityMatch = content.match(patterns.city);
    if (cityMatch) {
      result.city = cityMatch[1].trim().substring(0, 100);
    }

    // If we have at least phone or email, return the lead
    if (result.phone || result.email) {
      return result;
    }

    return null;
  }

  /**
   * Convert HTML to plain text
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Connect to email server via IMAP (using node-imap)
   */
  static async fetchEmails(
    config: {
      imapHost: string;
      imapPort: number;
      email: string;
      password: string;
      useSSL: boolean;
    },
    options: {
      since?: Date;
      limit?: number;
      folder?: string;
    } = {}
  ): Promise<{
    processed: number;
    newLeads: number;
    errors: string[];
  }> {
    // Dynamic import to handle optional dependency
    const Imap = (await import('imap')).default as any;
    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.useSSL,
      tlsOptions: { rejectUnauthorized: false },
    });

    return new Promise((resolve, reject) => {
      const result = {
        processed: 0,
        newLeads: 0,
        errors: [] as string[],
      };

      const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      const folder = options.folder || 'INBOX';
      const limit = options.limit || 50;

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            imap.end();
            reject(new Error(`Failed to open ${folder}: ${err.message}`));
            return;
          }

          // Search for IndiaMART emails
          imap.search(
            [
              'UNSEEN',
              ['SINCE', since],
              ['FROM', 'indiamart.com'],
            ],
            async (err, results) => {
              if (err) {
                imap.end();
                reject(new Error(`Search failed: ${err.message}`));
                return;
              }

              if (!results || results.length === 0) {
                imap.end();
                resolve(result);
                return;
              }

              // Limit emails to process
              const toFetch = results.slice(-limit);
              const fetch = imap.fetch(toFetch, { bodies: '', struct: true });

              fetch.on('message', async (msg) => {
                msg.on('body', async (stream) => {
                  try {
                    const parsed = await simpleParser(stream);
                    const leadData = this.parseIndiaMARTEmail(
                      (parsed as any).html || '',
                      (parsed as any).text || ''
                    );

                    if (leadData && (leadData.phone || leadData.email)) {
                      result.processed++;
                      // Note: businessId will be passed from the route
                      result.newLeads++;
                      console.log('IndiaMART Lead from email:', leadData.name, leadData.phone);
                    }
                  } catch (e: any) {
                    result.errors.push(`Parse error: ${e.message}`);
                  }
                });
              });

              fetch.once('end', () => {
                imap.end();
                resolve(result);
              });

              fetch.once('error', (err) => {
                result.errors.push(`Fetch error: ${err.message}`);
                imap.end();
                resolve(result);
              });
            }
          );
        });
      });

      imap.once('error', (err) => {
        reject(new Error(`IMAP connection error: ${err.message}`));
      });

      imap.connect();
    });
  }

  /**
   * Sync leads to Google Sheets
   */
  static async syncToGoogleSheets(
    businessId: string,
    spreadsheetId: string,
    leads: any[]
  ): Promise<{ synced: number }> {
    const { GoogleSheetsService } = await import('./google-sheets.service.js');

    const rows = leads.map(l => [
      l.name || '',
      l.phone || '',
      l.email || '',
      l.metadata?.product || '',
      l.metadata?.requirement || '',
      l.metadata?.city || '',
      l.source || 'indiamart_email',
      new Date(l.createdAt).toLocaleDateString(),
    ]);

    // Add headers
    const values = [
      ['Name', 'Phone', 'Email', 'Product', 'Requirement', 'City', 'Source', 'Date'],
      ...rows,
    ];

    // Use Google Sheets API directly
    const { google } = await import('googleapis');
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'google_sheets' },
    });

    if (!integration) {
      throw new Error('Google Sheets not configured');
    }

    const config = integration.config as any;
    const { decrypt } = await import('../utils/auth.js');

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );

    oauth2Client.setCredentials({
      access_token: decrypt(config.accessToken),
      refresh_token: config.refreshToken ? decrypt(config.refreshToken) : undefined,
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Leads!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { synced: leads.length };
  }

  /**
   * Process emails and capture leads (main integration method)
   */
  static async processIndiaMARTEmails(
    businessId: string,
    emailConfig: {
      imapHost: string;
      imapPort: number;
      email: string;
      password: string;
      useSSL: boolean;
    },
    options: {
      since?: Date;
      saveToSheet?: boolean;
      spreadsheetId?: string;
    } = {}
  ): Promise<{
    processed: number;
    newLeads: number;
    skipped: number;
    errors: string[];
    leads: any[];
  }> {
    const result = {
      processed: 0,
      newLeads: 0,
      skipped: 0,
      errors: [] as string[],
      leads: [] as any[],
    };

    try {
      // Fetch emails using node-imap
      const Imap = (await import('imap')).default as any;
      const imap = new Imap({
        user: emailConfig.email,
        password: emailConfig.password,
        host: emailConfig.imapHost,
        port: emailConfig.imapPort,
        tls: emailConfig.useSSL,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 15000,
      });

      const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const limit = 100;

      console.log(`[IndiaMART] Connecting to IMAP: ${emailConfig.imapHost}:${emailConfig.imapPort}`);

      await new Promise<void>((resolve, reject) => {
        imap.once('ready', () => {
          console.log(`[IndiaMART] IMAP connected successfully`);
          imap.openBox('INBOX', true, async (err, box) => {
            if (err) {
              imap.end();
              reject(new Error(`Failed to open INBOX: ${err.message}`));
              return;
            }

            console.log(`[IndiaMART] INBOX opened. Searching for IndiaMART emails since ${since.toISOString()}`);

            imap.search(
              [
                ['SINCE', since],
                ['OR',
                  ['FROM', 'indiamart.com'],
                  ['OR',
                    ['FROM', 'leadz@indiamart.com'],
                    ['OR',
                      ['FROM', 'noreply@indiamart.com'],
                      ['FROM', 'enquiry@indiamart.com']
                    ]
                  ]
                ],
              ],
              async (err, results) => {
                if (err) {
                  console.error(`[IndiaMART] Search error:`, err);
                  imap.end();
                  resolve();
                  return;
                }

                if (!results || results.length === 0) {
                  console.log(`[IndiaMART] No IndiaMART emails found`);
                  imap.end();
                  resolve();
                  return;
                }

                console.log(`[IndiaMART] Found ${results.length} IndiaMART emails`);

                const toFetch = results.slice(-limit);
                const fetch = imap.fetch(toFetch, { bodies: '', struct: true });

                fetch.on('message', async (msg) => {
                  msg.on('body', async (stream, info) => {
                    try {
                      const parsed = await simpleParser(stream);
                      const leadData = this.parseIndiaMARTEmail(
                        (parsed as any).html || '',
                        (parsed as any).text || ''
                      );

                      if (leadData && (leadData.phone || leadData.email)) {
                        result.processed++;

                        // Check if lead already exists
                        const existing = leadData.phone
                          ? await prisma.contact.findFirst({
                              where: {
                                businessId,
                                phone: leadData.phone,
                                createdAt: { gte: since },
                              },
                            })
                          : null;

                        if (existing) {
                          result.skipped++;
                          console.log(`[IndiaMART] Skipping duplicate: ${leadData.name} ${leadData.phone}`);
                          return;
                        }

                        // Capture lead to database
                        const contact = await LeadCaptureService.captureIndiaMARTLead(businessId, {
                          name: leadData.name || 'IndiaMART Customer',
                          phone: leadData.phone || '',
                          email: leadData.email || undefined,
                          product: leadData.product,
                          requirement: leadData.requirement,
                          city: leadData.city,
                        });

                        result.newLeads++;
                        result.leads.push(contact);
                        console.log(`[IndiaMART] New lead captured: ${leadData.name} ${leadData.phone}`);
                      }
                    } catch (e: any) {
                      result.errors.push(`Parse error: ${e.message}`);
                      console.error(`[IndiaMART] Parse error:`, e.message);
                    }
                  });
                });

                fetch.once('end', () => {
                  console.log(`[IndiaMART] Email fetch complete. Processed: ${result.processed}, New: ${result.newLeads}`);
                  imap.end();
                  resolve();
                });

                fetch.once('error', (err) => {
                  result.errors.push(`Fetch error: ${err.message}`);
                  console.error(`[IndiaMART] Fetch error:`, err);
                  imap.end();
                  resolve();
                });
              }
            );
          });
        });

        imap.once('error', (err) => {
          console.error(`[IndiaMART] IMAP connection error:`, err);
          reject(new Error(`IMAP error: ${err.message}`));
        });

        imap.connect();
      });

      // Sync to Google Sheet if requested
      if (options.saveToSheet && options.spreadsheetId && result.leads.length > 0) {
        try {
          await this.syncToGoogleSheets(businessId, options.spreadsheetId, result.leads);
        } catch (e: any) {
          result.errors.push(`Sheet sync error: ${e.message}`);
        }
      }
    } catch (e: any) {
      result.errors.push(`Process error: ${e.message}`);
      console.error(`[IndiaMART] Process error:`, e);
    }

    return result;
  }
}

export default IndiaMARTEmailService;