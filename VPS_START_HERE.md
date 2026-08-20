# 🚀 VPS Deploy - Start Here

## ⚠️ Important: Pehle Project Upload Karein!

Aapke VPS par abhi koi project nahi hai. Pehle aapko apna local project VPS par upload karna hoga.

---

## 📤 STEP 1: Project Upload (WinSCP से)

### 1. WinSCP Download करें:
- यहाँ जाएं: https://winscp.net/
- Download करें और Install करें

### 2. WinSCP Open करें और Connect करें:
- **Host name:** आपका VPS IP (जैसे: 123.45.67.89)
- **Port:** 22
- **User name:** root
- **Password:** आपका VPS password
- **Login** button दबाएं

### 3. Project Upload करें:
- **Left side** (आपका computer):
  - अपना project folder select करें: `c:/Users/SANDIP/Downloads/my project`
- **Right side** (VPS):
  - `/root` folder में जाएं
- **Upload करें:**
  - Left side से project folder को drag करें
  - Right side में drop करें
  - Wait करें जब तक upload complete न हो जाए

---

## ✅ STEP 2: Verify Upload

VPS पर ये command run करें:

```bash
ls -la /root
```

**Expected Output:**
```
drwxr-xr-x  root root  my project
```

Agar `my project` folder dikha toh upload successful hai!

---

## 🧹 STEP 3: Purana Code Clean करें

```bash
# Script को executable बनाएं
chmod +x /root/my\ project/scripts/clean-vps.sh

# Script run करें
cd /root
./my\ project/scripts/clean-vps.sh
```

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

## 🔧 Agar Upload Problem हो?

### WinSCP से upload fail हो रहा है?

1. **Connection check करें:**
   - VPS IP correct hai?
   - Password correct hai?
   - Internet connection hai?

2. **Permissions check करें:**
   - `/root` folder में write permission hai?

3. **Alternative: SCP use करें:**
   ```bash
   # अपने local computer पर (Windows PowerShell या Git Bash):
   scp -r "c:/Users/SANDIP/Downloads/my project" root@YOUR_VPS_IP:/root/
   ```

---

## 📊 Quick Commands

```bash
# VPS par kya hai check करें
ls -la /root

# Project upload हुआ hai check करें
ls -la /root/my\ project

# Docker check करें
docker ps

# Docker install है check करें
docker --version
```

---

## ✅ Checklist

- [ ] Project upload हो गया (WinSCP से)
- [ ] `/root/my project` folder dikha
- [ ] Purana code clean हो गया
- [ ] Naya project deploy हो गया
- [ ] .env file configure हो गया
- [ ] Admin account बन गया
- [ ] Browser में app open हो रहा है

---

## 🎯 Summary

**Pehle:** Project upload करें (WinSCP से)
**Phir:** Clean script run करें
**Phir:** Deploy script run करें
**Phir:** .env configure करें
**Phir:** Admin बनाएं
**Done!** 🎉

---

**Agar koi problem है तो बताएं!**
