#!/bin/bash

# ============================================
# 🔄 VPS Reset Script - Complete Clean
# ============================================
# यह script automatically:
# 1. Sab containers rokegi
# 2. Sab Docker resources clean karegi
# 3. Purana project hata degi
# 4. Sab volumes delete karegi
# 5. VPS ko fresh state mein le aayegi
# ============================================

echo "=========================================="
echo "🔄 VPS Reset Script Starting..."
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================
# STEP 1: Warning
# ============================================
echo -e "${RED}⚠ WARNING: This will delete ALL data!${NC}"
echo -e "${RED}⚠ This includes:${NC}"
echo -e "${RED}  - All Docker containers${NC}"
echo -e "${RED}  - All Docker images${NC}"
echo -e "${RED}  - All Docker volumes${NC}"
echo -e "${RED}  - All project files${NC}"
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Reset cancelled${NC}"
    exit 0
fi

# ============================================
# STEP 2: Backup Important Files
# ============================================
echo -e "${YELLOW}[1/6] Creating backup of important files...${NC}"

cd /root
mkdir -p backups

# Backup .env file if exists
if [ -f "saas-app/.env" ]; then
    echo -e "${GREEN}✓ Backing up .env file...${NC}"
    cp saas-app/.env backups/env_backup_$(date +%Y%m%d_%H%M%S)
fi

# Backup database if exists
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✓ Backing up database...${NC}"
    docker exec $(docker ps -q -f name=postgres) pg_dump -U postgres whatsapp_saas > backups/db_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo -e "${YELLOW}⚠ No database to backup${NC}"
fi

echo -e "${GREEN}✓ Backup completed${NC}"
echo ""

# ============================================
# STEP 3: Stop All Containers
# ============================================
echo -e "${YELLOW}[2/6] Stopping all containers...${NC}"

# Stop all running containers
echo -e "${GREEN}✓ Stopping all Docker containers...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || echo -e "${YELLOW}⚠ No containers to stop${NC}"

# Remove all containers
echo -e "${GREEN}✓ Removing all Docker containers...${NC}"
docker rm $(docker ps -aq) 2>/dev/null || echo -e "${YELLOW}⚠ No containers to remove${NC}"

echo -e "${GREEN}✓ All containers stopped and removed${NC}"
echo ""

# ============================================
# STEP 4: Remove All Docker Resources
# ============================================
echo -e "${YELLOW}[3/6] Removing all Docker resources...${NC}"

# Remove all images
echo -e "${GREEN}✓ Removing all Docker images...${NC}"
docker rmi $(docker images -q) 2>/dev/null || echo -e "${YELLOW}⚠ No images to remove${NC}"

# Remove all volumes
echo -e "${GREEN}✓ Removing all Docker volumes...${NC}"
docker volume rm $(docker volume ls -q) 2>/dev/null || echo -e "${YELLOW}⚠ No volumes to remove${NC}"

# Remove all networks
echo -e "${GREEN}✓ Removing all Docker networks...${NC}"
docker network rm $(docker network ls -q) 2>/dev/null || echo -e "${YELLOW}⚠ No networks to remove${NC}"

# Prune everything
echo -e "${GREEN}✓ Pruning all Docker resources...${NC}"
docker system prune -a --volumes -f

echo -e "${GREEN}✓ All Docker resources removed${NC}"
echo ""

# ============================================
# STEP 5: Remove Project Files
# ============================================
echo -e "${YELLOW}[4/6] Removing project files...${NC}"

# Remove saas-app directory
if [ -d "saas-app" ]; then
    echo -e "${GREEN}✓ Removing saas-app directory...${NC}"
    rm -rf saas-app
fi

# Remove my project directory
if [ -d "my project" ]; then
    echo -e "${GREEN}✓ Removing my project directory...${NC}"
    rm -rf "my project"
fi

# Remove saas-app-new directory
if [ -d "saas-app-new" ]; then
    echo -e "${GREEN}✓ Removing saas-app-new directory...${NC}"
    rm -rf saas-app-new
fi

echo -e "${GREEN}✓ All project files removed${NC}"
echo ""

# ============================================
# STEP 6: Verify Cleanup
# ============================================
echo -e "${YELLOW}[5/6] Verifying cleanup...${NC}"

echo -e "${GREEN}Docker Status:${NC}"
docker ps -a
docker images
docker volume ls

echo ""
echo -e "${GREEN}Directory Status:${NC}"
ls -la /root

echo ""
echo -e "${GREEN}Disk Usage:${NC}"
df -h

echo ""

# ============================================
# STEP 7: Ready for Fresh Start
# ============================================
echo -e "${YELLOW}[6/6] Ready for fresh start...${NC}"

echo -e "${GREEN}✓ VPS is now completely clean!${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Upload your project:"
echo -e "     - WinSCP: Upload to /root/my project"
echo -e "     - GitHub: git clone https://github.com/username/repo.git /root/saas-app"
echo ""
echo -e "  2. Run deployment script:"
echo -e "     chmod +x /root/my\\ project/scripts/deploy-simple.sh"
echo -e "     cd /root"
echo -e "     ./my\\ project/scripts/deploy-simple.sh"
echo ""

# ============================================
# Done!
# ============================================
echo "=========================================="
echo -e "${GREEN}🎉 VPS Reset Complete!${NC}"
echo "=========================================="
echo ""

echo -e "${GREEN}✓ Backup saved to: /root/backups${NC}"
echo -e "${GREEN}✓ All Docker resources removed${NC}"
echo -e "${GREEN}✓ All project files removed${NC}"
echo ""

echo -e "${YELLOW}Your VPS is now ready for a fresh deployment!${NC}"
echo ""

echo "=========================================="