# 🚀 CloudPE VPS Deployment Guide

Complete step-by-step guide to deploy your SaaS automation platform on CloudPE VPS.

---

## 📋 Pre-Requisites

You need:
- ✅ CloudPE VPS (Ubuntu 22.04 or 24.04)
- ✅ VPS IP address (example: `123.45.67.89`)
- ✅ Domain name (optional, example: `yourdomain.com`)
- ✅ SSH client (PuTTY on Windows or terminal on Mac/Linux)

---

## STEP 1: Connect to Your VPS

### On Windows (PuTTY):
1. Download PuTTY: https://www.putty.org/
2. Open PuTTY
3. In "Host Name" enter your VPS IP (e.g., `123.45.67.89`)
4. Port: `22`
5. Connection type: `SSH`
6. Click **Open**
7. Login: `root`
8. Enter password (from CloudPE dashboard)

### On Mac/Linux/Windows Terminal:
```bash
ssh root@YOUR_VPS_IP
# Enter password when prompted
```

---

## STEP 2: Initial Server Setup

```bash
# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y curl git wget nano ufw

# Set timezone to India
timedatectl set-timezone Asia/Kolkata

# Check OS version
cat /etc/os-release
```

---

## STEP 3: Install Docker

```bash
# Install Docker (one command)
curl -fsSL https://get.docker.com | sh

# Enable Docker to start on boot
systemctl enable docker

# Start Docker
systemctl start docker

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## STEP 4: Configure Firewall

```bash
# Allow SSH (IMPORTANT - don't skip!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

Expected output:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## STEP 5: Clone Your Project

```bash
# Go to home directory
cd /root

# Clone your project (replace with your Git URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git saas-app

# Enter project directory
cd saas-app

# If you don't have Git repo, upload files via SCP/SFTP:
# Use WinSCP or FileZilla to upload project to /root/saas-app
```

---

## STEP 6: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit .env file
nano .env
```

**Replace the values in `.env` with your actual configuration:**

```env
# ============ SERVER ============
NODE_ENV=production
PORT=4000
BASE_URL=https://yourdomain.com

# ============ DATABASE ============
DATABASE_URL=postgresql://postgres:SECURE_DB_PASSWORD_123@postgres:5432/whatsapp_saas?schema=public

# ============ JWT SECRETS (Generate random strings) ============
JWT_SECRET=$(openssl rand -base64 48)
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_EXPIRES_IN=30d

# ============ CORS ============
CORS_ORIGIN=https://yourdomain.com

# ============ ENCRYPTION ============
ENCRYPTION_KEY=$(openssl rand -hex 32)

# ============ AI PROVIDERS ============
OPENROUTER_API_KEY=sk-or-v1-YOUR_ACTUAL_KEY_HERE

# ============ WHATSAPP ============
META_APP_ID=YOUR_META_APP_ID
META_APP_SECRET=YOUR_META_APP_SECRET

# ============ EMAIL (SMTP) ============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ============ RAZORPAY ============
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
RAZORPAY_KEY_SECRET=YOUR_SECRET

# ============ REDIS ============
REDIS_URL=redis://:SECURE_REDIS_PASSWORD@redis:6379
REDIS_PASSWORD=SECURE_REDIS_PASSWORD

# ============ N8N ============
N8N_URL=http://n8n:5678
N8N_PASSWORD=YOUR_SECURE_N8N_PASSWORD

# ============ LOGGING ============
LOG_LEVEL=info
```

**Save file:** `Ctrl+O`, `Enter`, `Ctrl+X`

### Generate Secure Secrets:
```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate JWT_REFRESH_SECRET
openssl rand -base64 48

# Generate ENCRYPTION_KEY
openssl rand -hex 32

# Generate N8N_PASSWORD
openssl rand -base64 24

# Generate DB Password
openssl rand -base64 24

# Copy these values into .env file
nano .env
```

---

## STEP 7: Update docker-compose.prod.yml for Security

Edit the production docker-compose to remove public DB/Redis ports:

```bash
nano docker-compose.prod.yml
```

**IMPORTANT:** Remove these lines from postgres and redis services:

```yaml
# Under postgres - REMOVE this:
ports:
  - "5432:5432"    # ← DELETE THIS LINE

# Under redis - REMOVE this:
ports:
  - "6379:6379"    # ← DELETE THIS LINE
```

**Why?** Database and Redis should NOT be accessible from internet. Only your app containers need access.

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## STEP 8: Build and Start

```bash
# Build all containers (takes 5-10 minutes)
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check if all services are running
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                    STATUS          PORTS
saas-app-app-1          Up (healthy)    0.0.0.0:5173->5173, 0.0.0.0:4000->4000
saas-app-worker-1       Up (healthy)    
saas-app-postgres-1     Up (healthy)    
saas-app-redis-1        Up (healthy)    
saas-app-n8n-1          Up              0.0.0.0:5678->5678
```

---

## STEP 9: Initialize Database

```bash
# Run Prisma migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Generate Prisma client
docker compose -f docker-compose.prod.yml exec app npx prisma generate

# Verify database
docker compose -f docker-compose.prod.yml exec app npx prisma db push
```

---

## STEP 10: Create Super Admin

```bash
# Create super admin account
curl -X POST http://localhost:4000/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SuperAdmin@Secure123!",
    "name": "Super Admin"
  }'
```

**Save the password somewhere safe!**

---

## STEP 11: Verify Everything Works

```bash
# Check backend health
curl http://localhost:4000/health

# Check frontend
curl -s http://localhost:5173 | head -20

# Check n8n
curl -u admin:YOUR_N8N_PASSWORD http://localhost:5678/healthz

# View logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f n8n
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f redis
```

---

## STEP 12: Access Your App

Open browser and go to:

```
http://YOUR_VPS_IP:5173     → Frontend (React App)
http://YOUR_VPS_IP:4000     → Backend API
http://YOUR_VPS_IP:5678     → n8n Dashboard
```

**Login with super admin credentials:**
- Email: `admin@yourdomain.com`
- Password: `SuperAdmin@Secure123!`

---

## STEP 13: Setup Domain + SSL (Optional but Recommended)

### Point your domain to VPS:
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add an **A Record**:
   - Name: `@`
   - Value: `YOUR_VPS_IP`
   - TTL: `3600`

3. Add a **CNAME Record** (for www):
   - Name: `www`
   - Value: `yourdomain.com`

### Install Nginx + SSL:

```bash
# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Remove default Nginx config
rm /etc/nginx/sites-enabled/default

# Create config for your app
nano /etc/nginx/sites-available/saas-app
```

**Paste this (replace `yourdomain.com` and `YOUR_VPS_IP`):**

```nginx
upstream frontend {
    server 127.0.0.1:5173;
}

upstream backend {
    server 127.0.0.1:4000;
}

upstream n8n {
    server 127.0.0.1:5678;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
    }

    # n8n Dashboard
    location /n8n/ {
        rewrite ^/n8n/(.*) /$1 break;
        proxy_pass http://n8n;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Enable the config:**
```bash
# Create symlink
ln -s /etc/nginx/sites-available/saas-app /etc/nginx/sites-enabled/

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Get Free SSL Certificate:
```bash
# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# 1. Enter your email
# 2. Agree to terms
# 3. Choose whether to share email (your choice)
# 4. Choose redirect HTTP → HTTPS (option 2)
```

**Now your app is accessible at:**
```
https://yourdomain.com        → Frontend
https://yourdomain.com/api/   → Backend
https://yourdomain.com/n8n/   → n8n Dashboard
```

---

## STEP 14: Setup Automatic Backups

```bash
# Create backup directory
mkdir -p /root/backups

# Create backup script
nano /root/backup.sh
```

**Paste this:**
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/root/backups"

# Backup PostgreSQL
docker compose -f /root/saas-app/docker-compose.prod.yml exec -T postgres pg_dump -U postgres whatsapp_saas > "$BACKUP_DIR/db_$DATE.sql"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /root/saas-app/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable:**
```bash
chmod +x /root/backup.sh

# Test backup
/root/backup.sh
```

**Add to cron (daily at 2 AM):**
```bash
crontab -e

# Add this line at the end:
0 2 * * * /root/backup.sh >> /root/backup.log 2>&1
```

---

## 📁 Useful Commands

```bash
# View all running containers
docker ps

# View logs (live)
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f n8n

# Restart a service
docker compose -f docker-compose.prod.yml restart app

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Update code (if using Git)
cd /root/saas-app
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres whatsapp_saas > backup.sql

# Restore database
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres whatsapp_saas
```

---

## 🔧 Troubleshooting

### App won't start:
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs app 2>&1 | tail -50

# Restart everything
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Database connection error:
```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Restart PostgreSQL
docker compose -f docker-compose.prod.yml restart postgres
```

### Port already in use:
```bash
# Find what's using the port
netstat -tulpn | grep :4000
netstat -tulpn | grep :5173

# Kill the process
kill -9 <PID>
```

### Out of disk space:
```bash
# Remove unused Docker images
docker system prune -a --volumes

# Check disk usage
du -sh /var/lib/docker/*
```

---

## 🎯 After Deployment Checklist

- [ ] All containers running (`docker ps`)
- [ ] Backend health check passes (`curl http://IP:4000/health`)
- [ ] Frontend loads in browser (`http://IP:5173`)
- [ ] Super admin created
- [ ] `.env` file has real secrets (not placeholders)
- [ ] Firewall configured (`ufw status`)
- [ ] Database migrations ran
- [ ] Backup script working
- [ ] Domain pointed to VPS (if using)
- [ ] SSL certificate installed (if using)
- [ ] n8n accessible and workflows imported
- [ ] WhatsApp API credentials configured
- [ ] AI provider key (OpenRouter) configured
- [ ] SMTP configured (for email features)

---

## 📞 Quick Reference

| Service | URL | Default Login |
|---------|-----|---------------|
| Frontend | `http://IP:5173` | admin@yourdomain.com |
| Backend API | `http://IP:4000` | API only |
| n8n Dashboard | `http://IP:5678` | admin / N8N_PASSWORD |
| PostgreSQL | Internal only | postgres / DB_PASSWORD |
| Redis | Internal only | redis / REDIS_PASSWORD |

---

**Need help? Check logs:** `docker compose -f docker-compose.prod.yml logs -f`
