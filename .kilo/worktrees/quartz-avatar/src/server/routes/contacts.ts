import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

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
        stage: true,
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

// Create contact
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const { name, phone, email, tags, customFields, pipelineId, stageId } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

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

// Update contact
router.put('/:id', authenticate, async (req: any, res: any) => {
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

// Delete contact
router.delete('/:id', authenticate, async (req: any, res: any) => {
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

// Import contacts from CSV
router.post('/import', authenticate, async (req: any, res: any) => {
  try {
    const { contacts } = req.body; // Array of {name, phone, email, tags}

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid contacts array is required',
      });
    }

    const limit = 1000;
    if (contacts.length > limit) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${limit} contacts per import`,
      });
    }

    const created: any[] = [];
    const failed: any[] = [];

    for (const contactData of contacts) {
      try {
        if (!contactData.phone) continue;

        const existing = await prisma.contact.findFirst({
          where: {
            businessId: req.user.businessId,
            phone: contactData.phone,
          },
        });

        if (existing) {
          failed.push({ ...contactData, error: 'Already exists' });
          continue;
        }

        const contact = await prisma.contact.create({
          data: {
            businessId: req.user.businessId,
            name: contactData.name,
            phone: contactData.phone,
            email: contactData.email,
            tags: contactData.tags || [],
            whatsappOptIn: true,
          },
        });

        created.push(contact);
      } catch (error: any) {
        failed.push({ ...contactData, error: error.message });
      }
    }

    // Update business stats
    if (created.length > 0) {
      await prisma.business.update({
        where: { id: req.user.businessId },
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
