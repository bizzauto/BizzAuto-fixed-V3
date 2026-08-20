# 🧹 VPS Clean & Deploy - Step by Step

## 📋 Pehle Purana Code Clean Karein, Phir Naya Deploy Karein

---

## 🔌 STEP 1: VPS से Connect हों

### Windows Users (PuTTY):
1. **PuTTY Download:** https://www.putty.org/
2. **Connect करें:**
   - Host Name: आपका VPS IP
   - Port: 22
   - Open दबाएं
3. **Login:**
   - Login as: root
   - Password: आपका VPS password

### Mac/Linux Users:
```bash
ssh root@YOUR_VPS_IP
# Password डालें
```

---

## 🧹 STEP 2: Purana Code Clean करें

### Option A: Clean Script Use करें (Recommended)

```bash
# Script को executable बनाएं
chmod +x /root/my\ project/scripts/clean-vps.sh

# Script run करें
cd /root
./my\ project/scripts/clean-vps.sh
```

**Script automatically:**
- ✅ Database backup karegi
- ✅ Uploads backup karegi
- ✅ .env file backup karegi
- ✅ Sab containers rokegi
- ✅ Purana code hata degi
- ✅ Docker clean karegi

### Option B: Manual Clean करें

```bash
# 1. Backup बनाएं
cd /root
mkdir -p backups

# Database backup (agar chal raha hai)
docker exec $(docker ps -q -f name=postgres) pg_dump -U postgres whatsapp_saas > backups/db_backup.sql

# .env backup
cp saas-app/.env backups/env_backup

# 2. Containers रोकें
cd saas-app
docker compose -f docker-compose.prod.yml down

# 3. Purana project move करें
cd /root
mv saas-app backups/saas-app-old

# 4. Docker clean करें
docker system prune -a --volumes
```

---

## 📤 STEP 3: Naya Project Upload करें

### WinSCP से (Windows):

1. **WinSCP Open करें**
2. **Connect करें:**
   - Host: आपका VPS IP
   - User: root
   - Password: आपका VPS password
3. **Upload करें:**
   - Left side से "my project" folder select करें
   - Right side में `/root` में जाएं
   - Drag & drop करें
   - Wait करें जब तक upload complete न हो जाए

---

## 🚀 STEP 4: Naya Project Deploy करें

```bash
# Script को executable बनाएं
chmod +x /root/my\ project/scripts/deploy-simple.sh

# Script run करें
cd /root
./my\ project/scripts/deploy-simple.sh
```

**Wait करें - ये 5-10 minutes ले सकता है!**

---

## ⚙️ STEP 5: .env File Configure करें

```bash
cd /root/saas-app
nano .env
```

**इन values को update करें:**

```env
NODE_ENV=production
PORT=4000
BASE_URL=http://YOUR_VPS_IP

DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@postgres:5432/whatsapp_saas?schema=public

JWT_SECRET=generate_की_huyi_value
JWT_REFRESH_SECRET=generate_की_huyi_value
ENCRYPTION_KEY=generate_की_huyi_value

REDIS_PASSWORD=generate_की_huyi_value
N8N_URL=http://n8n:5678
N8N_APP_API_KEY=n8n_api_key_से_banao_n8n_UI_mai
N8N_API_KEY=n8n_api_key_जो_auth.ts_se_milta_hai
N8N_PASSWORD=generate_की_huyi_value

OPENROUTER_API_KEY=अपनी_key
META_APP_ID=अपनी_app_id
META_APP_SECRET=अपनी_app_secret
```

**Save:** `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 🔄 STEP 6: Restart करें

```bash
docker compose -f docker-compose.prod.yml restart
```

---

## 👤 STEP 7: Admin Account बनाएं

```bash
curl -X POST http://localhost:4000/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "Admin@Secure123!",
    "name": "Super Admin"
  }'
```

**इन details को save कर लें!**

---

## ✅ STEP 8: Verify करें

```bash
# Containers check करें
docker ps

# Health check करें
curl http://localhost:4000/health
```

---

## 🌐 STEP 9: Browser में Open करें

```
http://YOUR_VPS_IP:5173     → आपका App
http://YOUR_VPS_IP:4000     → Backend
http://YOUR_VPS_IP:5678     → n8n
```

**Login:**
- Email: `admin@yourdomain.com`
- Password: `Admin@Secure123!`

---

## 🔧 Troubleshooting

### Clean script fail हो रही है?

```bash
# Manual clean करें
cd /root
docker stop $(docker ps -aq)
docker system prune -a --volumes
rm -rf saas-app
```

### Deploy script fail हो रही है?

```bash
# Logs check करें
cd /root/saas-app
docker compose -f docker-compose.prod.yml logs

# Restart करें
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Database error आ रहा है?

```bash
# Database reset करें
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS whatsapp_saas;"
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "CREATE DATABASE whatsapp_saas;"
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

---

## 📊 Useful Commands

```bash
# सब containers देखें
docker ps

# Live logs देखें
docker compose -f docker-compose.prod.yml logs -f

# Restart करें
docker compose -f docker-compose.prod.yml restart

# Stop करें
docker compose -f docker-compose.prod.yml down

# Start करें
docker compose -f docker-compose.prod.yml up -d

# Disk space check करें
df -h
```

---

## ✅ Final Checklist

- [ ] Purana code clean हो गया
- [ ] Naya project upload हो गया
- [ ] सब containers running हैं
- [ ] Frontend browser में open हो रहा है
- [ ] Admin account बन गया है
- [ ] .env file में सब correct values हैं

---

## 🎯 Done!

आपका project VPS पर deploy हो गया! 🎉

---

**अगर कोई problem है तो बताएं!**
