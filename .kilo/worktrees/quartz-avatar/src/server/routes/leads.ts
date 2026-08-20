import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { LeadCaptureService } from '../services/lead-capture.service.js';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { EmailService } from '../services/email.service.js';

const router = Router();

/**
 * POST /api/leads/indiamart/:businessId
 * Capture lead from IndiaMART webhook
 */
router.post('/indiamart/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params as { businessId: string };
    const leadData = req.body;

    // Validate required fields
    if (!leadData.phone && !leadData.email) {
      return res.status(400).json({
        success: false,
        error: 'Phone or email is required',
      });
    }

    const contact = await LeadCaptureService.captureIndiaMARTLead(businessId, {
      name: leadData.name || '',
      phone: leadData.phone || '',
      email: leadData.email,
      company: leadData.company,
      product: leadData.product || leadData.service,
      requirement: leadData.requirement || leadData.message,
      city: leadData.city,
      state: leadData.state,
    });

    res.json({
      success: true,
      message: 'Lead captured successfully',
      data: contact,
    });
  } catch (error: any) {
    console.error('IndiaMART lead capture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/justdial/:businessId
 * Capture lead from JustDial webhook
 */
router.post('/justdial/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params as { businessId: string };
    const leadData = req.body;

    if (!leadData.phone && !leadData.email) {
      return res.status(400).json({
        success: false,
        error: 'Phone or email is required',
      });
    }

    const contact = await LeadCaptureService.captureJustDialLead(businessId, {
      name: leadData.name || '',
      phone: leadData.phone || '',
      email: leadData.email,
      service: leadData.service,
      location: leadData.location,
      message: leadData.message,
    });

    res.json({
      success: true,
      message: 'Lead captured successfully',
      data: contact,
    });
  } catch (error: any) {
    console.error('JustDial lead capture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/facebook/:businessId
 * Capture lead from Facebook Lead Ads webhook
 */
router.post('/facebook/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params as { businessId: string };
    const leadData = req.body;

    if (!leadData.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const contact = await LeadCaptureService.captureFacebookLead(businessId, {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      formId: leadData.form_id,
      adId: leadData.ad_id,
      campaignId: leadData.campaign_id,
      customFields: leadData.custom_fields,
    });

    res.json({
      success: true,
      message: 'Facebook lead captured successfully',
      data: contact,
    });
  } catch (error: any) {
    console.error('Facebook lead capture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/instagram/:businessId
 * Capture lead from Instagram Lead Ads webhook
 */
router.post('/instagram/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params as { businessId: string };
    const leadData = req.body;

    if (!leadData.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const contact = await LeadCaptureService.captureInstagramLead(businessId, {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      username: leadData.username,
      formId: leadData.form_id,
      adId: leadData.ad_id,
    });

    res.json({
      success: true,
      message: 'Instagram lead captured successfully',
      data: contact,
    });
  } catch (error: any) {
    console.error('Instagram lead capture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/manual
 * Manually create lead (for forms, imports, etc.)
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const { businessId, source, leadData } = req.body;

    if (!businessId || !source || !leadData) {
      return res.status(400).json({
        success: false,
        error: 'businessId, source, and leadData are required',
      });
    }

    let contact;

    switch (source) {
      case 'indiamart':
        contact = await LeadCaptureService.captureIndiaMARTLead(businessId, leadData);
        break;
      case 'justdial':
        contact = await LeadCaptureService.captureJustDialLead(businessId, leadData);
        break;
      case 'facebook_ads':
        contact = await LeadCaptureService.captureFacebookLead(businessId, leadData);
        break;
      case 'instagram_ads':
        contact = await LeadCaptureService.captureInstagramLead(businessId, leadData);
        break;
      case 'manual':
        // Manual lead entry - create contact directly
        contact = await prisma.contact.create({
          data: {
            businessId,
            name: leadData.name || '',
            phone: leadData.phone || '',
            email: leadData.email,
            company: leadData.company,
            source: 'manual',
            tags: [],
            customFields: {
              product: leadData.product,
              requirement: leadData.requirement,
              city: leadData.city,
              supplier: leadData.supplier,
            },
            metadata: {
              product: leadData.product,
              requirement: leadData.requirement,
              city: leadData.city,
              supplier: leadData.supplier,
            },
          },
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported source: ${source}`,
        });
    }

    res.json({
      success: true,
      message: 'Lead captured successfully',
      data: contact,
    });
  } catch (error: any) {
    console.error('Manual lead capture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/leads
 * List all leads with filters
 */
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;

    const {
      page = 1,
      limit = 20,
      source,
      tags,
      search,
      startDate,
      endDate,
    } = req.query;

    const where: any = { businessId };

    if (source) {
      where.source = source;
    }

    if (tags) {
      where.tags = { hasSome: (tags as string).split(',') };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
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
    console.error('List leads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/leads/stats
 * Get lead statistics
 */
router.get('/stats', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;

    const [totalLeads, leadsBySource, leadsByMonth] = await Promise.all([
      prisma.contact.count({ where: { businessId } }),
      prisma.contact.groupBy({
        by: ['source'],
        where: { businessId },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
      prisma.contact.groupBy({
        by: ['createdAt'],
        where: { businessId },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalLeads,
        leadsBySource,
        leadsByMonth: leadsByMonth.slice(-12),
      },
    });
  } catch (error: any) {
    console.error('Lead stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/export/csv
 * Export leads as CSV
 */
router.post('/export/csv', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { leadIds } = req.body;

    const where: any = { businessId };
    if (leadIds?.length) where.id = { in: leadIds };

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Name', 'Phone', 'Email', 'Company', 'Location', 'Product', 'Supplier', 'Requirement', 'Source', 'Tags', 'Deal Value', 'Created At'];
    const rows = contacts.map((c: any) => [
      c.name || '', c.phone, c.email || '', c.company || '',
      c.metadata?.city || c.metadata?.location || '',
      c.metadata?.product || c.metadata?.service || '',
      c.metadata?.supplier || '',
      c.metadata?.requirement || c.metadata?.message || '',
      c.source || '', (c.tags || []).join('; '),
      c.dealValue?.toString() || '', c.createdAt.toISOString(),
    ]);

    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_export.csv');
    res.send(csv);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/export/excel
 * Export leads as Excel (simple XML spreadsheet format)
 */
router.post('/export/excel', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { leadIds } = req.body;

    const where: any = { businessId };
    if (leadIds?.length) where.id = { in: leadIds };

    const contacts = await prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Simple CSV with xlsx extension (most spreadsheet apps handle this)
    const headers = ['Name', 'Phone', 'Email', 'Company', 'Location', 'Product', 'Supplier', 'Requirement', 'Source', 'Tags', 'Deal Value', 'Created At'];
    const rows = contacts.map((c: any) => [
      c.name || '', c.phone, c.email || '', c.company || '',
      c.metadata?.city || c.metadata?.location || '',
      c.metadata?.product || c.metadata?.service || '',
      c.metadata?.supplier || '',
      c.metadata?.requirement || c.metadata?.message || '',
      c.source || '', (c.tags || []).join('; '),
      c.dealValue?.toString() || '', c.createdAt.toISOString(),
    ]);

    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_export.xlsx');
    res.send(csv);
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/export/sheets
 * Sync leads to Google Sheets
 */
router.post('/export/sheets', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { leadIds } = req.body;

    const { GoogleSheetsService } = await import('../services/google-sheets.service.js');
    const result = await GoogleSheetsService.syncContacts(businessId, {});
    res.json({ success: true, url: result.spreadsheetUrl, synced: result.synced });
  } catch (error: any) {
    console.error('Sheets export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/bulk-reply
 * Send bulk reply to leads via WhatsApp/Email/SMS
 */
router.post('/bulk-reply', authenticate, async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { leadIds, channel, message } = req.body;
    if (!leadIds?.length || !channel || !message) {
      return res.status(400).json({ success: false, error: 'leadIds, channel, and message are required' });
    }

    const contacts = await prisma.contact.findMany({
      where: { businessId, id: { in: leadIds } },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      try {
        if (channel === 'whatsapp' && contact.phone) {
          const { WhatsAppService } = await import('../services/whatsapp.service.js');
          await WhatsAppService.sendTextMessage(businessId, contact.phone, message, { messageId: contact.id });
          sent++;
        } else if (channel === 'email' && contact.email) {
          const { EmailService } = await import('../services/email.service.js');
          await EmailService.sendEmail(businessId, {
            to: contact.email,
            subject: 'Response to your inquiry',
            html: `<p>Dear ${contact.name || 'Customer'},</p><p>${message.replace(/\n/g, '<br/>')}</p>`,
          });
          sent++;
        } else if (channel === 'sms' && contact.phone) {
          // SMS via WhatsApp as fallback (or integrate Twilio later)
          const { WhatsAppService } = await import('../services/whatsapp.service.js');
          await WhatsAppService.sendTextMessage(businessId, contact.phone, message, { messageId: contact.id });
          sent++;
        }
      } catch (err: any) {
        errors.push(`${contact.name || contact.phone}: ${err.message}`);
      }
    }

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'bulk_reply',
        title: `Bulk reply via ${channel}`,
        content: `Sent to ${sent} of ${contacts.length} leads`,
        metadata: { channel, sent, total: contacts.length, errors: errors.slice(0, 5) },
      },
    });

    res.json({ success: true, sent, total: contacts.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    console.error('Bulk reply error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead/contact
 */
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    // Verify the contact belongs to the user's business
    const contact = await prisma.contact.findFirst({
      where: { id, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    await prisma.contact.delete({ where: { id } });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/leads/capture/:businessId
 * Public lead capture endpoint (no auth required - for website forms)
 */
router.post('/capture/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params as { businessId: string };
    const { name, phone, email, company, product, requirement, city, supplier, source: src } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ success: false, error: 'Phone or email is required' });
    }

    const contact = await LeadCaptureService.upsertContact(businessId, {
      name: name || 'Website Lead',
      phone: phone || '',
      email,
      company,
      source: src || 'website',
      tags: [src ? src.charAt(0).toUpperCase() + src.slice(1) : 'Website', 'Lead'],
      metadata: {
        product,
        requirement,
        city,
        supplier,
        capturedAt: new Date().toISOString(),
      },
    });

    // Auto-reply via WhatsApp if phone provided
    if (phone) {
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { name: true, autoReplyMessage: true, phone: true },
        });
        const msg = business?.autoReplyMessage ||
          `Hi ${name || 'there'}! 👋\n\nThank you for your inquiry about ${product || 'our products'}.\n\nWe've received your requirement and our team will get back to you shortly.\n\nBest regards,\n${business?.name || 'Our Team'}`;
        await WhatsAppService.sendTextMessage(businessId, phone, msg, { messageId: contact.id });
      } catch (e: any) {
        console.error('Auto-reply WhatsApp failed:', e.message);
      }
    }

    // Auto-reply via Email if email provided
    if (email) {
      try {
        await EmailService.sendEmail(businessId, {
          to: email,
          subject: 'Thank you for your inquiry',
          html: `<h2>Thank you for contacting us!</h2><p>Dear ${name || 'there'},</p><p>We have received your inquiry about <strong>${product || 'our products'}</strong>.</p><p>Our team will get back to you shortly.</p><p>Best regards,<br/>Our Team</p>`,
        });
      } catch (e: any) {
        console.error('Auto-reply email failed:', e.message);
      }
    }

    // Log activity
    await prisma.activity.create({
      data: {
        businessId,
        contactId: contact.id,
        type: 'lead_captured',
        title: `New lead from ${src || 'website'}`,
        content: `Product: ${product}, Requirement: ${requirement}`,
        metadata: { source: src || 'website', product, requirement, city, supplier },
      },
    });

    res.json({ success: true, message: 'Lead captured successfully', data: contact });
  } catch (error: any) {
    console.error('Public lead capture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

