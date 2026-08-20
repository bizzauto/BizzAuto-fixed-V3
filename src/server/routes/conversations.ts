import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import axios from 'axios';
import { decrypt } from '../utils/auth.js';

const router = Router();

// ==================== INBOX STATS (must be before /:contactId) ====================

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [contacts, reviews, messages] = await Promise.all([
      prisma.contact.findMany({
        where: { businessId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          source: true,
          lastMessageAt: true,
          whatsappOptIn: true,
        },
      }),
      prisma.review.findMany({
        where: { businessId },
        select: { reviewerEmail: true, reviewerPhone: true, isRead: true, createdAt: true },
      }),
      prisma.message.groupBy({
        by: ['contactId'],
        where: { businessId, contactId: { not: null } },
        _count: true,
      }),
    ]);

    const messageContactIds = new Set(messages.map((m) => m.contactId).filter(Boolean));

    const uniqueContacts = new Map<string, { id: string; name: string; phone: string | null; email: string | null; source: string; lastMessageAt: Date | null; whatsappOptIn: boolean }>();

    for (const c of contacts) {
      if (!uniqueContacts.has(c.id)) {
        uniqueContacts.set(c.id, c);
      }
    }

    let whatsappCount = 0;
    let emailCount = 0;
    let reviewsCount = 0;

    Array.from(uniqueContacts.values()).forEach((c) => {
      if (c.whatsappOptIn || c.source === 'whatsapp' || (c.phone && messageContactIds.has(c.id))) {
        whatsappCount++;
      }
      if (c.email) {
        emailCount++;
      }
    });

    const uniqueReviewEmails = new Set<string>();
    for (const r of reviews) {
      if (r.reviewerEmail) uniqueReviewEmails.add(r.reviewerEmail);
    }
    reviewsCount = uniqueReviewEmails.size || reviews.length;

    const unreadMessages = await prisma.message.count({
      where: { businessId, direction: 'incoming', status: 'received' },
    });

    const unreadReviews = await prisma.review.count({
      where: { businessId, isRead: false },
    });

    res.json({
      success: true,
      data: {
        totalConversations: uniqueContacts.size + reviewsCount,
        unreadCount: unreadMessages + unreadReviews,
        byChannel: {
          whatsapp: whatsappCount,
          email: emailCount,
          reviews: reviewsCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Get inbox stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inbox stats', details: error.message });
  }
});

// ==================== LIST CONVERSATIONS ====================

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { channel = 'all', status, search, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const conversationMap = new Map<string, {
      contactId: string;
      contactName: string;
      contactPhone: string | null;
      contactEmail: string | null;
      contactAvatar: string | null;
      channel: string;
      lastMessage: string;
      lastMessageAt: Date;
      unreadCount: number;
      status: string;
    }>();

    // --- WhatsApp / Message conversations ---
    if (channel === 'all' || channel === 'whatsapp' || channel === 'email') {
      const contactWhere: any = { businessId };
      if (search) {
        contactWhere.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search) } },
          { email: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const contacts = await prisma.contact.findMany({
        where: contactWhere,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      for (const contact of contacts) {
        if (!contact.messages.length) continue; // eslint-disable-line no-continue

        const lastMsg = contact.messages[0];
        const channelType = contact.email && lastMsg.type === 'email' ? 'email' : 'whatsapp';

        if (channel !== 'all' && channel !== channelType) continue;

        const unreadCount = await prisma.message.count({
          where: {
            contactId: contact.id,
            businessId,
            direction: 'incoming',
            status: 'received',
          },
        });

        const convStatus = unreadCount > 0 ? 'unread' : 'read';

        if (status && status !== 'all' && status !== convStatus) continue;

        conversationMap.set(`msg_${contact.id}`, {
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          contactEmail: contact.email,
          contactAvatar: contact.waProfilePic || null,
          channel: channelType,
          lastMessage: lastMsg.content || `[${lastMsg.type}]`,
          lastMessageAt: lastMsg.createdAt,
          unreadCount,
          status: convStatus,
        });
      }
    }

    // --- Review conversations ---
    if (channel === 'all' || channel === 'reviews') {
      const reviewWhere: any = { businessId };
      if (search) {
        reviewWhere.OR = [
          { reviewerName: { contains: String(search), mode: 'insensitive' } },
          { reviewerEmail: { contains: String(search), mode: 'insensitive' } },
          { reviewerPhone: { contains: String(search) } },
        ];
      }

      const reviews = await prisma.review.findMany({
        where: reviewWhere,
        orderBy: { createdAt: 'desc' },
      });

      const reviewGroupMap = new Map<string, typeof reviews>();
      reviews.forEach((review) => {
        const key = review.reviewerEmail || review.reviewerPhone || review.reviewerName;
        if (!reviewGroupMap.has(key)) {
          reviewGroupMap.set(key, []);
        }
        reviewGroupMap.get(key)!.push(review);
      });

      Array.from(reviewGroupMap.entries()).forEach(([key, groupReviews]) => {
        const latest = groupReviews[0];
        const convStatus = groupReviews.some((r) => !r.isRead) ? 'unread' : 'read';

        if (status && status !== 'all' && status !== convStatus) return;

        const phone = groupReviews.find((r) => r.reviewerPhone)?.reviewerPhone || null;
        const email = groupReviews.find((r) => r.reviewerEmail)?.reviewerEmail || null;
        const contactId = `review_${encodeURIComponent(key)}`;

        conversationMap.set(`review_${key}`, {
          contactId,
          contactName: latest.reviewerName,
          contactPhone: phone,
          contactEmail: email,
          contactAvatar: null,
          channel: 'reviews',
          lastMessage: latest.text || `[${latest.platform} review]`,
          lastMessageAt: latest.createdAt,
          unreadCount: groupReviews.filter((r) => !r.isRead).length,
          status: convStatus,
        });
      });
    }

    // Sort all conversations by lastMessageAt descending
    const allConversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const total = allConversations.length;
    const paginated = allConversations.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: {
        conversations: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations', details: error.message });
  }
});

// ==================== GET FULL CONVERSATION ====================

router.get('/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const contactId = String(req.params.contactId);
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Check if this is a review conversation
    if (contactId.startsWith('review_')) {
      const decodedKey = decodeURIComponent(contactId.replace('review_', ''));
      const reviews = await prisma.review.findMany({
        where: {
          businessId,
          OR: [
            { reviewerEmail: decodedKey },
            { reviewerPhone: decodedKey },
            { reviewerName: decodedKey },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!reviews.length) {
        return res.status(404).json({ success: false, error: 'Review conversation not found' });
      }

      const messages = reviews.map((r) => ({
        id: r.id,
        channel: 'reviews' as const,
        direction: 'incoming' as const,
        type: 'review' as const,
        content: r.text || `[${r.platform} review - ${r.rating} stars]`,
        platform: r.platform,
        rating: r.rating,
        reviewerName: r.reviewerName,
        status: r.replyStatus || 'pending',
        createdAt: r.createdAt,
        replyText: r.replyText,
        repliedAt: r.repliedAt,
      }));

      const total = messages.length;
      const paginated = messages.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        success: true,
        data: {
          contactId,
          contactName: reviews[0].reviewerName,
          contactPhone: reviews[0].reviewerPhone,
          contactEmail: reviews[0].reviewerEmail,
          channel: 'reviews',
          messages: paginated,
          pagination: { total, page: pageNum, limit: limitNum },
        },
      });
    }

    // Regular contact conversation (WhatsApp + Email)
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const messages = await prisma.message.findMany({
      where: { contactId, businessId },
      orderBy: { createdAt: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const total = await prisma.message.count({
      where: { contactId, businessId },
    });

    const formattedMessages = messages.map((m) => ({
      id: m.id,
      channel: 'whatsapp' as const,
      direction: m.direction,
      type: m.type,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      status: m.status,
      createdAt: m.createdAt,
    }));

    res.json({
      success: true,
      data: {
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        contactAvatar: contact.waProfilePic || null,
        channel: 'whatsapp',
        messages: formattedMessages,
        pagination: { total, page: pageNum, limit: limitNum },
      },
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation', details: error.message });
  }
});

// ==================== REPLY TO CONVERSATION ====================

router.post('/:contactId/reply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const contactId = String(req.params.contactId);
    const { content, channel } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Reply content is required' });
    }

    // Review reply
    if (contactId.startsWith('review_')) {
      const decodedKey = decodeURIComponent(contactId.replace('review_', ''));
      const latestReview = await prisma.review.findFirst({
        where: {
          businessId,
          OR: [
            { reviewerEmail: decodedKey },
            { reviewerPhone: decodedKey },
            { reviewerName: decodedKey },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestReview) {
        return res.status(404).json({ success: false, error: 'Review conversation not found' });
      }

      const updated = await prisma.review.update({
        where: { id: latestReview.id },
        data: {
          replyText: content,
          replyStatus: 'replied',
          repliedAt: new Date(),
          repliedBy: req.user.id,
        },
      });

      await prisma.activity.create({
        data: {
          businessId,
          type: 'review_reply',
          title: `Replied to ${latestReview.platform} review by ${latestReview.reviewerName}`,
          content,
          createdBy: req.user.id,
        },
      });

      return res.json({ success: true, data: updated });
    }

    // WhatsApp / Email reply
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const replyChannel = channel || (contact.email && !contact.phone ? 'email' : 'whatsapp');

    if (replyChannel === 'email') {
      if (!contact.email) {
        return res.status(400).json({ success: false, error: 'Contact has no email address' });
      }

      try {
        const { EmailService } = await import('../services/email.service.js');
        await EmailService.sendEmail(contact.email, `Re: Conversation`, content);
      } catch (emailErr: any) {
        console.error('Email send failed:', emailErr.message);
      }

      const message = await prisma.message.create({
        data: {
          businessId,
          contactId,
          direction: 'outbound',
          type: 'email',
          content,
          status: 'sent',
        },
      });

      await prisma.contact.update({
        where: { id: contactId },
        data: { lastMessageAt: new Date() },
      });

      await prisma.activity.create({
        data: {
          businessId,
          contactId,
          type: 'email_sent',
          title: `Email sent to ${contact.name}`,
          content,
          createdBy: req.user.id,
        },
      });

      return res.json({ success: true, data: message });
    }

    // WhatsApp reply
    if (!contact.phone) {
      return res.status(400).json({ success: false, error: 'Contact has no phone number' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { waPhoneNumberId: true, waAccessToken: true },
    });

    if (!business?.waPhoneNumberId || !business?.waAccessToken) {
      return res.status(400).json({ success: false, error: 'WhatsApp not configured for this business' });
    }

    const accessToken = decrypt(business.waAccessToken);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${business.waPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: contact.phone,
        type: 'text',
        text: { body: content },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const message = await prisma.message.create({
      data: {
        businessId,
        contactId,
        direction: 'outbound',
        type: 'text',
        content,
        status: 'sent',
        waMessageId: response.data.messages?.[0]?.id,
      },
    });

    await prisma.contact.update({
      where: { id: contactId },
      data: { lastMessageAt: new Date() },
    });

    await prisma.activity.create({
      data: {
        businessId,
        contactId,
        type: 'whatsapp_sent',
        title: `WhatsApp message sent to ${contact.name}`,
        content,
        createdBy: req.user.id,
      },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: { totalMessages: { increment: 1 } },
    });

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send reply',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// ==================== MARK AS READ ====================

router.patch('/:contactId/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const contactId = String(req.params.contactId);

    // Review conversation
    if (contactId.startsWith('review_')) {
      const decodedKey = decodeURIComponent(contactId.replace('review_', ''));
      const updated = await prisma.review.updateMany({
        where: {
          businessId,
          isRead: false,
          OR: [
            { reviewerEmail: decodedKey },
            { reviewerPhone: decodedKey },
            { reviewerName: decodedKey },
          ],
        },
        data: { isRead: true },
      });

      return res.json({ success: true, data: { markedRead: updated.count } });
    }

    // WhatsApp conversation
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const updated = await prisma.message.updateMany({
      where: {
        contactId,
        businessId,
        direction: 'incoming',
        status: 'received',
      },
      data: { status: 'read' },
    });

    res.json({ success: true, data: { markedRead: updated.count } });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read', details: error.message });
  }
});

// ==================== ARCHIVE CONVERSATIONS ====================

router.post('/archive', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || !contactIds.length) {
      return res.status(400).json({ success: false, error: 'contactIds array is required' });
    }

    const reviewIds: string[] = [];
    const regularIds: string[] = [];

    for (const id of contactIds) {
      if (id.startsWith('review_')) {
        reviewIds.push(id);
      } else {
        regularIds.push(id);
      }
    }

    let archivedContacts = 0;
    let archivedReviews = 0;

    if (regularIds.length) {
      const result = await prisma.contact.updateMany({
        where: { id: { in: regularIds }, businessId },
        data: { status: 'inactive' },
      });
      archivedContacts = result.count;
    }

    if (reviewIds.length) {
      for (const rid of reviewIds) {
        const decodedKey = decodeURIComponent(rid.replace('review_', ''));
        const result = await prisma.review.updateMany({
          where: {
            businessId,
            OR: [
              { reviewerEmail: decodedKey },
              { reviewerPhone: decodedKey },
              { reviewerName: decodedKey },
            ],
          },
          data: { isRead: true },
        });
        archivedReviews += result.count;
      }
    }

    res.json({
      success: true,
      data: {
        archived: archivedContacts + archivedReviews,
        contacts: archivedContacts,
        reviews: archivedReviews,
      },
    });
  } catch (error: any) {
    console.error('Archive conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive conversations', details: error.message });
  }
});

export default router;
