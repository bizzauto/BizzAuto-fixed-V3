# 🚀 VPS पर Project Upload करने का Easy Guide
## (Step by Step - Simple Language)

---

## 📋 शुरू करने से पहले आपको ये चीज़ें चाहिए:

1. ✅ आपका VPS IP Address (जैसे: 123.45.67.89)
2. ✅ VPS का Password
3. ✅ आपका Project जो आप upload करना चाहते हैं

---

## 📤 STEP 1: Project को VPS पर Upload करें

### Option A: WinSCP Use करें (सबसे आसान - Windows के लिए)

1. **WinSCP Download करें:**
   - यहाँ जाएं: https://winscp.net/
   - Download करें और Install करें

2. **WinSCP Open करें:**
   - Host name में अपना VPS IP डालें (जैसे: 123.45.67.89)
   - Port: 22
   - User name: root
   - Password: अपना VPS password डालें
   - "Login" button दबाएं

3. **Project Upload करें:**
   - Left side में अपना computer दिखेगा
   - Right side में VPS दिखेगा
   - Left side से अपना project folder select करें
   - Right side में `/root` folder में जाएं
   - Project को drag करके right side में drop करें
   - Wait करें जब तक upload complete न हो जाए

### Option B: FileZilla Use करें

1. **FileZilla Download करें:**
   - यहाँ जाएं: https://filezilla-project.org/
   - Download करें और Install करें

2. **Connect करें:**
   - Host: आपका VPS IP
   - Protocol: SFTP
   - User: root
   - Password: आपका VPS password
   - "Quickconnect" दबाएं

3. **Upload करें:**
   - Left side से project folder select करें
   - Right side में `/root` folder में जाएं
   - Right click → Upload करें

---

## 🔌 STEP 2: VPS से Connect हों

### Windows Users:

1. **PuTTY Download करें:**
   - यहाँ जाएं: https://www.putty.org/
   - Download करें और Install करें

2. **PuTTY Open करें:**
   - Host Name में अपना VPS IP डालें
   - Port: 22
   - "Open" button दबाएं

3. **Login करें:**
   - Login as: root
   - Password: आपका VPS password (type करते समय कुछ भी दिखाई नहीं देगा, ये normal है)

### Mac/Linux Users:

Terminal open करें और ये command run करें:
```bash
ssh root@YOUR_VPS_IP
# Password डालें
```

---

## 🚀 STEP 3: पुराना Code हटाएं और नया Deploy करें

अब ये commands एक-एक करके run करें:

### 3.1: पुराना Project Backup करें
```bash
cd /root
mkdir -p backups
```

### 3.2: पुराने Containers रोकें
```bash
cd /root/saas-app
docker compose -f docker-compose.prod.yml down
```

### 3.3: पुराना Project Move करें
```bash
cd /root
mv saas-app backups/saas-app-old-$(date +%Y%m%d)
```

### 3.4: नया Project Rename करें
```bash
mv "my project" saas-app
cd saas-app
```

### 3.5: Environment File बनाएं
```bash
cp .env.example .env
```

### 3.6: Secure Passwords Generate करें
```bash
# ये commands run करें और output copy करें
openssl rand -base64 48
openssl rand -hex 32
openssl rand -base64 24
```

### 3.7: .env File Edit करें
```bash
nano .env
```

**इन values को update करें:**

```env
NODE_ENV=production
PORT=4000
BASE_URL=http://YOUR_VPS_IP

DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@postgres:5432/whatsapp_saas?schema=public

JWT_SECRET=यहाँ_पहले_generate_की_huyi_value_डालें
JWT_REFRESH_SECRET=यहाँ_दूसरी_value_डालें
ENCRYPTION_KEY=यहाँ_तीसरी_value_डालें

REDIS_PASSWORD=यहाँ_चौथी_value_डालें
N8N_PASSWORD=यहाँ_पांचवी_value_डालें

# अपनी actual API keys डालें
OPENROUTER_API_KEY=अपनी_key_यहाँ_डालें
META_APP_ID=अपनी_app_id
META_APP_SECRET=अपनी_app_secret
```

**Save करें:** `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 🔨 STEP 4: Docker Images Build करें

```bash
docker compose -f docker-compose.prod.yml build
```

**Note:** ये 5-10 minutes ले सकता है, wait करें।

---

## ▶️ STEP 5: Containers Start करें

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 🗄️ STEP 6: Database Setup करें

```bash
# Migrations run करें
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Prisma client generate करें
docker compose -f docker-compose.prod.yml exec app npx prisma generate
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

**इन details को कहीं safe जगह save कर लें!**

---

## ✅ STEP 8: Verify करें कि सब ठीक है

### 8.1: Containers Check करें
```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected Output:**
```
NAME                    STATUS          PORTS
saas-app-app-1          Up (healthy)    0.0.0.0:5173->5173, 0.0.0.0:4000->4000
saas-app-worker-1       Up (healthy)    
saas-app-postgres-1     Up (healthy)    
saas-app-redis-1        Up (healthy)    
saas-app-n8n-1          Up              0.0.0.0:5678->5678
```

### 8.2: Health Check करें
```bash
curl http://localhost:4000/health
```

**Expected Output:** `{"status":"ok"}`

---

## 🌐 STEP 9: Browser में Open करें

अपने browser में ये URLs open करें:

```
http://YOUR_VPS_IP:5173     → आपका Frontend App
http://YOUR_VPS_IP:4000     → Backend API
http://YOUR_VPS_IP:5678     → n8n Dashboard
```

**Login करें:**
- Email: `admin@yourdomain.com`
- Password: `Admin@Secure123!`

---

## 🔧 अगर कोई Problem आए तो?

### Problem 1: Containers Start नहीं हो रहे

```bash
# Logs check करें
docker compose -f docker-compose.prod.yml logs app

# Restart करें
docker compose -f docker-compose.prod.yml restart
```

### Problem 2: Database Error आ रहा है

```bash
# PostgreSQL restart करें
docker compose -f docker-compose.prod.yml restart postgres

# Database check करें
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

### Problem 3: Port already in use

```bash
# Port check करें
netstat -tulpn | grep :4000

# Process kill करें
kill -9 <PID>
```

### Problem 4: Full Restart करना है

```bash
# सब कुछ रोकें
docker compose -f docker-compose.prod.yml down

# फिर से शुरू करें
docker compose -f docker-compose.prod.yml up -d
```

---

## 📊 Useful Commands (जब भी जरूरत हो)

```bash
# सब containers देखें
docker ps

# Live logs देखें
docker compose -f docker-compose.prod.yml logs -f

# Specific service के logs देखें
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f n8n

# Restart करें
docker compose -f docker-compose.prod.yml restart app

# Stop करें
docker compose -f docker-compose.prod.yml down

# Start करें
docker compose -f docker-compose.prod.yml up -d

# Disk space check करें
df -h

# Memory check करें
free -h
```

---

## ✅ Final Checklist (सब check कर लें)

- [ ] सब containers running हैं (`docker ps`)
- [ ] Frontend browser में open हो रहा है
- [ ] Admin account बन गया है
- [ ] .env file में सब correct values हैं
- [ ] Database setup हो गया है

---

## 📞 Quick Help

| Service | URL | Login |
|---------|-----|-------|
| Frontend | `http://IP:5173` | admin@yourdomain.com |
| Backend | `http://IP:4000` | API only |
| n8n | `http://IP:5678` | admin / N8N_PASSWORD |

---

## 🔒 Security Tips (Important!)

1. **Default Passwords Change करें** - .env में सब passwords update करें
2. **Regular Backups लें** - Database का backup रखें
3. **Firewall Enable रखें** - Security के लिए

---

## 🎯 अगर अभी भी problem है?

Logs check करें:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

या मुझे बताएं कि क्या error आ रहा है!

---

**🎉 Congratulations! आपका project VPS पर deploy हो गया!**
