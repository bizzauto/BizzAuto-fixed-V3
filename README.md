# 🚀 SaaS Business Automation Tool

A comprehensive **GoHighLevel-style** SaaS automation platform with CRM, WhatsApp Business API integration, multi-channel marketing, AI-powered content generation, and more.

![Features](https://img.shields.io/badge/CRM-Complete-blue)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Official%20API-green)
![AI](https://img.shields.io/badge/AI-Multi--Provider-purple)
![Deployment](https://img.shields.io/badge/Deployment-Docker%20%26%20VPS-orange)

---

## ✨ Features

### 📊 CRM & Lead Management
- ✅ Contact management with tags & custom fields
- ✅ Visual sales pipelines (Kanban view)
- ✅ Deal tracking & management
- ✅ Activity logging & timeline
- ✅ Bulk contact import/export
- ✅ Lead scoring & segmentation
- ✅ Auto-lead capture from forms

### 💬 WhatsApp Business API
- ✅ **Official Meta WhatsApp Business API**
- ✅ QR code scanning for connection
- ✅ Send text, template, media messages
- ✅ **Bulk messaging** with queue system
- ✅ **Proxy support** for rate limiting
- ✅ Message templates (HSM)
- ✅ Two-way conversation handling
- ✅ Auto-reply & chatbot flows
- ✅ Message status tracking (sent/delivered/read)

### 📧 Email Integration
- ✅ SMTP configuration (Gmail, SendGrid, etc.)
- ✅ Auto-reply emails
- ✅ Email campaigns
- ✅ Contact import from email lists
- ✅ Email tracking & analytics

### 📈 Marketing Automation
- ✅ **IndiaMART** lead capture & auto-reply
- ✅ **JustDial** lead integration
- ✅ **Facebook Ads** lead forms
- ✅ **Instagram Ads** lead forms
- ✅ Auto-reply to leads via WhatsApp & Email
- ✅ Drip campaigns
- ✅ Campaign scheduling
- ✅ Campaign analytics

### 🤖 AI-Powered Features
- ✅ **Multi-provider AI fallback**:
  - OpenRouter (Free tier: Llama, Gemma, Mistral)
  - Ollama (Local models)
  - Replicate (Image/Video generation)
- ✅ AI poster generator
- ✅ AI video generator (coming soon)
- ✅ AI caption & hashtag generation
- ✅ AI review replies
- ✅ Content calendar generation
- ✅ AI credit tracking per business

### 📱 Social Media Management
- ✅ **Facebook** page posting
- ✅ **Instagram** publishing
- ✅ **LinkedIn** company posts
- ✅ **Twitter/X** tweeting
- ✅ **Google Business Profile** posts
- ✅ Post scheduling
- ✅ Cross-platform posting
- ✅ Engagement tracking

### 📊 Analytics & Reporting
- ✅ Dashboard with key metrics
- ✅ Contact growth trends
- ✅ Message volume analytics
- ✅ Campaign performance reports
- ✅ Pipeline analytics
- ✅ Review sentiment analysis
- ✅ Export reports to CSV/PDF

### 🔗 Integrations
- ✅ **Google Sheets** sync (contacts & data)
- ✅ **Webhooks** for custom integrations
- ✅ **Zapier** & **Make.com** compatible
- ✅ **REST API** for developers
- ✅ API key management

### 💳 Subscription & Billing
- ✅ Multi-tier plans (FREE, STARTER, GROWTH, PRO, AGENCY)
- ✅ **Razorpay** integration (India)
- ✅ Trial period management
- ✅ Usage limits & quotas
- ✅ AI credit system

### 🛡️ Security & Multi-Tenancy
- ✅ JWT authentication
- ✅ Role-based access control (Owner, Admin, Member, Viewer)
- ✅ Multi-tenant data isolation
- ✅ AES-256 encryption for sensitive data
- ✅ Rate limiting per plan
- ✅ Audit logging
- ✅ CORS protection
- ✅ SQL injection protection (Prisma)

### 🚀 Deployment & DevOps
- ✅ **Docker** & Docker Compose ready
- ✅ **VPS installation** script (Ubuntu)
- ✅ PostgreSQL database
- ✅ Redis for caching & queues
- ✅ Background job workers (BullMQ)
- ✅ Graceful shutdown handling
- ✅ Logging with Winston
- ✅ Health check endpoints

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Frontend (React)               │
│         Vite + TailwindCSS + TS             │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP/REST API
                  │
┌─────────────────▼───────────────────────────┐
│           Backend (Express.js)              │
│         Node.js + TypeScript                │
└───────┬──────────┬──────────┬───────────────┘
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │PostgreSQL│ │ Redis  │ │Workers │
   │        │ │        │ │BullMQ  │
   └────────┘ └────────┘ └────────┘
        │          │          │
        ▼          ▼          ▼
   ┌─────────────────────────────────┐
   │   External Services             │
   │ • WhatsApp Business API         │
   │ • OpenRouter / Ollama / Replicate│
   │ • Google Sheets API             │
   │ • Facebook/Instagram/Twitter    │
   │ • SMTP Email Service            │
   │ • Razorpay Payments             │
   └─────────────────────────────────┘
```

---

## 📦 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express 5, TypeScript
- **Database**: PostgreSQL 16, Prisma ORM
- **Cache/Queue**: Redis 7, BullMQ
- **AI Providers**: OpenRouter, Ollama, Replicate
- **Authentication**: JWT with refresh tokens
- **Deployment**: Docker, Docker Compose, VPS-ready

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd saas-automation

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Access the application
# Frontend: http://localhost:5173
# Backend: http://localhost:4000
```

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start databases
docker-compose up -d postgres redis

# 4. Initialize database
npm run prisma:generate
npm run prisma:migrate

# 5. Start development server
npm run dev:full

# Or start everything (app + frontend + worker)
npm run dev:all
```

### Option 3: VPS Installation (Ubuntu 22.04)

```bash
# Clone repository
git clone <your-repo-url>
cd saas-automation

# Run installation script
sudo chmod +x scripts/install.sh
sudo ./scripts/install.sh

# Follow the prompts
# Edit .env with your API keys
sudo nano /opt/saas-automation/.env

# Restart services
cd /opt/saas-automation
sudo docker-compose restart
```

---

## 🔑 Environment Variables

Create a `.env` file with the following:

```env
# Server
NODE_ENV=production
PORT=4000
BASE_URL=http://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_saas

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (generate random strings)
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# AI Providers (at least one required)
OPENROUTER_API_KEY=sk-or-v1-xxx
REPLICATE_API_KEY=r8_xxx
OLLAMA_BASE_URL=http://localhost:11434

# WhatsApp Business API
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payments
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Google APIs (for Sheets)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URL=http://localhost:4000/api/integrations/google-sheets/callback
```

---

## 📚 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "businessName": "My Business"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}

# Get Profile
GET /api/auth/me
Authorization: Bearer <token>
```

### WhatsApp

```bash
# Send Text Message
POST /api/whatsapp/send/text
{
  "to": "+919876543210",
  "message": "Hello from SaaS Platform!"
}

# Send Template
POST /api/whatsapp/send/template
{
  "to": "+919876543210",
  "templateName": "welcome_message",
  "language": "en",
  "variables": ["John"]
}

# Bulk Send
POST /api/whatsapp/bulk
{
  "messages": [
    {"to": "+919876543210", "type": "text", "content": "Message 1"},
    {"to": "+919876543211", "type": "text", "content": "Message 2"}
  ],
  "rateLimit": 80
}
```

### AI Generation

```bash
# Generate Content
POST /api/ai/generate
{
  "prompt": "Write a marketing caption for our product",
  "maxTokens": 500,
  "type": "creative"
}

# Generate Hashtags
POST /api/ai/hashtags
{
  "topic": "digital marketing"
}

# Generate Poster
POST /api/ai/poster
{
  "prompt": "Create a Diwali sale poster",
  "format": "square"
}
```

### CRM

```bash
# Create Contact
POST /api/contacts
{
  "name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "tags": ["lead", "indiamart"],
  "source": "manual"
}

# List Contacts
GET /api/contacts?page=1&limit=20&search=john
```

### Lead Capture

```bash
# IndiaMART Lead
POST /api/leads/indiamart/{businessId}
{
  "name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "product": "Software",
  "requirement": "Need CRM solution"
}

# Facebook Lead
POST /api/leads/facebook/{businessId}
{
  "name": "Jane Smith",
  "phone": "+919876543211",
  "email": "jane@example.com",
  "form_id": "123456",
  "ad_id": "789012"
}
```

**Full API documentation**: See `IMPLEMENTATION_GUIDE.md`

---

## 💰 Pricing Plans

| Feature | FREE | STARTER | GROWTH | PRO | AGENCY |
|---------|------|---------|--------|-----|--------|
| **Price** | ₹0 | ₹999/mo | ₹2,499/mo | ₹4,999/mo | ₹9,999/mo |
| Contacts | 100 | 1,000 | 10,000 | 50,000 | Unlimited |
| WhatsApp Messages | 100/mo | 5,000/mo | 25,000/mo | 100,000/mo | Unlimited |
| AI Credits | 10 | 100 | 500 | 2,000 | 10,000 |
| Users | 1 | 3 | 10 | 25 | Unlimited |
| Businesses | 1 | 1 | 3 | 10 | Unlimited |
| Email Integration | ❌ | ✅ | ✅ | ✅ | ✅ |
| Google Sheets | ❌ | ❌ | ✅ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ | ✅ |
| White Label | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🤖 AI Providers Configuration

### OpenRouter (Primary - Free Tier)

Get API key: https://openrouter.ai/

```env
OPENROUTER_API_KEY=sk-or-v1-xxx
```

**Free models available**:
- `google/gemma-2-9b-it:free`
- `meta-llama/llama-3.2-3b-instruct:free`
- `mistralai/mistral-7b-instruct:free`

### Ollama (Local - Free)

Install Ollama: https://ollama.ai/

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.2:3b
ollama pull gemma:9b

# Configure
OLLAMA_BASE_URL=http://localhost:11434
```

### Replicate (Image/Video Generation)

Get API key: https://replicate.com/

```env
REPLICATE_API_KEY=r8_xxx
```

---

## 🐳 Docker Services

```yaml
services:
  app:          # Main application (React + Express)
  worker:       # Background job processor (BullMQ)
  postgres:     # PostgreSQL database
  redis:        # Redis cache & queue
  # Optional:
  # ollama:     # Local AI models (requires GPU/8GB+ RAM)
  # minio:      # S3-compatible storage
  # nginx:      # Reverse proxy with SSL
  # certbot:    # SSL certificate management
```

---

## 📊 Database Schema

The application uses PostgreSQL with the following main models:

- **User** - Authentication & multi-tenancy
- **Business** - Company settings & configurations
- **Contact** - CRM contacts with tags & pipelines
- **Message** - WhatsApp messages with status tracking
- **Campaign** - Marketing campaigns (broadcast, drip)
- **ChatbotFlow** - Automation flows
- **SocialPost** - Multi-platform social media posts
- **PosterTemplate** - AI-generated poster templates
- **Review** - Customer reviews & ratings
- **Integration** - Third-party integrations
- **Subscription** - Billing & plans

**Full schema**: See `prisma/schema.prisma`

---

## 🔐 Security

- ✅ JWT authentication with refresh tokens
- ✅ AES-256 encryption for sensitive data (tokens, API keys)
- ✅ Rate limiting per subscription plan
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation with Zod
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection
- ✅ Multi-tenant data isolation
- ✅ Audit logging for all actions

---

## 📖 Project Structure

```
saas-automation/
├── src/
│   ├── server/              # Backend
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   ├── workers/         # Background job workers
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── utils/           # Helper functions
│   │   ├── index.ts         # Express server entry
│   │   └── worker.ts        # Worker process entry
│   ├── components/          # React components
│   ├── lib/                 # API client
│   └── utils/               # Frontend utilities
├── prisma/
│   └── schema.prisma        # Database schema
├── scripts/
│   ├── install.sh           # VPS installation
│   └── backup.sh            # Database backup
├── docker-compose.prod.yml  # Production Docker setup
├── Dockerfile               # Docker image
├── .env.example             # Environment template
└── README.md                # This file
```

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev              # Start frontend
npm run server           # Start backend
npm run dev:full         # Frontend + Backend
npm run dev:all          # Frontend + Backend + Worker

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
docker-compose restart   # Restart services

# Production
npm run build            # Build frontend
npm run server:prod      # Run production server
npm run worker:prod      # Run production worker

# Backup
./scripts/backup.sh      # Backup database
```

---

## 📝 Deployment Checklist

- [ ] Set up VPS (Ubuntu 22.04+, 2GB+ RAM)
- [ ] Configure domain name & DNS
- [ ] Run installation script
- [ ] Edit `.env` with production values
- [ ] Generate strong JWT secrets
- [ ] Add OpenRouter API key (or configure Ollama)
- [ ] Configure WhatsApp Business API credentials
- [ ] Set up SMTP for email integration
- [ ] Add Razorpay keys for payments
- [ ] Configure Google API for Sheets integration
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure firewall (ports 80, 443, 5432, 6379)
- [ ] Set up automated backups (cron job)
- [ ] Monitor logs & health checks

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See `LICENSE` file for details

---

## 🆘 Support

- **Documentation**: See `IMPLEMENTATION_GUIDE.md`
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@yourdomain.com
- **WhatsApp**: +91-XXXXXXXXXX

---

## 🙏 Acknowledgments

Built with:
- [React](https://reactjs.org/)
- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [BullMQ](https://docs.bullmq.io/)
- [OpenRouter](https://openrouter.ai/)
- [Ollama](https://ollama.ai/)

---

## 📈 Roadmap

### Phase 1 (✅ Completed)
- [x] Core CRM & WhatsApp integration
- [x] AI generation with multi-provider fallback
- [x] Campaign management
- [x] Chatbot flow builder
- [x] Background job system

### Phase 2 (🔄 In Progress)
- [x] Email integration
- [x] Google Sheets sync
- [x] Lead capture (IndiaMART, JD, FB, Insta)
- [x] Proxy support
- [ ] AI video generator
- [ ] Advanced analytics dashboard

### Phase 3 (📋 Planned)
- [ ] Mobile app (React Native)
- [ ] Advanced reporting
- [ ] White-label customization
- [ ] Multi-language support
- [ ] API documentation portal

---

**Made with ❤️ for small businesses & agencies in India**
