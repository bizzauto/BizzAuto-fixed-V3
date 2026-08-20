import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkContactLimit } from '../middleware/planLimits.js';
import { createContactSchema, updateContactSchema, importContactsSchema } from '../validations/schemas.js';

const router = Router();

// Get all contacts with filtering and pagination
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, search, tags, pipelineId, stageId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Tags filter
    if (tags) {
      where.tags = { has: tags as string };
    }

    // Pipeline/Stage filter
    if (pipelineId) {
      where.pipelineId = pipelineId as string;
    }
    if (stageId) {
      where.stageId = stageId as string;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { messages: true, activities: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts',
      details: error.message,
    });
  }
});

// Get single contact
router.get('/:id', authenticate, async (req: any, res: any) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        pipeline: true,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact',
      details: error.message,
    });
  }
});

// Create contact (with plan limit check) — OWNER/ADMIN only
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), checkContactLimit, validate(createContactSchema), async (req: any, res: any) => {
  try {
    const { name, phone, email, tags, customFields, pipelineId, stageId } = req.body;

    // Check if contact already exists
    const existing = await prisma.contact.findFirst({
      where: {
        businessId: req.user.businessId,
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Contact already exists',
        data: existing,
      });
    }

    // Note: businessId comes from authenticated user, not request body
    const contact = await prisma.contact.create({
      data: {
        businessId: req.user.businessId,
        name,
        phone,
        email,
        tags: tags || [],
        customFields: customFields || {},
        pipelineId,
        stageId,
        whatsappOptIn: true,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        businessId: req.user.businessId,
        contactId: contact.id,
        type: 'contact_created',
        title: 'Contact created',
        content: `Contact ${name || phone} was added to the system`,
        createdBy: req.user.id,
      },
    });

    // Update business stats
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { totalContacts: { increment: 1 } },
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      details: error.message,
    });
  }
});

// Update contact — OWNER/ADMIN only
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), validate(updateContactSchema), async (req: any, res: any) => {
  try {
    const { name, email, tags, customFields, pipelineId, stageId } = req.body;

    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(tags && { tags }),
        ...(customFields && { customFields }),
        ...(pipelineId !== undefined && { pipelineId }),
        ...(stageId !== undefined && { stageId }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact',
      details: error.message,
    });
  }
});

// Delete contact — OWNER/ADMIN only
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    await prisma.contact.delete({
      where: { id: req.params.id },
    });

    // Update business stats
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { totalContacts: { decrement: 1 } },
    });

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact',
      details: error.message,
    });
  }
});

// Import contacts from CSV — OWNER/ADMIN only
// Uses batch processing (500 per batch) with Prisma createMany for performance
router.post('/import', authenticate, requireRole('OWNER', 'ADMIN'), checkContactLimit, validate(importContactsSchema), async (req: any, res: any) => {
  try {
    const { contacts: rawContacts } = req.body;
    const businessId = req.user.businessId;
    const BATCH_SIZE = 500;

    // Pre-validate: skip rows without phone
    const contacts = (rawContacts || []).filter((c: any) => c?.phone);

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid contacts found in import (phone is required)',
      });
    }

    // Fetch existing phone numbers in bulk to avoid O(n) per-row queries
    const existingPhones = await prisma.contact.findMany({
      where: {
        businessId,
        phone: { in: contacts.map((c: any) => c.phone) },
      },
      select: { phone: true },
    });
    const existingPhoneSet = new Set(existingPhones.map((c) => c.phone));

    const created: any[] = [];
    const failed: any[] = [];

    // Split into batches for bulk insert
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const toCreate: any[] = [];

      for (const contactData of batch) {
        if (existingPhoneSet.has(contactData.phone)) {
          failed.push({ ...contactData, error: 'Already exists' });
          continue;
        }
        existingPhoneSet.add(contactData.phone); // Prevent intra-batch duplicates
        toCreate.push({
          businessId,
          name: contactData.name || null,
          phone: contactData.phone,
          email: contactData.email || null,
          tags: contactData.tags || [],
          whatsappOptIn: true,
        });
      }

      if (toCreate.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.contact.createMany({ data: toCreate, skipDuplicates: true });
        });
        created.push(...toCreate);
      }
    }

    // Update business stats
    if (created.length > 0) {
      await prisma.business.update({
        where: { id: businessId },
        data: { totalContacts: { increment: created.length } },
      });
    }

    res.json({
      success: true,
      data: {
        created: created.length,
        failed: failed.length,
        createdContacts: created,
        failedContacts: failed,
      },
    });
  } catch (error: any) {
    console.error('Import contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import contacts',
      details: error.message,
    });
  }
});

// Search contacts
router.get('/search', authenticate, async (req: any, res: any) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const where: any = {
      businessId: req.user.businessId,
      OR: [
        { name: { contains: q as string, mode: 'insensitive' } },
        { phone: { contains: q as string, mode: 'insensitive' } },
        { email: { contains: q as string, mode: 'insensitive' } },
      ],
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Search contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search contacts',
      details: error.message,
    });
  }
});

export default router;
