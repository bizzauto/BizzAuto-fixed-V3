#!/bin/bash

# ==========================================
# Database Backup Script
# ==========================================

set -e

BACKUP_DIR="/opt/saas-automation/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
echo "📦 Creating database backup..."
docker-compose exec -T postgres pg_dump -U postgres whatsapp_saas | gzip > $BACKUP_FILE

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "🗑️  Old backups cleaned"
echo "📊 Backup size: $(du -h $BACKUP_FILE | cut -f1)"
