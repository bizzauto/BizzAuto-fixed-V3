import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// ==================== DOCUMENTS ====================

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
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

    res.json({ success: true, data: { documents, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, totalPages: Math.ceil(total / parseInt(limit as string)) } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, content, html, clientName, clientPhone, clientEmail, amount, contactId } = req.body;
    const docNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const data: any = {
      business: { connect: { id: req.user.businessId } },
      documentNumber: docNumber,
      name: name || undefined,
      type: type || undefined,
      content: content || undefined,
      html: html || undefined,
      clientName: clientName || undefined,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      amount: amount ? parseFloat(amount) : undefined,
    };
    if (contactId) data.contact = { connect: { id: contactId } };
    const document = await prisma.document.create({ data });
    res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, content, html, status, clientName, clientPhone, clientEmail, amount } = req.body;
    const document = await prisma.document.update({
      where: { id: req.params.id, businessId: req.user.businessId },
      data: { name, type, content, html, status, clientName, clientPhone, clientEmail, amount },
    });
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DOCUMENT TEMPLATES ====================

router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.documentTemplate.findMany({
      where: { OR: [{ businessId: req.user.businessId }, { isDefault: true }] },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/templates', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, type, isDefault } = req.body;
    const template = await prisma.documentTemplate.create({
      data: {
        businessId: req.user.businessId,
        name: name || 'Untitled Template',
        type: type || 'invoice',
        content: content || undefined,
        isDefault: isDefault || false,
      },
    });
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AI CONTENT ====================

router.get('/ai-content', async (req: AuthRequest, res: Response) => {
  try {
    const { type, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { userId: req.user.id };
    if (type) where.type = type;

    const [content, total] = await Promise.all([
      prisma.aIContent.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.aIContent.count({ where }),
    ]);

    res.json({ success: true, data: { content, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total } } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai-content', async (req: AuthRequest, res: Response) => {
  try {
    const { type, prompt, model } = req.body;
    const aiContent = await prisma.aIContent.create({
      data: {
        user: { connect: { id: req.user.id } },
        type: type || 'text',
        prompt: prompt || '',
        model: model || undefined,
        result: '',
        tokensUsed: 0,
      },
    });
    res.status(201).json({ success: true, data: aiContent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single document (MUST be after /templates and /ai-content to avoid route conflicts!)
router.get('/:id', async (req: AuthRequest, res: Response) => {
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
router.post('/:id/convert', async (req: AuthRequest, res: Response) => {
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
router.post('/:id/send', async (req: AuthRequest, res: Response) => {
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
        status: document.status === 'draft' ? 'sent' : document.status,
        sentVia: document.sentVia ? `${document.sentVia},whatsapp` : 'whatsapp',
      },
    });

    res.json({ success: true, data: { publicLink, message: 'Document sent via WhatsApp' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete document
router.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id, businessId: req.user.businessId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
