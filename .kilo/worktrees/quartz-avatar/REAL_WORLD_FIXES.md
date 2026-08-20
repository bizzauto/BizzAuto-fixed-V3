# 🎯 Project Status: Real-World Integration Fixes

## ✅ COMPLETED FIXES

### 1. ReviewsPage.tsx
- **Removed:** Mock reviews data (6 hardcoded entries)
- **Added:** Real API integration with `reviewsAPI.list()` and `reviewsAPI.reply()`
- **Features:**
  - Fetches reviews from backend database
  - Sends replies via API
  - Loading states
  - Error handling with toast notifications
  - Auto-refresh capability

### 2. SocialMediaPage.tsx
- **Removed:** Mock posts data (6 hardcoded entries)
- **Added:** Real API integration with `postsAPI.list()`, `postsAPI.create()`, `postsAPI.delete()`
- **Features:**
  - Fetches posts from backend
  - Creates new posts via API
  - Deletes posts via API
  - Maintains all existing UI functionality

### 3. ReportsPage.tsx
- **Removed:** All mock data (overview stats, lead scores, weekly data, top leads)
- **Added:** Real API integration with `analyticsAPI.dashboard()` and `leadsAPI.list()`
- **Features:**
  - Fetches real analytics data
  - Calculates AI lead scores based on actual lead data
  - Dynamic scoring system based on tags, deal value, engagement
  - Loading states
  - Refresh data button
  - Charts display real data or "No data available" message

### 4. LeadGenerationPage.tsx
- **Status:** Already connected to backend API
- **Note:** Has fallback to mock data only on API failure (acceptable behavior)

### 5. API Client (api.ts)
- **Added:** `leadsAPI` object with full CRUD operations
- **Existing APIs confirmed:** contactsAPI, whatsappAPI, campaignsAPI, postsAPI, reviewsAPI, analyticsAPI, etc.

---

## 🔧 REMAINING FIXES NEEDED

### HIGH PRIORITY (Core Functionality)

#### 1. WhatsAppModule.tsx ⚠️ CRITICAL
**Current State:** Contains extensive mock data:
- 10 mock contacts with full details
- Message histories for 3 contacts
- 8 mock templates
- 4 mock auto-reply rules

**What Needs to Change:**
```typescript
// REMOVE:
const MOCK_CONTACTS, generateMessages(), MOCK_TEMPLATES, MOCK_AUTO_REPLIES

// REPLACE WITH:
- Fetch contacts from evolution API: GET /api/evolution/chats
- Fetch messages: GET /api/evolution/messages
- Fetch templates: GET /api/whatsapp/templates (already exists in backend)
- Fetch/save auto-reply rules from database (need to create API endpoints)

// IMPLEMENT:
- Evolution API config save/load: POST/GET /api/evolution/config
- Instance creation: POST /api/evolution/instance
- QR code connection: POST /api/evolution/connect
- Real-time message sending: POST /api/evolution/send/text
```

#### 2. DashboardPage.tsx
**Current State:** Hardcoded stats and mock contacts
```typescript
// REMOVE:
const mockContacts, analyticsData, pipelineData
Hardcoded stats: 'Leads Today: 12', 'Messages Sent: 456', etc.

// REPLACE WITH:
- Fetch dashboard stats from analyticsAPI.dashboard()
- Fetch recent leads from leadsAPI.list({ limit: 4 })
- Calculate pipeline data from real contacts
```

#### 3. AutomationPage.tsx
**Current State:** 6 mock automations, 8 mock templates

**What Needs to Change:**
```typescript
// REMOVE:
const mockAutomations, templates

// CREATE BACKEND ENDPOINTS (if not exist):
GET    /api/automation - List all automations
POST   /api/automation - Create new automation
PUT    /api/automation/:id - Update automation
DELETE /api/automation/:id - Delete automation
POST   /api/automation/:id/toggle - Activate/pause

// IMPLEMENT IN FRONTEND:
- Fetch automations from API
- Create/delete automations via API
- Save settings to backend
```

#### 4. NotificationCenter.tsx
**Current State:** 7 hardcoded notifications

**What Needs to Change:**
```typescript
// REMOVE:
const mockNotifications

// CREATE BACKEND ENDPOINT:
GET /api/notifications - List notifications (filter by unread)
POST /api/notifications/:id/read - Mark as read
DELETE /api/notifications/:id - Delete notification

// IMPLEMENT IN FRONTEND:
- Poll for new notifications every 30 seconds
- Fetch from API on mount
- Mark read/delete via API
```

#### 5. SuperAdminDashboard.tsx
**Current State:** All stats hardcoded

**What Needs to Change:**
```typescript
// REMOVE:
mockStats, growthData, planData, recentBusinesses

// CREATE BACKEND ENDPOINT:
GET /api/super-admin/stats - Get platform-wide statistics

// IMPLEMENT:
- Fetch real platform stats
- Real-time user count
- Revenue data from subscriptions
- Business growth trends
```

#### 6. TeamManagement.tsx
**Current State:** 5 mock team members

**What Needs to Change:**
```typescript
// REMOVE:
const mockTeamMembers

// USE EXISTING API:
Already has teamAPI in api.ts:
- teamAPI.listMembers()
- teamAPI.inviteMember()
- teamAPI.updateMember()
- teamAPI.removeMember()

// IMPLEMENT IN FRONTEND:
- Fetch team members from API
- Add/update/delete via API calls
```

#### 7. ECommercePage.tsx
**Current State:** 6 mock products, 5 mock orders

**What Needs to Change:**
```typescript
// REMOVE:
mockProducts, mockOrders

// CREATE BACKEND ENDPOINTS:
GET    /api/ecommerce/products
POST   /api/ecommerce/products
GET    /api/ecommerce/orders
POST   /api/ecommerce/orders

// IMPLEMENT:
- Fetch products and orders from API
- CRUD operations via API
```

#### 8. AppointmentsPage.tsx
**Current State:** 5 mock appointments

**What Needs to Change:**
```typescript
// REMOVE:
const mockAppointments

// CREATE BACKEND ENDPOINTS:
GET    /api/appointments
POST   /api/appointments
PUT    /api/appointments/:id
DELETE /api/appointments/:id

// IMPLEMENT:
- Fetch appointments from API
- Create/update/delete via API
```

---

### MEDIUM PRIORITY (Feature Completeness)

#### 9. Social Media OAuth Connection Flow
**Current State:** No way for users to connect their actual social media accounts

**What Needs to be Built:**

##### A. Database Schema (Prisma)
```prisma
model SocialAccount {
  id            String    @id @default(uuid())
  businessId    String
  platform      String    // facebook, instagram, twitter, linkedin, google
  accountId     String    // Platform's user/page ID
  pageId        String?   // For Facebook pages, Instagram business accounts
  pageName      String?   // Display name
  accessToken   String    // Encrypted OAuth token
  tokenExpiry   DateTime?
  metadata      Json?     // Additional platform-specific data
  status        String    @default("pending") // pending, connected, expired, error
  connectedAt   DateTime  @default(now())
  lastSyncAt    DateTime?
  
  business      Business  @relation(fields: [businessId], references: [id])
  
  @@unique([businessId, platform, accountId])
  @@index([businessId])
  @@index([status])
}
```

##### B. Backend Routes
```typescript
// src/server/routes/social-accounts.ts

// Get all connected accounts
GET /api/social-accounts
  - Returns list of connected social media accounts

// Get OAuth URL for platform
GET /api/social-accounts/oauth-url/:platform
  - Returns authorization URL for Facebook/Instagram/Twitter/Google

// Handle OAuth callback
GET /api/social-accounts/oauth/callback/:platform
  - Receives OAuth callback with code
  - Exchanges code for access token
  - Saves encrypted token to database

// Disconnect account
DELETE /api/social-accounts/:id
  - Removes account connection
  - Revokes token if possible

// Test connection
POST /api/social-accounts/:id/test
  - Verifies token is still valid
  - Updates status

// Refresh token
POST /api/social-accounts/:id/refresh
  - Refreshes expired tokens
```

##### C. Frontend Connection UI
Create component: `src/components/SocialAccountConnector.tsx`
```typescript
// Features:
- Show connected accounts with status
- "Connect Facebook" button → Opens OAuth popup
- Page selection after Facebook connection
- Account status indicators (connected, expired, error)
- Reconnect button for expired tokens
- Disconnect button
```

##### D. Platform-Specific Implementation

**Facebook/Instagram:**
1. User clicks "Connect Facebook"
2. Redirect to Facebook OAuth URL with scopes: `pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish`
3. User authorizes, Facebook redirects back with `code`
4. Backend exchanges `code` for `access_token`
5. Fetch user's pages via `GET /me/accounts`
6. User selects which pages to connect
7. Save page tokens (encrypted) to database

**Twitter/X:**
1. OAuth 1.0a or OAuth 2.0 PKCE flow
2. Redirect to Twitter authorization
3. Callback with verifier/code
4. Exchange for access token
5. Save to database

**Google Business:**
1. OAuth 2.0 flow with scopes: `https://www.googleapis.com/auth/business.manage`
2. Authorization callback
3. Exchange for token
4. Fetch business locations
5. Save connection

---

#### 10. Instagram Publishing Fix
**Current State:** Stub implementation that returns success without actually posting

**What Needs to Change:**

##### Backend Worker (`src/server/workers/index.ts`)
```typescript
async function publishToInstagram(postId: string) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { businessId: post.businessId, platform: 'instagram' }
  });
  
  if (!socialAccount) throw new Error('Instagram not connected');
  
  // Instagram requires two-step process:
  // 1. Create media container
  // 2. Publish container
  
  const accessToken = decryptToken(socialAccount.accessToken);
  const igBusinessId = socialAccount.pageId || socialAccount.accountId;
  
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    // For images/videos
    const mediaUrl = post.mediaUrls[0];
    
    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v18.0/${igBusinessId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption: post.content,
          access_token: accessToken,
        })
      }
    );
    
    const containerData = await containerRes.json();
    const creationId = containerData.id;
    
    // Wait for media processing
    await sleep(5000);
    
    // Step 2: Publish media
    const publishRes = await fetch(
      `https://graph.facebook.com/v18.0/${igBusinessId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        })
      }
    );
    
    return await publishRes.json();
  } else {
    // Instagram doesn't support text-only posts
    throw new Error('Instagram requires media (image/video) to publish');
  }
}
```

---

#### 11. Google Business Profile Backend
**Current State:** Frontend UI exists but zero backend integration

**What Needs to be Built:**

##### Backend Routes (`src/server/routes/google-business.ts`)
```typescript
import { Router } from 'express';
import { google } from 'googleapis';

const router = Router();

// OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get OAuth URL
router.get('/oauth-url', authenticate, (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/business.manage'],
    state: req.user.businessId,
  });
  res.json({ success: true, url });
});

// Handle callback
router.get('/callback', authenticate, async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  
  // Save tokens (encrypted)
  await prisma.googleBusiness.create({
    data: {
      businessId: req.user.businessId,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    }
  });
  
  res.json({ success: true });
});

// Get business locations
router.get('/locations', authenticate, async (req, res) => {
  const integration = await prisma.googleBusiness.findFirst({
    where: { businessId: req.user.businessId }
  });
  
  const token = decryptToken(integration.accessToken);
  oauth2Client.setCredentials({ access_token: token });
  
  const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });
  const locations = await mybusiness.accounts.locations.list({
    parent: 'accounts/-',
  });
  
  res.json({ success: true, data: locations.data });
});

// Create post/update
router.post('/post', authenticate, async (req, res) => {
  // Implementation for creating Google Business post
});

// Get reviews
router.get('/reviews', authenticate, async (req, res) => {
  // Implementation for fetching Google reviews
});

// Reply to review
router.post('/reviews/:id/reply', authenticate, async (req, res) => {
  // Implementation for replying to Google review
});
```

---

### LOW PRIORITY (Cleanup & Polish)

#### 12. Remove Hardcoded Placeholder Credentials

**Files to Update:**
- `src/server/utils/auth.ts` - JWT secret fallback
- `src/server/services/razorpay.service.ts` - Placeholder API keys
- `src/server/services/ai.service.ts` - Empty API key fallbacks
- `src/components/WhatsAppModule.tsx` - Placeholder URLs in Evolution config form

**Change:**
```typescript
// BEFORE:
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

// AFTER:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

#### 13. Add Evolution API Documentation
Create file: `docs/EVOLUTION_API_GUIDE.md`
```markdown
# Evolution API Integration Guide

## Setup Evolution API

1. **Install Evolution API**
   - Self-host: https://github.com/EvolutionAPI/evolution-api
   - Or use hosted version

2. **Configure in BizzAuto**
   - Go to WhatsApp module
   - Select "Evolution API" mode
   - Enter your Evolution API URL and API key
   - Click "Connect" to get QR code

3. **Scan QR Code**
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code shown in BizzAuto
   - Your WhatsApp is now connected!

## Available Endpoints

### Configuration
- `GET /api/evolution/config` - Get current config
- `POST /api/evolution/config` - Save config (baseUrl, apiKey)

### Instance Management
- `POST /api/evolution/instance` - Create new instance
- `POST /api/evolution/connect` - Get QR code
- `GET /api/evolution/status` - Check connection status
- `POST /api/evolution/disconnect` - Disconnect instance
- `DELETE /api/evolution/instance` - Delete instance

### Messaging
- `POST /api/evolution/send/text` - Send text message
- `POST /api/evolution/send/media` - Send media message
- `POST /api/evolution/send/template` - Send template
- `POST /api/evolution/send/bulk` - Bulk send to multiple contacts

### Data Retrieval
- `GET /api/evolution/chats` - Fetch all chats
- `GET /api/evolution/messages` - Fetch messages from chat
- `POST /api/evolution/check-number` - Check if number exists on WhatsApp

### Webhooks
- `POST /api/evolution/webhook/:businessId` - Receive webhook events

## Webhook Events

The Evolution API sends webhooks for:
- New incoming messages
- Message status updates (sent, delivered, read)
- Connection status changes
- QR code updates

Configure webhook URL in Evolution API settings to:
`https://your-domain.com/api/evolution/webhook/YOUR_BUSINESS_ID`
```

---

## 📋 IMPLEMENTATION PRIORITY ORDER

### Phase 1: Critical (Do First)
1. ✅ ReviewsPage - DONE
2. ✅ SocialMediaPage - DONE
3. ✅ ReportsPage - DONE
4. WhatsAppModule - Connect to Evolution API
5. DashboardPage - Connect to analytics API

### Phase 2: Important (Do Second)
6. AutomationPage - Create backend endpoints + connect
7. NotificationCenter - Create backend endpoint + connect
8. TeamManagement - Connect to existing teamAPI
9. SuperAdminDashboard - Create stats endpoint

### Phase 3: Feature Complete (Do Third)
10. Social Media OAuth Flow - Full implementation
11. Instagram Publishing - Fix worker implementation
12. Google Business Backend - Create full API integration
13. ECommercePage - Create backend endpoints
14. AppointmentsPage - Create backend endpoints

### Phase 4: Polish (Do Last)
15. Remove all hardcoded credentials
16. Add Evolution API documentation
17. Add error boundaries to all pages
18. Add loading states to all components
19. Test all API integrations end-to-end

---

## 🧪 TESTING CHECKLIST

After all fixes are implemented:

- [ ] Create new user account
- [ ] Connect WhatsApp via Evolution API (scan QR code)
- [ ] Send test WhatsApp message
- [ ] Add manual lead
- [ ] Import leads from CSV
- [ ] View leads list (should show real data)
- [ ] Connect Facebook account (OAuth flow)
- [ ] Create social media post
- [ ] Schedule post for future
- [ ] View dashboard (should show real stats)
- [ ] View reports (should show real analytics)
- [ ] Create automation rule
- [ ] Reply to review
- [ ] Export leads to CSV
- [ ] View notifications (should be real-time)
- [ ] Check team management (add/remove members)
- [ ] Test social media publishing (Facebook/Instagram)

---

## 🚀 QUICK START FOR DEVELOPER

1. **Ensure backend is running:**
   ```bash
   npm run server
   ```

2. **Ensure database is set up:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Set environment variables in `.env`:**
   ```env
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=<generate-strong-secret>
   OPENROUTER_API_KEY=<your-key>
   ```

4. **Frontend will auto-connect to backend at:**
   ```
   http://localhost:4000/api
   ```

5. **Test API health:**
   ```bash
   curl http://localhost:4000/health
   ```

---

**Last Updated:** 2026-04-14
**Status:** In Progress - 5/18 tasks completed
