import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Enterprise Data Export/Import API
 * Allows businesses to export all their data and import from other platforms.
 */

// GET /api/data-export/contacts — Export all contacts as JSON
router.get('/contacts', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { format = 'json' } = req.query;
    const contacts = await prisma.contact.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = 'Name,Phone,Email,Company,Tags,Source,Deal Value,Status,Created\n';
      const rows = contacts.map((c: any) =>
        `"${c.name || ''}",${c.phone || ''},"${c.email || ''}","${c.company || ''}","${(c.tags || []).join('; ')}",${c.source || ''},${c.dealValue || 0},${c.status || 'active'},${c.createdAt.toISOString()}`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-export-${Date.now()}.csv"`);
      return res.send(headers + rows);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="contacts-export-${Date.now()}.json"`);
    res.json({ success: true, data: { contacts, exportedAt: new Date().toISOString(), count: contacts.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data-export/deals — Export all deals
router.get('/deals', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { businessId: req.user.businessId, dealValue: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
    });

    const deals = contacts.map((c: any) => ({
      contactName: c.name,
      contactEmail: c.email,
      contactPhone: c.phone,
      company: c.company,
      dealValue: c.dealValue,
      dealStage: c.dealStage || c.stage,
      pipelineId: c.pipelineId,
      tags: c.tags,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="deals-export-${Date.now()}.json"`);
    res.json({ success: true, data: { deals, exportedAt: new Date().toISOString(), count: deals.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data-export/ledger — Export all ledger entries
router.get('/ledger', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { date: 'desc' },
      include: { contact: { select: { name: true, phone: true } } },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-export-${Date.now()}.json"`);
    res.json({ success: true, data: { entries, exportedAt: new Date().toISOString(), count: entries.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data-export/full — Full business data export (JSON)
router.get('/full', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;

    const [business, contacts, deals, invoices, appointments, campaigns, ledgerEntries, products, workflows] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.contact.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.contact.findMany({ where: { businessId, dealValue: { gt: 0 } } }),
      prisma.document.findMany({ where: { businessId, type: 'invoice' }, orderBy: { createdAt: 'desc' } }),
      prisma.appointment.findMany({ where: { businessId }, orderBy: { startTime: 'desc' } }),
      prisma.campaign.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.ledgerEntry.findMany({ where: { businessId }, orderBy: { date: 'desc' } }),
      prisma.product.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.workflow.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    ]);

    // Strip sensitive fields
    const safeBusiness = business ? {
      name: business.name, type: business.type, phone: business.phone,
      email: business.email, city: business.city, state: business.state,
      country: business.country, plan: business.plan,
      createdAt: business.createdAt,
    } : null;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bizzauto-full-export-${Date.now()}.json"`);
    res.json({
      success: true,
      data: {
        business: safeBusiness,
        contacts, deals, invoices, appointments,
        campaigns, ledgerEntries, products, workflows,
        exportedAt: new Date().toISOString(),
        counts: {
          contacts: contacts.length,
          deals: deals.length,
          invoices: invoices.length,
          appointments: appointments.length,
          campaigns: campaigns.length,
          ledgerEntries: ledgerEntries.length,
          products: products.length,
          workflows: workflows.length,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/data-export/contacts/import — Bulk import contacts from JSON array
router.post('/contacts/import', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, error: 'contacts array is required' });
    }
    if (contacts.length > 5000) {
      return res.status(400).json({ success: false, error: 'Maximum 5000 contacts per import' });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const c of contacts) {
      try {
        // Validate each contact before importing
        const phone = typeof c.phone === 'string' ? c.phone.trim() : null;
        const email = typeof c.email === 'string' ? c.email.trim() : null;
        const name = typeof c.name === 'string' ? c.name.trim().slice(0, 200) : 'Imported Contact';
        const company = typeof c.company === 'string' ? c.company.trim().slice(0, 200) : null;
        const tags = Array.isArray(c.tags) ? c.tags.filter((t: any) => typeof t === 'string').slice(0, 20) : [];
        const dealValue = typeof c.dealValue === 'number' && c.dealValue >= 0 ? c.dealValue : 0;
        const dealStage = typeof c.dealStage === 'string' ? c.dealStage.trim().slice(0, 50) : null;

        if (!phone && !email) { skipped++; continue; }

        await prisma.contact.create({
          data: {
            businessId: req.user.businessId,
            name,
            phone: phone || null,
            email: email || null,
            company,
            tags,
            source: 'import',
            dealValue,
            dealStage,
          },
        });
        imported++;
      } catch (err: any) {
        if (err.code === 'P2002') { skipped++; continue; } // duplicate
        errors.push(`${c.name || 'Unknown'}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      data: { imported, skipped, errors: errors.slice(0, 50), total: contacts.length },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
