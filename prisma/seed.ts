import { PrismaClient, LedgerType, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database with comprehensive demo data...\n');

  // ── Clean up any previous demo data (idempotent re-runs) ──────────
  console.log('🧹 Cleaning up previous demo data...');
  // Delete in reverse dependency order to avoid FK constraint violations
  await prisma.dripQueue.deleteMany();
  await prisma.scheduledMessage.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.dripCampaign.deleteMany();
  await prisma.emailList.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.chatbotFlow.deleteMany();
  await prisma.whiteLabel.deleteMany();
  await prisma.posterTemplate.deleteMany();
  await prisma.wingsStore.deleteMany();
  await prisma.eCommerceStore.deleteMany();
  await prisma.autopilotSettings.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leadScore.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.post.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.review.deleteMany();
  await prisma.document.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.themePreference.deleteMany();
  await prisma.aIContent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  console.log('✅ Cleanup complete\n');

  // ===================================================================
  // 1. BUSINESS
  // ===================================================================
  const business = await prisma.business.upsert({
    where: { id: 'demo-business-id' },
    update: {},
    create: {
      id: 'demo-business-id',
      name: 'BizzAuto Demo',
      type: 'general',
      phone: '+91 8983027975',
      email: 'demo@bizzauto.com',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      address: 'Office 42, IT Park, Hinjewadi',
      website: 'https://bizzautoai.com',
      timezone: 'Asia/Kolkata',
      plan: 'PROFESSIONAL',
      planStartedAt: new Date(),
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      aiCreditsUsed: 0,
      aiCreditsLimit: 500,
      contactsLimit: 10000,
      messagesLimit: 5000,
      usersLimit: 10,
    },
  });
  console.log('✅ Business created:', business.name);

  // ===================================================================
  // 2. USER
  // ===================================================================
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { id: 'demo-user-id' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@bizzauto.com',
      password: hashedPassword,
      name: 'Demo User',
      phone: '+91 8983027975',
      role: 'OWNER',
      businessId: business.id,
      emailVerified: new Date(),
      isVerified: true,
    },
  });
  console.log('✅ User created:', user.email);

  // ===================================================================
  // 3. SALES PIPELINE & STAGES
  // ===================================================================
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'demo-pipeline-id' },
    update: {},
    create: {
      id: 'demo-pipeline-id',
      name: 'Sales Pipeline',
      businessId: business.id,
    },
  });

  const stageData = [
    { id: 'stage-new', name: 'New Lead', order: 0, color: '#3B82F6' },
    { id: 'stage-qualified', name: 'Qualified', order: 1, color: '#8B5CF6' },
    { id: 'stage-proposal', name: 'Proposal Sent', order: 2, color: '#F59E0B' },
    { id: 'stage-negotiation', name: 'Negotiation', order: 3, color: '#F97316' },
    { id: 'stage-closed-won', name: 'Closed Won', order: 4, color: '#10B981' },
    { id: 'stage-closed-lost', name: 'Closed Lost', order: 5, color: '#EF4444' },
  ];

  for (const stage of stageData) {
    await prisma.stage.upsert({
      where: { id: stage.id },
      update: {},
      create: { ...stage, pipelineId: pipeline.id },
    });
  }
  console.log('✅ Pipeline with 6 stages created');

  // ===================================================================
  // 4. CONTACTS (15 realistic Indian business contacts)
  // ===================================================================
  const contactsData = [
    { name: 'Rahul Sharma', phone: '+91 7972888023', email: 'rahul.sharma@techsolutions.com', company: 'Tech Solutions Pvt Ltd', designation: 'CEO', stage: 'QUALIFIED', dealValue: 85000, source: 'Website', city: 'Mumbai', tags: ['Hot Lead', 'VIP'] },
    { name: 'Priya Patel', phone: '+91 8765432109', email: 'priya.patel@digitalmedia.in', company: 'Digital Media Co', designation: 'Marketing Head', stage: 'NEW', dealValue: 45000, source: 'Referral', city: 'Pune', tags: ['New'] },
    { name: 'Amit Verma', phone: '+91 7654321098', email: 'amit.verma@buildcorp.com', company: 'BuildCorp Industries', designation: 'Director', stage: 'PROPOSAL', dealValue: 120000, source: 'LinkedIn', city: 'Delhi', tags: ['Follow Up'] },
    { name: 'Sneha Joshi', phone: '+91 6543210987', email: 'sneha@startupideas.in', company: 'StartupIdeas.in', designation: 'Founder', stage: 'NEGOTIATION', dealValue: 95000, source: 'WhatsApp', city: 'Bangalore', tags: ['Hot Lead'] },
    { name: 'Vikram Singh', phone: '+91 5432109876', email: 'vikram@retailmart.com', company: 'RetailMart Chain', designation: 'Operations Head', stage: 'CLOSED_WON', dealValue: 150000, source: 'Website', city: 'Jaipur', tags: ['VIP', 'Repeat'] },
    { name: 'Neha Gupta', phone: '+91 4321098765', email: 'neha.gupta@edutech.in', company: 'EduTech Innovations', designation: 'CTO', stage: 'NEW', dealValue: 28000, source: 'Google Ads', city: 'Noida', tags: ['New', 'Education'] },
    { name: 'Rajesh Kumar', phone: '+91 3210987654', email: 'rajesh@hospitalitygroup.com', company: 'Hospitality Group', designation: 'Manager', stage: 'QUALIFIED', dealValue: 72000, source: 'Referral', city: 'Goa', tags: ['Hospitality'] },
    { name: 'Ananya Reddy', phone: '+91 2109876543', email: 'ananya@fintechsolutions.com', company: 'FinTech Solutions', designation: 'Product Lead', stage: 'PROPOSAL', dealValue: 108000, source: 'WhatsApp', city: 'Hyderabad', tags: ['Follow Up'] },
    { name: 'Deepak Malhotra', phone: '+91 1098765432', email: 'deepak@autodealers.in', company: 'AutoDealers India', designation: 'Owner', stage: 'NEGOTIATION', dealValue: 200000, source: 'Website', city: 'Chandigarh', tags: ['VIP', 'Hot Lead'] },
    { name: 'Kavita Deshmukh', phone: '+91 9988776655', email: 'kavita@wellnessclinic.com', company: 'Wellness Clinic', designation: 'Doctor', stage: 'NEW', dealValue: 12000, source: 'Google Ads', city: 'Nagpur', tags: ['Healthcare'] },
    { name: 'Suresh Iyer', phone: '+91 8877665544', email: 'suresh@logisticspro.in', company: 'LogisticsPro', designation: 'VP Operations', stage: 'CLOSED_LOST', dealValue: 0, source: 'Referral', city: 'Chennai', tags: ['Lost'] },
    { name: 'Pooja Mehta', phone: '+91 7766554433', email: 'pooja@fashionhub.com', company: 'Fashion Hub', designation: 'Creative Director', stage: 'QUALIFIED', dealValue: 55000, source: 'Instagram', city: 'Ahmedabad', tags: ['Fashion', 'Social'] },
    { name: 'Arun Nair', phone: '+91 6655443322', email: 'arun@realestate.co.in', company: 'Prime Realty', designation: 'Broker', stage: 'PROPOSAL', dealValue: 175000, source: 'WhatsApp', city: 'Kochi', tags: ['Real Estate'] },
    { name: 'Meera Chopra', phone: '+91 5544332211', email: 'meera@foodiescorner.com', company: 'Foodies Corner', designation: 'Owner', stage: 'NEW', dealValue: 22000, source: 'Facebook', city: 'Indore', tags: ['F&B'] },
    { name: 'Rohit Agarwal', phone: '+91 4433221100', email: 'rohit@consultancy.in', company: 'Agarwal Consultancy', designation: 'Managing Partner', stage: 'CLOSED_WON', dealValue: 90000, source: 'LinkedIn', city: 'Kolkata', tags: ['Repeat'] },
  ];

  const contactIds: string[] = [];
  for (const c of contactsData) {
    const created = await prisma.contact.create({
      data: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        company: c.company,
        designation: c.designation,
        source: c.source,
        city: c.city,
        stage: c.stage,
        dealValue: c.dealValue,
        tags: c.tags,
        businessId: business.id,
      },
    });
    contactIds.push(created.id);
  }
  console.log(`✅ ${contactsData.length} demo contacts created with pipeline stages`);

  // ===================================================================
  // 5. WHATSAPP MESSAGE TEMPLATES
  // ===================================================================
  const templateData = [
    { id: 'template-welcome', name: 'Welcome Message', category: 'MARKETING', content: JSON.stringify({ body: 'Hi {{1}}! 👋 Welcome to BizzAuto. We are excited to have you on board. Let us know how we can help your business grow!' }) },
    { id: 'template-followup', name: 'Follow Up', category: 'UTILITY', content: JSON.stringify({ body: 'Hello {{1}}, this is a friendly follow-up from BizzAuto. Did you have any questions about our services?' }) },
    { id: 'template-offer', name: 'Special Offer', category: 'MARKETING', content: JSON.stringify({ body: '🎉 Exclusive offer for {{1}}! Get 20% off on our Pro plan this month. Contact us now!' }) },
    { id: 'template-appointment', name: 'Appointment Reminder', category: 'UTILITY', content: JSON.stringify({ body: 'Reminder: You have an appointment with {{1}} on {{2}} at {{3}}. Please confirm your availability.' }) },
    { id: 'template-invoice', name: 'Invoice Notification', category: 'UTILITY', content: JSON.stringify({ body: 'Dear {{1}}, your invoice #{{2}} of ₹{{3}} has been generated. Due date: {{4}}.' }) },
  ];

  for (const tpl of templateData) {
    await prisma.messageTemplate.upsert({
      where: { id: tpl.id },
      update: {},
      create: {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        businessId: business.id,
        components: JSON.parse(tpl.content),
      },
    });
  }
  console.log('✅ 5 WhatsApp message templates created');

  // ===================================================================
  // 6. SAMPLE CAMPAIGNS
  // ===================================================================
  const campaignData = [
    {
      id: 'campaign-festive',
      name: 'Diwali Festive Offer 🪔',
      type: 'WHATSAPP',
      status: 'completed',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      content: { message: 'Happy Diwali! 🎆 Exclusive festive discounts on all plans. Use code DIWALI20 for 20% off!' },
      totalSent: 15,
      delivered: 14,
      read: 10,
      totalDelivered: 14,
      totalRead: 10,
      totalReplied: 3,
    },
    {
      id: 'campaign-newyear',
      name: 'New Year Campaign 2026',
      type: 'WHATSAPP',
      status: 'draft',
      scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      content: { message: '🎉 Welcome 2026! Start the year with BizzAuto. Special New Year pricing available now!' },
    },
    {
      id: 'campaign-product',
      name: 'Product Launch - AI Chatbots',
      type: 'EMAIL',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      content: { subject: 'Introducing AI-Powered Chatbots 🤖', body: 'Automate your customer support with our new AI chatbot integration. 24/7 support, smart replies, and more.' },
    },
  ];

  for (const camp of campaignData) {
    await prisma.campaign.upsert({
      where: { id: camp.id },
      update: {},
      create: {
        id: camp.id,
        name: camp.name,
        type: camp.type,
        status: camp.status,
        scheduledAt: camp.scheduledAt,
        sentAt: (camp as any).sentAt || null,
        businessId: business.id,
        content: camp.content,
        targetFilters: { all: true },
        createdBy: user.id,
        totalSent: (camp as any).totalSent || 0,
        delivered: (camp as any).delivered || 0,
        read: (camp as any).read || 0,
        totalDelivered: (camp as any).totalDelivered || 0,
        totalRead: (camp as any).totalRead || 0,
        totalReplied: (camp as any).totalReplied || 0,
      },
    });
  }
  console.log('✅ 3 demo campaigns created');

  // ===================================================================
  // 7. SAMPLE MESSAGES (WhatsApp conversations)
  // ===================================================================
  const messageSamples = [
    { contactIndex: 0, messages: [
      { direction: 'incoming', type: 'text', content: 'Hi! I saw your demo on WhatsApp automation. Can you tell me more?', status: 'read' },
      { direction: 'outgoing', type: 'text', content: 'Hello Rahul! Thank you for reaching out. We offer automated WhatsApp messaging, chatbots, and campaign management. Would you like a personalized demo?', status: 'read' },
      { direction: 'incoming', type: 'text', content: 'Yes, that would be great! When can we schedule it?', status: 'read' },
      { direction: 'outgoing', type: 'text', content: 'I have added you to our demo pipeline. Our team will reach out within 24 hours to schedule a convenient time. 😊', status: 'read' },
    ]},
    { contactIndex: 3, messages: [
      { direction: 'incoming', type: 'text', content: 'We need help with social media automation for our startup.', status: 'read' },
      { direction: 'outgoing', type: 'text', content: 'Hi Sneha! Great timing. Our social media module can schedule posts, generate AI captions, and manage multiple platforms. Want to see a quick demo?', status: 'read' },
      { direction: 'incoming', type: 'text', content: "That's exactly what we need! Can we start with a trial?", status: 'read' },
      { direction: 'outgoing', type: 'text', content: "Absolutely! I'll set up a 14-day free trial for you right away. You'll get full access to all features.", status: 'read' },
    ]},
  ];

  for (const sample of messageSamples) {
    const contactId = contactIds[sample.contactIndex];
    for (const msg of sample.messages) {
      await prisma.message.create({
        data: {
          contactId,
          direction: msg.direction,
          type: msg.type,
          content: msg.content,
          status: msg.status,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log('✅ Sample WhatsApp conversations created');

  // ===================================================================
  // 8. APPOINTMENTS
  // ===================================================================
  const appointmentsData = [
    { title: 'Product Demo - Tech Solutions', contactIndex: 0, daysFromNow: 1, startHour: 10, duration: 45, status: 'confirmed', location: 'Video Call' },
    { title: 'Follow-up Call - Digital Media Co', contactIndex: 1, daysFromNow: 2, startHour: 14, duration: 30, status: 'pending', location: 'Phone Call' },
    { title: 'Contract Review - BuildCorp', contactIndex: 2, daysFromNow: 3, startHour: 11, duration: 60, status: 'confirmed', location: 'Office - Conference Room A' },
    { title: 'Strategy Session - StartupIdeas', contactIndex: 3, daysFromNow: 5, startHour: 16, duration: 90, status: 'pending', location: 'Virtual' },
    { title: 'Quarterly Review - RetailMart', contactIndex: 4, daysFromNow: -3, startHour: 15, duration: 60, status: 'completed', location: 'Video Call' },
    { title: 'Onboarding Call - EduTech', contactIndex: 5, daysFromNow: 7, startHour: 9, duration: 45, status: 'pending', location: 'Phone Call' },
  ];

  for (const apt of appointmentsData) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + apt.daysFromNow);
    startTime.setHours(apt.startHour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + apt.duration);

    await prisma.appointment.create({
      data: {
        title: apt.title,
        contactId: contactIds[apt.contactIndex],
        businessId: business.id,
        startTime,
        endTime,
        status: apt.status,
        location: apt.location,
        createdBy: user.id,
      },
    });
  }
  console.log('✅ 6 demo appointments created');

  // ===================================================================
  // 9. PRODUCTS & E-COMMERCE
  // ===================================================================
  const productsData = [
    { name: 'WhatsBot Pro', description: 'Advanced WhatsApp automation with chatbots, templates, and analytics.', price: 9999, sku: 'WB-PRO-001', quantity: 100, category: 'Software', mainImage: '/images/products/whatsbot.png' },
    { name: 'Social Media Manager', description: 'Schedule, publish, and analyze posts across Instagram, Facebook, and LinkedIn.', price: 14999, sku: 'SMM-001', quantity: 50, category: 'Software', mainImage: '/images/products/smm.png' },
    { name: 'AI Content Generator', description: 'Generate captions, blogs, and marketing copy using advanced AI.', price: 4999, sku: 'AI-CG-001', quantity: 200, category: 'Digital Service', mainImage: '/images/products/ai-content.png' },
    { name: 'CRM Enterprise', description: 'Full-featured CRM with pipeline management, lead scoring, and analytics.', price: 24999, sku: 'CRM-ENT-001', quantity: 30, category: 'Software', mainImage: '/images/products/crm.png' },
    { name: 'Email Marketing Suite', description: 'Professional email campaigns with templates, drips, and analytics.', price: 7999, sku: 'EMS-001', quantity: 80, category: 'Software', mainImage: '/images/products/email.png' },
  ];

  const productRecords: any[] = [];
  for (const product of productsData) {
    const created = await prisma.product.create({
      data: {
        ...product,
        images: product.mainImage ? [product.mainImage] : [],
        businessId: business.id,
        status: 'active',
        isActive: true,
      },
    });
    productRecords.push(created);
  }
  console.log('✅ 5 demo products created');

  // ===================================================================
  // 10. SAMPLE ORDERS
  // ===================================================================
  const ordersData = [
    {
      contactIndex: 4, items: [
        { productIndex: 0, name: 'WhatsBot Pro', price: 9999, qty: 1 },
        { productIndex: 2, name: 'AI Content Generator', price: 4999, qty: 1 },
      ], total: 14998, status: 'delivered', paymentStatus: 'paid', gateway: 'UPI',
    },
    {
      contactIndex: 14, items: [
        { productIndex: 3, name: 'CRM Enterprise', price: 24999, qty: 1 },
        { productIndex: 1, name: 'Social Media Manager', price: 14999, qty: 1 },
      ], total: 39998, status: 'processing', paymentStatus: 'paid', gateway: 'BANK',
    },
    {
      contactIndex: 0, items: [
        { productIndex: 0, name: 'WhatsBot Pro', price: 9999, qty: 2 },
      ], total: 19998, status: 'pending', paymentStatus: 'pending', gateway: 'CARD',
    },
  ];

  for (const order of ordersData) {
    await prisma.order.create({
      data: {
        contactId: contactIds[order.contactIndex],
        businessId: business.id,
        status: order.status,
        total: order.total,
        subtotal: order.total,
        taxAmount: 0,
        shippingAmount: 0,
        discountAmount: 0,
        paymentStatus: order.paymentStatus,
        gateway: order.gateway,
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items: {
          create: order.items.map((item) => ({
            name: item.name,
            quantity: item.qty,
            price: item.price,
            total: item.price * item.qty,
            productId: productRecords[item.productIndex]?.id || null,
          })),
        },
      },
    });
  }
  console.log('✅ 3 sample orders created');

  // ===================================================================
  // 11. DOCUMENTS (Invoices & Quotes)
  // ===================================================================
  const documentsData = [
    {
      name: 'Invoice - CRM Enterprise', type: 'invoice', status: 'sent', amount: 39998, contactIndex: 14,
      clientName: 'Rohit Agarwal', clientEmail: 'rohit@consultancy.in',
      content: { items: [{ description: 'CRM Enterprise License', qty: 1, rate: 24999 }, { description: 'Social Media Manager', qty: 1, rate: 14999 }] },
    },
    {
      name: 'Quote - WhatsApp Automation', type: 'quotation', status: 'draft', amount: 85000, contactIndex: 0,
      clientName: 'Rahul Sharma', clientEmail: 'rahul.sharma@techsolutions.com',
      content: { items: [{ description: 'WhatsBot Pro - Annual License', qty: 1, rate: 60000 }, { description: 'Setup & Training', qty: 1, rate: 25000 }] },
    },
    {
      name: 'Invoice - Content Services', type: 'invoice', status: 'generated', amount: 14998, contactIndex: 4,
      clientName: 'Vikram Singh', clientEmail: 'vikram@retailmart.com',
      content: { items: [{ description: 'WhatsBot Pro', qty: 1, rate: 9999 }, { description: 'AI Content Generator', qty: 1, rate: 4999 }] },
    },
  ];

  for (const doc of documentsData) {
    await prisma.document.create({
      data: {
        name: doc.name,
        documentNumber: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: doc.type,
        status: doc.status,
        amount: doc.amount,
        businessId: business.id,
        contactId: contactIds[doc.contactIndex],
        clientName: doc.clientName,
        clientEmail: doc.clientEmail,
        content: doc.content,
        createdBy: user.id,
      },
    });
  }
  console.log('✅ 3 sample documents created');

  // ===================================================================
  // 12. REVIEWS
  // ===================================================================
  const reviewsData = [
    { reviewerName: 'Rahul Sharma', rating: 5, text: 'Excellent platform! The WhatsApp automation has saved us hours every week. Highly recommended for any business looking to scale their communication.', platform: 'google', reviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), replyText: 'Thank you Rahul! We are thrilled to have you as a customer. 😊', replyStatus: 'replied' },
    { reviewerName: 'Priya Patel', rating: 4, text: 'Great features and easy to use. The AI content generator is particularly impressive. Would love to see more templates.', platform: 'google', reviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), replyText: null, replyStatus: null },
    { reviewerName: 'Amit Verma', rating: 5, text: 'Game changer for our business. The pipeline management and CRM features are world-class. Support team is very responsive.', platform: 'facebook', reviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), replyText: 'Thank you Amit! We appreciate your kind words. 🙏', replyStatus: 'replied' },
    { reviewerName: 'Sneha Joshi', rating: 4, text: 'Good product overall. The social media scheduling works well. A few UI improvements would make it perfect.', platform: 'google', reviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), replyText: null, replyStatus: null },
  ];

  for (const review of reviewsData) {
    await prisma.review.create({
      data: {
        reviewerName: review.reviewerName,
        rating: review.rating,
        text: review.text,
        platform: review.platform,
        reviewDate: review.reviewDate,
        businessId: business.id,
        replyText: review.replyText,
        replyStatus: review.replyStatus,
      },
    });
  }
  console.log('✅ 4 sample reviews created');

  // ===================================================================
  // 13. LEDGER ENTRIES
  // ===================================================================
  const ledgerData = [
    { type: LedgerType.INCOME, amount: 39998, category: 'Product Sales', description: 'CRM Enterprise - RetailMart', paymentMethod: PaymentMethod.UPI, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    { type: LedgerType.INCOME, amount: 14998, category: 'Product Sales', description: 'WhatsBot Pro + AI Content - RetailMart', paymentMethod: PaymentMethod.UPI, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    { type: LedgerType.EXPENSE, amount: 15000, category: 'Marketing', description: 'Google Ads Campaign - January', paymentMethod: PaymentMethod.CARD, date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    { type: LedgerType.INCOME, amount: 90000, category: 'Services', description: 'Consultancy Retainer - Agarwal Consultancy', paymentMethod: PaymentMethod.BANK, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { type: LedgerType.EXPENSE, amount: 8000, category: 'Infrastructure', description: 'Server Hosting - January', paymentMethod: PaymentMethod.CARD, date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
    { type: LedgerType.EXPENSE, amount: 5000, category: 'Utilities', description: 'Office Electricity & Internet', paymentMethod: PaymentMethod.UPI, date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
    { type: LedgerType.INCOME, amount: 19998, category: 'Product Sales', description: 'WhatsBot Pro x2 - Tech Solutions', paymentMethod: PaymentMethod.CARD, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  ];

  for (const entry of ledgerData) {
    await prisma.ledgerEntry.create({
      data: {
        type: entry.type,
        amount: entry.amount,
        category: entry.category,
        description: entry.description,
        paymentMethod: entry.paymentMethod,
        date: entry.date,
        businessId: business.id,
      },
    });
  }
  console.log('✅ 7 ledger entries created');

  // ===================================================================
  // 14. SOCIAL MEDIA POSTS
  // ===================================================================
  const postsData = [
    { content: '🚀 Exciting news! Our AI-powered chatbot is now live. Automate your customer support 24/7. #AI #Chatbot #BusinessAutomation', platforms: ['LinkedIn'], status: 'published', scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { content: '📊 Did you know? Businesses using WhatsApp automation see a 40% increase in customer engagement! Switch to BizzAuto today. #WhatsAppMarketing #Automation', platforms: ['Instagram'], status: 'published', scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { content: '💡 Tip of the day: Use pipeline stages to track your leads effectively. From New Lead to Closed Won - every stage matters! #CRM #SalesTips', platforms: ['Facebook'], status: 'scheduled', scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
    { content: '🎉 Happy New Year from the BizzAuto team! Wishing you a prosperous 2026 filled with growth and success. #NewYear2026 #BusinessGrowth', platforms: ['LinkedIn'], status: 'draft', scheduledAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
  ];

  for (const post of postsData) {
    await prisma.post.create({
      data: {
        content: post.content,
        platforms: post.platforms,
        status: post.status,
        scheduledAt: post.scheduledAt,
        publishedAt: (post as any).publishedAt || null,
        businessId: business.id,
        createdBy: user.id,
      },
    });
  }
  console.log('✅ 4 social media posts created');

  // ===================================================================
  // 15. AUTO-REPLIES
  // ===================================================================
  const autoReplyData = [
    { keyword: 'hi|hello|hey', response: 'Hello! 👋 Welcome to BizzAuto. How can we help you today? Type "menu" to see our services.', matchType: 'regex', isActive: true },
    { keyword: 'price|cost|pricing', response: '💰 Our plans start at FREE for basic features. Pro plan at ₹4,999/month and Enterprise at ₹9,999/month. Visit our pricing page for details!', matchType: 'regex', isActive: true },
    { keyword: 'demo|trial', response: '🎯 Great choice! I can schedule a personalized demo for you. Please share your preferred date and time, and our team will reach out!', matchType: 'regex', isActive: true },
    { keyword: 'contact|support|help', response: '📞 You can reach our support team at support@bizzauto.com or call us at +91 8983027975. We typically respond within 2 hours!', matchType: 'regex', isActive: true },
    { keyword: 'thank|thanks', response: "😊 You're welcome! If you need anything else, feel free to ask. Have a great day!", matchType: 'regex', isActive: true },
  ];

  for (const reply of autoReplyData) {
    await prisma.autoReply.create({
      data: {
        keyword: reply.keyword,
        response: reply.response,
        matchType: reply.matchType,
        isActive: reply.isActive,
        businessId: business.id,
      },
    });
  }
  console.log('✅ 5 auto-reply rules created');

  // ===================================================================
  // 16. ACTIVITY LOG
  // ===================================================================
  const activityData = [
    { type: 'contact_created', title: 'New lead captured', content: 'Rahul Sharma added as a new lead via Website' },
    { type: 'deal_stage_change', title: 'Deal stage updated', content: 'Tech Solutions moved from Qualified to Proposal Sent' },
    { type: 'whatsapp', title: 'Campaign sent', content: 'Diwali Festive Offer campaign sent to 15 contacts' },
    { type: 'meeting', title: 'Appointment booked', content: 'Product Demo scheduled with Tech Solutions' },
    { type: 'note', title: 'New order placed', content: 'RetailMart ordered CRM Enterprise - ₹24,999' },
    { type: 'email', title: 'Invoice sent', content: 'Invoice for CRM Enterprise sent to RetailMart' },
  ];

  for (const act of activityData) {
    await prisma.activity.create({
      data: {
        businessId: business.id,
        type: act.type,
        title: act.title,
        content: act.content,
        createdBy: user.id,
      },
    });
  }
  console.log('✅ 6 activity log entries created');

  // ===================================================================
  // COMPLETE
  // ===================================================================
  console.log('\n🎉 Database seeding complete!');
  console.log('═══════════════════════════════════════════');
  console.log('📧 Demo Login:  demo@bizzauto.com');
  console.log('🔑 Password:    demo123');
  console.log('═══════════════════════════════════════════');
  // ===================================================================
  // POSTER TEMPLATES for AI Creative Studio
  // ===================================================================
  const posterTemplates = [
    { name: 'Diwali Special', category: 'Festival', description: 'Diwali festival poster with traditional colors', thumbnailUrl: null, isSystem: true },
    { name: 'Holi Colors', category: 'Festival', description: 'Holi festival celebration poster', thumbnailUrl: null, isSystem: true },
    { name: 'Eid Mubarak', category: 'Festival', description: 'Eid Mubarak greeting poster', thumbnailUrl: null, isSystem: true },
    { name: 'Christmas', category: 'Festival', description: 'Christmas celebration poster', thumbnailUrl: null, isSystem: true },
    { name: 'Pongal Wishes', category: 'Festival', description: 'Pongal festival poster', thumbnailUrl: null, isSystem: true },
    { name: 'Flash Sale', category: 'Offer', description: 'Flash sale promotional poster', thumbnailUrl: null, isSystem: true },
    { name: 'Grand Opening', category: 'Offer', description: 'Grand opening event poster', thumbnailUrl: null, isSystem: true },
    { name: 'Buy 1 Get 1', category: 'Offer', description: 'Buy one get one free offer', thumbnailUrl: null, isSystem: true },
    { name: '50% Off', category: 'Offer', description: '50 percent discount sale poster', thumbnailUrl: null, isSystem: true },
    { name: 'New Arrival', category: 'Product', description: 'New product arrival announcement', thumbnailUrl: null, isSystem: true },
    { name: 'Best Seller', category: 'Product', description: 'Best selling product showcase', thumbnailUrl: null, isSystem: true },
    { name: 'Summer Deal', category: 'Seasonal', description: 'Summer season special offers', thumbnailUrl: null, isSystem: true },
    { name: 'Monsoon Sale', category: 'Seasonal', description: 'Monsoon season sale poster', thumbnailUrl: null, isSystem: true },
    { name: 'Winter Collection', category: 'Seasonal', description: 'Winter collection showcase', thumbnailUrl: null, isSystem: true },
    { name: 'Today Special', category: 'Menu', description: 'Today special menu item', thumbnailUrl: null, isSystem: true },
    { name: 'Biryani Fest', category: 'Menu', description: 'Biryani festival promotion', thumbnailUrl: null, isSystem: true },
    { name: 'Pizza Offer', category: 'Menu', description: 'Pizza deal promotional poster', thumbnailUrl: null, isSystem: true },
    { name: 'Price List', category: 'Price List', description: 'Product price list poster', thumbnailUrl: null, isSystem: true },
    { name: 'Rate Card', category: 'Price List', description: 'Service rate card poster', thumbnailUrl: null, isSystem: true },
    { name: 'Customer Review', category: 'Testimonial', description: 'Customer testimonial showcase', thumbnailUrl: null, isSystem: true },
    { name: 'Happy Clients', category: 'Testimonial', description: 'Client happiness testimonial', thumbnailUrl: null, isSystem: true },
    { name: 'Wedding Invite', category: 'Wedding', description: 'Wedding invitation poster', thumbnailUrl: null, isSystem: true },
    { name: 'Engagement', category: 'Wedding', description: 'Engagement ceremony poster', thumbnailUrl: null, isSystem: true },
    { name: 'Birthday Party', category: 'Birthday', description: 'Birthday celebration poster', thumbnailUrl: null, isSystem: true },
    { name: 'Kids Party', category: 'Birthday', description: 'Kids birthday party poster', thumbnailUrl: null, isSystem: true },
  ];

  for (const pt of posterTemplates) {
    await prisma.posterTemplate.upsert({
      where: { id: `poster-${pt.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `poster-${pt.name.replace(/\s+/g, '-').toLowerCase()}`,
        businessId: business.id,
        name: pt.name,
        category: pt.category,
        description: pt.description,
        content: JSON.stringify({ title: pt.name, subtitle: pt.description }),
        variables: [{ name: 'title', type: 'text' }, { name: 'subtitle', type: 'text' }, { name: 'businessName', type: 'text' }, { name: 'phone', type: 'text' }],
        isSystem: pt.isSystem,
        usageCount: 0,
      },
    });
  }
  console.log(`✅ ${posterTemplates.length} poster templates seeded for Creative Studio`);

  console.log('\n📊 Seeded data summary:');
  console.log('  • 1 Business (PROFESSIONAL plan)');
  console.log('  • 1 User (Owner)');
  console.log('  • 1 Pipeline with 6 stages');
  console.log('  • 15 Contacts in various stages');
  console.log('  • 5 WhatsApp message templates');
  console.log('  • 3 Campaigns (1 sent, 1 draft, 1 scheduled)');
  console.log('  • 8 WhatsApp messages in conversations');
  console.log('  • 6 Appointments (various statuses)');
  console.log('  • 5 Products');
  console.log('  • 3 Orders');
  console.log('  • 3 Documents (invoices & quotes)');
  console.log('  • 4 Reviews');
  console.log('  • 7 Ledger entries');
  console.log('  • 4 Social media posts');
  console.log('  • 25 Poster templates for Creative Studio');
  console.log('  • 5 Auto-reply rules');
  console.log('  • 6 Activity log entries');
  console.log('───────────────────────────────────────────');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
