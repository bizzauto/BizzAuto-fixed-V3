# 🚀 Step-by-Step Deployment Guide to Sevalla.com

Complete guide to deploy your SaaS Business Automation Tool to **Sevalla.com** cloud platform.

---

## 📋 Overview

**Sevalla.com** is a modern PaaS (Platform as a Service) that offers:
- ✅ Kubernetes-based application hosting with automated scaling
- ✅ Managed PostgreSQL databases (unlimited, no row/query limits)
- ✅ Managed Redis (for caching & queues)
- ✅ Object Storage (S3-compatible, unlimited)
- ✅ Global deployment across 25+ data centers
- ✅ Automated SSL via Cloudflare
- ✅ Git-based & Docker deployments
- ✅ SOC II Type 2, ISO 27001 certified

**What you'll deploy:**
1. **Main App** (React + Express backend)
2. **Worker** (BullMQ background jobs)
3. **PostgreSQL Database** (Managed)
4. **Redis** (Managed)

---

## 🎯 Prerequisites

Before you start, make sure you have:
- ✅ Sevalla.com account (sign up at https://sevalla.com)
- ✅ Your project pushed to GitHub/GitLab (public or private repo)
- ✅ Domain name (optional, Sevalla provides free subdomains)
- ✅ Environment variables ready (from `.env.example`)

---

## STEP 1: Sign Up & Create Project

### 1.1 Create Sevalla Account
1. Go to: https://sevalla.com
2. Click **"Sign Up"** (use GitHub, GitLab, or email)
3. Complete email verification

### 1.2 Create New Project
1. Login to your Sevalla dashboard
2. Click **"+ New Project"**
3. Name your project: `saas-automation`
4. Select your region (closest to your users):
   - **Mumbai, India** (recommended for Indian users)
   - Singapore, Tokyo, Frankfurt, New York, etc.

---

## STEP 2: Provision Managed PostgreSQL Database

### 2.1 Create Database
1. In your Sevalla dashboard, go to **"Databases"** → **"+ Create Database"**
2. Select **PostgreSQL**
3. Choose configuration:
   - **Name**: `saas-postgres`
   - **Version**: `16` (or latest available)
   - **Region**: Same as your project region
   - **Plan**: Start with smallest (you can upgrade later)

4. Click **"Create Database"**

### 2.2 Get Database Connection String
1. After creation, go to your database dashboard
2. Copy the **Connection String** (looks like):
   ```
   postgresql://username:password@db.sevalla.io:5432/dbname
   ```
3. **Save this securely** - you'll need it for `DATABASE_URL`

---

## STEP 3: Provision Managed Redis

### 3.1 Create Redis Instance
1. In Sevalla dashboard, go to **"Databases"** → **"+ Create Database"**
2. Select **Redis**
3. Choose configuration:
   - **Name**: `saas-redis`
   - **Version**: `7` (or latest available)
   - **Region**: Same as your project
   - **Plan**: Start with smallest

4. Click **"Create Database"**

### 3.2 Get Redis Connection String
1. After creation, copy the **Connection String**:
   ```
   redis://:password@redis.sevalla.io:6379
   ```
2. **Save this securely** - you'll need it for `REDIS_URL`

---

## STEP 4: Deploy Main Application (App + Worker)

### 4.1 Connect Your Git Repository

1. In Sevalla dashboard, click **"+ New Service"** → **"Application"**
2. Choose deployment method:
   - **Git Repository** (recommended for auto-deploy)
   - **Docker Image** (if using container registry)

3. If using **Git**:
   - Select **GitHub** or **GitLab**
   - Authorize Sevalla to access your repos
   - Select your repository: `your-username/saas-automation`
   - Branch: `main` (or your production branch)

### 4.2 Configure Main App Service

**Service Settings:**
- **Name**: `saas-app`
- **Root Directory**: `/` (root of your repo)
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  npm run server:prod
  ```

**Docker Alternative (if using Dockerfile):**
- Select **"Docker"** as deployment type
- Sevalla will auto-detect your `Dockerfile`
- Build context: `/` (root)

### 4.3 Set Environment Variables

In the **"Environment Variables"** section, add these:

```env
# Server
NODE_ENV=production
PORT=4000
BASE_URL=https://your-app.sevalla.app

# Database (from Step 2)
DATABASE_URL=postgresql://username:password@db.sevalla.io:5432/dbname

# Redis (from Step 3)
REDIS_URL=redis://:password@redis.sevalla.io:6379
REDIS_HOST=redis.sevalla.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-generate-random
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-generate-random
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://your-app.sevalla.app

# Encryption
ENCRYPTION_KEY=your-32-character-hex-encryption-key

# AI Providers (at least one required)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key

# WhatsApp Business API
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payments
RAZORPAY_KEY_ID=rzp_test_your-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Google APIs (for Sheets integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=https://your-app.sevalla.app/api/integrations/google-sheets/callback

# Logging
LOG_LEVEL=info
```

**Generate Secure Secrets:**
```bash
# Run these on your local machine:

# JWT_SECRET
openssl rand -base64 48

# JWT_REFRESH_SECRET
openssl rand -base64 48

# ENCRYPTION_KEY
openssl rand -hex 32
```

### 4.4 Configure Health Check

1. Go to **"Health Check"** settings
2. Set:
   - **Path**: `/health`
   - **Port**: `4000`
   - **Interval**: `30s`
   - **Timeout**: `5s`
   - **Unhealthy threshold**: `3`

### 4.5 Set Resource Limits

- **CPU**: Start with `0.5 - 1 vCPU`
- **Memory**: Start with `512MB - 1GB`
- **Replicas**: `1` (auto-scale to `2-3` if needed)

### 4.6 Configure Domain

1. Go to **"Domains"** section
2. Sevalla auto-generates: `saas-app-xxxx.sevalla.app`
3. **Custom Domain** (optional):
   - Click **"+ Add Domain"**
   - Enter: `yourdomain.com`
   - Follow DNS instructions (CNAME/A record)
   - SSL is automatic via Cloudflare

### 4.7 Deploy Main App

1. Review all settings
2. Click **"Deploy"**
3. Wait for deployment (5-10 minutes)
4. Check deployment logs for errors

---

## STEP 5: Deploy Worker Service

### 5.1 Create Worker Service

1. Click **"+ New Service"** → **"Worker"** (or **"Background Worker"**)
2. Name: `saas-worker`

### 5.2 Configure Worker

**If using Git:**
- Same repository as main app
- **Root Directory**: `/`
- **Build Command**: 
  ```bash
  npm install
  ```
- **Start Command**: 
  ```bash
  npm run worker:prod
  ```

**If using Docker:**
- Use the same Dockerfile
- Override command to run worker instead

### 5.3 Set Environment Variables

**Same as main app** (copy all env vars from Step 4.3):

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@db.sevalla.io:5432/dbname
REDIS_URL=redis://:password@redis.sevalla.io:6379
# ... (all other vars same as main app)
```

### 5.4 Set Resource Limits

- **CPU**: `0.25 - 0.5 vCPU`
- **Memory**: `256MB - 512MB`
- **Replicas**: `1`

### 5.5 Deploy Worker

1. Click **"Deploy"**
2. Monitor logs to ensure worker connects to Redis

---

## STEP 6: Initialize Database

After your app is deployed, you need to set up the database schema.

### 6.1 Run Prisma Migrations

**Option A: Via SSH/Console (if Sevalla provides it)**
```bash
# Access your app's console/SSH
# In Sevalla dashboard, find "Console" or "Shell"

npx prisma migrate deploy
npx prisma generate
```

**Option B: Local Migration Script**

Create a script to run migrations remotely:

```bash
# On your local machine:

# Install Prisma CLI globally
npm install -g prisma

# Set DATABASE_URL to your Sevalla database
export DATABASE_URL="postgresql://username:password@db.sevalla.io:5432/dbname"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

**Option C: Add to Build Process**

Update your `package.json` to auto-migrate on start:

```json
{
  "scripts": {
    "server:prod": "npx prisma migrate deploy && npx prisma generate && node dist/server/index.js"
  }
}
```

Then redeploy.

---

## STEP 7: Create Super Admin

```bash
# Via curl to your deployed backend:

curl -X POST https://your-app.sevalla.app/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SuperAdmin@Secure123!",
    "name": "Super Admin"
  }'
```

**Save the password securely!**

---

## STEP 8: Verify Deployment

### 8.1 Health Check
```bash
curl https://your-app.sevalla.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-04-13T..."
}
```

### 8.2 Test Frontend
- Open browser: `https://your-app.sevalla.app`
- Should load your React app
- Login with super admin credentials

### 8.3 Test Backend API
```bash
# Test registration
curl -X POST https://your-app.sevalla.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "businessName": "Test Business"
  }'
```

### 8.4 Check Logs
- In Sevalla dashboard → `saas-app` → **Logs**
- In Sevalla dashboard → `saas-worker` → **Logs**
- Look for any errors or warnings

---

## STEP 9: Configure Object Storage (Optional)

Sevalla provides S3-compatible object storage (unlimited).

### 9.1 Create Storage Bucket
1. Go to **"Storage"** → **"+ Create Bucket"**
2. Name: `saas-uploads`
3. Region: Same as your app
4. Click **"Create"**

### 9.2 Get Storage Credentials
1. Copy these values:
   - **Endpoint**: `https://storage.sevalla.io`
   - **Access Key ID**: `your-access-key`
   - **Secret Access Key**: `your-secret-key`
   - **Bucket Name**: `saas-uploads`

### 9.3 Update Environment Variables
Add to both `saas-app` and `saas-worker`:

```env
# Object Storage
STORAGE_ENDPOINT=https://storage.sevalla.io
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
STORAGE_BUCKET=saas-uploads
```

---

## STEP 10: Setup Custom Domain (Optional)

### 10.1 Add Domain in Sevalla
1. Go to your `saas-app` service
2. Click **"Domains"** → **"+ Add Domain"**
3. Enter: `yourdomain.com` or `app.yourdomain.com`
4. Copy the DNS target (CNAME value)

### 10.2 Configure DNS

**At your domain registrar (GoDaddy, Namecheap, etc.):**

**For root domain (`yourdomain.com`):**
- Type: `A`
- Name: `@`
- Value: Sevalla-provided IP
- TTL: `3600`

**For subdomain (`www.yourdomain.com` or `app.yourdomain.com`):**
- Type: `CNAME`
- Name: `www` or `app`
- Value: `your-app.sevalla.app`
- TTL: `3600`

### 10.3 SSL Certificate
- **Automatic** via Cloudflare (no action needed)
- Wait 5-30 minutes for DNS propagation
- Access via: `https://yourdomain.com`

---

## 📊 Post-Deployment Checklist

- [ ] PostgreSQL database created & connection string saved
- [ ] Redis instance created & connection string saved
- [ ] Main app deployed successfully
- [ ] Worker deployed successfully
- [ ] All environment variables set correctly
- [ ] Database migrations ran successfully
- [ ] Super admin account created
- [ ] Health check passing (`/health` endpoint)
- [ ] Frontend loads in browser
- [ ] Can login to dashboard
- [ ] Worker logs show successful connection to Redis
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic)
- [ ] Object storage configured (optional)
- [ ] WhatsApp API credentials configured
- [ ] AI provider key (OpenRouter) working
- [ ] SMTP configured & test email sent
- [ ] Razorpay keys added (if using payments)

---

## 🔧 Environment Variables Quick Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Sevalla PostgreSQL connection string | `postgresql://user:pass@db.sevalla.io:5432/db` |
| `REDIS_URL` | Sevalla Redis connection string | `redis://:password@redis.sevalla.io:6379` |
| `JWT_SECRET` | Secret for signing JWT tokens | (random 48 chars) |
| `OPENROUTER_API_KEY` | AI generation API key | `sk-or-v1-xxx` |
| `BASE_URL` | Your app's public URL | `https://your-app.sevalla.app` |
| `CORS_ORIGIN` | Allowed CORS origin | Same as BASE_URL |
| `SMTP_*` | Email configuration | Your Gmail/SendGrid creds |
| `RAZORPAY_*` | Payment gateway keys | Your Razorpay keys |

---

## 📈 Monitoring & Scaling

### View Logs
- Dashboard → Your Service → **"Logs"** tab
- Real-time streaming logs
- Filter by date, level, search terms

### Monitor Metrics
- Dashboard → Your Service → **"Metrics"** tab
- CPU, Memory, Network usage
- Request count & latency
- Error rates

### Scale Up/Down
1. Go to service settings
2. Adjust **CPU** and **Memory** limits
3. Adjust **Replicas** (for high availability)
4. Click **"Save"** → Auto-redeploys

### Auto-Scaling (if available)
1. Go to **"Scaling"** settings
2. Enable **Auto-scaling**
3. Set min/max replicas: `1 - 5`
4. Set CPU threshold: `70%`

---

## 🔄 Updating Your Application

### Method 1: Git Auto-Deploy (Recommended)
1. Push changes to your Git repo:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
2. Sevalla auto-detects changes
3. Auto-deploys (wait 5-10 minutes)
4. Check logs for successful deployment

### Method 2: Manual Redeploy
1. In Sevalla dashboard → Your Service
2. Click **"Redeploy"** or **"Deploy Latest"**
3. Wait for completion

### Method 3: Docker Image
1. Build & push Docker image to registry
2. Update service to use new image tag
3. Redeploy

---

## 🐛 Troubleshooting

### App won't start
```bash
# Check logs in Sevalla dashboard
# Common issues:
# 1. DATABASE_URL incorrect
# 2. REDIS_URL incorrect
# 3. Missing environment variables
# 4. Port mismatch (should be 4000)
```

### Database connection error
```bash
# Verify DATABASE_URL format:
postgresql://username:password@hostname:5432/dbname

# Check if database is running in Sevalla dashboard
# Test connection locally:
psql "postgresql://username:password@db.sevalla.io:5432/dbname"
```

### Worker not processing jobs
```bash
# Check REDIS_URL format:
redis://:password@hostname:6379

# Check worker logs in dashboard
# Verify REDIS_PASSWORD is correct
# Check if Redis instance is running
```

### CORS errors
```bash
# Ensure CORS_ORIGIN matches your domain:
CORS_ORIGIN=https://your-app.sevalla.app

# For multiple domains:
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Health check failing
```bash
# Ensure /health endpoint exists in your backend
# Check if PORT env var matches your app port (4000)
# Check backend logs for startup errors
```

---

## 💰 Cost Estimation

**Typical monthly costs on Sevalla:**

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Main App | 0.5 vCPU, 512MB | ~$5-10 |
| Worker | 0.25 vCPU, 256MB | ~$3-5 |
| PostgreSQL | Smallest plan | ~$5-15 |
| Redis | Smallest plan | ~$3-10 |
| Object Storage | Unlimited | ~$0.02/GB |
| Bandwidth | Varies | ~$0.01/GB |
| **Total** | **Basic Setup** | **~$16-40/month** |

**Tips to reduce costs:**
- Start with smallest plans
- Use auto-scaling to handle traffic spikes
- Monitor usage & upgrade only when needed
- Delete unused services

---

## 📞 Quick Commands Reference

```bash
# Test health check
curl https://your-app.sevalla.app/health

# Create super admin
curl -X POST https://your-app.sevalla.app/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@domain.com","password":"SecurePass123!","name":"Admin"}'

# Test API endpoint
curl https://your-app.sevalla.app/api/health

# View logs (via Sevalla dashboard, not CLI)
# Dashboard → Service → Logs tab

# Redeploy (via dashboard or Git push)
git push origin main
```

---

## 🎯 Next Steps After Deployment

1. **Configure WhatsApp Business API**
   - Add Meta App ID & Secret in env vars
   - Set up webhook URLs
   - Test message sending

2. **Setup Email Integration**
   - Configure SMTP settings
   - Test email sending
   - Setup email templates

3. **Configure AI Providers**
   - Add OpenRouter API key
   - Test AI content generation
   - Configure fallback providers

4. **Setup Payment Gateway**
   - Add Razorpay keys
   - Configure webhook endpoints
   - Test payment flow

5. **Import n8n Workflows**
   - Access n8n (if deployed separately)
   - Import automation workflows
   - Test integrations

6. **Monitor & Optimize**
   - Check logs daily
   - Monitor resource usage
   - Scale up if needed
   - Setup alerts (if available)

---

## 📚 Additional Resources

- **Sevalla Documentation**: https://docs.sevalla.com
- **Sevalla Discord/Community**: Join for support
- **Your Project README**: See `README.md` for local setup
- **VPS Deployment Guide**: See `VPS_DEPLOYMENT_GUIDE.md` (alternative to Sevalla)

---

## 🆘 Support

If you encounter issues:
1. Check Sevalla service status page
2. Review deployment logs in dashboard
3. Search Sevalla's documentation
4. Ask in Sevalla's community/Discord
5. Check your environment variables (most common issue)

---

**🚀 Congratulations! Your SaaS platform is now live on Sevalla.com!**
