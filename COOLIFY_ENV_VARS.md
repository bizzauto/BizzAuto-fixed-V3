# Coolify Environment Variables — Master Checklist

> **App:** BizzAuto CRM at `bizzautoai.com`
> **Stack:** Docker Compose (`docker-compose.prod.yml`)
> **Services:** app + redis + evolution-api + n8n
> **DB:** Supabase PostgreSQL

---

## 🟢 REQUIRED VARS (App won't work without these)

### Database
| Variable | Your Value (example) | Notes |
|----------|---------------------|-------|
| `DATABASE_URL` | `postgresql://postgres:xxx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Copy from Supabase Dashboard → Project Settings → Connection String (Pooled) |

### Auth
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `JWT_SECRET` | *(your 32+ char secret)* | Already set in Coolify |
| `JWT_REFRESH_SECRET` | *(your 32+ char secret)* | Already set in Coolify |
| `ENCRYPTION_KEY` | *(your 64 hex char key)* | Already set in Coolify |

### URLs
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `FRONTEND_URL` | `https://bizzautoai.com` | Public app URL |
| `API_URL` | `https://bizzautoai.com` | If same domain (reverse proxy handles `/api/*`) |
| `N8N_URL` | `https://n8n.bizzautoai.com` | n8n workflow automation URL — backend uses this to trigger workflows |

### n8n API Auth
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `N8N_APP_API_KEY` | Create in n8n UI (Settings → n8n API) | App→n8n outgoing API key (uses `X-N8N-API-KEY` header) |
| `N8N_API_KEY` | Strong random key | n8n→App incoming auth — must match what `auth.ts` middleware expects |

---

## 🟡 EVOLUTION API VARS (New — must be added!)

| Variable | Your Value | Notes |
|----------|-----------|-------|
| **`EVOLUTION_API_KEY`** | `4vI14TE9beNwRhzLHNccn11oqcEkaX9V` | ⚠️ Same as local `.env` — already generated! |
| `EVOLUTION_INSTANCE_NAME` | `bizzauto` | Can be anything unique |
| `EVOLUTION_WEBHOOK_URL` | `https://bizzautoai.com/api/evolution/webhook` | Required for incoming messages |
| `EVOLUTION_DATABASE_URL` | *(skip unless using separate schema)* | Optional — see DB section below |

> 🔧 **REDIS_URL**: Auto-defaults to `redis://redis:6379` (Docker internal — same stack). No need to set unless using external Redis.

> 💡 **Already set in Coolify?** Check Coolify Dashboard → Your Project → Environment Variables → search for `EVOLUTION`

### Verification — Evolution API in docker-compose.prod.yml

These are wired automatically from the env vars above — you don't need to set them separately:

| Auto-wired Variable | Source | Used By |
|--------------------|--------|---------|
| `AUTHENTICATION_API_KEY` | = `EVOLUTION_API_KEY` | evolution-api service |
| `DATABASE_CONNECTION_URI` | = `${EVOLUTION_DATABASE_URL:-${DATABASE_URL}}` | evolution-api service |
| `REDIS_URI` | = `REDIS_URL` | evolution-api service |
| `EVOLUTION_API_URL` | defaults to `http://evolution-api:8080` | app service |

---

## 🟡 n8n VARS (verify these are set in n8n resource — not App)

| Variable | Your Value | Notes |
|----------|-----------|-------|
| `N8N_PASSWORD` | *(your password)* | For n8n admin login |
| `N8N_ENCRYPTION_KEY` | *(your key)* | Required for n8n |
| `N8N_USER_MANAGEMENT_JWT_SECRET` | *(your secret)* | Required for n8n |
| `N8N_APP_API_KEY` | Create in n8n UI → Settings → n8n API | n8n's own API key for app→n8n calls |
| `WEBHOOK_URL` | `https://n8n.bizzautoai.com` | n8n's own webhook URL (set in n8n resource) |
| `OPENROUTER_API_KEY` | *(your key)* | For AI features in n8n workflows |

---

## 🟡 AI SERVICES VARS

| Variable | Your Value | Notes |
|----------|-----------|-------|
| `OPENROUTER_API_KEY` | *(your key)* | Required for AI chatbot features |
| `GROK_API_KEY` | *(optional)* | Alternative AI provider |

---

## 🔵 OPTIONAL VARS

### SMTP / Email (for password reset, notifications)
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | Or your email provider |
| `SMTP_PORT` | `587` | TLS port |
| `SMTP_USER` | your-email@gmail.com | |
| `SMTP_PASS` | your-app-password | Use app password |
| `SMTP_FROM` | BizzAuto CRM <noreply@bizzautoai.com> | |

### Payments
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `RAZORPAY_KEY_ID` | *(optional)* | For payment features |
| `RAZORPAY_KEY_SECRET` | *(optional)* | |

### Meta / Facebook (WhatsApp Business API — alternative to Evolution API)
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `META_APP_ID` | *(optional)* | Required if using Meta Official API instead of Evolution API |

### Google OAuth
| Variable | Your Value | Notes |
|----------|-----------|-------|
| `GOOGLE_CLIENT_ID` | *(optional)* | For Google login |
| `GOOGLE_CLIENT_SECRET` | *(optional)* | |
| `GOOGLE_REDIRECT_URL` | `https://bizzautoai.com/api/auth/google/callback` | |

---

## ✅ Step-by-Step: Set These in Coolify Now

### 1. Open Coolify Dashboard
Go to [your-coolify-server] → Projects → Your Project

### 2. Go to Environment Variables
Click the **Environment Variables** tab (not Docker Compose env vars — the top-level ones)

### 3. Add Evolution API Vars
Click **+ Add Variable** and add these one by one:

```
EVOLUTION_API_KEY        → 4vI14TE9beNwRhzLHNccn11oqcEkaX9V
EVOLUTION_INSTANCE_NAME  → bizzauto
EVOLUTION_WEBHOOK_URL    → https://bizzautoai.com/api/evolution/webhook
```

> ⚠️ **Same API key as local?** Yes! Use the same key in Coolify — it's already generated and updated in your local `.env`. This way local dev and production use the same API key for Evolution API.

### 4. Save
Click **Save** → Then go to **Deploy** tab → Click **Deploy**

---

## 🔍 How to Check What's Already in Coolify

Log in to your Coolify dashboard and:

1. Go to **Projects** → select your BizzAuto project
2. Go to **Environment Variables** tab
3. Look for `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_URL`, etc.
4. If they're missing → add them using the table above
5. If they're present with placeholder values → update them

---

## 📋 Quick Verification After Redeploy

### Via Coolify Dashboard (easiest)
1. Go to **Coolify Dashboard → Your Project**
2. Check **container status** — all 4 services (app, redis, evolution-api, n8n) should show green
3. Go to **Logs** tab → filter by `evolution-api` → verify no errors in startup logs

### Via Terminal (SSH access required)
```bash
# Check all containers are running
coolify ssh
```

```bash
docker ps | grep -E "bizzauto|redis|evolution|n8n"

# Check Evolution API logs
docker logs bizzauto-evolution --tail 30

# Test Evolution API health
curl -s http://localhost:8080/health

# Test from app (inside Docker)
docker exec bizzauto-app curl -s http://evolution-api:8080/health
```

---

## 🔄 Rollback

If something breaks after adding Evolution API:

1. **Remove** the `EVOLUTION_API_*` env vars from Coolify
2. **Remove** the `evolution-api` service from `docker-compose.prod.yml`
3. **Push** to git → **Redeploy**

The app will work normally without Evolution API — it's completely optional.
