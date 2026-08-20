# 🚀 BizzAuto CRM - Complete Deployment Guide

## Overview

This is a production-ready CRM system with:
- ✅ Docker & Docker Compose deployment
- ✅ Coolify support
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ WebSocket real-time
- ✅ PWA offline support
- ✅ Rate limiting per plan
- ✅ CI/CD with GitHub Actions
- ✅ Monitoring (Prometheus + Grafana)

---

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

---

## 🚀 Quick Start (Local Development)

```bash
# Clone and install
npm install
npx prisma generate

# Start development
npm run dev
```

Access: http://localhost:5173

---

## 🐳 Docker Deployment

### Option 1: Simple (No Redis/SSL)

```bash
# Build and run
docker build -t bizzauto .
docker run -p 4000:4000 -e DATABASE_URL="postgresql://..." bizzauto
```

### Option 2: With Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f
```

### Option 3: Full Stack (With Nginx, Monitoring)

```bash
docker-compose -f docker-compose.full.yml up -d
```

---

## ☁️ Coolify Deployment

### Steps:

1. **Push code to GitHub**
```bash
git add .
git commit -m "Production ready"
git push origin main
```

2. **Create Coolify Project**
   - Go to Coolify dashboard
   - Create new project
   - Add GitHub repository

3. **Configure Environment Variables**
   Copy `.env.example` to `.env` and fill:
```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-32-char-min-secret-key
JWT_REFRESH_SECRET=your-32-char-min-secret-key

# Optional (for features)
OPENROUTER_API_KEY=sk-or-...
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@email.com
SMTP_PASS=app-password
```

4. **Deploy**
   - Coolify auto-detects from `nixpacks.toml`
   - Click "Deploy"

---

## 🔧 Database Setup

### Initialize Database
```bash
# Push schema (development)
npx prisma db push

# Or migrate (production)
npx prisma migrate deploy
```

### Seed Demo Data
```bash
npm run prisma:seed
```

Demo login: `demo@bizzauto.com` / `demo123`

---

## 📱 PWA Installation

1. Visit https://your-domain.com
2. Chrome: Menu → Install BizzAuto
3. Safari: Share → Add to Home Screen

Features:
- 📴 Works offline
- 🔔 Push notifications
- ⚡ Fast loading

---

## 📊 Monitoring

### Prometheus + Grafana

After `docker-compose.full.yml`:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin123)

### Custom Metrics Endpoint
```
GET /api/v1/metrics
```

---

## 🔒 Security Features

### Rate Limiting (Per Plan)
| Plan | API Requests/min | WhatsApp Messages/min |
|------|------------------|----------------------|
| FREE | 10 | 80 |
| STARTER | 50 | 200 |
| GROWTH | 200 | 500 |
| PRO | 500 | 1000 |
| ENTERPRISE | 2000 | 3000 |

### JWT Token Rotation
- Access token: 15 minutes
- Refresh token: 7 days
- Auto-rotation on expiry

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run CI
npm run lint
npm run build
```

---

## 📁 Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── lib/           # Utilities, stores
│   ├── hooks/         # Custom hooks
│   ├── locales/       # i18n translations
│   └── server/        # Express backend
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic
│       └── middleware/# Auth, rate limit
├── prisma/
│   └── schema.prisma  # Database schema
├── public/
│   ├── manifest.json  # PWA manifest
│   └── sw.js          # Service worker
├── docker-compose*.yml
├── Dockerfile
├── nixpacks.toml      # Coolify config
└── .env.example
```

---

## 🔧 Available Scripts

```bash
# Development
npm run dev           # Frontend only
npm run server        # Backend only
npm run dev:full      # Both

# Build
npm run build         # Full build
npm run build:client # Frontend
npm run build:server # Backend

# Database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio

# Deploy
npm run deploy:coolify
npm run deploy:build
```

---

## 📞 Support

- Email: support@bizzautoai.com
- WhatsApp: +91 8983027975
- Website: https://www.bizzautoai.com

---

## 📝 License

MIT License - See LICENSE file