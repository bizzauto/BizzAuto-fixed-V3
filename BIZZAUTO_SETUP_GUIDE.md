# BizzAuto CRM - Setup Guide & Backup

## 📋 Project Overview
- **App Name:** BizzAuto CRM (my-project-11.4.1)
- **Domain:** https://bizzautoai.com
- **Type:** Full-stack CRM (React + Express + PostgreSQL)
- **GitHub:** https://github.com/bizzauto/my-project-11.4.1
- **Deploy:** Coolify (Docker)

---

## 🖥️ Coolify Settings

### General
| Setting | Value |
|---------|-------|
| Name | my-project-11.4.1 |
| Build Pack | Dockerfile |
| Domains | https://bizzautoai.com |
| Port | 3000 |
| Network | coolify |

### Environment Variables
| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@zby7dsx9s8cdbx17e3xu3c0z:5432/postgres` | ✅ |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ✅ |

### Docker Build
```bash
# Build locally
npm run build

# Build Docker image
docker build -t bizzauto .
```

---

## 🗄️ Supabase (PostgreSQL)
- **Project URL:** https://supabase.bizzautoai.com
- **Database Host:** zby7dsx9s8cdbx17e3xu3c0z
- **Port:** 5432
- **Connection String:** PostgreSQL direct connection
- **Note:** Only PostgreSQL is used (NOT Supabase Auth)

---

## 📦 Prisma Schema
**File:** `prisma/schema.prisma`

### Models (36 total)
```
User, Business, Subscription, Contact, Pipeline, Stage, Activity,
Message, MessageTemplate, Campaign, Appointment, Product, ProductVariant,
Order, OrderItem, LedgerEntry, Coupon, Document, DocumentTemplate, Post,
Review, Integration, AIContent, AutomationRule, WorkflowRun, WingsStore,
AutopilotSettings, AuditLog, Notification, ThemePreference, ECommerceStore,
PosterTemplate, Invoice, LeadScore, WhiteLabel,
Webhook, ApiKey, ChatbotFlow, ScheduledMessage, DripQueue, AutoReply
```

### Enums
- `Role`: SUPER_ADMIN, OWNER, ADMIN, MEMBER, VIEWER
- `Plan`: FREE, BASIC, PROFESSIONAL, ENTERPRISE, AGENCY

### Key Indexes
- 63 performance indexes across all tables

---

## 🚀 Deployment Commands

### Local Development
```bash
npm run dev         # Frontend (Vite React)
npm run server      # Backend (Express)
npm run dev:full    # Both together
```

### Production Build
```bash
npm run build       # Builds client + server + worker
npm start           # Runs in production
```

### Database
```bash
npx prisma generate      # Generate client after schema change
npx prisma db push       # Push schema to DB (migration-less)
npx prisma studio        # Open DB GUI
```

---

## 🔧 Key Files Reference

### Server
| File | Purpose |
|------|---------|
| `src/server/index.ts` | Main server entry - middleware, routes, SPA fallback |
| `src/server/routes/*.ts` | 31 API route files |
| `src/server/services/*.ts` | Business logic services |
| `src/server/middleware/*.ts` | Auth, CSRF, API version middleware |
| `scripts/build-server.js` | ESBuild server bundler |

### Frontend
| File | Purpose |
|------|---------|
| `src/main.tsx` | React entry point |
| `src/AppWrapper.tsx` | Router + route definitions |
| `src/lib/api.ts` | Axios API client (baseURL: `/api`) |
| `src/lib/authStore.ts` | Zustand auth store |
| `src/components/*.tsx` | React page components |

### Config
| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build config |
| `Dockerfile` | Docker multi-stage build |
| `nixpacks.toml` | Alternative build config |
| `tsconfig.server.json` | Server TS config |
| `package.json` | All dependencies & scripts |

---

## 🔐 Security Notes
- JWT tokens expire in 7 days (configurable)
- CORS allows only https://bizzautoai.com
- Helmet CSP whitelists: Razorpay, Google Fonts, CDN
- CSRF protection on all API routes (except auth)
- Rate limiting on auth routes

---

## 🧪 Seeding Test User
```bash
# Via API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass1234","name":"Test","businessName":"MyBiz","businessType":"general"}'

# Via script
node scripts/seed-user.js
```

---

## 🛠️ Common Fixes

### 1. White Screen / Empty Build
Check `index.html` has:
```html
<script type="module" src="/src/main.tsx"></script>
```

### 2. "Route not found" on API calls
Check axios baseURL in `src/lib/api.ts`:
```ts
baseURL: '/api'  // Should be hardcoded, not env-dependent
```

### 3. 500 Errors on Pages
Run `prisma db push` to sync schema. Missing models? Add them to schema.

### 4. Service Worker serving old files
Bump version in `public/sw.js`:
```js
const CACHE_NAME = 'bizzauto-v[NEW]';
```

---

## 📝 Prompt to Recreate This Project

```
Create a full-stack CRM application with the following stack:

**Frontend:** React 19 + Vite 7 + TailwindCSS 4 + TypeScript
**Backend:** Express 4 + TypeScript (bundled with ESBuild)
**Database:** PostgreSQL via Prisma ORM
**Auth:** JWT-based (bcrypt + jsonwebtoken)
**Deploy:** Docker multi-stage → Coolify

**Features needed:**
1. User registration/login with JWT auth
2. Role-based access (OWNER, ADMIN, MEMBER, SUPER_ADMIN)
3. Dashboard with analytics (recharts charts)
4. CRM module (contacts, deals, invoices, appointments)
5. WhatsApp Business integration (Evolution API)
6. E-commerce store (products, orders, cart)
7. Email marketing (campaigns, templates, drips)
8. Lead generation (manual + IndiaMART import)
9. Social media post scheduler
10. Appointment booking
11. Document management
12. Reviews management
13. AI chatbot
14. Automation rules
15. White-label settings
16. Two-factor authentication
17. Audit logging
18. API keys management
19. Team management
20. File uploads

**Key Technical Requirements:**
- All API routes at `/api/*`
- SPA fallback for React routes (serve index.html for non-API paths)
- Proper CSP headers (allow Razorpay, Google Fonts)
- CORS configured for production domain
- Service Worker for offline support
- Prisma db push (no migration files needed)
- ESBuild for server bundling (no TypeScript checking at runtime)
- Zustand for state management
- react-i18next for translations
- Radix UI for accessible components
- Axios with baseURL: '/api' (no env vars for API URL)
```
