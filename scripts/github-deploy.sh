#!/bin/bash

# ============================================
# 🚀 GitHub से VPS Deploy Script
# ============================================
# यह script automatically:
# 1. Git install karegi (agar nahi hai)
# 2. GitHub se project clone karegi
# 3. Purana code clean karegi
# 4. Naya project deploy karegi
# ============================================

echo "=========================================="
echo "🚀 GitHub Deployment Script Starting..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================
# STEP 1: Check Git Installation
# ============================================
echo -e "${YELLOW}[1/8] Checking Git installation...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}⚠ Git not found, installing...${NC}"
    apt update
    apt install -y git
    echo -e "${GREEN}✓ Git installed${NC}"
else
    echo -e "${GREEN}✓ Git already installed${NC}"
fi

echo ""

# ============================================
# STEP 2: Get GitHub Repository URL
# ============================================
echo -e "${YELLOW}[2/8] Getting GitHub repository URL...${NC}"

# Ask for GitHub URL
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " GITHUB_URL

if [ -z "$GITHUB_URL" ]; then
    echo -e "${RED}✗ GitHub URL is required!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ GitHub URL: $GITHUB_URL${NC}"
echo ""

# ============================================
# STEP 3: Backup Existing Data
# ============================================
echo -e "${YELLOW}[3/8] Creating backup of existing data...${NC}"

cd /root
mkdir -p backups

# Backup PostgreSQL database if exists
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✓ Backing up PostgreSQL database...${NC}"
    docker exec $(docker ps -q -f name=postgres) pg_dump -U postgres whatsapp_saas > backups/db_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo -e "${YELLOW}⚠ No database to backup${NC}"
fi

# Backup .env file if exists
if [ -f "saas-app/.env" ]; then
    echo -e "${GREEN}✓ Backing up .env file...${NC}"
    cp saas-app/.env backups/env_backup_$(date +%Y%m%d_%H%M%S)
fi

echo -e "${GREEN}✓ Backup completed!${NC}"
echo ""

# ============================================
# STEP 4: Stop Old Containers
# ============================================
echo -e "${YELLOW}[4/8] Stopping old containers...${NC}"

if [ -d "saas-app" ]; then
    cd saas-app
    docker compose -f docker-compose.prod.yml down 2>/dev/null || docker compose down 2>/dev/null || echo -e "${YELLOW}⚠ No containers to stop${NC}"
    cd /root
fi

# Also try to stop any running containers
docker stop $(docker ps -aq) 2>/dev/null || echo -e "${YELLOW}⚠ No running containers${NC}"

echo -e "${GREEN}✓ All containers stopped${NC}"
echo ""

# ============================================
# STEP 5: Remove Old Project
# ============================================
echo -e "${YELLOW}[5/8] Removing old project...${NC}"

if [ -d "saas-app" ]; then
    echo -e "${GREEN}✓ Moving old project to backup...${NC}"
    mv saas-app backups/saas-app-old-$(date +%Y%m%d_%H%M%S)
else
    echo -e "${YELLOW}⚠ No old project found${NC}"
fi

echo -e "${GREEN}✓ Old project removed${NC}"
echo ""

# ============================================
# STEP 6: Clone GitHub Repository
# ============================================
echo -e "${YELLOW}[6/8] Cloning GitHub repository...${NC}"

echo -e "${GREEN}✓ Cloning from: $GITHUB_URL${NC}"
git clone "$GITHUB_URL" saas-app

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to clone repository!${NC}"
    echo -e "${YELLOW}Check your GitHub URL and internet connection${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Repository cloned successfully${NC}"
echo ""

# ============================================
# STEP 7: Deploy Project
# ============================================
echo -e "${YELLOW}[7/8] Deploying project...${NC}"

cd saas-app

# Check if deployment script exists
if [ -f "scripts/deploy-simple.sh" ]; then
    echo -e "${GREEN}✓ Running deployment script...${NC}"
    chmod +x scripts/deploy-simple.sh
    ./scripts/deploy-simple.sh
else
    echo -e "${YELLOW}⚠ No deployment script found, using manual deployment...${NC}"
    
    # Manual deployment steps
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
    fi
    
    echo -e "${GREEN}✓ Building Docker images...${NC}"
    docker compose -f docker-compose.prod.yml build
    
    echo -e "${GREEN}✓ Starting containers...${NC}"
    docker compose -f docker-compose.prod.yml up -d
    
    sleep 10
    
    echo -e "${GREEN}✓ Setting up database...${NC}"
    docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
    docker compose -f docker-compose.prod.yml exec -T app npx prisma generate
fi

echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# ============================================
# STEP 8: Verify Deployment
# ============================================
echo -e "${YELLOW}[8/8] Verifying deployment...${NC}"

echo -e "${GREEN}Container Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}Health Check:${NC}"
curl -s http://localhost:4000/health || echo -e "${YELLOW}⚠ Health check failed${NC}"

echo ""

# ============================================
# Done!
# ============================================
echo "=========================================="
echo -e "${GREEN}🎉 GitHub Deployment Complete!${NC}"
echo "=========================================="
echo ""

# Get VPS IP
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")

echo -e "${GREEN}Access URLs:${NC}"
echo -e "  Frontend:  http://$VPS_IP:5173"
echo -e "  Backend:   http://$VPS_IP:4000"
echo -e "  n8n:       http://$VPS_IP:5678"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Edit .env file with your actual values:"
echo -e "     cd /root/saas-app"
echo -e "     nano .env"
echo ""
echo -e "  2. Create admin account:"
echo -e "     curl -X POST http://$VPS_IP:4000/api/auth/create-super-admin \\"
echo -e "       -H \"Content-Type: application/json\" \\"
echo -e "       -d '{\"email\":\"admin@yourdomain.com\",\"password\":\"Admin@Secure123!\",\"name\":\"Admin\"}'"
echo ""
echo -e "  3. View logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""

echo -e "${GREEN}✓ Backup saved to: /root/backups${NC}"
echo -e "${GREEN}✓ GitHub repository: $GITHUB_URL${NC}"
echo ""

echo "=========================================="