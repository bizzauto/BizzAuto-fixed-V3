# 🚀 Setup PostgreSQL + Redis on Windows

Your Super Admin + User Management system is **fully built**. You just need to run PostgreSQL + Redis to activate it.

---

## Option 1: Docker Desktop (Recommended - Easiest)

### Step 1: Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop/
2. Run the installer
3. Restart your PC
4. Open Docker Desktop and wait for it to start (green dot in system tray)

### Step 2: Start Database Services
```bash
# Open PowerShell in your project folder
docker compose -f docker-compose.prod.yml up -d postgres redis
```

### Step 3: Generate Prisma Client
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Step 4: Create Super Admin
```bash
# After starting the backend server:
curl -X POST http://localhost:4000/api/auth/create-super-admin ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"admin@example.com\", \"password\": \"SuperAdmin123!\", \"name\": \"Super Admin\"}"
```

### Step 5: Start Backend
```bash
npm run server
```

---

## Option 2: Manual Installation (No Docker)

### Step 1: Install PostgreSQL

1. Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Choose **PostgreSQL 16** for Windows
3. During installation:
   - Set password: `postgres`
   - Port: `5432`
   - Leave all defaults
4. Add PostgreSQL to PATH:
   - Open Environment Variables
   - Add `C:\Program Files\PostgreSQL\16\bin` to PATH

### Step 2: Install Redis

Redis doesn't have official Windows support, but you can use:

**Option A: Memurai (Recommended for Windows)**
1. Download from: https://www.memurai.com/get-memurai
2. Install and it runs automatically on `localhost:6379`

**Option B: Use WSL2**
```bash
# Enable WSL2
wsl --install

# In WSL terminal:
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Step 3: Update .env File

Edit your `.env` file with the correct database URLs:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas
REDIS_URL=redis://localhost:6379
```

### Step 4: Initialize Database
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Step 5: Start Backend
```bash
npm run server
```

### Step 6: Create Super Admin
```bash
curl -X POST http://localhost:4000/api/auth/create-super-admin ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"admin@example.com\", \"password\": \"SuperAdmin123!\", \"name\": \"Super Admin\"}"
```

Or use **PowerShell** (if curl doesn't work):
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/create-super-admin" -Method POST -ContentType "application/json" -Body '{"email":"admin@example.com","password":"SuperAdmin123!","name":"Super Admin"}'
```

---

## Quick Start Commands

Once everything is set up:

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Restart after code changes
docker compose restart
```

---

## What You Now Have

### 🎯 Super Admin (`SUPER_ADMIN`)
- Dashboard at `/api/super-admin/stats`
- View all businesses and users
- Change plans, suspend accounts
- Platform analytics & revenue tracking
- **UI**: Change `currentUserRole` in `App.tsx` to `SUPER_ADMIN` to see it

### 👥 Team Management (`OWNER` / `ADMIN` only)
- Invite users with email
- Assign roles (Admin, Member, Viewer)
- Suspend/activate users
- Transfer ownership
- Reset passwords

### 👤 User Profile
- Edit name, phone
- Change password with strength meter
- View active sessions
- Delete account option

---

## Test the Frontend (No Database Needed)

The frontend works with **mock data** — no backend required:

```bash
npm run dev
```

Open http://localhost:5173

To see different role views, change this line in `App.tsx`:
```typescript
const currentUserRole = 'OWNER'; // Try: 'SUPER_ADMIN', 'ADMIN', 'MEMBER', 'VIEWER'
```

---

## Troubleshooting

### "Prisma Client not generated"
```bash
npx prisma generate
```

### "Database connection refused"
```bash
# Check if PostgreSQL is running
# Windows:
Get-Service postgresql*

# If not running:
Start-Service postgresql-x64-16
```

### "Redis connection refused"
```bash
# Check if Redis is running
# For Memurai:
Get-Service Memurai

# For WSL Redis:
wsl sudo service redis-server status
```

### "Port already in use"
```bash
# Find what's using the port
netstat -ano | findstr "5432"
netstat -ano | findstr "6379"

# Kill the process
taskkill /F /PID <PID>
```
