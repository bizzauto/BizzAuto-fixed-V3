# Coolify Evolution API — Deploy Checklist

> **Target:** Add Evolution API (WhatsApp QR) to your existing Coolify stack at `bizzautoai.com`
> **Stack:** Docker Compose (app + redis + evolution-api + n8n)
> **DB:** Supabase PostgreSQL

---

## ✅ Pre-Flight Checklist

Before clicking Redeploy, confirm these are ready:

- [ ] **Git repo updated** — `docker-compose.prod.yml` has the `evolution-api` service
- [ ] **Coolify compose file path** — Go to Coolify Dashboard → your stack → verify the compose file path is set to `docker-compose.prod.yml` (not `docker-compose.yml`)
- [ ] **Coolify** has access to the latest commit (push your changes)
- [ ] **Supabase** is running and accessible from Coolify
- [ ] **Redis** is already running in the stack (evolution-api depends on it)

---

## Step 1: Push Updated `docker-compose.prod.yml` to Git

```bash
git add docker-compose.prod.yml
git commit -m "feat: add evolution-api service for WhatsApp QR connection"
git push
```

> Coolify will auto-detect the changes if Auto-Deploy is ON. Otherwise, proceed to Step 2.

---

## Step 2: Set Environment Variables in Coolify Dashboard

Go to **Coolify Dashboard → Your Project → Environment Variables** and add these:

| Variable | Value | Notes |
|----------|-------|-------|
| `EVOLUTION_API_KEY` | `openssl rand -hex 32` (run this!) | Min 32 chars — **required** |
| `EVOLUTION_INSTANCE_NAME` | `bizzauto` | Can be anything unique |
| `EVOLUTION_DATABASE_URL` | *(see Step 5 below)* | Optional — separate DB recommended |
| `EVOLUTION_WEBHOOK_URL` | `https://bizzautoai.com/api/evolution/webhook` | Required for incoming messages |

### How to generate API key

```bash
# Run this in your terminal:
openssl rand -hex 32
# Example output: 7a8b3c9d1e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g
```

Copy the output and paste it as the `EVOLUTION_API_KEY` value in Coolify.

---

## Step 3: Redeploy in Coolify

1. Go to **Coolify Dashboard → Your Project**
2. Click the **Deploy** tab
3. Click **Deploy** button

Coolify will:
- Pull the latest `docker-compose.prod.yml`
- Detect the new `evolution-api` service
- Pull `evoapicloud/evolution-api:latest` image
- Start the container with Redis dependency

### Verify it's running

```bash
# Check container status
docker ps | grep evolution

# Check logs
docker logs bizzauto-evolution --tail 50

# Health check
curl http://localhost:8080/health
```

Or check **Coolify Dashboard → Logs** tab for real-time output.

---

## Step 4: Configure in App UI

1. Open **https://bizzautoai.com** and log in
2. Go to **WhatsApp Module** → **Connection tab**
3. Click the **Evolution API** tab (next to Meta Official API)
4. Click **Configure Evolution API**
5. Enter:
   - **API Base URL**: `http://evolution-api:8080`
   - **API Key**: *(same as EVOLUTION_API_KEY from Step 2)*
   - **Instance Name**: `bizzauto` (or leave blank)
6. Click **Save Configuration**
7. Click **Connect & Get QR Code**
8. A QR code will appear — **scan with WhatsApp** on your phone!
   - Open WhatsApp → Linked Devices → Link a Device → Scan

---

## Step 5: (Optional) Separate Database for Evolution API

Evolution API creates its own tables. To keep them separate from your app's data:

### Option A: Separate Schema in Supabase

```sql
-- Run in Supabase SQL Editor
CREATE SCHEMA IF NOT EXISTS evolution;
```

Then set in Coolify env vars:
```
EVOLUTION_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?options=-c%20search_path=evolution
```

> ⚠️ Use `?options=-c%20search_path=evolution` — NOT `?schema=evolution` (Prisma syntax, won't work for raw PostgreSQL).

### Option B: Separate Database in Supabase

Supabase free tier gives you 1 database. For a separate database, you'd need to:
- Use a different Supabase project
- Or use a different PostgreSQL instance

> 💡 **Pro tip:** If you use the **same database**, Evolution API creates tables like `Instances`, `Messages`, `Chats` — these are different from your Prisma tables (`wa_instances`, `wa_messages`, etc.), so there's **no conflict**. You can skip this step safely.

---

## 🔍 Troubleshooting

### Container keeps restarting
```bash
docker logs bizzauto-evolution --tail 100
```
Common causes:
- Redis not ready yet (wait for redis healthcheck)
- Database URL incorrect
- API key too short (< 32 chars)

### QR code not appearing
- Check if the instance already exists: try disconnecting first
- Check logs for errors

### Webhook not receiving messages
- Verify `EVOLUTION_WEBHOOK_URL` is set correctly
- The URL must be accessible from Evolution API (use `http://evolution-api:8080` for internal, or the public URL)

### App can't reach Evolution API
- In the UI config, use `http://evolution-api:8080` (Docker internal network name)
- Not `localhost:8080` — that won't work from inside Docker!

---

## Step 6: Test the Full Flow ✅

After deployment, run through this checklist to verify everything works:

- [ ] **Verify container is running** (Coolify Dashboard → container status shows green)
- [ ] **Check startup logs** (Coolify Dashboard → Logs tab → filter `evolution-api`) — no errors
- [ ] **Health check** (Coolify terminal): `docker logs bizzauto-evolution --tail 20` shows server started
- [ ] **App UI — Evolution tab visible**: Log in to `bizzautoai.com` → WhatsApp Module → Connection tab → **Evolution API tab** appears next to Meta Official API
- [ ] **Configure**: Click Evolution API → Configure Evolution API → enter URL (`http://evolution-api:8080`) and API key → Save → "Evolution API Configured" badge shows
- [ ] **QR Code generation**: Click "Connect & Get QR Code" — QR code image appears on screen
- [ ] **WhatsApp scan**: Open WhatsApp phone app → Linked Devices → Link a Device → Scan QR code
- [ ] **Connection status**: Status changes to "Connected" and phone number appears
- [ ] **Message test (incoming)**: Send a WhatsApp message to your number from another phone — message appears in **Chats** view
- [ ] **Message test (outgoing)**: Reply from BizzAuto app — message delivers on your phone
- [ ] **Disconnect test**: Click Disconnect → status changes to "Disconnected" → can reconnect again

> 💡 If any step fails, check **Coolify Dashboard → Logs** for the `evolution-api` container.

---

## 📋 Quick Rollback

If something goes wrong:

1. **In Coolify**: Remove the `EVOLUTION_API_*` env vars
2. **Redeploy** the old `docker-compose.yml` (without evolution-api service)
3. The app will continue working — WhatsApp just won't have Evolution API mode

Evolution API is **optional** — the app works fine without it using Meta Official API.

If something goes wrong:

1. **In Coolify**: Remove the `EVOLUTION_API_*` env vars
2. **Redeploy** the old `docker-compose.yml` (without evolution-api service)
3. The app will continue working — WhatsApp just won't have Evolution API mode

Evolution API is **optional** — the app works fine without it using Meta Official API.
