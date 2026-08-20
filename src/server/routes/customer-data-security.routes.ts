import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { decryptFields, encryptFields, SENSITIVE_CONTACT_FIELDS, SENSITIVE_ADDRESS_FIELDS, generateExportToken } from '../services/data-encryption.service.js';
import { maskPhone, maskEmail, deepMaskPII, anonymizeForAnalytics } from '../middleware/pii-masking.js';
import { qs } from '../utils/query.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GDPR/Privacy Compliance Routes
 * Handles customer data export, deletion, and privacy rights
 */

// ==================== DATA EXPORT ====================

/**
 * POST /api/customer-security/export-data
 * Customer requests export of their personal data (GDPR Right to Portability)
 */
router.post('/export-data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email, contactId } = req.body;
    const businessId = req.user.businessId;
    
    // Find contact by phone, email, or ID — always scoped to business
    let contact;
    if (contactId) {
      contact = await prisma.contact.findFirst({ where: { id: contactId, businessId } });
    } else if (phone) {
      contact = await prisma.contact.findFirst({ where: { phone, businessId } });
    } else if (email) {
      contact = await prisma.contact.findFirst({ where: { email, businessId } });
    }
    
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    // Collect all customer data
    const orders = await prisma.order.findMany({
      where: { contactId: contact.id },
      include: { items: true },
    });
    
    const conversations = await (prisma as any).conversation.findMany({
      where: { contactId: contact.id },
    });
    
    const appointments = await prisma.appointment.findMany({
      where: { contactId: contact.id },
    });
    
    const reviews = await prisma.review.findMany({
      where: { contactId: contact.id } as any,
    });
    
    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportToken: generateExportToken(),
      personalInformation: {
        name: contact.name,
        phone: contact.phone ? decryptFields({ phone: contact.phone }, ['phone']).phone : null,
        email: contact.email ? decryptFields({ email: contact.email }, ['email']).email : null,
        company: contact.company,
        city: contact.city,
        state: contact.state,
        createdAt: contact.createdAt,
      },
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        items: order.items.map(item => ({
          name: (item as any).productName || 'Product',
          quantity: item.quantity,
          price: item.price,
        })),
        createdAt: order.createdAt,
      })),
      conversations: conversations.length,
      appointments: appointments.map(apt => ({
        title: apt.title,
        date: apt.startTime,
        status: apt.status,
      })),
      reviews: reviews.map(r => ({
        rating: r.rating,
        comment: (r as any).comment,
        createdAt: r.createdAt,
      })),
      consentHistory: {
        whatsappOptIn: contact.whatsappOptIn,
        emailOptIn: contact.emailOptIn,
      },
    };
    
    // Create audit log
    await createAuditLog({
      action: 'DATA_EXPORT',
      contactId: contact.id,
      businessId: businessId || contact.businessId,
      details: `Data exported for customer ${contact.id}`,
      requestedBy: 'customer',
    });
    
    res.json({ success: true, data: exportData });
  } catch (error: any) {
    console.error('[CustomerSecurity] Data export failed:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// ==================== DATA DELETION ====================

/**
 * POST /api/customer-security/delete-data
 * Customer requests deletion of their personal data (GDPR Right to Erasure)
 */
router.post('/delete-data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email, contactId, reason } = req.body;
    const businessId = req.user.businessId;
    
    // Find contact — always scoped to business
    let contact;
    if (contactId) {
      contact = await prisma.contact.findFirst({ where: { id: contactId, businessId } });
    } else if (phone) {
      contact = await prisma.contact.findFirst({ where: { phone, businessId } });
    } else if (email) {
      contact = await prisma.contact.findFirst({ where: { email, businessId } });
    }
    
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    // Anonymize instead of hard delete (preserve order history for business)
    const anonymizedPhone = 'DELETED_' + Date.now();
    const anonymizedEmail = 'deleted_' + Date.now() + '@anonymized.com';
    
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        name: 'Deleted Customer',
        phone: null,
        email: null,
        company: null,
        title: null,
        designation: null,
        city: null,
        state: null,
        customFields: {},
        metadata: {
          deletedAt: new Date().toISOString(),
          deletionReason: reason || 'customer_request',
          originalId: contact.id,
        },
      },
    });
    
    // Create audit log
    await createAuditLog({
      action: 'DATA_DELETION',
      contactId: contact.id,
      businessId: businessId || contact.businessId,
      details: `Customer data deleted. Reason: ${reason || 'customer_request'}`,
      requestedBy: 'customer',
    });
    
    res.json({ 
      success: true, 
      message: 'Your personal data has been deleted. Order history is preserved for business records.',
      deletedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CustomerSecurity] Data deletion failed:', error);
    res.status(500).json({ success: false, error: 'Deletion failed' });
  }
});

// ==================== CONSENT MANAGEMENT ====================

/**
 * POST /api/customer-security/consent
 * Update customer consent preferences
 */
router.post('/consent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, whatsappOptIn, emailOptIn } = req.body;
    const businessId = req.user.businessId;
    
    if (!contactId) {
      return res.status(400).json({ success: false, error: 'Contact ID required' });
    }
    
    // Verify contact belongs to this business
    const contact = await prisma.contact.findFirst({ where: { id: contactId, businessId } });
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        whatsappOptIn: whatsappOptIn ?? undefined,
        emailOptIn: emailOptIn ?? undefined,
      },
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CONSENT_UPDATE',
      contactId,
      businessId,
      details: `Consent updated: WhatsApp=${whatsappOptIn}, Email=${emailOptIn}`,
      requestedBy: 'customer',
    });
    
    res.json({ success: true, message: 'Consent preferences updated' });
  } catch (error: any) {
    console.error('[CustomerSecurity] Consent update failed:', error);
    res.status(500).json({ success: false, error: 'Consent update failed' });
  }
});

// ==================== DATA ACCESS LOG ====================

/**
 * GET /api/customer-security/access-log/:contactId
 * Get access log for a specific customer
 */
router.get('/access-log/:contactId', authenticate, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { businessId } = req.user as any;
    
    // Verify business access
    const contact = await prisma.contact.findFirst({
      where: { id: qs(contactId), businessId },
    });
    
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    const logs = await prisma.auditLog.findMany({
      where: {
        businessId,
        entity: 'contact',
        entityId: qs(contactId),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const accessLog = logs.map((log) => ({
      action: log.action.toUpperCase(),
      timestamp: log.createdAt,
      user: log.userEmail || log.userId || 'Unknown',
      details: log.description || log.action,
    }));

    res.json({ success: true, data: accessLog });
  } catch (error: any) {
    console.error('[CustomerSecurity] Access log failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch access log' });
  }
});

// ==================== DATA RETENTION ====================

/**
 * POST /api/customer-security/anonymize-old
 * Anonymize old customer data (for data retention compliance)
 * Run this as a scheduled job
 */
router.post('/anonymize-old', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { retentionDays = 365 } = req.body;
    const businessId = req.user.businessId;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Find contacts older than retention period with no recent orders
    const oldContacts = await prisma.contact.findMany({
      where: {
        businessId,
        createdAt: { lt: cutoffDate },
        orders: { none: { createdAt: { gt: cutoffDate } } },
      },
      take: 100, // Process in batches
    });
    
    let anonymizedCount = 0;
    
    for (const contact of oldContacts) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          phone: null,
          email: null,
          customFields: {},
          metadata: {
            anonymizedAt: new Date().toISOString(),
            reason: 'data_retention',
          },
        },
      });
      anonymizedCount++;
    }
    
    // Create audit log
    await createAuditLog({
      action: 'BATCH_ANONYMIZATION',
      businessId,
      details: `${anonymizedCount} contacts anonymized (retention: ${retentionDays} days)`,
      requestedBy: 'system',
    });
    
    res.json({ 
      success: true, 
      message: `${anonymizedCount} old contacts anonymized`,
      count: anonymizedCount,
    });
  } catch (error: any) {
    console.error('[CustomerSecurity] Anonymization failed:', error);
    res.status(500).json({ success: false, error: 'Anonymization failed' });
  }
});

// ==================== HELPER: Audit Log ====================

async function createAuditLog(data: {
  action: string;
  contactId?: string;
  businessId?: string;
  details: string;
  requestedBy: string;
}) {
  try {
    // You can create an AuditLog model in Prisma schema
    // For now, log to console
    console.log('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      ...data,
    }));
  } catch (error) {
    console.error('[AuditLog] Failed to create audit log:', error);
  }
}

export default router;