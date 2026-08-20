# AI Lead Finder + WhatsApp Outreach — Feature Plan

## Overview
BizzAuto CRM mein AI-powered Lead Generation feature add karna hai jisme:
- Google Maps se businesses dhundho (website/social media nahi hai)
- AI se lead score karo (hot/warm/cold)
- Automated personalized WhatsApp messages bhejo
- Auto follow-up sequences chalao

---

## Phase 1: Google Maps Lead Finder

### Backend
**New File:** `src/server/services/lead-finder.service.ts`

```
- Google Places API se businesses search by: category, city, radius
- Extract: name, phone, address, website, rating, reviews
- Check digital presence: website hai ya nahi, social media hai ya nahi
- Deduplication: existing contacts se match karo by phone
- Store as Contact with source = "lead_finder"
```

**New Route:** `src/server/routes/lead-finder.ts`

```
POST /api/lead-finder/search     — Search businesses on Google Maps
POST /api/lead-finder/import     — Import selected leads to contacts
GET  /api/lead-finder/history    — Past search history
POST /api/lead-finder/analyze    — AI se digital presence analyze
```

### Frontend
**New File:** `src/components/LeadFinderPage.tsx`

```
- Search bar: category dropdown + city input + radius slider
- Results table: name, phone, address, website (yes/no), social (yes/no)
- Select leads checkbox
- "Import to Contacts" button
- Digital presence score indicator (red/yellow/green)
```

### Database
```prisma
// New model for tracking lead finder searches
model LeadFinderSearch {
  id              String   @id @default(cuid())
  businessId      String
  query           String   // e.g. "restaurants in Mumbai"
  category        String
  city            String
  radius          Int
  resultsCount    Int
  importedCount   Int
  createdAt       DateTime @default(now())
  
  business        Business @relation(fields: [businessId], references: [id])
  
  @@index([businessId])
}

// Add to Contact model
// leadFinderScore    Int?     // 0-100 digital presence gap score
// leadFinderSource   String?  // "google_maps", "justdial", etc.
// leadFinderData     Json?    // Raw Google Places data
```

---

## Phase 2: AI Lead Scoring

### Backend
**New File:** `src/server/services/ai-lead-scoring.service.ts`

```
- Score leads based on:
  1. Digital presence gap (no website = +30, no social = +20)
  2. Business category (high-value categories score higher)
  3. Location (metro vs tier-2/3 cities)
  4. Reviews count (more reviews = more active business)
  5. Phone number valid hai ya nahi
- Categories: hot (80-100), warm (50-79), cold (0-49)
- Use AIService (Nvidia NIM / OpenRouter) for analysis
```

### Integration
```
- Lead import ke baad auto-score hota hai
- Bulk scoring: select multiple leads → "Score with AI" button
- Score refresh on re-analysis
```

---

## Phase 3: AI Personalized WhatsApp Outreach

### Backend
**New File:** `src/server/services/ai-outreach.service.ts`

```
- Generate personalized message per lead using AIService:
  "Hi {name}, I noticed {business} doesn't have a website yet. 
   We help businesses like yours get online with a professional 
   website starting at just ₹4,999. Interested?"
- Message templates for different categories
- Rate limiting: max 30 messages/hour (WhatsApp safe limit)
- Queue system using BullMQ
```

**New Route:** `src/server/routes/ai-outreach.ts`

```
POST /api/outreach/generate      — AI se personalized message generate
POST /api/outreach/preview       — Message preview before sending
POST /api/outreach/send          — Send single message
POST /api/outreach/bulk          — Bulk send with drip mode
GET  /api/outreach/campaigns     — List campaigns
GET  /outreach/campaign/:id      — Campaign stats
```

### Message Flow
```
Lead Import → AI Score → AI Generate Message → Preview → Approve → Send via WhatsApp
                                                                    ↓
                                                            Track delivery
                                                                    ↓
                                                          No reply? → Follow-up
```

---

## Phase 4: Auto Follow-up Engine

### Backend
**New File:** `src/server/services/followup-engine.service.ts`

```
- Follow-up rules:
  1. No reply in 24h → Follow-up 1 (gentle reminder)
  2. No reply in 72h → Follow-up 2 (different angle)
  3. No reply in 7 days → Follow-up 3 (last chance / offer)
- AI generates each follow-up message differently
- Stop sequence if lead replies (any reply = hot lead)
- BullMQ worker processes follow-up queue
```

### Database
```prisma
model OutreachCampaign {
  id              String   @id @default(cuid())
  businessId      String
  name            String
  status          String   @default("draft") // draft/active/paused/completed
  totalLeads      Int      @default(0)
  sent            Int      @default(0)
  delivered       Int      @default(0)
  replied         Int      @default(0)
  clicked         Int      @default(0)
  template        String   // base message template
  followUpRules   Json     // follow-up timing and templates
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  business        Business @relation(fields: [businessId], references: [id])
  outreachLogs    OutreachLog[]
  
  @@index([businessId])
}

model OutreachLog {
  id              String   @id @default(cuid())
  campaignId      String
  contactId       String
  businessId      String
  messageType      String   // initial/followup_1/followup_2/followup_3
  message         String
  status          String   @default("pending") // pending/sent/delivered/read/replied/failed
  whatsappMsgId   String?
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?
  repliedAt       DateTime?
  replyContent    String?
  createdAt       DateTime @default(now())
  
  campaign        OutreachCampaign @relation(fields: [campaignId], references: [id])
  contact         Contact          @relation(fields: [contactId], references: [id])
  business        Business         @relation(fields: [businessId], references: [id])
  
  @@index([campaignId])
  @@index([contactId])
  @@index([businessId])
}
```

---

## Phase 5: Campaign Dashboard

### Frontend
**New File:** `src/components/OutreachCampaignPage.tsx`

```
- Campaign list with stats (sent/delivered/replied/clicked)
- Create campaign wizard:
  Step 1: Select leads (from Lead Finder or existing contacts)
  Step 2: AI generates personalized messages
  Step 3: Preview & edit messages
  Step 4: Set follow-up rules
  Step 5: Launch campaign
- Real-time stats: delivery rate, reply rate, conversion
- Individual lead tracking: message history, follow-up status
```

---

## API Dependencies

| Service | API | Free Tier | Purpose |
|---------|-----|-----------|---------|
| Google Places | Google Maps Platform | $200/month credit | Find businesses |
| AI Text | Nvidia NIM | 1000 req/day FREE | Generate messages |
| AI Text | OpenRouter | Free tier fallback | Backup AI |
| WhatsApp | Evolution API | Self-hosted FREE | Send messages |
| WhatsApp | Meta Business API | FREE | Official WhatsApp |

---

## File Structure

```
src/server/
├── services/
│   ├── lead-finder.service.ts      ← Phase 1: Google Maps search
│   ├── ai-lead-scoring.service.ts  ← Phase 2: Lead scoring
│   ├── ai-outreach.service.ts      ← Phase 3: Message generation
│   └── followup-engine.service.ts  ← Phase 4: Follow-up engine
├── routes/
│   ├── lead-finder.ts              ← Phase 1: Search API
│   └── ai-outreach.ts              ← Phase 3-4: Outreach API
└── workers/
    └── outreach.worker.ts          ← Phase 4: BullMQ worker

src/components/
├── LeadFinderPage.tsx              ← Phase 1: Search UI
├── OutreachCampaignPage.tsx        ← Phase 5: Campaign dashboard
└── LeadScoreBadge.tsx              ← Phase 2: Score indicator
```

---

## Implementation Order

1. **Phase 1** (Week 1): Google Maps Lead Finder — search + import
2. **Phase 2** (Week 1): AI Lead Scoring — auto-score on import
3. **Phase 3** (Week 2): AI Message Generation + Send
4. **Phase 4** (Week 2): Follow-up Engine + BullMQ worker
5. **Phase 5** (Week 3): Campaign Dashboard + Analytics

---

## Status: PLANNED — Ready for Implementation
