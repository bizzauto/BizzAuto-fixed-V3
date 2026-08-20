import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// ==================== DOCUMENTS ====================

router.get('/', async (req: any, res: any) => {
  try {
    const { type, status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        include: { contact: { select: { name: true, phone: true, email: true } } },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({ success: true, data: { documents, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const docNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const document = await prisma.document.create({
      data: { businessId: req.user.businessId, documentNumber: docNumber, ...req.body },
    });
    res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const document = await prisma.document.update({
      where: { id: req.params.id, businessId: req.user.businessId },
      data: req.body,
    });
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single document
router.get('/:id', async (req: any, res: any) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { contact: { select: { name: true, phone: true, email: true } } },
    });
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Convert document to different type
router.post('/:id/convert', async (req: any, res: any) => {
  try {
    const { targetType } = req.body;

    if (!targetType || !['quote', 'invoice', 'proposal'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetType. Must be quote, invoice, or proposal'
      });
    }

    const document = await prisma.document.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Update document type
    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        type: targetType,
        documentNumber: `${targetType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      },
    });

    res.json({ success: true, data: updatedDocument });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send document via WhatsApp
router.post('/:id/send', async (req: any, res: any) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
      include: { contact: true },
    });
    if (!document || !document.contact) {
      return res.status(404).json({ success: false, error: 'Document or contact not found' });
    }

    // Generate public link
    const publicLink = `https://yourdomain.com/docs/${crypto.randomUUID()}`;
    await prisma.document.update({
      where: { id: document.id },
      data: {
        publicLink,
        publicLinkExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: document.status === 'draft' ? 'sent' : document.status,
        sentAt: new Date(),
        sentVia: [...(document.sentVia as string[] || []), 'whatsapp'],
      },
    });

    res.json({ success: true, data: { publicLink, message: 'Document sent via WhatsApp' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete document
router.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id, businessId: req.user.businessId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DOCUMENT TEMPLATES ====================

router.get('/templates', async (req: any, res: any) => {
  try {
    const templates = await prisma.documentTemplate.findMany({
      where: { OR: [{ businessId: req.user.businessId }, { isSystem: true }] },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/templates', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const template = await prisma.documentTemplate.create({
      data: { businessId: req.user.businessId, ...req.body },
    });
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AI CONTENT ====================

router.get('/ai-content', async (req: any, res: any) => {
  try {
    const { type, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { businessId: req.user.businessId };
    if (type) where.type = type;

    const [content, total] = await Promise.all([
      prisma.aIContent.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.aIContent.count({ where }),
    ]);

    res.json({ success: true, data: { content, pagination: { page: parseInt(page), limit: parseInt(limit), total } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai-content', async (req: any, res: any) => {
  try {
    const aiContent = await prisma.aIContent.create({
      data: { businessId: req.user.businessId, userId: req.user.id, ...req.body },
    });
    res.status(201).json({ success: true, data: aiContent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
