import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { IndiaMARTEmailService } from '../services/indiamart-email.service.js';
import { EmailLeadService, Platform } from '../services/email-lead.service.js';
import { LeadCaptureService } from '../services/lead-capture.service.js';
import { GmailIMAPService } from '../services/gmail-imap.service.js';
import { encrypt, decrypt } from '../utils/auth.js';
import { simpleParser } from 'mailparser';

const router = Router();

/**
 * POST /api/indiamart/setup
 * Configure IndiaMART email settings for a business
 */
router.post('/setup', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const {
      imapHost,
      imapPort,
      email,
      password,
      useSSL = true,
      spreadsheetId,
      autoSync = false,
      syncInterval = 60, // minutes
    } = req.body;

    if (!imapHost || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'IMAP host, email, and password are required',
      });
    }

    // Clean password - remove spaces (Gmail App Passwords have spaces)
    const cleanPassword = password.replace(/\s/g, '');

    // Save email config (encrypted)
    const emailConfig = {
      imapHost,
      imapPort: imapPort || 993,
      email,
      password: encrypt(cleanPassword),
      useSSL,
      spreadsheetId,
      autoSync,
      syncInterval,
      lastSyncAt: null,
    };

    // Remove old integration first, then create new one
    await prisma.integration.deleteMany({
      where: { businessId, type: 'indiamart_email' },
    });

    const integration = await prisma.integration.create({
      data: {
        businessId,
        type: 'indiamart_email',
        name: 'IndiaMART Email Integration',
        config: emailConfig as any,
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: 'IndiaMART email integration configured',
      data: {
        id: integration.id,
        email,
        imapHost,
        imapPort: imapPort || 993,
        autoSync,
        syncInterval,
      },
    });
  } catch (error: any) {
    console.error('IndiaMART setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/indiamart/config
 * Get current IndiaMART email configuration (without password)
 */
router.get('/config', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email' },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: {
          configured: false,
          email: null,
          imapHost: null,
          autoSync: false,
        },
      });
    }

    const config = integration.config as any;

    res.json({
      success: true,
      data: {
        configured: true,
        email: config.email,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        useSSL: config.useSSL,
        spreadsheetId: config.spreadsheetId,
        autoSync: config.autoSync || false,
        syncInterval: config.syncInterval || 60,
        lastSyncAt: config.lastSyncAt,
        isActive: integration.isActive,
      },
    });
  } catch (error: any) {
    console.error('Get config error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/debug-emails
 * Shows actual email content for debugging
 */
router.post('/debug-emails', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { days = 7 } = req.body;

    console.log(`[Debug] Request for businessId: ${businessId}`);

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    });

    if (!integration) {
      console.log(`[Debug] No integration found`);
      return res.status(400).json({ success: false, error: 'Not configured' });
    }

    const config = integration.config as any;
    const password = decrypt(config.password);

    console.log(`[Debug] Config: email=${config.email}, host=${config.imapHost}, port=${config.imapPort}`);

    const Imap = (await import('imap')).default;
    const imap = new Imap({
      user: config.email,
      password: password,
      host: config.imapHost || 'imap.gmail.com',
      port: config.imapPort || 993,
      tls: config.useSSL !== false,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 20000,
    });

    const debugResult = await new Promise<any>((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => safeResolve({ error: 'timeout' }), 30000);
      const safeResolve = (v: any) => { if (!resolved) { resolved = true; clearTimeout(timeoutId); try { imap.end(); } catch {} resolve(v); } };

      imap.once('ready', () => {
        console.log('[Debug] IMAP connected!');
        imap.openBox('INBOX', true, (err, box) => {
          if (err) { 
            console.log('[Debug] Error opening INBOX:', err.message);
            safeResolve({ error: err.message }); 
            return; 
          }

          console.log(`[Debug] INBOX opened. Total: ${box.messages.total}`);

          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          // Search for IndiaMART emails specifically
          imap.search([
            ['SINCE', since],
            ['FROM', 'indiamart.com'],
          ], (err, results) => {
            if (err) {
              console.log('[Debug] Search error:', err.message);
              safeResolve({ error: err.message });
              return;
            }

            console.log(`[Debug] Found ${results ? results.length : 0} IndiaMART emails`);

            if (!results || results.length === 0) {
              safeResolve({ totalEmails: box.messages.total, found: 0, emails: [] });
              return;
            }

            const toFetch = results.slice(-10);
            const fetch = imap.fetch(toFetch, { bodies: '' });
            const emails: any[] = [];
            const parsePromises: Promise<void>[] = [];

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                const p = simpleParser(stream).then((parsed: any) => {
                  const text = parsed.text || '';
                  const html = parsed.html || '';
                  const fromEmail = parsed.from?.value?.[0]?.address || '';
                  emails.push({
                    from: parsed.from?.text || '',
                    fromEmail,
                    subject: parsed.subject || '',
                    date: parsed.date,
                    hasPhone: /\d{10}/.test(text),
                    hasTemplate: text.includes('{{.'),
                    textLength: text.length,
                    htmlLength: html.length,
                    textPreview: text.substring(0, 2000),
                    htmlPreview: html.substring(0, 2000),
                  });
                }).catch(() => {});
                parsePromises.push(p);
              });
            });

            fetch.once('end', () => {
              Promise.all(parsePromises).then(() => {
                console.log(`[Debug] Fetched ${emails.length} emails`);
                safeResolve({
                  totalEmails: box.messages.total,
                  found: results.length,
                  emails: emails,
                });
              });
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.log('[Debug] IMAP error:', err.message);
        safeResolve({ error: err.message });
      });

      imap.connect();
    });

    console.log('[Debug] Result:', debugResult);
    res.json({ success: true, data: debugResult });
  } catch (error: any) {
    console.error('[Debug] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/test-gmail
 * Direct Gmail test - shows exactly what's happening
 */
router.post('/test-gmail', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    });

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: 'Email not configured. Please setup first.',
      });
    }

    const config = integration.config as any;
    const password = decrypt(config.password);

    console.log(`[TestGmail] Testing connection for ${config.email}`);

    // Simple IMAP connection test
    const Imap = (await import('imap')).default;
    
    const imap = new Imap({
      user: config.email,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 20000,
    });

    const testResult = await new Promise<any>((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        safeResolve({ success: false, error: 'Connection timeout' });
      }, 30000);
      
      const safeResolve = (value: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          try { imap.end(); } catch {}
          resolve(value);
        }
      };

      imap.once('ready', () => {
        console.log('[TestGmail] IMAP connected!');
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            safeResolve({ success: false, error: `Cannot open INBOX: ${err.message}` });
            return;
          }

          console.log(`[TestGmail] INBOX opened. Total messages: ${box.messages.total}`);

          // Search for ALL emails in last 30 days
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          imap.search([['SINCE', since]], (err, results) => {
            if (err) {
              safeResolve({ success: false, error: `Search error: ${err.message}` });
              return;
            }

            console.log(`[TestGmail] Found ${results ? results.length : 0} emails in last 30 days`);

            if (!results || results.length === 0) {
              safeResolve({ 
                success: true, 
                connected: true,
                totalEmails: box.messages.total,
                recentEmails: 0,
                message: 'Connected but no emails in last 30 days'
              });
              return;
            }

            // Fetch first 5 emails to check content
            const toFetch = results.slice(-5);
            const fetch = imap.fetch(toFetch, { bodies: '' });
            const emails: any[] = [];
            const parsePromises: Promise<void>[] = [];

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                const p = simpleParser(stream)
                  .then((parsed: any) => {
                    emails.push({
                      from: parsed.from?.text || '',
                      subject: parsed.subject || '',
                      date: parsed.date,
                      hasPhone: /\d{10}/.test(parsed.text || ''),
                    });
                  })
                  .catch(() => {});
                parsePromises.push(p);
              });
            });

            fetch.once('end', () => {
              Promise.all(parsePromises).then(() => {
                console.log(`[TestGmail] Sample emails:`, emails);
                safeResolve({
                  success: true,
                  connected: true,
                  totalEmails: box.messages.total,
                  recentEmails: results.length,
                  sampleEmails: emails,
                  message: `Found ${results.length} emails. ${emails.length} sampled.`
                });
              });
            });

            fetch.once('error', (err) => {
              safeResolve({ success: false, error: `Fetch error: ${err.message}` });
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.error('[TestGmail] IMAP error:', err.message);
        safeResolve({ 
          success: false, 
          error: `IMAP error: ${err.message}`,
          hint: 'Check email and App Password. For Gmail, use App Password from myaccount.google.com/apppasswords'
        });
      });

      imap.connect();
    });

    res.json(testResult);
  } catch (error: any) {
    console.error('[TestGmail] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/simple-sync
 * Simple Gmail sync - 100% reliable
 */
router.post('/simple-sync', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { days = 30 } = req.body;

    console.log(`[SimpleSync] Request received for businessId: ${businessId}`);

    // Get email config
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    });

    if (!integration) {
      console.log(`[SimpleSync] No integration found for businessId: ${businessId}`);
      return res.status(400).json({
        success: false,
        error: 'Email not configured. Please setup first.',
      });
    }

    const config = integration.config as any;
    const password = decrypt(config.password);

    console.log(`[SimpleSync] Config found: email=${config.email}, host=${config.imapHost}, port=${config.imapPort}`);
    console.log(`[SimpleSync] Starting sync for ${config.email}`);

    const result = await GmailIMAPService.fetchAndCreateLeads(
      businessId,
      {
        email: config.email,
        password: password,
      },
      {
        days,
        platform: 'indiamart',
      }
    );

    console.log(`[SimpleSync] Result: success=${result.success}, total=${result.totalEmails}, indiamart=${result.indiamartEmails}, created=${result.leadsCreated}`);
    console.log(`[SimpleSync] Details:`, result.details);
    console.log(`[SimpleSync] Errors:`, result.errors);

    // Update last sync time
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        config: {
          ...config,
          lastSyncAt: new Date().toISOString(),
        } as any,
      },
    });

    res.json({
      success: result.success,
      message: result.success 
        ? `Synced ${result.leadsCreated} new leads from ${result.indiamartEmails} IndiaMART emails`
        : 'Sync failed - check server logs',
      data: result,
    });
  } catch (error: any) {
    console.error('[SimpleSync] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/indiamart-email/sync
 * Sync leads from email - supports indiamart, justdial, tradeindia
 */
router.post('/sync', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { since, days = 30, platform = 'indiamart' } = req.body;

    // Get platform-specific integration
    const integrationType = `email_${platform}`;
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: integrationType, isActive: true },
    });

    // Fallback to indiamart_email for backward compatibility
    const fallbackIntegration = !integration ? await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    }) : null;

    const activeIntegration = integration || fallbackIntegration;

    if (!activeIntegration) {
      return res.status(400).json({
        success: false,
        error: `${EmailLeadService.getPlatformName(platform as Platform)} email not configured. Please setup first.`,
      });
    }

    const config = activeIntegration.config as any;
    const emailConfig = {
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      email: config.email,
      password: decrypt(config.password),
      useSSL: config.useSSL,
    };

    let sinceDate: Date;
    if (since) {
      sinceDate = new Date(since);
    } else {
      sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    console.log(`[EmailLead] Sync: platform=${platform}, since=${sinceDate.toISOString()}`);

    const result = await EmailLeadService.processEmails(
      businessId,
      emailConfig,
      platform as Platform,
      {
        since: sinceDate,
        saveToSheet: !!config.spreadsheetId,
        spreadsheetId: config.spreadsheetId,
      }
    );

    // Update last sync time
    await prisma.integration.update({
      where: { id: activeIntegration.id },
      data: {
        config: {
          ...config,
          lastSyncAt: new Date().toISOString(),
        } as any,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'indiamart_sync',
        title: 'IndiaMART Email Sync',
        content: `Processed ${result.processed} emails, captured ${result.newLeads} new leads`,
        metadata: result,
        createdBy: 'system',
      },
    });

    res.json({
      success: true,
      message: `Synced ${result.newLeads} new leads from ${result.processed} emails`,
      data: result,
    });
  } catch (error: any) {
    console.error('IndiaMART sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check email credentials and IMAP settings',
    });
  }
});

/**
 * POST /api/indiamart-email/test-connection
 * Test IMAP connection for any platform
 */
router.post('/test-connection', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { platform = 'indiamart' } = req.body;

    const integrationType = `email_${platform}`;
    const integration = await prisma.integration.findFirst({
      where: { businessId, type: integrationType, isActive: true },
    });

    const fallbackIntegration = !integration ? await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email', isActive: true },
    }) : null;

    const activeIntegration = integration || fallbackIntegration;

    if (!activeIntegration) {
      return res.status(400).json({
        success: false,
        error: `${EmailLeadService.getPlatformName(platform as Platform)} email not configured.`,
      });
    }

    const config = activeIntegration.config as any;
    const emailConfig = {
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      email: config.email,
      password: decrypt(config.password),
      useSSL: config.useSSL,
    };

    const testResult = await EmailLeadService.testConnection(emailConfig, platform as Platform);

    res.json({
      success: true,
      message: `${EmailLeadService.getPlatformName(platform as Platform)} IMAP connection successful`,
      data: {
        ...testResult,
        email: emailConfig.email,
        host: emailConfig.imapHost,
        platform,
      },
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check IMAP host, port, email and password. For Gmail, use App Password.',
    });
  }
});

/**
 * GET /api/indiamart-email/debug
 * Debug IMAP configuration (shows settings without password)
 */
router.get('/debug', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const integration = await prisma.integration.findFirst({
      where: { businessId, type: 'indiamart_email' },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: { configured: false, message: 'No IndiaMART email integration found' },
      });
    }

    const config = integration.config as any;

    res.json({
      success: true,
      data: {
        configured: true,
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        email: config.email,
        useSSL: config.useSSL,
        passwordLength: config.password ? decrypt(config.password).length : 0,
        passwordPreview: config.password ? decrypt(config.password).substring(0, 4) + '****' : 'N/A',
        autoSync: config.autoSync,
        lastSyncAt: config.lastSyncAt,
        isActive: integration.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/import
 * Manual email import - paste email content to create lead
 * This is 100% reliable - no IMAP needed
 */
router.post('/import', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { name, phone, email, product, requirement, city, platform = 'indiamart' } = req.body;

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        error: 'At least phone or email is required',
      });
    }

    // Create lead directly
    const contact = await LeadCaptureService.captureIndiaMARTLead(businessId, {
      name: name || `${platform} Customer`,
      phone: phone || '',
      email: email || undefined,
      product: product || '',
      requirement: requirement || '',
      city: city || '',
    });

    res.json({
      success: true,
      message: 'Lead imported successfully',
      data: contact,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/bulk-import
 * Bulk import multiple leads at once
 */
router.post('/bulk-import', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { leads, platform = 'indiamart' } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leads array is required',
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const lead of leads) {
      try {
        if (!lead.phone && !lead.email) {
          results.failed++;
          results.errors.push(`Skipped: No phone or email for ${lead.name || 'unknown'}`);
          continue;
        }

        await LeadCaptureService.captureIndiaMARTLead(businessId, {
          name: lead.name || `${platform} Customer`,
          phone: lead.phone || '',
          email: lead.email || undefined,
          product: lead.product || '',
          requirement: lead.requirement || '',
          city: lead.city || '',
        });

        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Failed: ${lead.name || 'unknown'} - ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `Imported ${results.success} leads, ${results.failed} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart-email/test-email
 * Test parsing a single email content
 */
router.post('/test-email', authenticate, async (req: any, res: Response) => {
  try {
    const { html, text, platform = 'indiamart' } = req.body;

    if (!html && !text) {
      return res.status(400).json({
        success: false,
        error: 'Either html or text is required',
      });
    }

    const leadData = EmailLeadService.parseEmail(html || '', text || '', platform);

    res.json({
      success: true,
      data: {
        parsed: leadData,
        hasPhone: !!leadData?.phone,
        hasEmail: !!leadData?.email,
        canCreateLead: !!(leadData?.phone || leadData?.email),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/indiamart/leads
 * Get leads captured from IndiaMART emails
 */
router.get('/leads', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { page = 1, limit = 20, since } = req.query;

    const where: any = {
      businessId,
      source: 'indiamart',
    };

    if (since) {
      where.createdAt = { gte: new Date(since as string) };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          company: true,
          source: true,
          tags: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Get IndiaMART leads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/indiamart/disconnect
 * Remove IndiaMART email integration
 */
router.delete('/disconnect', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;

    await prisma.integration.deleteMany({
      where: { businessId, type: 'indiamart_email' },
    });

    res.json({
      success: true,
      message: 'IndiaMART email integration removed',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/indiamart/connect
 * Test email connection
 */
router.post('/connect', authenticate, async (req: any, res: Response) => {
  try {
    const { imapHost, imapPort, email, password, useSSL = true } = req.body;

    if (!imapHost || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'IMAP host, email, and password are required',
      });
    }

    // Test connection
    const Imap = (await import('imap')).default as any;
    const imap = new Imap({
      user: email,
      password: password,
      host: imapHost,
      port: imapPort || 993,
      tls: useSSL,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
    });

    return new Promise<void>((resolve) => {
      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          imap.end();
          if (err) {
            res.json({
              success: false,
              error: `Connection failed: ${err.message}`,
            });
          } else {
            res.json({
              success: true,
              message: 'Connection successful!',
              folders: Object.keys(boxes || {}),
            });
          }
          resolve();
        });
      });

      imap.once('error', (err) => {
        res.json({
          success: false,
          error: `Connection failed: ${err.message}`,
        });
        resolve();
      });

      imap.connect();
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Connection test failed: ${error.message}`,
    });
  }
});

export default router; 