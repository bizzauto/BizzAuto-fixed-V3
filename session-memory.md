# Session Memory

> **Last Updated:** May 31, 2026  
> **Next Session Prompt:** "session-memory.md padho aur wahan se continue karo"

---

## ✅ Fixes Applied This Session

### 0. Removed @ts-nocheck from backend files (already done in previous session)
- **7 files verified clean:** `posters.ts`, `reviews.ts`, `google-business.ts`, `workers/index.ts`, `google-sheets.service.ts`, `lead-capture.service.ts`, `ai.service.ts`
- ✅ Already fixed — no action needed

### 1. WhatsApp Module — Messages Not Loading
- **Issue:** `evolutionAPI.getMessages` was using `GET` but backend route expects `POST`
- **Fix:** Changed to `apiClient.post('/evolution/messages', data)`
- **Result:** WhatsApp messages now load when Evolution API is connected (falls back to Meta API)
- **File:** `src/components/WhatsAppModule.tsx` (line 154)

### 2. WhatsApp Dark Mode — 3 Rounds of Fixes

**Round 1:** 352+ `dark:` Tailwind variants for major UI areas
- Chat sidebar, message bubbles, input bar, chat window
- QR Connect view, Broadcast view, Templates, Settings
- All deployed to VPS

**Round 2:** Button-specific fixes
- `hover:bg-gray-200` → `dark:hover:bg-gray-600`
- `hover:bg-gray-100` → `dark:hover:bg-gray-700`
- Toggle handles, +Add buttons, generic action buttons

**Round 3 (Final):** Container & nav bar backgrounds
- `bg-gray-100` → `dark:bg-gray-900` (main container)
- `bg-white border-b` → `dark:bg-gray-800 dark:border-gray-700` (nav bar)
- `bg-green-50` → `dark:bg-green-900/30` (active nav tab)
- `flex-1 flex flex-col bg-gray-50` → `dark:bg-gray-800` (sub-views)
- `hover:bg-gray-50` → `dark:hover:bg-gray-700`
- **File:** `src/components/WhatsAppModule.tsx`

### 3. AppWrapper — React Router Fix
- **Issue:** Used `window.location.pathname` instead of React Router's `useLocation()`
- **Fix:** Added `useLocation` hook from react-router-dom
- **File:** `src/AppWrapper.tsx`

### 4. Auth Middleware — Dynamic Import → Static Import
- **Issue:** `await import('../services/csrf.service.js')` inside request handler (latency)
- **Fix:** Moved to top-level `import { CSRFService } from '../services/csrf.service.js'`
- **File:** `src/server/middleware/auth.ts`

---

## 🚀 Deployment Info

| Detail | Value |
|--------|-------|
| **VPS IP** | 87.76.169.6 |
| **Container** | `wxxl6hhh02j9yf7m3u8452qo-025442012803` |
| **SSH Key** | `bizzauto-new-key` (in project root) |
| **Domain** | https://bizzautoai.com |
| **Login Email** | `bizzautoai.solution@gmail.com` |
| **Login Password** | `Admin@123456` |
| **Build Command** | `npx vite build --minify false` |
| **Deploy Method** | `tar → scp → docker cp → tar extract → docker restart` |
| **Latest Bundle** | `index-WvYqIJIA.js` |
| **Server Port** | `0.0.0.0:3000` (production mode) |

---

## 🐛 Remaining Known Bugs

### 🔴 Critical (Security)
1. **Lead capture webhooks** (IndiaMART, JustDial, Facebook) — bina authentication ke, koi bhi businessId daal kar fake leads bhej sakta hai
2. **WhatsApp webhook** — bina token verification ke, koi bhi POST kare to data accept ho jata hai
3. **JWT_SECRET hardcoded fallback** — `'dev-jwt-secret-do-not-use-in-production'` — env set nahi hai to insecure key use hoti hai
4. **ENCRYPTION_KEY random har restart pe** — saara encrypted data bekaar ho jata hai

### 🟠 High
6. **`prisma['autoReply']` bracket notation** — agar Prisma model name match nahi kiya to runtime error
7. **Auth middleware `lastLoginAt` update har request pe** — performance issue (har API call pe DB write)
8. **DashboardPage `&#8377;` HTML entity** — ₹ symbol proper render nahi ho raha
9. **Duplicate CSS in index.css** — `@keyframes shimmer`, `.gradient-text`, `.hover-lift` etc. 2 baar defined
10. **Dynamic `import()` inside request handlers** — `auth.ts`, `leads.ts` mein baar-baar latency

### 🟡 Medium
11. **Review model missing `isRead` field** — Prisma schema mein nahi hai par code use kar raha hai
12. **Google Business API wrong URLs** — wrong URL format for locations endpoint
13. **CSV export bina row limit ke** — 50,000 leads export karega to server crash
14. **LeadProcessingWorker is a stub** — hamesha `{ processed: true }` return karta hai
15. **Leads stats group by month nahi, by timestamp ho raha hai**

---

## 📋 Quick Commands Reference

```bash
# Build (both client + server)
npx vite build --minify false

# TypeScript check
npx tsc --noEmit

# Deploy to VPS
rm -f /tmp/bizzauto-dist.tar.gz
tar -czf /tmp/bizzauto-dist.tar.gz -C dist .
scp -o StrictHostKeyChecking=no -i /tmp/codebuff_vps_key /tmp/bizzauto-dist.tar.gz root@87.76.169.6:/tmp/
ssh -o StrictHostKeyChecking=no -i /tmp/codebuff_vps_key root@87.76.169.6 'docker cp /tmp/bizzauto-dist.tar.gz wxxl6hhh02j9yf7m3u8452qo-172327323448:/tmp/'
ssh -o StrictHostKeyChecking=no -i /tmp/codebuff_vps_key root@87.76.169.6 'docker exec wxxl6hhh02j9yf7m3u8452qo-172327323448 sh -c "rm -rf /app/dist && mkdir -p /app/dist && cd /app/dist && tar -xzf /tmp/bizzauto-dist.tar.gz && rm -f /tmp/bizzauto-dist.tar.gz"'
ssh -o StrictHostKeyChecking=no -i /tmp/codebuff_vps_key root@87.76.169.6 'docker restart wxxl6hhh02j9yf7m3u8452qo-172327323448'
```

---

## 🎙️ Dograh Voice AI Integration

### Status: Using Cloud (VPS CPU Incompatible)
- VPS CPU (Common KVM processor) only supports SSE/SSE2
- numpy 2.4.6 requires X86_V2 (SSE4.2+) — numpy 2.x hard-redirects SSE→X86_V2
- All rebuild attempts (`cpu-baseline=min`, `disable-optimization=true`) failed
- **Solution**: Dograh Cloud (api.dograh.com) until CPU is fixed

### Traefik Reverse Proxy (Ready)
- `voice.bizzautoai.com` → `https://api.dograh.com` (Traefik config loaded)
- ⚠️ **DNS A record NOT set** — add `voice.bizzautoai.com` → `87.76.169.6`
- Old Docker containers cleaned from VPS

### What User Needs To Do
1. Sign up at https://app.dograh.com
2. Settings → API Keys → Create Key
3. In IndiaCRM: Settings → Voice AI → configure API URL (`https://api.dograh.com`) + API Key
4. Add DNS A record for `voice.bizzautoai.com`
5. Later: change VPS CPU to "host" mode via provider, then switch back to self-hosted

### Code Ready
- Prisma schema: CallLog, Wallet, WalletTransaction, PlatformEarning + Business dograh fields
- `src/server/services/dograh.service.ts`: Full Dograh API client
- `src/server/routes/voice-calls.ts`, `dograh-webhook.ts`, `wallet.ts`
- `src/components/VoiceCallPage.tsx`, `DograhSettings.tsx`, `WalletWidget.tsx`, `WalletHistory.tsx`, `PlatformEarnings.tsx`
- `.env`: Updated with Dograh Cloud defaults

---

## 🔧 Useful Files

| File | Purpose |
|------|---------|
| `src/components/WhatsAppModule.tsx` | Main WhatsApp module (2464 lines, dark mode fixed) |
| `src/AppWrapper.tsx` | Layout with React Router fixes |
| `src/server/middleware/auth.ts` | Auth middleware (static CSRF import) |
| `src/index.css` | Global CSS (has some duplicates) |
| `package.json` | Build scripts |
| `AGENTS.md` | Project agent guidance |
| `MEMORY.md` | Previous project-level memory |
