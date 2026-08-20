import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
const router = Router();

// Get chatbot flows
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flows = await prisma.chatbotFlow.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: flows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch flows', details: error.message });
  }
});

// Create chatbot flow
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, trigger, keywords, response, aiEnabled } = req.body;
    const flow = await prisma.chatbotFlow.create({
      data: {
        businessId: req.user.businessId,
        name,
        trigger: trigger || 'keyword',
        keywords: keywords || [],
        response: response || '',
        aiEnabled: aiEnabled || false,
      },
    });
    res.status(201).json({ success: true, data: flow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create flow', details: error.message });
  }
});

// Update chatbot flow
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

    const { name, trigger, keywords, response, aiEnabled, isActive } = req.body;
    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: { name, trigger, keywords, response, aiEnabled, isActive },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update flow', details: error.message });
  }
});

// Toggle chatbot flow
router.post('/:id/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: { isActive: !flow.isActive },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to toggle flow', details: error.message });
  }
});

// Activate chatbot flow
router.post('/:id/activate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to activate flow', details: error.message });
  }
});

// Deactivate chatbot flow
router.post('/:id/deactivate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

    const updated = await prisma.chatbotFlow.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to deactivate flow', details: error.message });
  }
});

// Test chatbot flow
router.post('/:id/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

    // Simple test response - in production, this would run the actual flow logic
    res.json({
      success: true,
      data: {
        response: `Test response for flow "${flow.name}" with message: "${message}"`,
        flowId: flow.id,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to test flow', details: error.message });
  }
});

// Delete chatbot flow
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.chatbotFlow.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });

    await prisma.chatbotFlow.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Flow deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete flow', details: error.message });
  }
});

export default router;
