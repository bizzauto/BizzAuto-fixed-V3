import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== WHITE LABEL ====================

// Get white-label settings
router.get('/', async (req: any, res: any) => {
  try {
    let settings = await prisma.whiteLabel.findUnique({
      where: { businessId: req.user.businessId },
    });

    if (!settings) {
      settings = await prisma.whiteLabel.create({
        data: { businessId: req.user.businessId },
      });
    }

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update white-label settings
router.put('/', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const settings = await prisma.whiteLabel.upsert({
      where: { businessId: req.user.businessId },
      update: req.body,
      create: { businessId: req.user.businessId, ...req.body },
    });
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== THEME PREFERENCES ====================

router.get('/theme', async (req: any, res: any) => {
  try {
    let prefs = await prisma.themePreference.findUnique({
      where: { userId: req.user.id },
    });

    if (!prefs) {
      prefs = await prisma.themePreference.create({
        data: { userId: req.user.id },
      });
    }

    res.json({ success: true, data: prefs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/theme', async (req: any, res: any) => {
  try {
    const prefs = await prisma.themePreference.upsert({
      where: { userId: req.user.id },
      update: req.body,
      create: { userId: req.user.id, ...req.body },
    });
    res.json({ success: true, data: prefs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== APPOINTMENTS ====================

// Get appointments
router.get('/appointments', async (req: any, res: any) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where: any = { businessId: req.user.businessId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create appointment
router.post('/appointments', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const appointment = await prisma.appointment.create({
      data: { businessId: req.user.businessId, ...req.body },
      include: { contact: true },
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update appointment
router.put('/appointments/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    if (!appointment) return res.status(404).json({ success: false, error: 'Not found' });

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete appointment
router.delete('/appointments/:id', requireRole('OWNER', 'ADMIN'), async (req: any, res: any) => {
  try {
    await prisma.appointment.delete({
      where: { id: req.params.id, businessId: req.user.businessId },
    });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
