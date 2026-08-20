#!/bin/bash
# ============================================
# 🚀 SaaS Automation Platform - VPS Installer
# CloudPE VPS (Ubuntu 22.04/24.04)
# Run as: bash install.sh
# ============================================

set -e  # Exit on error

echo "============================================"
echo "🚀 SaaS Automation Platform Installer"
echo "============================================"
echo ""

# ============ CONFIG ============
read -p "📦 Project directory [/root/saas-app]: " PROJECT_DIR
PROJECT_DIR=${PROJECT_DIR:-/root/saas-app}

read -p "🌐 Domain name (leave empty for IP only): " DOMAIN
DOMAIN=${DOMAIN:-}

read -p "📧 Super Admin Email [admin@yourdomain.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@yourdomain.com}

read -sp "🔒 Super Admin Password: " ADMIN_PASSWORD
echo ""

read -sp "🔑 N8N Password: " N8N_PASSWORD
echo ""

# Generate secrets
echo ""
echo "🔐 Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/' | tr -d '+')
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/' | tr -d '+')

echo "✅ Secrets generated"

# ============ STEP 1: System Update ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Updating system..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
apt update && apt upgrade -y
apt install -y curl git wget nano ufw net-tools
timedatectl set-timezone Asia/Kolkata
echo "✅ System updated"

# ============ STEP 2: Install Docker ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Step 2: Installing Docker..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v docker &> /dev/null; then
    echo "✅ Docker already installed"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
    echo "✅ Docker Compose plugin installed"
else
    echo "✅ Docker Compose already installed"
fi

# ============ STEP 3: Firewall ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛡️ Step 3: Configuring firewall..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ Firewall configured"

# ============ STEP 4: Clone/Setup Project ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Step 4: Setting up project..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "$PROJECT_DIR" ]; then
    echo "✅ Project directory exists at $PROJECT_DIR"
    cd "$PROJECT_DIR"
else
    read -p "Git repository URL (leave empty to skip): " GIT_URL
    if [ -n "$GIT_URL" ]; then
        git clone "$GIT_URL" "$PROJECT_DIR"
        cd "$PROJECT_DIR"
        echo "✅ Project cloned from Git"
    else
        mkdir -p "$PROJECT_DIR"
        cd "$PROJECT_DIR"
        echo "✅ Directory created. Upload project files to $PROJECT_DIR"
        echo "⚠️  Use WinSCP or FileZilla to upload files, then re-run this script"
        exit 1
    fi
fi

# ============ STEP 5: Create .env ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️ Step 5: Creating .env file..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Determine CORS origin
if [ -n "$DOMAIN" ]; then
    CORS_ORIGIN="https://$DOMAIN"
    BASE_URL="https://$DOMAIN"
else
    CORS_ORIGIN="*"
    BASE_URL="http://0.0.0.0"
fi

cat > .env << ENVEOF
# ============ SERVER ============
NODE_ENV=production
PORT=4000
BASE_URL=$BASE_URL

# ============ DATABASE ============
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@postgres:5432/whatsapp_saas?schema=public

# ============ JWT SECRETS ============
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=30d

# ============ CORS ============
CORS_ORIGIN=$CORS_ORIGIN

# ============ ENCRYPTION ============
ENCRYPTION_KEY=$ENCRYPTION_KEY

# ============ AI PROVIDERS ============
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
GROK_API_KEY=xai-YOUR_KEY_HERE
NVIDIA_API_KEY=nvapi-YOUR_KEY_HERE

# ============ WHATSAPP ============
META_APP_ID=YOUR_META_APP_ID
META_APP_SECRET=YOUR_META_APP_SECRET
WHATSAPP_REDIRECT_URL=$BASE_URL/api/whatsapp/callback
WHATSAPP_API_VERSION=v18.0

# ============ RAZORPAY ============
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
RAZORPAY_KEY_SECRET=YOUR_SECRET

# ============ REDIS ============
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# ============ EMAIL ============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ============ STORAGE ============
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=uploads

# ============ N8N ============
N8N_URL=http://n8n:5678
N8N_PASSWORD=$N8N_PASSWORD

# ============ LOGGING ============
LOG_LEVEL=info
ENVEOF

echo "✅ .env file created"
echo ""
echo "⚠️  IMPORTANT: Edit .env and add your real API keys!"
echo "   nano .env"

# ============ STEP 6: Create required dirs ============
mkdir -p uploads logs backups

# ============ STEP 7: Remove public DB/Redis ports from docker-compose.prod.yml ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Step 6: Securing docker-compose..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "docker-compose.prod.yml" ]; then
    # Remove public port mappings for postgres and redis (security)
    if grep -q '"5432:5432"' docker-compose.prod.yml; then
        sed -i '/"5432:5432"/d' docker-compose.prod.yml
        echo "✅ Removed PostgreSQL public port"
    fi
    if grep -q '"6379:6379"' docker-compose.prod.yml; then
        sed -i '/"6379:6379"/d' docker-compose.prod.yml
        echo "✅ Removed Redis public port"
    fi
fi

# ============ STEP 8: Build & Start ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Step 7: Building and starting services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be healthy..."
sleep 30

# ============ STEP 9: Database Setup ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️ Step 8: Initializing database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy || echo "⚠️  Migration had issues, check logs"
docker compose -f docker-compose.prod.yml exec -T app npx prisma generate

# ============ STEP 10: Create Super Admin ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👤 Step 9: Creating super admin..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 5
curl -s -X POST http://localhost:4000/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"name\": \"Super Admin\"
  }" || echo "⚠️  Super admin creation failed. Run manually later:"

echo ""

# ============ STEP 11: Status ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ INSTALLATION COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Services status:"
docker compose -f docker-compose.prod.yml ps
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "🌐 Access your app:"
echo "   Frontend:  http://$SERVER_IP:5173"
echo "   Backend:   http://$SERVER_IP:4000"
echo "   n8n:       http://$SERVER_IP:5678"
echo ""
echo "🔐 Super Admin Login:"
echo "   Email:    $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "📁 Project: $PROJECT_DIR"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Edit .env with real API keys: nano $PROJECT_DIR/.env"
echo "   2. Restart after editing: docker compose -f docker-compose.prod.yml restart"
echo "   3. Import n8n workflows from: $PROJECT_DIR/n8n/workflows.json"
echo "   4. Setup SSL (see VPS_DEPLOYMENT_GUIDE.md)"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "   Restart:       docker compose -f docker-compose.prod.yml restart"
echo "   Stop:          docker compose -f docker-compose.prod.yml down"
echo "   Start:         docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "🎉 Done!"
