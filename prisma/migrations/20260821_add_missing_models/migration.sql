-- CreateTable
CREATE TABLE "wl_resellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "phone" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "domain" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
    "logo" TEXT,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "wl_resellers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wl_resellers_email_key" ON "wl_resellers"("email");

-- CreateTable
CREATE TABLE "wl_clients" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "product" TEXT NOT NULL DEFAULT 'google-reviews',
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "wl_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wl_clients_resellerId_idx" ON "wl_clients"("resellerId");

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'business',
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "websites_businessId_slug_key" ON "websites"("businessId","slug");
CREATE INDEX "websites_businessId_idx" ON "websites"("businessId");

-- CreateTable
CREATE TABLE "landingPage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "content" JSONB,
    "html" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "landingPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landingPage_businessId_idx" ON "landingPage"("businessId");

-- CreateTable
CREATE TABLE "customRole" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "customRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customRole_businessId_idx" ON "customRole"("businessId");

-- CreateTable
CREATE TABLE "upload" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_businessId_idx" ON "upload"("businessId");

-- CreateTable
CREATE TABLE "funnelPageView" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "visitorId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "funnelPageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funnelPageView_funnelId_idx" ON "funnelPageView"("funnelId");
CREATE INDEX "funnelPageView_businessId_idx" ON "funnelPageView"("businessId");
CREATE INDEX "funnelPageView_pageId_idx" ON "funnelPageView"("pageId");

-- CreateTable
CREATE TABLE "crmInvoice" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "crmInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crmInvoice_businessId_idx" ON "crmInvoice"("businessId");

-- CreateTable
CREATE TABLE "deal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stage" TEXT,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_businessId_idx" ON "deal"("businessId");

-- CreateTable
CREATE TABLE "messageLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "to" TEXT,
    "body" TEXT,
    "contactId" TEXT,
    "providerMessageId" TEXT,
    "cost" DOUBLE PRECISION,
    "success" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "messageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messageLog_businessId_idx" ON "messageLog"("businessId");

-- CreateTable
CREATE TABLE "notificationPreference" (
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false,
    "newLeadAlert" BOOLEAN NOT NULL DEFAULT true,
    "appointmentReminder" BOOLEAN NOT NULL DEFAULT true,
    "campaignUpdate" BOOLEAN NOT NULL DEFAULT true,
    "supportTicketUpdate" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReport" BOOLEAN NOT NULL DEFAULT true,
    "monthlyReport" BOOLEAN NOT NULL DEFAULT true,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "notificationPreference_pkey" PRIMARY KEY ("userId")
);
