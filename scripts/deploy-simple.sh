#!/bin/bash

# ============================================
# 🚀 Simple VPS Deployment Script
# ============================================
# यह script automatically:
# 1. पुराना code backup करेगी
# 2. पुराने containers रोकेगी
# 3. नया project deploy करेगी
# 4. सब कुछ start करेगी
# ============================================

echo "=========================================="
echo "🚀 VPS Deployment Script Starting..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================
# STEP 1: Backup
# ============================================
echo -e "${YELLOW}[1/7] Creating backup...${NC}"

cd /root
mkdir -p backups

# Backup database if exists
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✓ Backing up database...${NC}"
    docker exec $(docker ps -q -f name=postgres) pg_dump -U postgres whatsapp_saas > backups/db_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo "No database to backup"
fi

# Backup .env if exists
if [ -f "saas-app/.env" ]; then
    echo -e "${GREEN}✓ Backing up .env file...${NC}"
    cp saas-app/.env backups/env_backup_$(date +%Y%m%d_%H%M%S)
fi

echo -e "${GREEN}✓ Backup completed!${NC}"
echo ""

# ============================================
# STEP 2: Stop Old Containers
# ============================================
echo -e "${YELLOW}[2/7] Stopping old containers...${NC}"

if [ -d "saas-app" ]; then
    cd saas-app
    docker compose -f docker-compose.prod.yml down 2>/dev/null || docker compose down 2>/dev/null || echo "No containers to stop"
    cd /root
fi

echo -e "${GREEN}✓ Old containers stopped${NC}"
echo ""

# ============================================
# STEP 3: Move Old Project
# ============================================
echo -e "${YELLOW}[3/7] Moving old project to backup...${NC}"

if [ -d "saas-app" ]; then
    mv saas-app backups/saas-app-old-$(date +%Y%m%d_%H%M%S)
fi

echo -e "${GREEN}✓ Old project moved${NC}"
echo ""

# ============================================
# STEP 4: Setup New Project
# ============================================
echo -e "${YELLOW}[4/7] Setting up new project...${NC}"

# Check if new project exists
if [ -d "my project" ]; then
    mv "my project" saas-app
    echo -e "${GREEN}✓ New project renamed${NC}"
elif [ -d "saas-app-new" ]; then
    mv saas-app-new saas-app
    echo -e "${GREEN}✓ New project renamed${NC}"
else
    echo -e "${RED}✗ New project not found!${NC}"
    echo "Please upload your project to /root/my project or /root/saas-app-new first"
    exit 1
fi

cd saas-app

echo -e "${GREEN}✓ New project ready${NC}"
echo ""

# ============================================
# STEP 5: Setup Environment
# ============================================
echo -e "${YELLOW}[5/7] Setting up environment...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file with your actual values!${NC}"
        echo -e "${YELLOW}  Run: nano .env${NC}"
    else
        echo -e "${RED}✗ .env.example not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo -e "${GREEN}✓ Environment setup complete${NC}"
echo ""

# ============================================
# STEP 6: Build & Start
# ============================================
echo -e "${YELLOW}[6/7] Building Docker images...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes, please wait...${NC}"

docker compose -f docker-compose.prod.yml build

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${YELLOW}[7/7] Starting containers...${NC}"

docker compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}✓ Containers started${NC}"
echo ""

# Wait for containers to be ready
echo -e "${YELLOW}Waiting for containers to be ready...${NC}"
sleep 10

# ============================================
# STEP 7: Database Setup
# ============================================
echo -e "${YELLOW}Setting up database...${NC}"

docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec -T app npx prisma generate

echo -e "${GREEN}✓ Database setup complete${NC}"
echo ""

# ============================================
# Done!
# ============================================
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=========================================="
echo ""

echo -e "${GREEN}Container Status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

# Get VPS IP
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")

echo -e "${GREEN}Access URLs:${NC}"
echo -e "  Frontend:  http://$VPS_IP:5173"
echo -e "  Backend:   http://$VPS_IP:4000"
echo -e "  n8n:       http://$VPS_IP:5678"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Create admin account:"
echo -e "     curl -X POST http://$VPS_IP:4000/api/auth/create-super-admin \\"
echo -e "       -H \"Content-Type: application/json\" \\"
echo -e "       -d '{\"email\":\"admin@yourdomain.com\",\"password\":\"Admin@Secure123!\",\"name\":\"Admin\"}'"
echo ""
echo -e "  2. View logs: docker compose -f docker-compose.prod.yml logs -f"
echo -e "  3. Check health: curl http://$VPS_IP:4000/health"
echo ""

echo -e "${GREEN}✓ Backup saved to: /root/backups${NC}"
echo ""

echo "=========================================="
