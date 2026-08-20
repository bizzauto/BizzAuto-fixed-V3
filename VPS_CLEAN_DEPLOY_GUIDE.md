# ============================================
# 🚀 VPS Deployment Guide - Clean & Deploy
# ============================================
# Step-by-step guide to replace old code with new project on your VPS
# ============================================

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ VPS access (SSH credentials)
- ✅ Your project files ready to upload
- ✅ Basic knowledge of terminal commands

---

## 📤 STEP 1: Upload Your Project to VPS

### Option A: Using SCP (Windows/Mac/Linux)

```bash
# From your local machine, run:
scp -r "c:/Users/SANDIP/Downloads/my project" root@YOUR_VPS_IP:/root/saas-app-new
```

### Option B: Using WinSCP (Windows GUI)

1. Download WinSCP: https://winscp.net/
2. Connect to your VPS:
   - Host: YOUR_VPS_IP
   - Port: 22
   - Username: root
   - Password: YOUR_VPS_PASSWORD
3. Upload your project folder to `/root/saas-app-new`

### Option C: Using FileZilla

1. Download FileZilla: https://filezilla-project.org/
2. Connect using SFTP:
   - Host: YOUR_VPS_IP
   - Protocol: SFTP
   - User: root
   - Password: YOUR_VPS_PASSWORD
3. Upload to `/root/saas-app-new`

---

## 🔌 STEP 2: Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
# Enter password when prompted
```

---

## 🚀 STEP 3: Run Deployment Script

The deployment script will:
1. ✅ Backup existing data (database, uploads, .env)
2. ✅ Stop old containers
3. ✅ Clean old code
4. ✅ Deploy new project
5. ✅ Build and start new containers
6. ✅ Initialize database

```bash
# Make script executable
chmod +x /root/saas-app-new/scripts/deploy-to-vps.sh

# Run deployment script
cd /root/saas-app-new
./scripts/deploy-to-vps.sh
```

---

## ⚙️ STEP 4: Configure Environment Variables

After deployment, you may need to update your `.env` file:

```bash
cd /root/saas-app
nano .env
```

**Update these values:**

```env
# ============ SERVER ============
NODE_ENV=production
PORT=4000
BASE_URL=https://yourdomain.com

# ============ DATABASE ============
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@postgres:5432/whatsapp_saas?schema=public

# ============ CORS ============
CORS_ORIGIN=https://yourdomain.com

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
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 🔄 STEP 5: Restart Services

```bash
cd /root/saas-app
docker compose -f docker-compose.prod.yml restart
```

---

## 👤 STEP 6: Create Super Admin Account

```bash
curl -X POST http://localhost:4000/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SuperAdmin@Secure123!",
    "name": "Super Admin"
  }'
```

**Save these credentials safely!**

---

## ✅ STEP 7: Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check backend health
curl http://localhost:4000/health

# View logs
docker compose -f docker-compose.prod.yml logs -f app
```

---

## 🌐 STEP 8: Access Your Application

Open your browser and go to:

```
http://YOUR_VPS_IP:5173     → Frontend (React App)
http://YOUR_VPS_IP:4000     → Backend API
http://YOUR_VPS_IP:5678     → n8n Dashboard
```

**Login with super admin credentials:**
- Email: `admin@yourdomain.com`
- Password: `SuperAdmin@Secure123!`

---

## 🔧 Troubleshooting

### Deployment script fails?

```bash
# Check what went wrong
cd /root/saas-app-new
./scripts/deploy-to-vps.sh 2>&1 | tee deploy.log

# View the log
cat deploy.log
```

### Containers won't start?

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs app
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs redis

# Restart everything
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Need to restore old data?

```bash
# Restore database
cat /root/backups/db_backup_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres whatsapp_saas

# Restore uploads
tar -xzf /root/backups/uploads_backup_YYYYMMDD_HHMMSS.tar.gz -C /root/saas-app
```

### Port already in use?

```bash
# Find what's using the port
netstat -tulpn | grep :4000
netstat -tulpn | grep :5173

# Kill the process
kill -9 <PID>
```

---

## 📊 Useful Commands

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

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

---

## 🎯 After Deployment Checklist

- [ ] All containers running (`docker ps`)
- [ ] Backend health check passes (`curl http://IP:4000/health`)
- [ ] Frontend loads in browser (`http://IP:5173`)
- [ ] Super admin created
- [ ] `.env` file has real secrets (not placeholders)
- [ ] Database migrations ran
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

## 🔒 Security Notes

1. **Change default passwords** - Update all passwords in `.env`
2. **Setup SSL** - Use Let's Encrypt for HTTPS
3. **Firewall** - Ensure only necessary ports are open
4. **Regular backups** - Setup automated backups
5. **Update regularly** - Keep Docker and system packages updated

---

**Need help? Check logs:** `docker compose -f docker-compose.prod.yml logs -f`
