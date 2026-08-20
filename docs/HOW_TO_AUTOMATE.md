# 🤖 How to Automate Your Business with BizzAuto

Complete guide to setting up automation workflows for your business.

---

## 📋 Table of Contents

1. [WhatsApp Automation](#1-whatsapp-automation)
2. [Lead Capture & Auto-Response](#2-lead-capture--auto-response)
3. [Social Media Automation](#3-social-media-automation)
4. [Review Management](#4-review-management)
5. [Email Automation](#5-email-automation)
6. [n8n Advanced Workflows](#6-n8n-advanced-workflows)
7. [AI-Powered Features](#7-ai-powered-features)
8. [Scheduled Campaigns](#8-scheduled-campaigns)

---

## 1. WhatsApp Automation

### Option A: Evolution API (Recommended)

**Best for:** Businesses wanting full control without Meta approval

#### Setup Steps:

1. **Install Evolution API**
   ```bash
   # Using Docker
   docker run -d -p 8080:8080 \
     -e API_KEY=your-secret-key \
     --name evolution-api \
     atendai/evolution-api:latest
   ```

2. **Configure in BizzAuto**
   - Go to WhatsApp Module
   - Select "Evolution API" mode
   - Enter Base URL: `http://localhost:8080`
   - Enter API Key: `your-secret-key`
   - Click "Save Configuration"

3. **Connect WhatsApp**
   - Click "Connect & Get QR Code"
   - Open WhatsApp > Settings > Linked Devices
   - Scan the QR code
   - Wait for connection (5-10 seconds)

4. **Start Automation**
   - All incoming messages will be processed automatically
   - Set up auto-replies in Settings tab
   - Create broadcast campaigns

#### Features Available:
- ✅ Send/receive messages
- ✅ Send media (images, videos, documents)
- ✅ Bulk messaging
- ✅ Auto-reply with keywords
- ✅ Chat history sync
- ✅ Real-time webhooks

**Full Guide:** [Evolution API Documentation](./EVOLUTION_API_GUIDE.md)

---

### Option B: Meta WhatsApp Cloud API

**Best for:** Large businesses needing official API

#### Setup Steps:

1. **Create Meta Developer Account**
   - Go to https://developers.facebook.com/
   - Create new app
   - Add WhatsApp product

2. **Get Credentials**
   - Note your App ID and App Secret
   - Add them to `.env` file:
     ```env
     META_APP_ID=your_app_id
     META_APP_SECRET=your_app_secret
     ```

3. **Phone Number Verification**
   - Verify your business phone number
   - Complete business profile

4. **Connect in BizzAuto**
   - Select "Meta Official API" mode
   - Follow OAuth flow
   - Grant permissions

---

### Setting Up Auto-Replies

1. **Go to WhatsApp > Settings > Auto-Reply**
2. **Enable Auto-Reply**
3. **Add Keyword Rules:**
   ```
   Keyword: "hi", "hello", "hey"
   Response: "Welcome! How can we help you?"
   Match Type: Contains
   
   Keyword: "price", "pricing", "cost"
   Response: "Our plans start at ₹499/month..."
   Match Type: Contains
   
   Keyword: "location", "address"
   Response: "📍 We're at Shop 42, MG Road, Mumbai"
   Match Type: Contains
   ```

4. **Enable AI Auto-Reply** (Optional)
   - Toggle "AI-Powered Replies"
   - Select AI provider (OpenRouter recommended)
   - Set max reply length (200 characters)

---

## 2. Lead Capture & Auto-Response

### IndiaMART Integration

1. **Get Webhook URL**
   - Go to Leads > Settings
   - Copy webhook URL: `https://yourdomain.com/api/leads/indiamart/YOUR_BUSINESS_ID`

2. **Configure IndiaMART**
   - Login to IndiaMART seller dashboard
   - Go to Integrations > Webhooks
   - Paste the webhook URL
   - Enable lead notifications

3. **Auto-Response Setup**
   - When new lead comes from IndiaMART:
     - Lead is automatically created in CRM
     - Auto WhatsApp message sent to lead
     - Email notification to your team
     - Tag added: "indiamart"

### JustDial Integration

Same process as IndiaMART, JustDial webhook endpoint:
```
https://yourdomain.com/api/leads/justdial/YOUR_BUSINESS_ID
```

### Facebook Lead Ads

1. **Connect Facebook Page**
   - Go to Social Media > Connected Accounts
   - Click "Connect Facebook"
   - Authorize and select pages

2. **Create Lead Ad Campaign**
   - Facebook will send leads to BizzAuto automatically
   - Configure auto-reply in Leads > Settings

### Website Contact Form

Embed this form on your website:
```html
<form action="https://yourdomain.com/api/leads/manual" method="POST">
  <input name="name" placeholder="Your Name" required>
  <input name="phone" placeholder="Phone Number" required>
  <input name="email" placeholder="Email">
  <input name="source" value="website" type="hidden">
  <button type="submit">Submit</button>
</form>
```

---

## 3. Social Media Automation

### Auto-Post Scheduling

1. **Create Post**
   - Go to Social Media > Create Post
   - Write content or use AI to generate
   - Select platforms (Facebook, Instagram, Twitter, LinkedIn)
   - Choose publish now or schedule

2. **Schedule Posts**
   - Set date and time
   - Post will publish automatically
   - View scheduled posts in Calendar view

### Connecting Social Accounts

#### Facebook & Instagram

1. **Click "Connect Facebook"**
2. **Login and Authorize**
3. **Select Pages to Connect**
4. **Pages will appear in Connected Accounts**

#### Twitter/X

1. **Click "Connect Twitter"**
2. **Authorize Application**
3. **Twitter account connected**

#### LinkedIn

1. **Click "Connect LinkedIn"**
2. **Authorize with your LinkedIn account**
3. **Select Profile or Company Page**

### Best Times to Post

The analytics dashboard shows optimal posting times based on your audience engagement.

---

## 4. Review Management

### Google Reviews

1. **Connect Google Business Profile**
   - Go to Reviews > Settings
   - Click "Connect Google Business"
   - Authorize with Google account

2. **Auto-Reply to Reviews**
   - Enable "AI Auto-Reply"
   - Set reply tone (Professional, Friendly, Formal)
   - Reviews will get auto-replied

### Review Monitoring

- All reviews from Google, Facebook monitored
- Notifications for new reviews
- Unreplied reviews highlighted

---

## 5. Email Automation

### Welcome Series

1. **Go to Automation > Templates**
2. **Select "Email Welcome Series"**
3. **Configure:**
   - Trigger: New contact added
   - Email 1: Immediate welcome
   - Email 2: 2 days later (product info)
   - Email 3: 5 days later (special offer)

### Drip Campaigns

Create multi-step email sequences:
1. Day 1: Welcome email
2. Day 3: Educational content
3. Day 7: Product demo invitation
4. Day 14: Special offer

---

## 6. n8n Advanced Workflows

### What is n8n?

n8n is a workflow automation tool that connects any app to any app. Think Zapier but self-hosted and unlimited workflows.

### Setup n8n

1. **Access n8n Dashboard**
   - URL: `http://localhost:5678` (or your n8n URL)
   - Login with credentials from `.env`

2. **Create Your First Workflow**

   **Example: New Lead → WhatsApp → Email → Google Sheet**
   
   ```
   Webhook Trigger
       ↓
   Create Contact in BizzAuto
       ↓
   Send WhatsApp Message
       ↓
   Send Email
       ↓
   Add Row to Google Sheet
   ```

3. **Connect to BizzAuto**
   - Use HTTP Request node
   - URL: `https://yourdomain.com/api/...`
   - Auth: Bearer Token (get from API Keys)

### Popular n8n Workflows

#### Lead Qualification Workflow
```
New Lead from IndiaMART
    ↓
Check if phone exists in CRM
    ↓ (Yes)
    Update existing contact
    ↓
    Send WhatsApp (existing customer offer)
    ↓
(New)
    Create new contact
    ↓
    Send welcome WhatsApp
    ↓
    Tag as "new-lead"
    ↓
    Assign to sales rep
    ↓
    Create follow-up task (2 days)
```

#### Review Response Workflow
```
New Google Review
    ↓
Check rating
    ↓ (5 stars)
    Send thank you WhatsApp
    ↓
    Ask for referral
    ↓
(1-3 stars)
    Notify manager
    ↓
    Create support ticket
    ↓
    Send apology email
```

---

## 7. AI-Powered Features

### AI Caption Generation

1. Go to Social Media > Create Post
2. Click "Generate with AI"
3. Enter topic: "Diwali Sale"
4. AI generates engaging caption
5. AI suggests hashtags

### AI Review Replies

1. Enable in Reviews > Settings
2. Set tone: Professional/Friendly/Formal
3. AI automatically replies to new reviews

### AI Lead Scoring

Leads are automatically scored based on:
- Tags (Hot, VIP, New)
- Deal value
- Engagement level
- Recent activity

View scores in Reports > AI Lead Scores

### AI Content Calendar

1. Go to AI > Content Calendar
2. Enter business type and month
3. AI generates 30-day content plan
4. Approve and schedule all posts

---

## 8. Scheduled Campaigns

### WhatsApp Broadcast

1. **Create Campaign**
   - Go to WhatsApp > Campaigns > New
   - Select message template
   - Choose recipient list

2. **Schedule**
   - Send now or schedule for later
   - Set timezone
   - Campaign will auto-send

3. **Track Results**
   - Delivery rate
   - Read rate
   - Response rate

### Best Practices

- **Limit:** 1000 messages per batch
- **Timing:** 10 AM - 6 PM (avoid late night)
- **Content:** Personalized messages perform better
- **Frequency:** Max 2 campaigns per week per contact

---

## 🔗 Quick Links

- [Evolution API Guide](./EVOLUTION_API_GUIDE.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [API Documentation](./API_REFERENCE.md)

---

## 💡 Pro Tips

1. **Use AI Smartly:** AI works best with specific prompts. Instead of "write about products", use "write a 100-word Instagram caption about our new hair oil launch with 10 relevant hashtags"

2. **Automate Repetitive Tasks:** If you do something more than 3 times, automate it with n8n

3. **Segment Your Contacts:** Use tags effectively - Hot Lead, VIP, New Customer, etc. This enables targeted campaigns

4. **Monitor Analytics:** Check Reports weekly to understand what's working

5. **Test Before Sending:** Always test campaigns with your own number before bulk send

6. **Respect User Privacy:** Only message users who have opted in. Provide opt-out options.

---

## ❓ Common Questions

**Q: Can I use personal WhatsApp?**
A: No, you need WhatsApp Business or Evolution API with a business number.

**Q: How many messages can I send?**
A: Depends on your WhatsApp API tier. Evolution API has no limits, Meta API has conversation-based pricing.

**Q: Can I schedule posts for multiple platforms?**
A: Yes! Create once, publish to Facebook, Instagram, Twitter, LinkedIn simultaneously.

**Q: How does AI lead scoring work?**
A: It analyzes tags, deal value, engagement, and recency to assign a 0-100 score.

**Q: Is my data secure?**
A: Yes, all data is encrypted at rest. API keys and tokens are encrypted using AES-256.

---

**Need Help?** Check our [FAQ](./FAQ.md) or contact support.
