import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== AI LEAD SCORING ====================

// Helper function to score a single contact
async function scoreContact(contactId: string, businessId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, businessId },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      messages: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!contact) {
    throw new Error('Contact not found');
  }

  const now = new Date();
  const lastActivity = contact.lastActivity ? new Date(contact.lastActivity) : new Date(0);
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  // Recency score (0-25)
  const recencyScore = daysSinceActivity === 0 ? 25 : Math.max(0, 25 - daysSinceActivity);

  // Engagement score (0-25)
  const engagementScore = Math.min(25, Math.floor((contact.activities.length + contact.messages.length) / 2));

  // Intent score (0-25) - based on tags and deal value
  let intentScore = 0;
  if (contact.tags.includes('Hot Lead')) intentScore += 15;
  if (contact.tags.includes('VIP')) intentScore += 10;
  if (contact.dealValue && contact.dealValue > 50000) intentScore += 10;
  else if (contact.dealValue && contact.dealValue > 10000) intentScore += 5;

  // Fit score (0-25) - based on completeness of profile
  let fitScore = 0;
  if (contact.name) fitScore += 5;
  if (contact.email) fitScore += 5;
  if (contact.phone) fitScore += 5;
  if (contact.company) fitScore += 5;
  if (contact.customFields) fitScore += 5;

  const totalScore = recencyScore + engagementScore + intentScore + fitScore;

  let category = 'cold';
  if (totalScore >= 75) category = 'very_hot';
  else if (totalScore >= 50) category = 'hot';
  else if (totalScore >= 25) category = 'warm';

  const score = await prisma.leadScore.upsert({
    where: { contactId },
    update: {
      score: totalScore,
      category,
      engagementScore,
      recencyScore,
      intentScore,
      fitScore,
      aiConfidence: 0.85,
      predictedValue: contact.dealValue || null,
      churnRisk: daysSinceActivity > 30 ? Math.min(100, daysSinceActivity * 3) : 0,
      reasons: {
        recency: `Last active ${daysSinceActivity} days ago`,
        engagement: `${contact.activities.length} activities, ${contact.messages.length} messages`,
        intent: `Tags: ${contact.tags.join(', ') || 'none'}`,
        fit: `Profile ${fitScore * 4}% complete`,
      },
      lastScoredAt: now,
    },
    create: {
      contactId,
      businessId,
      score: totalScore,
      category,
      engagementScore,
      recencyScore,
      intentScore,
      fitScore,
      aiModel: 'algorithm_v1',
      aiConfidence: 0.85,
      predictedValue: contact.dealValue || null,
      churnRisk: daysSinceActivity > 30 ? Math.min(100, daysSinceActivity * 3) : 0,
      reasons: {
        recency: `Last active ${daysSinceActivity} days ago`,
        engagement: `${contact.activities.length} activities, ${contact.messages.length} messages`,
        intent: `Tags: ${contact.tags.join(', ') || 'none'}`,
        fit: `Profile ${fitScore * 4}% complete`,
      },
    },
  });

  return score;
}

// Get lead scores
router.get('/scores', async (req: any, res: any) => {
  try {
    const { category, minScore, maxScore } = req.query;
    const where: any = { businessId: req.user.businessId };
    if (category) where.category = category;
    if (minScore) where.score = { gte: parseInt(minScore) };
    if (maxScore) where.score = { ...where.score, lte: parseInt(maxScore) };

    const scores = await prisma.leadScore.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, phone: true, email: true, tags: true }
        }
      },
      orderBy: { score: 'desc' },
      take: 50,
    });

    const avgScore = await prisma.leadScore.aggregate({
      where: { businessId: req.user.businessId },
      _avg: { score: true },
      _count: { score: true },
    });

    const byCategory = await prisma.leadScore.groupBy({
      by: ['category'],
      where: { businessId: req.user.businessId },
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        scores,
        averageScore: Math.round(avgScore._avg.score || 0),
        totalScored: avgScore._count.score,
        byCategory: byCategory.reduce((acc: any, item: any) => {
          acc[item.category] = item._count.id;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Score a single contact
router.post('/score/:contactId', async (req: any, res: any) => {
  try {
    const { contactId } = req.params;
    const score = await scoreContact(contactId, req.user.businessId);
    res.json({ success: true, data: score });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Score all contacts
router.post('/score-all', async (req: any, res: any) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { businessId: req.user.businessId },
      select: { id: true },
    });

    let scored = 0;
    for (const contact of contacts) {
      try {
        await scoreContact(contact.id, req.user.businessId);
        scored++;
      } catch {
        // Skip failed scores
      }
    }

    res.json({ success: true, message: `Scored ${scored}/${contacts.length} contacts` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== NOTIFICATIONS ====================

// Get notifications
router.get('/notifications', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '20', unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { businessId: req.user.businessId };
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { businessId: req.user.businessId, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
        unreadCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req: any, res: any) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark all as read
router.patch('/notifications/read-all', async (req: any, res: any) => {
  try {
    await prisma.notification.updateMany({
      where: { businessId: req.user.businessId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create notification
router.post('/notifications', async (req: any, res: any) => {
  try {
    const notification = await prisma.notification.create({
      data: { businessId: req.user.businessId, ...req.body },
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
