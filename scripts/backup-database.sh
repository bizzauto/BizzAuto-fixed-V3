#!/bin/bash
# ============================================================
# BizzAuto Automated Database Backup Script
# Creates timestamped PostgreSQL backups with rotation
# ============================================================
# Usage:
#   ./scripts/backup-database.sh              # Manual backup
#   crontab: 0 2 * * * /path/to/scripts/backup-database.sh  # Daily at 2 AM
# ============================================================

set -euo pipefail

# Configuration (override via environment variables)
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"
DATABASE_URL="${DATABASE_URL:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
REMOTE_BACKUP="${REMOTE_BACKUP:-}"  # Optional: s3://bucket/path or scp://host/path

# Parse DATABASE_URL to extract connection details
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  exit 1
fi

# Extract components from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Defaults
DB_PORT="${DB_PORT:-5432}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."
echo "  Database: ${DB_NAME}"
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "  Output: ${BACKUP_FILE}"

# Set password for pg_dump
export PGPASSWORD="$DB_PASS"

# Create compressed backup
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -F p \
  | gzip > "$BACKUP_FILE"

# Verify backup was created and is not empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file is empty or was not created!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed: ${BACKUP_SIZE}"

# Rotate old backups (keep last N days)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotating backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "  Deleted ${DELETED} old backup(s)"

# Remote backup (optional)
if [ -n "$REMOTE_BACKUP" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to remote: ${REMOTE_BACKUP}"
  if [[ "$REMOTE_BACKUP" == s3://* ]]; then
    # AWS S3 upload
    if command -v aws &> /dev/null; then
      aws s3 cp "$BACKUP_FILE" "${REMOTE_BACKUP}/$(basename $BACKUP_FILE)" --storage-class STANDARD_IA
      echo "  Uploaded to S3 successfully"
    else
      echo "  WARNING: aws CLI not found, skipping S3 upload"
    fi
  elif [[ "$REMOTE_BACKUP" == scp://* ]]; then
    # SCP upload
    REMOTE_PATH="${REMOTE_BACKUP#scp://}"
    scp "$BACKUP_FILE" "${REMOTE_PATH}/"
    echo "  Uploaded via SCP successfully"
  fi
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
TOTAL_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup directory: ${TOTAL_SIZE} (${TOTAL_COUNT} backups)"

# Unset password
unset PGPASSWORD

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database backup complete!"
