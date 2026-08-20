#!/bin/bash

# ============================================
# 🧹 VPS Clean Script - Purana Code Hatao
# ============================================
# यह script automatically:
# 1. Existing data backup karegi
# 2. Sab containers rokegi
# 3. Purana code hata degi
# 4. Docker images clean karegi
# ============================================

echo "=========================================="
echo "🧹 VPS Clean Script Starting..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================
# STEP 1: Backup Existing Data
# ============================================
echo -e "${YELLOW}[1/5] Creating backup of existing data...${NC}"

cd /root
mkdir -p backups

# Backup PostgreSQL database if exists
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✓ Backing up PostgreSQL database...${NC}"
    docker exec $(docker ps -q -f name=postgres) pg_dump -U postgres whatsapp_saas > backups/db_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo -e "${YELLOW}⚠ No database to backup${NC}"
fi

# Backup uploads directory if exists
if [ -d "saas-app/uploads" ]; then
    echo -e "${GREEN}✓ Backing up uploads directory...${NC}"
    tar -czf backups/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C saas-app uploads 2>/dev/null || echo -e "${YELLOW}⚠ No uploads to backup${NC}"
fi

# Backup .env file if exists
if [ -f "saas-app/.env" ]; then
    echo -e "${GREEN}✓ Backing up .env file...${NC}"
    cp saas-app/.env backups/env_backup_$(date +%Y%m%d_%H%M%S)
fi

echo -e "${GREEN}✓ Backup completed!${NC}"
echo ""

# ============================================
# STEP 2: Stop All Containers
# ============================================
echo -e "${YELLOW}[2/5] Stopping all containers...${NC}"

# Stop containers if docker-compose files exist
if [ -f "saas-app/docker-compose.yml" ] || [ -f "saas-app/docker-compose.prod.yml" ]; then
    cd saas-app
    docker compose -f docker-compose.prod.yml down 2>/dev/null || docker compose down 2>/dev/null || echo -e "${YELLOW}⚠ No containers to stop${NC}"
    cd /root
fi

# Also try to stop any running containers
docker stop $(docker ps -aq) 2>/dev/null || echo -e "${YELLOW}⚠ No running containers${NC}"

echo -e "${GREEN}✓ All containers stopped${NC}"
echo ""

# ============================================
# STEP 3: Remove Old Project
# ============================================
echo -e "${YELLOW}[3/5] Removing old project...${NC}"

if [ -d "saas-app" ]; then
    echo -e "${GREEN}✓ Moving old project to backup...${NC}"
    mv saas-app backups/saas-app-old-$(date +%Y%m%d_%H%M%S)
else
    echo -e "${YELLOW}⚠ No old project found${NC}"
fi

echo -e "${GREEN}✓ Old project removed${NC}"
echo ""

# ============================================
# STEP 4: Clean Docker Resources
# ============================================
echo -e "${YELLOW}[4/5] Cleaning Docker resources...${NC}"

# Remove all stopped containers
echo -e "${GREEN}✓ Removing stopped containers...${NC}"
docker container prune -f

# Remove unused images
echo -e "${GREEN}✓ Removing unused images...${NC}"
docker image prune -a -f

# Remove unused volumes (WARNING: This will delete all volumes!)
echo -e "${YELLOW}⚠ Removing unused volumes...${NC}"
read -p "Do you want to remove ALL Docker volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume prune -f
    echo -e "${GREEN}✓ All volumes removed${NC}"
else
    echo -e "${YELLOW}⚠ Volumes kept${NC}"
fi

# Remove unused networks
echo -e "${GREEN}✓ Removing unused networks...${NC}"
docker network prune -f

echo -e "${GREEN}✓ Docker resources cleaned${NC}"
echo ""

# ============================================
# STEP 5: Verify Cleanup
# ============================================
echo -e "${YELLOW}[5/5] Verifying cleanup...${NC}"

echo -e "${GREEN}Docker Status:${NC}"
docker ps -a

echo ""
echo -e "${GREEN}Disk Usage:${NC}"
df -h

echo ""
echo -e "${GREEN}Docker Disk Usage:${NC}"
docker system df

echo ""

# ============================================
# Done!
# ============================================
echo "=========================================="
echo -e "${GREEN}🎉 Cleanup Complete!${NC}"
echo "=========================================="
echo ""

echo -e "${GREEN}✓ Backup saved to: /root/backups${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Upload your new project to /root/my project"
echo -e "  2. Run deployment script: ./my\ project/scripts/deploy-simple.sh"
echo ""

echo "=========================================="
