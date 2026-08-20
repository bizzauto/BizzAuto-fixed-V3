# 🚀 BizzAuto CRM - Complete Coolify Setup Guide

This guide covers every step to make your app 100% working with all features at **bizzautoai.com**.

---

## 📋 Step 1: Generate Required Secrets

Open a **terminal on YOUR LOCAL computer** and run these commands (or use any online SHA generator). You'll need these values throughout this guide:

```bash
# Generate 5 keys — copy each one as you go
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET
openssl rand -hex 32   # → ENCRYPTION_KEY
openssl rand -hex 32   # → N8N_ENCRYPTION_KEY
openssl rand -hex 32   # → N8N_USER_MANAGEMENT_JWT_SECRET
```

Also pick:
- `N8N_APP_API_KEY` → API key created in n8n UI (Settings > n8n API) for app→n8n calls
- `N8N_API_KEY` → a strong key like `n8n_key_YourRandomString123456789` for n8n→app auth
- `N8N_PASSWORD` → strong admin password for n8n
- `EVOLUTION_API_KEY` → `evol_` + `openssl rand -hex 16` output

---

## 📋 Step 2: Configure the App Service in Coolify

In Coolify Dashboard → **Resources** → Click your **BizzAuto App** → **Environment Variables**

Set these EXACT values:

### 🔴 Critical (Core) — App won't start without these

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required for prod mode |
| `PORT` | `4000` | Express port (already set) |
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@YOUR_SUPABASE_HOST:5432/postgres` | From your Supabase resource in Coolify |
| `JWT_SECRET` | `<from Step 1>` | Must be 32+ chars |
| `JWT_REFRESH_SECRET` | `<from Step 1>` | Must be 32+ chars |
| `ENCRYPTION_KEY` | `<from Step 1>` | Must be 64 hex chars |
| `CORS_ORIGIN` | `https://bizzautoai.com` | CORS whitelist |
| `FRONTEND_URL` | `https://bizzautoai.com` | Used in links |
| `BASE_URL` | `https://bizzautoai.com` | Webhook URL generation |

### 🟡 AI Features — Unlocks all AI capabilities

| Variable | Value | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | `sk-or-v1-XXXXXXXXXXXXXXXXXXXX` | Get from [openrouter.ai/keys](https://openrouter.ai/keys) |

### 🟡 Redis — Required for background workers

Check if you have a Redis resource in Coolify. If not, create one.

| Variable | Value | Notes |
|---|---|---|
| `REDIS_URL` | `redis://YOUR_REDIS_HOST:6379` | From Coolify Redis resource |
| `REDIS_HOST` | `YOUR_REDIS_HOST` | Or the hostname |
| `REDIS_PORT` | `6379` | Default |
| `REDIS_PASSWORD` | `<if set>` | Leave blank if no password |

### 🟡 n8n Integration — Connect App to n8n

| Variable | Value | Notes |
|---|---|---|
| `N8N_URL` | `https://n8n.bizzautoai.com` | Set after Step 4 |
| `N8N_APP_API_KEY` | `<from Step 1>` | App→n8n API key (Settings > n8n API) |
| `N8N_API_KEY` | `<from Step 1>` | n8n→App service-to-service auth key |

### 🟡 Evolution API (WhatsApp) — Connect App to WhatsApp

| Variable | Value | Notes |
|---|---|---|
| `EVOLUTION_API_URL` | `https://evolution.bizzautoai.com` | Set after Step 5 |
| `EVOLUTION_API_KEY` | `<from Step 1>` | Must match Evolution API's `AUTHENTICATION_API_KEY` |
| `EVOLUTION_INSTANCE_NAME` | `bizzauto` | Instance identifier |

### ⚪ SMTP / Email (Optional)

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` (or your provider) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your@email.com` |
| `SMTP_PASS` | App password |
| `SMTP_FROM` | `"BizzAuto CRM <noreply@bizzautoai.com>"` |

### ⚪ Payments (Optional)

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_XXXXXXXXXX` |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |

### ⚪ Google OAuth (Optional)

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | `XXXXX.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URL` | `https://bizzautoai.com/api/auth/google/callback` |

### ⚪ Meta WhatsApp Business API (Optional)

| Variable | Value |
|---|---|
| `META_APP_ID` | From Meta Developer Portal |
| `WHATSAPP_REDIRECT_URL` | `https://bizzautoai.com/api/whatsapp/callback` |

---

## 📋 Step 3: Push Database Schema & Seed

In Coolify, go to your **App resource** → **Terminal** tab. Run these commands:

```bash
# Navigate to app directory (usually /app or the deploy path)
cd /app

# Generate Prisma client (creates the database access layer)
npx prisma generate

# Push schema to Supabase (creates all tables)
npx prisma db push

# Seed initial data (creates demo user: demo@bizzauto.com / demo123)
npx prisma db seed
```

After this, **Redeploy** your App service.

---

## 📋 Step 4: Configure n8n Subdomain

In Coolify Dashboard → **Resources** → Click your **n8n resource**:

### Domain Settings

| Field | Value |
|---|---|
| **Domain** | `n8n.bizzautoai.com` |
| **Port** | `5678` |

### Environment Variables

```env
# === Auth ===
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<from Step 1>

# === Encryption ===
N8N_ENCRYPTION_KEY=<from Step 1>
N8N_USER_MANAGEMENT_JWT_SECRET=<from Step 1>

# === URL Configuration ===
N8N_WEBHOOK_URL=https://bizzautoai.com
N8N_HOST=n8n.bizzautoai.com
N8N_PROTOCOL=https

# === Timezone ===
GENERIC_TIMEZONE=Asia/Kolkata

# === Storage ===
DB_TYPE=sqlite

# === Workflow Variables (used as $env.VARIABLE_NAME in n8n) ===
N8N_APP_URL=https://bizzautoai.com
N8N_API_URL=https://bizzautoai.com
N8N_OPENROUTER_KEY=<same as OPENROUTER_API_KEY from Step 2>
```

> **Important:** After n8n is deployed, go to **Settings → n8n API** in the n8n UI and create an API key. Add it as `N8N_APP_API_KEY` in the App environment variables (Step 6).

Deploy n8n, then verify:
```bash
curl https://n8n.bizzautoai.com/healthz
# Expected: {"status":"ok"}
```

---

## 📋 Step 5: Configure Evolution API Subdomain

In Coolify Dashboard → **Resources** → Click your **Evolution API resource**:

### Domain Settings

| Field | Value |
|---|---|
| **Domain** | `evolution.bizzautoai.com` |
| **Port** | `8080` |

### Environment Variables

```env
# === API Key (security) ===
AUTHENTICATION_API_KEY=<from Step 1>

# === Database ===
DATABASE_ENABLED=true
DATABASE_TYPE=sqlite

# === Disable unused ===
RABBITMQ_ENABLED=false

# === Enable WebSocket (for QR scanning) ===
WEBSOCKET_ENABLED=true

# === Webhook URL (CRITICAL - forwards messages to App) ===
WEBHOOK_URL=https://bizzautoai.com/api/evolution/webhook/{businessId}
```

Deploy Evolution API, then verify:
```bash
curl https://evolution.bizzautoai.com/
# Expected: Some JSON API response (not connection refused)
```

---

## 📋 Step 6: Final Wiring & Redeploy

After ALL subdomains are configured and deployed:

1. Go back to **App resource** → **Environment Variables**
2. Update n8n URLs if needed:
   ```env
   N8N_URL=https://n8n.bizzautoai.com
   N8N_APP_API_KEY=<from Step 1>
   N8N_API_KEY=<from Step 1>
   ```
3. Update Evolution API URLs:
   ```env
   EVOLUTION_API_URL=https://evolution.bizzautoai.com
   EVOLUTION_API_KEY=<from Step 1>
   EVOLUTION_INSTANCE_NAME=bizzauto
   ```
4. **Redeploy** the App

---

## 📋 Step 7: Health Check

After everything is deployed, run these checks:

```bash
# 1. App health 🟢
curl https://bizzautoai.com/health
# → {"status":"ok","environment":"production","version":"1.0.0"}

# 2. n8n health 🟢
curl https://n8n.bizzautoai.com/healthz
# → {"status":"ok"}

# 3. Evolution API 🟢
curl https://evolution.bizzautoai.com/
# → Responds with API data

# 4. Full integration test 🟢
TOKEN=$(curl -s https://bizzautoai.com/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"demo@bizzauto.com","password":"demo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))")

# Check n8n connection from App
curl -s https://bizzautoai.com/api/automation/n8n/status \
  -H "Authorization: Bearer $TOKEN"

# Check Evolution API config
curl -s https://bizzautoai.com/api/evolution/config \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Step 8: Connect WhatsApp (via App UI)

1. Open `https://bizzautoai.com` in browser
2. Login: `demo@bizzauto.com` / `demo123`
3. Go to **Settings → WhatsApp → Evolution API**
4. Enter:
   - **Server URL**: `https://evolution.bizzautoai.com`
   - **API Key**: (your `AUTHENTICATION_API_KEY` from Step 5)
5. Click **Connect** → QR code appears
6. Open WhatsApp on phone → **Linked Devices** → Scan QR code
7. ✅ WhatsApp connected!

---

## 📋 Step 9: Import n8n Workflows

1. Open `https://n8n.bizzautoai.com` in browser
2. Login: `admin` / your N8N_PASSWORD
3. Click **Workflows → Add from JSON**
4. Copy each workflow from your project's `n8n/workflows.json` file
5. Activate each workflow

---

## 🎯 Required vs Optional Features Summary

| Feature | Ready When | Priority |
|---------|-----------|----------|
| ✅ Core App (login, dashboard) | Already working | — |
| ✅ Database (Supabase) | Step 3 complete | **Do first** |
| ✅ Auth (JWT) | Step 2 env vars set | **Do first** |
| ✅ AI (chatbot, posters, captions) | `OPENROUTER_API_KEY` set | **High** |
| ⬜ n8n Automation | Step 4 done | Medium |
| ⬜ WhatsApp (Evolution API) | Step 5 done | Medium |
| ⬜ Email | SMTP env vars set | Low |
| ⬜ Payments | Razorpay keys set | Low |
| ⬜ Google Login/OAuth | Google credentials | Low |
| ⬜ Redis Workers | Redis configured | Medium |
