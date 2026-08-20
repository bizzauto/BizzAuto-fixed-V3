# 🚀 BizzAuto CRM - Complete Setup Guide

## 📋 Customer Data Required

### Step 1: Business Information (Required)

| Field | Description | Example |
|-------|-------------|---------|
| **Business Name** | Company/Shop name | "Sharma Traders" |
| **Business Type** | Category | "Retail", "Services", "Restaurant" |
| **Owner Name** | Full name | "Rahul Sharma" |
| **Phone Number** | Primary contact | "+91 9876543210" |
| **Email** | Business email | "info@sharmatraders.com" |
| **Address** | Full address | "123 Main Road, Mumbai" |
| **Website** | (Optional) | "www.sharmatraders.com" |
| **GST Number** | (If applicable) | "27AABCS1234N1Z5" |

### Step 2: Social Media Accounts

| Platform | What We Need | How to Get |
|----------|--------------|------------|
| **WhatsApp Business** | API Key | Meta Business Suite |
| **Facebook** | Page ID + Access Token | Facebook Developer |
| **Instagram** | User ID + Access Token | Facebook Developer |
| **Google Business** | OAuth Login | Google Cloud Console |
| **LinkedIn** | Page ID + Access Token | LinkedIn Developer |
| **Twitter** | User ID + Access Token | Twitter Developer |

### Step 3: AI & Automation Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **AI Provider** | Nvidia NIM (Free) | Already configured |
| **Gemini API Key** | For images | Optional |
| **Auto-Reply** | WhatsApp auto-reply | Off |
| **Business Hours** | When to respond | 9AM-6PM |
| **Timezone** | Your timezone | Asia/Kolkata |

---

## 🎯 Feature-Wise Setup Guide

### 1. 📱 WhatsApp Marketing

**What it does:**
- Send bulk messages to customers
- Auto-reply to incoming messages
- Schedule messages for later
- AI-powered smart replies

**Setup:**
1. Go to Settings → Integrations
2. Connect WhatsApp Business API
3. Set business hours
4. Configure auto-reply messages

**Data needed:**
- WhatsApp Business API key
- Message templates
- Business hours

---

### 2. 👥 Leads Management (CRM)

**What it does:**
- Store all customer information
- Track lead status
- Follow-up reminders
- Lead scoring

**Setup:**
1. Go to Leads section
2. Import existing customers (CSV/Excel)
3. Set lead stages
4. Configure follow-up reminders

**Data needed:**
- Customer name
- Phone number
- Email
- Source (How they found you)
- Interest/Requirement

---

### 3. ⭐ Reviews Management

**What it does:**
- Monitor Google reviews
- Auto-reply to reviews
- Request reviews from customers
- Track ratings

**Setup:**
1. Go to Settings → Integrations
2. Connect Google Business Profile
3. Set auto-reply templates
4. Configure review request timing

**Data needed:**
- Google Business account access
- Reply templates

---

### 4. 🏢 Google Business Profile

**What it does:**
- Auto-post updates
- Manage reviews
- Track insights
- Schedule posts

**Setup:**
1. Go to Google Business page
2. Click "Connect Google Business"
3. Login with Google account
4. Select your business

**Data needed:**
- Google account with Business Profile access

---

### 5. 🎨 Creative Generator

**What it does:**
- Create posters & designs
- Social media posts
- Festival greetings
- Promotional materials

**Setup:**
1. Go to Creative page
2. Choose template
3. Customize text & images
4. Download or share

**Data needed:**
- Brand colors (optional)
- Logo (optional)
- Content ideas

---

### 6. 📢 Campaigns

**What it does:**
- Create marketing campaigns
- Track performance
- A/B testing
- ROI tracking

**Setup:**
1. Go to Campaigns page
2. Create new campaign
3. Set target audience
4. Schedule & launch

**Data needed:**
- Campaign goal
- Target audience
- Budget
- Content/Messages

---

### 7. 📧 Email Marketing

**What it does:**
- Send bulk emails
- Email templates
- Open/click tracking
- Automation

**Setup:**
1. Go to Email Marketing
2. Import email list
3. Create templates
4. Schedule campaigns

**Data needed:**
- Email list
- Email templates
- SMTP settings (optional)

---

### 8. 🤖 AI Chatbot

**What it does:**
- 24/7 customer support
- Auto-answer FAQs
- Lead capture
- Smart routing

**Setup:**
1. Go to AI Chatbot page
2. Train with your FAQs
3. Set response rules
4. Embed on website

**Data needed:**
- FAQ list
- Business hours
- Escalation contacts

---

### 9. 📊 Analytics & Reports

**What it does:**
- Track all metrics
- Revenue reports
- Lead conversion
- Campaign performance

**Setup:**
1. Go to Analytics page
2. Connect data sources
3. Set report schedule
4. Configure dashboards

**Data needed:**
- Already auto-collected!

---

### 10. 🎤 Jimi AI Assistant

**What it does:**
- Voice commands
- Smart reminders
- Quick actions
- Multi-language support

**Setup:**
- Already configured!
- Just click mic and speak

**Commands:**
- "Aaj ka briefing batao"
- "Reminder set karo"
- "Note karo"
- "Joke sunao"

---

## 📝 Quick Setup Checklist

### Day 1: Basic Setup
- [ ] Business information entered
- [ ] Owner account created
- [ ] Logo uploaded
- [ ] Business hours set

### Day 2: Integrations
- [ ] WhatsApp Business connected
- [ ] Google Business connected
- [ ] Facebook page connected
- [ ] Instagram connected

### Day 3: Content
- [ ] Message templates created
- [ ] Email templates created
- [ ] Social media posts scheduled
- [ ] Auto-reply configured

### Day 4: Data Import
- [ ] Customer list imported
- [ ] Leads categorized
- [ ] Follow-up reminders set
- [ ] Campaigns created

### Day 5: Go Live!
- [ ] Test WhatsApp messages
- [ ] Test email campaigns
- [ ] Test AI chatbot
- [ ] Monitor analytics

---

## 🔧 Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# AI (FREE)
NVIDIA_NIM_API_KEY=nvapi-xxx
GEMINI_API_KEY=xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URL=https://your-domain.com/api/google-business/auth/callback

# WhatsApp (Optional)
WHATSAPP_API_KEY=xxx

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

---

## 📞 Support

For setup help:
1. Check this guide
2. Use Jimi AI assistant ("Help" bolo)
3. Contact support team

---

## 🎉 You're Ready!

After setup:
1. **Daily**: Check dashboard for updates
2. **Weekly**: Review analytics
3. **Monthly**: Optimize campaigns

**Need help?** Just ask Jimi! 🎤
