# Quick Database Setup Guide

Since you don't have PostgreSQL running locally, here are the easiest ways to get a free database:

## Option 1: Neon (Recommended - Free & Fast)

1. Go to https://neon.tech
2. Click "Sign up" (use Google/GitHub for quick signup)
3. Create a new project:
   - Project name: `whatsapp-saas`
   - Region: Choose closest to you
4. Copy the connection string (it looks like: `postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require`)
5. Update your `.env` file:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
```

6. Run the setup script:
```bash
node setup-test-user.mjs
```

## Option 2: Supabase (Free & Popular)

1. Go to https://supabase.com
2. Click "Start your project"
3. Create a new project:
   - Name: `whatsapp-saas`
   - Database Password: (choose a strong password)
4. Wait for the project to be ready (1-2 minutes)
5. Go to Settings → Database
6. Copy the connection string
7. Update your `.env` file with the connection string
8. Run the setup script:
```bash
node setup-test-user.mjs
```

## After Setting Up Database

Once you have the database running:

1. **Create test user:**
```bash
node setup-test-user.mjs
```

2. **Login credentials:**
```
Email:    test@example.com
Password: test123
```

3. **Access the app:**
Open http://localhost:5173/ and login with the credentials above.

## Features Available After Login

- **Dashboard** - Overview of your business
- **Reviews** - Manage and reply to customer reviews
- **Appointments** - Schedule and manage appointments
- **Google Business** - Connect and manage your Google Business Profile
- **Creative Generator** - AI-powered poster and content creation
- **Lead Generation** - Capture and manage leads from various sources
- **WhatsApp Module** - Send and receive WhatsApp messages
- **Social Media** - Schedule posts to Facebook, Instagram, LinkedIn
- **CRM** - Manage contacts and pipelines
- **Reports** - View analytics and insights
- **Settings** - Configure your business settings

All pages have been fixed with proper API integration and no mock data!
