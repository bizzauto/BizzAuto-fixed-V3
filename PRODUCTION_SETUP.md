# BizzAuto - Production Setup Guide

This guide will help you set up BizzAuto for production deployment.

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional, for containerized deployment)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your actual values
# IMPORTANT: Change all default values, especially:
# - DATABASE_URL
# - JWT_SECRET (use a strong random string, min 32 chars)
# - JWT_REFRESH_SECRET
# - ENCRYPTION_KEY (32 bytes hex string)
# - RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view/edit data
npm run prisma:studio
```

### 4. Start Development Servers

```bash
# Start everything (backend, frontend, worker)
npm run dev:all

# Or start components separately:
# Frontend only
npm run dev

# Backend only
npm run server

# Worker only
npm run worker
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **API Health:** http://localhost:4000/health

## 📁 Project Structure

```
bizzauto/
├── src/
│   ├── components/        # React components
│   ├── layouts/           # Layout components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and API clients
│   └── server/            # Express backend
│       ├── routes/        # API routes
│       ├── middleware/    # Auth and validation
│       ├── services/      # Business logic
│       └── workers/       # Background job workers
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
└── dist/                  # Production build output
```

## 🔐 Security Checklist

- [ ] Change all default secrets in `.env`
- [ ] Use strong passwords for all API keys
- [ ] Enable HTTPS in production
- [ ] Set proper CORS_ORIGIN in production
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular database backups
- [ ] Monitor error logs

## 🌐 Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set NODE_ENV=production in .env**

3. **Start the servers:**
   ```bash
   # Main server
   npm run server:prod

   # Worker process
   npm run worker:prod
   ```

4. **Setup Nginx as reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5173;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header Host $http_host;
       }
   }
   ```

5. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## 📊 Available Features

### ✅ Completed Features

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (SUPER_ADMIN, OWNER, ADMIN, MEMBER, VIEWER)
   - Password reset with OTP
   - Session management

2. **CRM & Contact Management**
   - Contact CRUD operations
   - Pipeline management
   - CSV import/export
   - Activity timeline

3. **WhatsApp Business Integration**
   - Send text, template, image messages
   - Conversation management
   - Webhook integration
   - Message status tracking

4. **Marketing Campaigns**
   - Broadcast campaigns
   - Drip campaigns
   - Scheduled campaigns
   - Campaign analytics

5. **Social Media Management**
   - Multi-platform posting (Facebook, Instagram, LinkedIn, Twitter, GBP)
   - Post scheduling
   - Engagement tracking
   - Content calendar

6. **AI-Powered Features**
   - Content generation
   - Caption writing
   - Hashtag generation
   - Review reply suggestions
   - Lead scoring

7. **Analytics & Reporting**
   - Dashboard metrics
   - Campaign analytics
   - Contact analytics
   - Social media analytics
   - CSV exports

8. **Team Management**
   - User invitations
   - Role management
   - Audit logs
   - API key management

9. **Billing & Subscriptions**
   - Razorpay integration
   - Multiple pricing tiers
   - Subscription management
   - Plan upgrades/cancellations

10. **Additional Features**
    - E-commerce integration (Shopify, WooCommerce)
    - Document generation (quotes, invoices)
    - Appointment booking
    - Review management
    - Automation workflows
    - Dark mode support
    - Multi-language support (backend ready)

## 🔧 API Documentation

All API endpoints are available at `http://localhost:4000` with the base path `/api`.

### Key Endpoints

| Resource | Base Path | Description |
|----------|-----------|-------------|
| Auth | `/api/auth` | Registration, login, profile |
| Contacts | `/api/contacts` | CRM contacts |
| WhatsApp | `/api/whatsapp` | Messaging |
| Campaigns | `/api/campaigns` | Marketing campaigns |
| Posts | `/api/posts` | Social media posts |
| AI | `/api/ai` | AI content generation |
| Analytics | `/api/analytics` | Dashboard metrics |
| Subscriptions | `/api/subscriptions` | Billing |

See individual route files in `src/server/routes/` for detailed endpoint documentation.

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Logging

Logs are stored in:
- `error.log` - Error level logs
- `combined.log` - All level logs

View logs in development with:
```bash
npm run server
```

## 🔄 Background Workers

The worker process handles:
- WhatsApp message sending
- Email delivery
- Social media publishing
- Google Sheets sync
- Lead processing
- Campaign scheduling

Start worker:
```bash
npm run worker
```

## 💾 Database Backup

```bash
# Using the backup script
./backup.sh

# Manual backup
pg_dump -U postgres whatsapp_saas > backup_$(date +%Y%m%d).sql
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use
```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### Prisma Errors
```bash
# Reset and regenerate
npx prisma generate
npx prisma migrate reset
npx prisma migrate dev
```

## 📞 Support

For issues and questions:
- Check existing documentation
- Review error logs in `error.log` and `combined.log`
- Search GitHub Issues
- Create a new issue with detailed information

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated:** April 13, 2026
**Version:** 1.0.0
