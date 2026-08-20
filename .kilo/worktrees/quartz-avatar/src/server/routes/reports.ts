import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== REPORTS OVERVIEW ====================

router.get('/overview', async (req: any, res: any) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [
      contactsAdded,
      messagesSent,
      messagesReceived,
      campaignsSent,
      postsPublished,
      reviewsReceived,
      dealsWon,
      revenue,
    ] = await Promise.all([
      prisma.contact.count({ where: { businessId: req.user.businessId, createdAt: { gte: since } } }),
      prisma.message.count({ where: { businessId: req.user.businessId, direction: 'outbound', createdAt: { gte: since } } }),
      prisma.message.count({ where: { businessId: req.user.businessId, direction: 'inbound', createdAt: { gte: since } } }),
      prisma.campaign.count({ where: { businessId: req.user.businessId, startedAt: { gte: since } } }),
      prisma.socialPost.count({ where: { businessId: req.user.businessId, publishedAt: { gte: since } } }),
      prisma.review.count({ where: { businessId: req.user.businessId, createdAt: { gte: since } } }),
      prisma.contact.count({ where: { businessId: req.user.businessId, stage: 'Won', updatedAt: { gte: since } } }),
      prisma.contact.aggregate({
        where: { businessId: req.user.businessId, stage: 'Won', updatedAt: { gte: since } },
        _sum: { dealValue: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        contactsAdded,
        messagesSent,
        messagesReceived,
        campaignsSent,
        postsPublished,
        reviewsReceived,
        dealsWon,
        totalRevenue: revenue._sum.dealValue || 0,
        avgResponseTime: '2.5 hours', // Placeholder
        conversionRate: contactsAdded > 0 ? ((dealsWon / contactsAdded) * 100).toFixed(1) : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPORT CONTACTS ====================

router.get('/export/contacts', async (req: any, res: any) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { businessId: req.user.businessId },
      select: {
        id: true, name: true, phone: true, email: true,
        tags: true, source: true, dealValue: true,
        company: true, designation: true, createdAt: true,
      },
    });

    // CSV export
    const headers = 'ID,Name,Phone,Email,Tags,Source,Deal Value,Company,Designation,Created\n';
    const rows = contacts.map(c =>
      `${c.id},"${c.name || ''}",${c.phone},"${c.email || ''}","${c.tags.join(', ')}",${c.source || ''},${c.dealValue || 0},"${c.company || ''}","${c.designation || ''}",${c.createdAt.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(headers + rows);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPORT MESSAGES ====================

router.get('/export/messages', async (req: any, res: any) => {
  try {
    const messages = await prisma.message.findMany({
      where: { businessId: req.user.businessId },
      include: { contact: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const headers = 'ID,Contact,Phone,Direction,Type,Content,Status,Created\n';
    const rows = messages.map(m =>
      `${m.id},"${m.contact?.name || 'Unknown'}",${m.contact?.phone || ''},${m.direction},${m.type},"${(m.content || '').substring(0, 100)}",${m.status},${m.createdAt.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=messages.csv');
    res.send(headers + rows);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPORT CAMPAIGNS ====================

router.get('/export/campaigns', async (req: any, res: any) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = 'ID,Name,Type,Status,Sent,Delivered,Read,Replied,Failed,Created\n';
    const rows = campaigns.map(c =>
      `${c.id},"${c.name}",${c.type},${c.status},${c.totalSent},${c.totalDelivered},${c.totalRead},${c.totalReplied},${c.totalFailed},${c.createdAt.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campaigns.csv');
    res.send(headers + rows);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
