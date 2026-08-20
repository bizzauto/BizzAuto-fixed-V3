# 🚀 Complete Deployment Guide - SaaS Automation Platform

> **Bhai, ye raha tera complete deployment guide!** 4 platforms pe deploy karne ka step-by-step procedure hai. Jo bhi platform suits kare, wahi follow kar.

---

## 📋 Project Architecture (Samajh Le Pehle)

```
┌─────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)         │
│  → Builds to dist/client/ (static files)     │
│  → Served by Express in production           │
├─────────────────────────────────────────────┤
│  Backend (Express + TypeScript)              │
│  → Compiles to dist/server/                  │
│  → Runs on PORT 4000                         │
│  → Serves API at /api/*                      │
│  → Serves frontend for all non-API routes    │
├─────────────────────────────────────────────┤
│  Worker (BullMQ background jobs)             │
│  → Same codebase, runs worker:prod           │
├─────────────────────────────────────────────┤
│  PostgreSQL (Prisma ORM)                    │
│  Redis (Caching + Queues)                    │
│  MinIO (S3-compatible file storage)          │
│  n8n (Automation workflows)                  │
└─────────────────────────────────────────────┘
```

**Key Points:**
- Single Dockerfile builds both frontend + backend
- In production, Express serves the frontend too (SPA)
- Health check endpoint: `GET /health`
- Port: **4000**

---

## 🔧 Pre-Deployment Checklist (Zaroor Kar!)

### 1. Generate Strong Secrets
```bash
# JWT Secret (min 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run this 3 times and save the outputs for:
# - JWT_SECRET
# - JWT_REFRESH_SECRET  
# - ENCRYPTION_KEY
```

### 2. Get API Keys Ready
- **OpenRouter API Key** → https://openrouter.ai/keys
- **Grok API Key** → https://console.x.ai/
- **Razorpay Keys** → https://dashboard.razorpay.com/
- **Meta WhatsApp** → https://developers.facebook.com/ (optional)

### 3. Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 🅰️ OPTION 1: Deploy on Sevalla.com (RECOMMENDED - Easiest!)

> **Sevalla = Best for Indian developers.** Managed PostgreSQL, Redis, auto SSL, Mumbai region available.

### Step 1: Create Account & Project
1. Go to https://sevalla.com
2. Sign up (GitHub/Email)
3. Click **"+ New Project"**
4. Name: `saas-automation`
5. Region: **Mumbai, India** (or closest to your users)

### Step 2: Create Managed PostgreSQL
1. Dashboard → **Databases** → **"+ Create Database"**
2. Select **PostgreSQL 16**
3. Name: `saas-postgres`
4. Region: Same as project
5. Click **Create**
6. **Copy the Connection String** → This is your `DATABASE_URL`

### Step 3: Create Managed Redis
1. Dashboard → **Databases** → **"+ Create Database"**
2. Select **Redis 7**
3. Name: `saas-redis`
4. Click **Create**
5. **Copy the Connection URL** → This is your `REDIS_URL`

### Step 4: Deploy Main App
1. Dashboard → **Services** → **"+ Create Service"**
2. Select **"Git Deployment"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `saas-app`
   - **Branch**: `main`
   - **Build Command**: `npx prisma generate && npx vite build && npx tsc -p tsconfig.server.json`
   - **Start Command**: `npx prisma db push --accept-data-loss && npx prisma generate && node dist/server/index.js`
   - **Port**: `4000`
   - **CPU**: 0.5 vCPU
   - **Memory**: 512MB

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=<from-step-2>
   REDIS_URL=<from-step-3>
   JWT_SECRET=<your-generated-secret>
   JWT_REFRESH_SECRET=<your-generated-refresh-secret>
   ENCRYPTION_KEY=<your-generated-encryption-key>
   CORS_ORIGIN=https://your-app.sevalla.app
   BASE_URL=https://your-app.sevalla.app
   OPENROUTER_API_KEY=<your-key>
   LOG_LEVEL=info
   ```

6. Click **Deploy** 🚀

### Step 5: Deploy Worker (Background Jobs)
1. **"+ Create Service"** → **"Git Deployment"**
2. Same repo, same branch
3. Configure:
   - **Name**: `saas-worker`
   - **Build Command**: Same as above
   - **Start Command**: `npx prisma db push --accept-data-loss && npx prisma generate && node dist/server/worker.js`
   - **CPU**: 0.25 vCPU
   - **Memory**: 256MB

4. Same environment variables as main app
5. Click **Deploy**

### Step 6: Add Custom Domain (Optional)
1. Service → **Settings** → **Domains**
2. Add your domain: `app.yourdomain.com`
3. Add CNAME record in your DNS:
   ```
   app.yourdomain.com  →  CNAME  →  your-app.sevalla.app
   ```
4. SSL is automatic ✅

### Step 7: Verify Deployment
```bash
# Check health
curl https://your-app.sevalla.app/health

# Should return:
# {"status":"ok","timestamp":"...","environment":"production","version":"1.0.0"}
```

---

## 🅱️ OPTION 2: Deploy on VPS with Docker (Full Control!)

> **Best for: Full control, custom domain, unlimited scaling.** Works on any VPS (DigitalOcean, AWS EC2, Hetzner, CloudPE, etc.)

### Step 1: Get a VPS
- **DigitalOcean** → $6/month droplet (2GB RAM minimum)
- **Hetzner** → €4.5/month (best value in Europe)
- **AWS EC2** → t3.small (free tier eligible)
- **CloudPE** → Indian VPS provider

**Minimum Requirements:** 2GB RAM, 1 vCPU, 20GB SSD

### Step 2: Connect to VPS
```bash
ssh root@YOUR_VPS_IP
```

### Step 3: Install Docker
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Step 4: Configure Firewall
```bash
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw allow 4000    # App (optional, if not using nginx)
ufw enable
```

### Step 5: Clone Your Repo
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git saas-app
cd saas-app
```

### Step 6: Create Production .env File
```bash
cat > .env << 'EOF'
# Server
PORT=4000
NODE_ENV=production

# Database (change password!)
DATABASE_URL=postgresql://postgres:STRONG_DB_PASSWORD@postgres:5432/whatsapp_saas

# Redis (change password!)
REDIS_URL=redis://:STRONG_REDIS_PASSWORD@redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

# JWT (generate strong secrets!)
JWT_SECRET=<your-generated-jwt-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<your-generated-refresh-secret>
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY=<your-generated-encryption-key>

# CORS (your domain!)
CORS_ORIGIN=https://yourdomain.com
BASE_URL=https://yourdomain.com

# AI
OPENROUTER_API_KEY=<your-key>

# Logging
LOG_LEVEL=info
EOF
```

### Step 7: Update docker-compose.prod.yml
```bash
# The file is already in your project, just make sure
# CORS_ORIGIN and BASE_URL match your actual domain
```

### Step 8: Deploy with Docker Compose
```bash
# Build and start everything
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f app
```

### Step 9: Setup Nginx + SSL (For Custom Domain)
```bash
# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/saas-app << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/saas-app /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Get SSL certificate (FREE!)
certbot --nginx -d yourdomain.com

# Auto-renew SSL
certbot renew --dry-run
```

### Step 10: Verify
```bash
curl https://yourdomain.com/health
```

---

## 🅲️ OPTION 3: Deploy on Railway.app (Quick & Easy!)

> **Railway = Fastest deployment.** Just push to GitHub and it works. Free tier available.

### Step 1: Create Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your repo

### Step 3: Add PostgreSQL
1. In project → **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-generates `DATABASE_URL`

### Step 4: Add Redis
1. **"+ New"** → **"Database"** → **"Redis"**
2. Railway auto-generates `REDIS_URL`

### Step 5: Configure App Service
1. Click on your app service → **"Settings"**
2. Set:
   - **Root Directory**: `/` (default)
   - **Build Command**: `npx prisma generate && npx vite build && npx tsc -p tsconfig.server.json`
   - **Start Command**: `npx prisma db push --accept-data-loss && npx prisma generate && node dist/server/index.js`
   - **Port**: `4000`

3. Go to **"Variables"** tab → Add:
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=<your-secret>
   JWT_REFRESH_SECRET=<your-refresh-secret>
   ENCRYPTION_KEY=<your-encryption-key>
   CORS_ORIGIN=https://your-app.up.railway.app
   BASE_URL=https://your-app.up.railway.app
   OPENROUTER_API_KEY=<your-key>
   ```

4. Railway will auto-deploy! 🚀

### Step 6: Add Worker Service
1. **"+ New"** → **"Deploy from GitHub repo"** → Same repo
2. Settings:
   - **Start Command**: `npx prisma db push --accept-data-loss && npx prisma generate && node dist/server/worker.js`
3. Same environment variables

### Step 7: Custom Domain (Optional)
1. Service → **"Settings"** → **"Domains"**
2. Add custom domain
3. Add CNAME in your DNS

---

## 🅳️ OPTION 4: Deploy on Render.com (Free Tier Available!)

> **Render = Good free tier.** Auto-deploys from GitHub.

### Step 1: Create Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Create PostgreSQL Database
1. Dashboard → **"New"** → **"PostgreSQL"**
2. Name: `saas-postgres`
3. Plan: **Free** (or Starter for production)
4. Region: Oregon or Frankfurt
5. Click **Create Database**
6. Copy **Internal Database URL** → `DATABASE_URL`

### Step 3: Create Redis (Paid only on Render)
> ⚠️ Render doesn't have free Redis. Use **Upstash** (free tier) instead.
1. Go to https://upstash.com → Create Redis
2. Copy the URL → `REDIS_URL`

### Step 4: Create Web Service (Main App)
1. Dashboard → **"New"** → **"Web Service"**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `saas-app`
   - **Runtime**: Node
   - **Build Command**: `npm ci && npx prisma generate && npx vite build && npx tsc -p tsconfig.server.json`
   - **Start Command**: `npx prisma db push --accept-data-loss && npx prisma generate && node dist/server/index.js`
   - **Plan**: Free (or Starter for production)

4. Add Environment Variables (same as above)
5. Click **Create Web Service**

### Step 5: Create Background Worker
1. Dashboard → **"New"** → **"Background Worker"**
2. Same repo, same build command
3. **Start Command**: `npx prisma db push --accept-data-loss && npx prisma generate && node dist/server/worker.js`
4. Same environment variables

---

## 🔍 Post-Deployment Verification (Sab Ke Liye!)

After deploying on ANY platform, run these checks:

### 1. Health Check
```bash
curl https://your-domain.com/health
# Expected: {"status":"ok","timestamp":"...","environment":"production","version":"1.0.0"}
```

### 2. API Check
```bash
curl https://your-domain.com/api/auth/login
# Expected: 404 or method not allowed (means API is working)
```

### 3. Frontend Check
- Open `https://your-domain.com` in browser
- You should see the landing page
- Try registering a new account

### 4. Database Check
```bash
# If you have Prisma Studio access
npx prisma studio
# Or check via API
curl https://your-domain.com/api/auth/me
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot find module" Error
**Fix:** Make sure build commands run in order:
```bash
npx prisma generate && npx vite build && npx tsc -p tsconfig.server.json
```

### Issue 2: CORS Error in Browser
**Fix:** Set `CORS_ORIGIN` to your exact frontend URL:
```
CORS_ORIGIN=https://yourdomain.com
```
NOT `http://localhost:5173` in production!

### Issue 3: Database Connection Failed
**Fix:** Check `DATABASE_URL` format:
```
postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```
For Docker: Use service name `postgres` not `localhost`

### Issue 4: "Prisma Client not generated"
**Fix:** Always run before starting:
```bash
npx prisma generate
npx prisma db push --accept-data-loss
```

### Issue 5: Frontend shows blank page
**Fix:** Make sure `dist/client/` folder exists and Express serves it:
```javascript
// In server/index.ts, this should exist:
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client')));
  app.get('*', (req, res) => { ... });
}
```

### Issue 6: 502 Bad Gateway
**Fix:** App hasn't started yet. Check logs:
```bash
# Docker
docker compose -f docker-compose.prod.yml logs -f app

# Railway/Render
# Check deployment logs in dashboard
```

---

## 💰 Cost Comparison

| Platform | Free Tier | Production Cost | Managed DB | Managed Redis |
|----------|-----------|----------------|------------|---------------|
| **Sevalla** | ❌ | ~$10-20/mo | ✅ | ✅ |
| **VPS (Docker)** | ❌ | ~$5-10/mo | ❌ (self-hosted) | ❌ (self-hosted) |
| **Railway** | $5 credit/mo | ~$10-20/mo | ✅ | ✅ |
| **Render** | ✅ (limited) | ~$7-15/mo | ✅ | ❌ (use Upstash) |

---

## 🏆 My Recommendation

| Situation | Best Platform |
|-----------|--------------|
| **Indian users, easy setup** | Sevalla (Mumbai region) |
| **Full control, cheapest** | VPS + Docker |
| **Fastest to deploy** | Railway |
| **Free testing** | Render |

---

## 📞 Quick Deploy Commands Cheat Sheet

```bash
# === VPS Docker Deploy ===
cd /opt/saas-app
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app

# === Local Docker Test ===
docker compose up -d --build
curl http://localhost:4000/health

# === Rebuild after code changes ===
docker compose -f docker-compose.prod.yml up -d --build app

# === Database backup ===
docker exec postgres pg_dump -U postgres whatsapp_saas > backup.sql

# === View running containers ===
docker compose -f docker-compose.prod.yml ps
```

---

**Made with ❤️ for easy deployment!**
