-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'STARTER', 'GROWTH', 'PROFESSIONAL', 'PRO', 'ENTERPRISE', 'AGENCY');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'UPI', 'CARD');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT,
    "appleId" TEXT,
    "name" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "businessId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorBackupCodes" TEXT,
    "csrfToken" TEXT,
    "csrfTokenExpiresAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "address" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "brandColors" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "contactsLimit" INTEGER NOT NULL DEFAULT 500,
    "messagesLimit" INTEGER NOT NULL DEFAULT 1000,
    "usersLimit" INTEGER NOT NULL DEFAULT 1,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planStartedAt" TIMESTAMP(3),
    "planExpiresAt" TIMESTAMP(3),
    "razorpaySubId" TEXT,
    "razorpayOrderId" TEXT,
    "admissionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "wabaId" TEXT,
    "waPhoneNumberId" TEXT,
    "waAccessToken" TEXT,
    "waWebhookSecret" TEXT,
    "waPhoneNumber" TEXT,
    "fbPageId" TEXT,
    "fbAccessToken" TEXT,
    "igUserId" TEXT,
    "igAccessToken" TEXT,
    "linkedinPageId" TEXT,
    "linkedinAccessToken" TEXT,
    "twitterUserId" TEXT,
    "twitterAccessToken" TEXT,
    "youtubeChannelId" TEXT,
    "youtubeAccessToken" TEXT,
    "gbpAccessToken" TEXT,
    "gbpRefreshToken" TEXT,
    "gbpAccountId" TEXT,
    "gbpLocationId" TEXT,
    "gbpTokenExpiry" TIMESTAMP(3),
    "gbpAutoPostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gbpAutoPostTime" TEXT NOT NULL DEFAULT '09:00',
    "gbpAutoPostTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "gbpAutoPostDays" JSONB NOT NULL DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
    "gbpAutoPostTemplates" JSONB NOT NULL DEFAULT '[]',
    "gbpAutoPostLastPosted" TIMESTAMP(3),
    "leadWebhookSecret" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyMessage" TEXT,
    "businessHours" JSONB,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalContacts" INTEGER NOT NULL DEFAULT 0,
    "aiCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiCreditsLimit" INTEGER NOT NULL DEFAULT 100,
    "aiCreditsPurchased" INTEGER NOT NULL DEFAULT 0,
    "dograhApiKey" TEXT,
    "dograhApiUrl" TEXT,
    "dograhEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dograhWebhookSecret" TEXT,
    "dograhDefaultAgentId" INTEGER,
    "telephonyProvider" TEXT NOT NULL DEFAULT 'twilio',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "razorpaySubscriptionId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySubId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "interval" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "metadata" JSONB,
    "paymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "title" TEXT,
    "designation" TEXT,
    "city" TEXT,
    "state" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT,
    "pipelineId" TEXT,
    "stageId" TEXT,
    "stageName" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB,
    "metadata" JSONB,
    "dealValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dealStage" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappBlocked" BOOLEAN NOT NULL DEFAULT false,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT false,
    "waProfilePic" TEXT,
    "waLastMessageAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "stage" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "metadata" JSONB,
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dealValue" DOUBLE PRECISION,
    "stageFrom" TEXT,
    "stageTo" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "businessId" TEXT,
    "waMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaSize" INTEGER,
    "mediaName" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "templateParams" JSONB,
    "templateVars" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusTimestamp" TIMESTAMP(3),
    "statusUpdatedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "error" TEXT,
    "campaignId" TEXT,
    "interactiveType" TEXT,
    "metadata" JSONB,
    "replyToMessageId" TEXT,
    "replyContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "category" TEXT NOT NULL DEFAULT 'UTILITY',
    "components" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "waTemplateId" TEXT,
    "waStatus" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "segmentId" TEXT,
    "filters" JSONB,
    "contactIds" TEXT[],
    "targetTags" TEXT[],
    "targetFilters" JSONB,
    "targetContacts" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    "templateName" TEXT,
    "templateVars" JSONB,
    "content" JSONB NOT NULL,
    "dripSteps" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalContacts" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "read" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalRead" INTEGER NOT NULL DEFAULT 0,
    "totalReplied" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "service" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "meetingUrl" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "sku" TEXT,
    "barcode" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[],
    "mainImage" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "shopifyId" TEXT,
    "wooCommerceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "price" DOUBLE PRECISION,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "bundleId" TEXT,
    "shippingAddress" JSONB,
    "gateway" TEXT,
    "gatewayData" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantName" TEXT,
    "variantPrice" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contactId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contactId" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxOrderAmount" DOUBLE PRECISION,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeAbove" DOUBLE PRECISION,
    "pincodePrefixes" TEXT[],
    "states" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBundle" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "purchaserContactId" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentlyViewed" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentlyViewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComparison" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "contactId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refundAmount" DOUBLE PRECISION,
    "refundMethod" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "price" DOUBLE PRECISION NOT NULL,
    "productId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxSubscribers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSubscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nextBillingDate" TIMESTAMP(3),
    "lastBillingDate" TIMESTAMP(3),
    "razorpaySubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTheme" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#8B5CF6',
    "accentColor" TEXT NOT NULL DEFAULT '#10B981',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textColor" TEXT NOT NULL DEFAULT '#111827',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "bannerImage" TEXT,
    "logoUrl" TEXT,
    "customCss" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "productColumns" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVideo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeGuide" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "headers" TEXT[],
    "rows" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewEmailTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'transactional',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSegment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "icon" TEXT NOT NULL DEFAULT 'star',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LowStockAlert" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" TEXT,
    "threshold" INTEGER NOT NULL,
    "currentQty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notifiedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LowStockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentMember" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SegmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTranslation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "translations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsIntegration" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "gaTrackingId" TEXT,
    "facebookPixelId" TEXT,
    "googleTagManagerId" TEXT,
    "hotjarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minQuantity" INTEGER,
    "buyX" INTEGER,
    "getY" INTEGER,
    "productIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNotification" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "LedgerType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod",
    "referenceNo" TEXT,
    "contactId" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "templateId" TEXT,
    "documentNumber" TEXT,
    "content" JSONB NOT NULL,
    "html" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentVia" TEXT,
    "publicLink" TEXT,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "contactId" TEXT,
    "amount" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "header" TEXT,
    "footer" TEXT,
    "content" TEXT NOT NULL,
    "css" TEXT,
    "variables" JSONB[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "link" TEXT,
    "platforms" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedIds" JSONB,
    "stats" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "reviewerName" TEXT NOT NULL,
    "reviewerPhone" TEXT,
    "reviewerEmail" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT,
    "images" TEXT[],
    "replyText" TEXT,
    "replyStatus" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIContent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trigger" JSONB NOT NULL,
    "actions" JSONB[],
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ruleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggerData" JSONB NOT NULL,
    "actions" JSONB[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingsStore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "size" INTEGER,
    "mimeType" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WingsStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopilotSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "replyDelay" INTEGER NOT NULL DEFAULT 5,
    "welcomeMessage" TEXT,
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "followUpDelay" INTEGER NOT NULL DEFAULT 1440,
    "followUpMessage" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiTone" TEXT NOT NULL DEFAULT 'professional',
    "aiLanguage" TEXT NOT NULL DEFAULT 'en',
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutopilotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "description" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemePreference" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "accentColor" TEXT NOT NULL DEFAULT 'blue',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemePreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ECommerceStore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "provider" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ECommerceStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosterTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "variables" JSONB[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosterBackground" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "scheduleType" TEXT NOT NULL DEFAULT 'manual',
    "expiresAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosterBackground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gateway" TEXT,
    "gatewayData" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "factors" JSONB[],
    "category" TEXT NOT NULL DEFAULT 'cold',
    "engagementScore" INTEGER NOT NULL DEFAULT 0,
    "recencyScore" INTEGER NOT NULL DEFAULT 0,
    "intentScore" INTEGER NOT NULL DEFAULT 0,
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "aiModel" TEXT NOT NULL DEFAULT 'algorithm_v1',
    "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "predictedValue" DOUBLE PRECISION,
    "churnRisk" INTEGER NOT NULL DEFAULT 0,
    "reasons" JSONB,
    "lastScoredAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteLabel" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "brandName" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT,
    "customCss" TEXT,
    "customDomain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT,
    "permissions" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotFlow" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'keyword',
    "keywords" TEXT[],
    "response" TEXT NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "phone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "templateVars" JSONB,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "waMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DripQueue" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DripQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "variables" JSONB[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DripCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "steps" JSONB[],
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DripCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailList" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoReply" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'exact',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggerData" JSONB,
    "nodeResults" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelPage" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'landing',
    "content" JSONB NOT NULL,
    "html" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "conversionScript" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelPageView" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "visitorId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelPageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail" TEXT,
    "content" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'form',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "thankYouMessage" TEXT,
    "thankYouRedirect" TEXT,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validation" JSONB,
    "conditionalLogic" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "width" TEXT NOT NULL DEFAULT 'full',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "answers" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "accessType" TEXT NOT NULL DEFAULT 'paid',
    "dripContent" BOOLEAN NOT NULL DEFAULT false,
    "dripInterval" INTEGER,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'video',
    "content" JSONB,
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerLink" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "campaignId" TEXT,
    "workflowId" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriggerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerLinkClick" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "contactId" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriggerLinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '["view_invoices", "view_deals", "view_appointments", "make_payments"]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "options" JSONB,
    "validation" JSONB,
    "defaultValue" TEXT,
    "placeholder" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImage" TEXT,
    "author" TEXT,
    "categoryId" TEXT,
    "tags" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "type" TEXT NOT NULL DEFAULT 'fixed',
    "minAmount" DOUBLE PRECISION,
    "razorpayOrderId" TEXT,
    "razorpayLinkId" TEXT,
    "shortCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "maxPayments" INTEGER,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "totalCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contactId" TEXT,
    "invoiceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLinkTransaction" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "contactId" TEXT,
    "razorpayPaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLinkTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "appointmentId" TEXT,
    "orderId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "message" TEXT NOT NULL,
    "reviewUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequestCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "messageTemplate" TEXT NOT NULL,
    "reviewUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequestCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "customDomain" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "maxSubAccounts" INTEGER NOT NULL DEFAULT 5,
    "subAccountCount" INTEGER NOT NULL DEFAULT 0,
    "branding" JSONB,
    "billingConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubAccount" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "customDomain" TEXT,
    "branding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatSession" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "visitorIP" TEXT,
    "visitorUserAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "satisfaction" INTEGER,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatWidget" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "greetingMessage" TEXT NOT NULL DEFAULT 'Hi! How can we help you?',
    "offlineMessage" TEXT NOT NULL DEFAULT 'We''re offline. Leave a message.',
    "workingHours" JSONB,
    "autoResponses" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveChatWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "campaignId" TEXT,
    "contactId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SMSMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetTags" TEXT[],
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartRecovery" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "cartItems" JSONB NOT NULL,
    "cartValue" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'abandoned',
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "recoveredAmount" DOUBLE PRECISION,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentReminder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "contactId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reminderType" TEXT NOT NULL DEFAULT 'before',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsPerRupee" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "redemptionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "minRedemption" INTEGER NOT NULL DEFAULT 100,
    "tierThresholds" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyPoints" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsRequired" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" DOUBLE PRECISION,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProgram" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "referrerReward" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "refereeReward" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "rewardType" TEXT NOT NULL DEFAULT 'credits',
    "maxReferrals" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referrerReward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refereeReward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFollowUp" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response" TEXT,
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCatalog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "imageUrl" TEXT,
    "category" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'in_stock',
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoMeeting" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingUrl" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'jitsi',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "hostId" TEXT,
    "participants" TEXT[],
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "tags" TEXT[],
    "attachments" TEXT[],
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "dograhRunId" TEXT,
    "workflowId" INTEGER,
    "workflowName" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "callType" TEXT NOT NULL DEFAULT 'phone',
    "callerNumber" TEXT NOT NULL,
    "calleeNumber" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "transcriptUrl" TEXT,
    "costInfo" JSONB,
    "gatheredContext" JSONB,
    "annotations" JSONB,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "lowBalanceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "totalRecharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMarginPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "callLogId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEarning" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "walletTxnId" TEXT NOT NULL,
    "twilioCost" DOUBLE PRECISION NOT NULL,
    "platformMargin" DOUBLE PRECISION NOT NULL,
    "totalCharged" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "callLogId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformReferral" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformReferralReward" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "creditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformReferralPayout" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wl_clients" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "product" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wl_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wl_resellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "phone" TEXT,
    "plan" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wl_resellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VCards" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "template" TEXT NOT NULL DEFAULT 'professional',
    "color" TEXT NOT NULL DEFAULT '#2563eb',
    "views" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VCards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Websites" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'business',
    "blocks" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "views" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "customDomain" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surveys" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySubmissions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "respondent" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveySubmissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SSOConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "domain" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SSOConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "blocks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" JSONB,
    "html" TEXT,
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "views" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'bg-purple-100 text-purple-700',
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "entityType" TEXT,
    "entityId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- CreateIndex
CREATE INDEX "User_appleId_idx" ON "User"("appleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Business_plan_idx" ON "Business"("plan");

-- CreateIndex
CREATE INDEX "Subscription_businessId_idx" ON "Subscription"("businessId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Contact_businessId_idx" ON "Contact"("businessId");

-- CreateIndex
CREATE INDEX "Contact_businessId_source_idx" ON "Contact"("businessId", "source");

-- CreateIndex
CREATE INDEX "Contact_businessId_createdAt_idx" ON "Contact"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_businessId_lastMessageAt_idx" ON "Contact"("businessId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Contact_source_idx" ON "Contact"("source");

-- CreateIndex
CREATE INDEX "Contact_tags_idx" ON "Contact"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_businessId_phone_key" ON "Contact"("businessId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_businessId_email_key" ON "Contact"("businessId", "email");

-- CreateIndex
CREATE INDEX "Pipeline_businessId_idx" ON "Pipeline"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Pipeline_businessId_name_key" ON "Pipeline"("businessId", "name");

-- CreateIndex
CREATE INDEX "Stage_pipelineId_idx" ON "Stage"("pipelineId");

-- CreateIndex
CREATE INDEX "Activity_businessId_idx" ON "Activity"("businessId");

-- CreateIndex
CREATE INDEX "Activity_businessId_contactId_idx" ON "Activity"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "Activity_businessId_type_idx" ON "Activity"("businessId", "type");

-- CreateIndex
CREATE INDEX "Activity_businessId_createdAt_idx" ON "Activity"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Message_contactId_idx" ON "Message"("contactId");

-- CreateIndex
CREATE INDEX "Message_businessId_idx" ON "Message"("businessId");

-- CreateIndex
CREATE INDEX "Message_businessId_contactId_idx" ON "Message"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "Message_businessId_status_idx" ON "Message"("businessId", "status");

-- CreateIndex
CREATE INDEX "Message_businessId_createdAt_idx" ON "Message"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_businessId_name_key" ON "MessageTemplate"("businessId", "name");

-- CreateIndex
CREATE INDEX "Campaign_businessId_idx" ON "Campaign"("businessId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "Campaign_businessId_status_idx" ON "Campaign"("businessId", "status");

-- CreateIndex
CREATE INDEX "Appointment_businessId_idx" ON "Appointment"("businessId");

-- CreateIndex
CREATE INDEX "Appointment_contactId_idx" ON "Appointment"("contactId");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_businessId_status_idx" ON "Appointment"("businessId", "status");

-- CreateIndex
CREATE INDEX "Appointment_contactId_startTime_idx" ON "Appointment"("contactId", "startTime");

-- CreateIndex
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_businessId_idx" ON "Order"("businessId");

-- CreateIndex
CREATE INDEX "Order_contactId_idx" ON "Order"("contactId");

-- CreateIndex
CREATE INDEX "Order_businessId_status_idx" ON "Order"("businessId", "status");

-- CreateIndex
CREATE INDEX "Order_businessId_createdAt_idx" ON "Order"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Cart_businessId_idx" ON "Cart"("businessId");

-- CreateIndex
CREATE INDEX "Cart_contactId_idx" ON "Cart"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_businessId_contactId_key" ON "Cart"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- CreateIndex
CREATE INDEX "ProductReview_businessId_idx" ON "ProductReview"("businessId");

-- CreateIndex
CREATE INDEX "ProductReview_rating_idx" ON "ProductReview"("rating");

-- CreateIndex
CREATE INDEX "Wishlist_contactId_idx" ON "Wishlist"("contactId");

-- CreateIndex
CREATE INDEX "Wishlist_productId_idx" ON "Wishlist"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_contactId_productId_key" ON "Wishlist"("contactId", "productId");

-- CreateIndex
CREATE INDEX "StockAlert_productId_idx" ON "StockAlert"("productId");

-- CreateIndex
CREATE INDEX "StockAlert_businessId_idx" ON "StockAlert"("businessId");

-- CreateIndex
CREATE INDEX "StockAlert_status_idx" ON "StockAlert"("status");

-- CreateIndex
CREATE INDEX "ShippingRule_businessId_idx" ON "ShippingRule"("businessId");

-- CreateIndex
CREATE INDEX "ProductBundle_businessId_idx" ON "ProductBundle"("businessId");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "BundleItem_productId_idx" ON "BundleItem"("productId");

-- CreateIndex
CREATE INDEX "FlashSale_businessId_idx" ON "FlashSale"("businessId");

-- CreateIndex
CREATE INDEX "FlashSale_startsAt_endsAt_idx" ON "FlashSale"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_businessId_idx" ON "GiftCard"("businessId");

-- CreateIndex
CREATE INDEX "GiftCard_code_idx" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_status_idx" ON "GiftCard"("status");

-- CreateIndex
CREATE INDEX "RecentlyViewed_contactId_idx" ON "RecentlyViewed"("contactId");

-- CreateIndex
CREATE INDEX "RecentlyViewed_viewedAt_idx" ON "RecentlyViewed"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewed_contactId_productId_key" ON "RecentlyViewed"("contactId", "productId");

-- CreateIndex
CREATE INDEX "ProductComparison_sessionId_idx" ON "ProductComparison"("sessionId");

-- CreateIndex
CREATE INDEX "CustomerAddress_contactId_idx" ON "CustomerAddress"("contactId");

-- CreateIndex
CREATE INDEX "CustomerAddress_businessId_idx" ON "CustomerAddress"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_businessId_idx" ON "ReturnRequest"("businessId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_productId_key" ON "SubscriptionPlan"("productId");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_businessId_idx" ON "SubscriptionPlan"("businessId");

-- CreateIndex
CREATE INDEX "CustomerSubscription_businessId_idx" ON "CustomerSubscription"("businessId");

-- CreateIndex
CREATE INDEX "CustomerSubscription_contactId_idx" ON "CustomerSubscription"("contactId");

-- CreateIndex
CREATE INDEX "CustomerSubscription_status_idx" ON "CustomerSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreTheme_businessId_key" ON "StoreTheme"("businessId");

-- CreateIndex
CREATE INDEX "ProductVideo_productId_idx" ON "ProductVideo"("productId");

-- CreateIndex
CREATE INDEX "SizeGuide_businessId_idx" ON "SizeGuide"("businessId");

-- CreateIndex
CREATE INDEX "NewEmailTemplate_businessId_idx" ON "NewEmailTemplate"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_endpoint_idx" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_contactId_idx" ON "PushSubscription"("contactId");

-- CreateIndex
CREATE INDEX "CustomerSegment_businessId_idx" ON "CustomerSegment"("businessId");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_idx" ON "PriceHistory"("productId");

-- CreateIndex
CREATE INDEX "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "LowStockAlert_businessId_idx" ON "LowStockAlert"("businessId");

-- CreateIndex
CREATE INDEX "LowStockAlert_status_idx" ON "LowStockAlert"("status");

-- CreateIndex
CREATE INDEX "SegmentMember_segmentId_idx" ON "SegmentMember"("segmentId");

-- CreateIndex
CREATE INDEX "SegmentMember_contactId_idx" ON "SegmentMember"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentMember_segmentId_contactId_key" ON "SegmentMember"("segmentId", "contactId");

-- CreateIndex
CREATE INDEX "StoreTranslation_businessId_idx" ON "StoreTranslation"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreTranslation_businessId_language_key" ON "StoreTranslation"("businessId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsIntegration_businessId_key" ON "AnalyticsIntegration"("businessId");

-- CreateIndex
CREATE INDEX "DiscountRule_businessId_idx" ON "DiscountRule"("businessId");

-- CreateIndex
CREATE INDEX "OrderNotification_businessId_idx" ON "OrderNotification"("businessId");

-- CreateIndex
CREATE INDEX "OrderNotification_orderId_idx" ON "OrderNotification"("orderId");

-- CreateIndex
CREATE INDEX "OrderNotification_read_idx" ON "OrderNotification"("read");

-- CreateIndex
CREATE INDEX "LedgerEntry_businessId_idx" ON "LedgerEntry"("businessId");

-- CreateIndex
CREATE INDEX "LedgerEntry_date_idx" ON "LedgerEntry"("date");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "LedgerEntry_category_idx" ON "LedgerEntry"("category");

-- CreateIndex
CREATE INDEX "Coupon_businessId_idx" ON "Coupon"("businessId");

-- CreateIndex
CREATE INDEX "Coupon_active_idx" ON "Coupon"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_businessId_code_key" ON "Coupon"("businessId", "code");

-- CreateIndex
CREATE INDEX "Document_businessId_idx" ON "Document"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_businessId_name_key" ON "DocumentTemplate"("businessId", "name");

-- CreateIndex
CREATE INDEX "Post_businessId_idx" ON "Post"("businessId");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");

-- CreateIndex
CREATE INDEX "Review_businessId_idx" ON "Review"("businessId");

-- CreateIndex
CREATE INDEX "Review_platform_idx" ON "Review"("platform");

-- CreateIndex
CREATE INDEX "Integration_businessId_idx" ON "Integration"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_businessId_type_key" ON "Integration"("businessId", "type");

-- CreateIndex
CREATE INDEX "AIContent_userId_idx" ON "AIContent"("userId");

-- CreateIndex
CREATE INDEX "AIContent_type_idx" ON "AIContent"("type");

-- CreateIndex
CREATE INDEX "AutomationRule_businessId_idx" ON "AutomationRule"("businessId");

-- CreateIndex
CREATE INDEX "WorkflowRun_businessId_idx" ON "WorkflowRun"("businessId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WingsStore_businessId_idx" ON "WingsStore"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "AutopilotSettings_businessId_key" ON "AutopilotSettings"("businessId");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_idx" ON "AuditLog"("businessId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_action_idx" ON "AuditLog"("businessId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_entity_idx" ON "AuditLog"("businessId", "entity");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "ECommerceStore_businessId_key" ON "ECommerceStore"("businessId");

-- CreateIndex
CREATE INDEX "ECommerceStore_businessId_idx" ON "ECommerceStore"("businessId");

-- CreateIndex
CREATE INDEX "PosterTemplate_businessId_idx" ON "PosterTemplate"("businessId");

-- CreateIndex
CREATE INDEX "PosterBackground_isActive_idx" ON "PosterBackground"("isActive");

-- CreateIndex
CREATE INDEX "PosterBackground_category_idx" ON "PosterBackground"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_businessId_idx" ON "Invoice"("businessId");

-- CreateIndex
CREATE INDEX "LeadScore_businessId_idx" ON "LeadScore"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadScore_businessId_contactId_key" ON "LeadScore"("businessId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteLabel_businessId_key" ON "WhiteLabel"("businessId");

-- CreateIndex
CREATE INDEX "WhiteLabel_businessId_idx" ON "WhiteLabel"("businessId");

-- CreateIndex
CREATE INDEX "Webhook_businessId_idx" ON "Webhook"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_businessId_idx" ON "ApiKey"("businessId");

-- CreateIndex
CREATE INDEX "ChatbotFlow_businessId_idx" ON "ChatbotFlow"("businessId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_businessId_idx" ON "ScheduledMessage"("businessId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_status_idx" ON "ScheduledMessage"("status");

-- CreateIndex
CREATE INDEX "DripQueue_campaignId_idx" ON "DripQueue"("campaignId");

-- CreateIndex
CREATE INDEX "DripQueue_status_idx" ON "DripQueue"("status");

-- CreateIndex
CREATE INDEX "EmailTemplate_businessId_idx" ON "EmailTemplate"("businessId");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");

-- CreateIndex
CREATE INDEX "DripCampaign_businessId_idx" ON "DripCampaign"("businessId");

-- CreateIndex
CREATE INDEX "EmailList_businessId_idx" ON "EmailList"("businessId");

-- CreateIndex
CREATE INDEX "AutoReply_businessId_idx" ON "AutoReply"("businessId");

-- CreateIndex
CREATE INDEX "Workflow_businessId_idx" ON "Workflow"("businessId");

-- CreateIndex
CREATE INDEX "Workflow_businessId_isActive_idx" ON "Workflow"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "WorkflowExecution_businessId_idx" ON "WorkflowExecution"("businessId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "Funnel_businessId_idx" ON "Funnel"("businessId");

-- CreateIndex
CREATE INDEX "FunnelPage_funnelId_idx" ON "FunnelPage"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelPage_funnelId_slug_key" ON "FunnelPage"("funnelId", "slug");

-- CreateIndex
CREATE INDEX "FunnelPageView_pageId_idx" ON "FunnelPageView"("pageId");

-- CreateIndex
CREATE INDEX "FunnelPageView_funnelId_idx" ON "FunnelPageView"("funnelId");

-- CreateIndex
CREATE INDEX "FunnelPageView_businessId_idx" ON "FunnelPageView"("businessId");

-- CreateIndex
CREATE INDEX "FunnelPageView_createdAt_idx" ON "FunnelPageView"("createdAt");

-- CreateIndex
CREATE INDEX "FunnelPageView_funnelId_createdAt_idx" ON "FunnelPageView"("funnelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "Survey_businessId_idx" ON "Survey"("businessId");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyId_idx" ON "SurveyQuestion"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyResponse_businessId_idx" ON "SurveyResponse"("businessId");

-- CreateIndex
CREATE INDEX "Course_businessId_idx" ON "Course"("businessId");

-- CreateIndex
CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");

-- CreateIndex
CREATE INDEX "CourseLesson_moduleId_idx" ON "CourseLesson"("moduleId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_courseId_idx" ON "CourseEnrollment"("courseId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_businessId_idx" ON "CourseEnrollment"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_courseId_contactId_key" ON "CourseEnrollment"("courseId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "TriggerLink_shortCode_key" ON "TriggerLink"("shortCode");

-- CreateIndex
CREATE INDEX "TriggerLink_businessId_idx" ON "TriggerLink"("businessId");

-- CreateIndex
CREATE INDEX "TriggerLink_shortCode_idx" ON "TriggerLink"("shortCode");

-- CreateIndex
CREATE INDEX "TriggerLinkClick_linkId_idx" ON "TriggerLinkClick"("linkId");

-- CreateIndex
CREATE INDEX "TriggerLinkClick_clickedAt_idx" ON "TriggerLinkClick"("clickedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortal_token_key" ON "ClientPortal"("token");

-- CreateIndex
CREATE INDEX "ClientPortal_businessId_idx" ON "ClientPortal"("businessId");

-- CreateIndex
CREATE INDEX "ClientPortal_token_idx" ON "ClientPortal"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortal_businessId_contactId_key" ON "ClientPortal"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "CustomField_businessId_idx" ON "CustomField"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_businessId_entityType_slug_key" ON "CustomField"("businessId", "entityType", "slug");

-- CreateIndex
CREATE INDEX "BlogPost_businessId_idx" ON "BlogPost"("businessId");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_businessId_slug_key" ON "BlogPost"("businessId", "slug");

-- CreateIndex
CREATE INDEX "BlogCategory_businessId_idx" ON "BlogCategory"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_businessId_slug_key" ON "BlogCategory"("businessId", "slug");

-- CreateIndex
CREATE INDEX "BlogComment_postId_idx" ON "BlogComment"("postId");

-- CreateIndex
CREATE INDEX "BlogComment_businessId_idx" ON "BlogComment"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_shortCode_key" ON "PaymentLink"("shortCode");

-- CreateIndex
CREATE INDEX "PaymentLink_businessId_idx" ON "PaymentLink"("businessId");

-- CreateIndex
CREATE INDEX "PaymentLink_shortCode_idx" ON "PaymentLink"("shortCode");

-- CreateIndex
CREATE INDEX "PaymentLinkTransaction_linkId_idx" ON "PaymentLinkTransaction"("linkId");

-- CreateIndex
CREATE INDEX "PaymentLinkTransaction_status_idx" ON "PaymentLinkTransaction"("status");

-- CreateIndex
CREATE INDEX "ReviewRequest_businessId_idx" ON "ReviewRequest"("businessId");

-- CreateIndex
CREATE INDEX "ReviewRequest_status_idx" ON "ReviewRequest"("status");

-- CreateIndex
CREATE INDEX "ReviewRequest_contactId_idx" ON "ReviewRequest"("contactId");

-- CreateIndex
CREATE INDEX "ReviewRequestCampaign_businessId_idx" ON "ReviewRequestCampaign"("businessId");

-- CreateIndex
CREATE INDEX "Agency_ownerId_idx" ON "Agency"("ownerId");

-- CreateIndex
CREATE INDEX "SubAccount_agencyId_idx" ON "SubAccount"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "SubAccount_agencyId_businessId_key" ON "SubAccount"("agencyId", "businessId");

-- CreateIndex
CREATE INDEX "LiveChatSession_businessId_idx" ON "LiveChatSession"("businessId");

-- CreateIndex
CREATE INDEX "LiveChatSession_status_idx" ON "LiveChatSession"("status");

-- CreateIndex
CREATE INDEX "LiveChatSession_assignedTo_idx" ON "LiveChatSession"("assignedTo");

-- CreateIndex
CREATE INDEX "LiveChatMessage_sessionId_idx" ON "LiveChatMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveChatWidget_businessId_key" ON "LiveChatWidget"("businessId");

-- CreateIndex
CREATE INDEX "SMSMessage_businessId_idx" ON "SMSMessage"("businessId");

-- CreateIndex
CREATE INDEX "SMSMessage_phone_idx" ON "SMSMessage"("phone");

-- CreateIndex
CREATE INDEX "SMSMessage_status_idx" ON "SMSMessage"("status");

-- CreateIndex
CREATE INDEX "SMSMessage_campaignId_idx" ON "SMSMessage"("campaignId");

-- CreateIndex
CREATE INDEX "SMSCampaign_businessId_idx" ON "SMSCampaign"("businessId");

-- CreateIndex
CREATE INDEX "SMSCampaign_status_idx" ON "SMSCampaign"("status");

-- CreateIndex
CREATE INDEX "CartRecovery_businessId_idx" ON "CartRecovery"("businessId");

-- CreateIndex
CREATE INDEX "CartRecovery_status_idx" ON "CartRecovery"("status");

-- CreateIndex
CREATE INDEX "CartRecovery_contactId_idx" ON "CartRecovery"("contactId");

-- CreateIndex
CREATE INDEX "AppointmentReminder_businessId_idx" ON "AppointmentReminder"("businessId");

-- CreateIndex
CREATE INDEX "AppointmentReminder_scheduledAt_idx" ON "AppointmentReminder"("scheduledAt");

-- CreateIndex
CREATE INDEX "AppointmentReminder_status_idx" ON "AppointmentReminder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyProgram_businessId_key" ON "LoyaltyProgram"("businessId");

-- CreateIndex
CREATE INDEX "LoyaltyPoints_businessId_idx" ON "LoyaltyPoints"("businessId");

-- CreateIndex
CREATE INDEX "LoyaltyPoints_contactId_idx" ON "LoyaltyPoints"("contactId");

-- CreateIndex
CREATE INDEX "LoyaltyPoints_type_idx" ON "LoyaltyPoints"("type");

-- CreateIndex
CREATE INDEX "LoyaltyReward_businessId_idx" ON "LoyaltyReward"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralProgram_businessId_key" ON "ReferralProgram"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralCode_key" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_businessId_idx" ON "Referral"("businessId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "AIFollowUp_businessId_idx" ON "AIFollowUp"("businessId");

-- CreateIndex
CREATE INDEX "AIFollowUp_status_idx" ON "AIFollowUp"("status");

-- CreateIndex
CREATE INDEX "AIFollowUp_scheduledAt_idx" ON "AIFollowUp"("scheduledAt");

-- CreateIndex
CREATE INDEX "WhatsAppCatalog_businessId_idx" ON "WhatsAppCatalog"("businessId");

-- CreateIndex
CREATE INDEX "WhatsAppCatalog_productId_idx" ON "WhatsAppCatalog"("productId");

-- CreateIndex
CREATE INDEX "VideoMeeting_businessId_idx" ON "VideoMeeting"("businessId");

-- CreateIndex
CREATE INDEX "VideoMeeting_scheduledAt_idx" ON "VideoMeeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "VideoMeeting_status_idx" ON "VideoMeeting"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_businessId_idx" ON "SupportTicket"("businessId");

-- CreateIndex
CREATE INDEX "SupportTicket_ticketNumber_idx" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_contactId_idx" ON "SupportTicket"("contactId");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_dograhRunId_key" ON "CallLog"("dograhRunId");

-- CreateIndex
CREATE INDEX "CallLog_businessId_idx" ON "CallLog"("businessId");

-- CreateIndex
CREATE INDEX "CallLog_businessId_contactId_idx" ON "CallLog"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "CallLog_businessId_createdAt_idx" ON "CallLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "CallLog_dograhRunId_idx" ON "CallLog"("dograhRunId");

-- CreateIndex
CREATE INDEX "Goal_businessId_idx" ON "Goal"("businessId");

-- CreateIndex
CREATE INDEX "Goal_businessId_type_idx" ON "Goal"("businessId", "type");

-- CreateIndex
CREATE INDEX "Goal_businessId_isActive_idx" ON "Goal"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_businessId_key" ON "Wallet"("businessId");

-- CreateIndex
CREATE INDEX "Wallet_businessId_idx" ON "Wallet"("businessId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_businessId_idx" ON "WalletTransaction"("businessId");

-- CreateIndex
CREATE INDEX "WalletTransaction_businessId_createdAt_idx" ON "WalletTransaction"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "PlatformEarning_businessId_idx" ON "PlatformEarning"("businessId");

-- CreateIndex
CREATE INDEX "PlatformEarning_createdAt_idx" ON "PlatformEarning"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformEarning_status_idx" ON "PlatformEarning"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformReferral_userId_key" ON "PlatformReferral"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformReferral_referralCode_key" ON "PlatformReferral"("referralCode");

-- CreateIndex
CREATE INDEX "PlatformReferral_referralCode_idx" ON "PlatformReferral"("referralCode");

-- CreateIndex
CREATE INDEX "PlatformReferralReward_referrerId_idx" ON "PlatformReferralReward"("referrerId");

-- CreateIndex
CREATE INDEX "PlatformReferralReward_refereeId_idx" ON "PlatformReferralReward"("refereeId");

-- CreateIndex
CREATE INDEX "PlatformReferralReward_status_idx" ON "PlatformReferralReward"("status");

-- CreateIndex
CREATE INDEX "PlatformReferralPayout_referralId_idx" ON "PlatformReferralPayout"("referralId");

-- CreateIndex
CREATE INDEX "PlatformReferralPayout_status_idx" ON "PlatformReferralPayout"("status");

-- CreateIndex
CREATE INDEX "wl_clients_resellerId_idx" ON "wl_clients"("resellerId");

-- CreateIndex
CREATE UNIQUE INDEX "wl_resellers_email_key" ON "wl_resellers"("email");

-- CreateIndex
CREATE INDEX "VCards_businessId_idx" ON "VCards"("businessId");

-- CreateIndex
CREATE INDEX "Websites_businessId_idx" ON "Websites"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Websites_businessId_slug_key" ON "Websites"("businessId", "slug");

-- CreateIndex
CREATE INDEX "Surveys_businessId_idx" ON "Surveys"("businessId");

-- CreateIndex
CREATE INDEX "SurveySubmissions_surveyId_idx" ON "SurveySubmissions"("surveyId");

-- CreateIndex
CREATE INDEX "SSOConfig_businessId_idx" ON "SSOConfig"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "SSOConfig_businessId_provider_key" ON "SSOConfig"("businessId", "provider");

-- CreateIndex
CREATE INDEX "LandingPage_businessId_idx" ON "LandingPage"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_businessId_slug_key" ON "LandingPage"("businessId", "slug");

-- CreateIndex
CREATE INDEX "CustomRole_businessId_idx" ON "CustomRole"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_businessId_name_key" ON "CustomRole"("businessId", "name");

-- CreateIndex
CREATE INDEX "Upload_businessId_idx" ON "Upload"("businessId");

-- CreateIndex
CREATE INDEX "Upload_businessId_category_idx" ON "Upload"("businessId", "category");

-- CreateIndex
CREATE INDEX "Upload_entityType_entityId_idx" ON "Upload"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Upload_createdAt_idx" ON "Upload"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ProductBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRule" ADD CONSTRAINT "ShippingRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBundle" ADD CONSTRAINT "ProductBundle_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ProductBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSale" ADD CONSTRAINT "FlashSale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSubscription" ADD CONSTRAINT "CustomerSubscription_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSubscription" ADD CONSTRAINT "CustomerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTheme" ADD CONSTRAINT "StoreTheme_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVideo" ADD CONSTRAINT "ProductVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeGuide" ADD CONSTRAINT "SizeGuide_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewEmailTemplate" ADD CONSTRAINT "NewEmailTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSegment" ADD CONSTRAINT "CustomerSegment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockAlert" ADD CONSTRAINT "LowStockAlert_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockAlert" ADD CONSTRAINT "LowStockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentMember" ADD CONSTRAINT "SegmentMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentMember" ADD CONSTRAINT "SegmentMember_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTranslation" ADD CONSTRAINT "StoreTranslation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsIntegration" ADD CONSTRAINT "AnalyticsIntegration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIContent" ADD CONSTRAINT "AIContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingsStore" ADD CONSTRAINT "WingsStore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopilotSettings" ADD CONSTRAINT "AutopilotSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemePreference" ADD CONSTRAINT "ThemePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECommerceStore" ADD CONSTRAINT "ECommerceStore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterTemplate" ADD CONSTRAINT "PosterTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScore" ADD CONSTRAINT "LeadScore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScore" ADD CONSTRAINT "LeadScore_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteLabel" ADD CONSTRAINT "WhiteLabel_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotFlow" ADD CONSTRAINT "ChatbotFlow_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DripQueue" ADD CONSTRAINT "DripQueue_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DripQueue" ADD CONSTRAINT "DripQueue_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DripCampaign" ADD CONSTRAINT "DripCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailList" ADD CONSTRAINT "EmailList_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoReply" ADD CONSTRAINT "AutoReply_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelPage" ADD CONSTRAINT "FunnelPage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelPageView" ADD CONSTRAINT "FunnelPageView_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FunnelPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerLink" ADD CONSTRAINT "TriggerLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerLinkClick" ADD CONSTRAINT "TriggerLinkClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "TriggerLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPortal" ADD CONSTRAINT "ClientPortal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLinkTransaction" ADD CONSTRAINT "PaymentLinkTransaction_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestCampaign" ADD CONSTRAINT "ReviewRequestCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubAccount" ADD CONSTRAINT "SubAccount_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubAccount" ADD CONSTRAINT "SubAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatSession" ADD CONSTRAINT "LiveChatSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatWidget" ADD CONSTRAINT "LiveChatWidget_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SMSCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSCampaign" ADD CONSTRAINT "SMSCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartRecovery" ADD CONSTRAINT "CartRecovery_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartRecovery" ADD CONSTRAINT "CartRecovery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPoints" ADD CONSTRAINT "LoyaltyPoints_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPoints" ADD CONSTRAINT "LoyaltyPoints_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralProgram" ADD CONSTRAINT "ReferralProgram_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFollowUp" ADD CONSTRAINT "AIFollowUp_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFollowUp" ADD CONSTRAINT "AIFollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCatalog" ADD CONSTRAINT "WhatsAppCatalog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoMeeting" ADD CONSTRAINT "VideoMeeting_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformReferral" ADD CONSTRAINT "PlatformReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformReferralReward" ADD CONSTRAINT "PlatformReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "PlatformReferral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformReferralPayout" ADD CONSTRAINT "PlatformReferralPayout_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "PlatformReferral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

