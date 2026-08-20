# 🚀 BizzAuto - Quick Start Guide

## Welcome! 👋

BizzAuto is a comprehensive SaaS business automation platform built for small businesses and agencies in India. It includes CRM, WhatsApp Business API, marketing automation, AI-powered content generation, and much more.

---

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Environment
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` and update these required values:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A strong random string (min 32 chars)
- `JWT_REFRESH_SECRET` - Another strong random string

### Step 3: Setup Database
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Step 4: Start the App
```bash
# Start everything (Frontend + Backend + Workers)
npm run dev:all
```

**That's it!** 🎉

Your app is now running at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

---

## 🎯 First Steps

### 1. Try Demo Mode
Visit http://localhost:5173 and click "Quick Demo Login" to explore the dashboard without setting up the backend.

### 2. Create Your First Account
1. Visit http://localhost:5173/register
2. Fill in your details
3. Complete the onboarding wizard

### 3. Explore Features
- **Dashboard** - View business metrics and analytics
- **WhatsApp** - Send messages and manage conversations
- **CRM** - Manage contacts and pipelines
- **Social Media** - Schedule and publish posts
- **AI Creative** - Generate content and posters with AI
- **Automation** - Set up workflows and auto-replies

---

## 📚 Key Features

### ✅ Completed & Working
- User authentication & authorization
- Role-based access (5 roles)
- CRM with pipeline management
- WhatsApp Business API integration
- Marketing campaigns (broadcast, drip)
- Social media scheduling
- AI-powered content generation
- Analytics & reporting
- Team management
- API key management
- Audit logging
- Dark mode support
- Razorpay payment integration

### 📊 What's Included
- **30+ Database Models** - Complete business management schema
- **80+ API Endpoints** - Full REST API
- **38 Frontend Pages** - Complete UI
- **6 Background Workers** - Async job processing
- **6 Business Services** - AI, WhatsApp, Email, etc.

---

## 🛠 Development Commands

```bash
# Start everything
npm run dev:all

# Start components separately
npm run dev          # Frontend only
npm run server       # Backend only
npm run worker       # Worker only

# Database commands
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open database UI

# Production
npm run build              # Build for production
npm run server:prod        # Start production server
npm run worker:prod        # Start production worker
```

---

## 📖 Documentation

- `README.md` - Project overview and features
- `PRODUCTION_SETUP.md` - Production deployment guide
- `IMPLEMENTATION_SUMMARY.md` - What's been implemented
- `BACKEND_SETUP.md` - Backend configuration
- `.env.example` - Environment variables reference

---

## 🐛 Troubleshooting

### "Database connection failed"
- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `npm run prisma:migrate`

### "Port already in use"
- Frontend: Change port in Vite config
- Backend: Change `PORT` in `.env`

### "Module not found"
- Run `npm install`
- Delete `node_modules` and run `npm install` again

### "Prisma errors"
```bash
npx prisma generate
npx prisma migrate reset
npx prisma migrate dev
```

---

## 🤝 Need Help?

1. Check the documentation
2. Review error logs in console
3. Check `error.log` and `combined.log` files
4. Verify all environment variables

---

## 🎉 You're All Set!

Start exploring the platform and automate your business workflows!

**Happy Building! 🚀**
