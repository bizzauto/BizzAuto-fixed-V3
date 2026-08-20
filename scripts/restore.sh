#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/bizzauto-restore.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

usage() {
    echo "Usage: $0 <backup-file.tar.gz> [--dry-run]"
    echo ""
    echo "Options:"
    echo "  --dry-run    Show what would be restored without making changes"
    echo ""
    echo "Example:"
    echo "  $0 /backups/20260625_020000.tar.gz"
    echo "  $0 /backups/20260625_020000.tar.gz --dry-run"
    exit 1
}

DRY_RUN=false
BACKUP_FILE=""

for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN=true ;;
        -h|--help) usage ;;
        *) BACKUP_FILE="$arg" ;;
    esac
done

if [[ -z "$BACKUP_FILE" ]]; then
    echo "Error: No backup file specified."
    usage
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

RESTORE_DIR="/tmp/bizzauto-restore-$$"
mkdir -p "$RESTORE_DIR"

log "Extracting backup: $BACKUP_FILE"
tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

BACKUP_CONTENT=$(find "$RESTORE_DIR" -maxdepth 1 -mindepth 1 -type d | head -1)
if [[ -z "$BACKUP_CONTENT" ]]; then
    echo "Error: Invalid backup format."
    rm -rf "$RESTORE_DIR"
    exit 1
fi

echo ""
echo "========================================="
echo "  BizzAuto Backup Restore"
echo "========================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Dry run:     $DRY_RUN"
echo ""
echo "Contents found:"
[[ -f "$BACKUP_CONTENT/postgres.sql.gz" ]] && echo "  - PostgreSQL database dump"
[[ -f "$BACKUP_CONTENT/redis_dump.rdb" ]] && echo "  - Redis data dump"
[[ -f "$BACKUP_CONTENT/uploads.tar.gz" ]] && echo "  - Uploads directory"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    log "Dry run - listing backup contents:"
    ls -lh "$BACKUP_CONTENT/"
    [[ -f "$BACKUP_CONTENT/postgres.sql.gz" ]] && echo "Would restore PostgreSQL: $(gzip -l "$BACKUP_CONTENT/postgres.sql.gz" | tail -1 | awk '{print $1}') bytes uncompressed"
    [[ -f "$BACKUP_CONTENT/redis_dump.rdb" ]] && echo "Would restore Redis: $(ls -lh "$BACKUP_CONTENT/redis_dump.rdb" | awk '{print $5}')"
    [[ -f "$BACKUP_CONTENT/uploads.tar.gz" ]] && echo "Would restore Uploads: $(gzip -l "$BACKUP_CONTENT/uploads.tar.gz" | tail -1 | awk '{print $1}') bytes uncompressed"
    rm -rf "$RESTORE_DIR"
    exit 0
fi

read -p "Are you sure you want to restore this backup? This will OVERWRITE current data. (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    log "Restore cancelled by user."
    rm -rf "$RESTORE_DIR"
    exit 0
fi

# Restore PostgreSQL
if [[ -f "$BACKUP_CONTENT/postgres.sql.gz" ]]; then
    log "Restoring PostgreSQL database..."
    gunzip -c "$BACKUP_CONTENT/postgres.sql.gz" | PGPASSWORD="${DB_PASSWORD:-}" psql "${DATABASE_URL}" 2>&1 | tee -a "$LOG_FILE"
    log "PostgreSQL restore complete."
else
    log "No PostgreSQL dump found, skipping."
fi

# Restore Redis
if [[ -f "$BACKUP_CONTENT/redis_dump.rdb" ]]; then
    log "Restoring Redis data..."
    redis-cli -a "${REDIS_PASSWORD:-}" SHUTDOWN NOSAVE || true
    sleep 2
    cp "$BACKUP_CONTENT/redis_dump.rdb" /data/dump.rdb
    log "Redis data restored. Redis will restart automatically."
else
    log "No Redis dump found, skipping."
fi

# Restore Uploads
if [[ -f "$BACKUP_CONTENT/uploads.tar.gz" ]]; then
    log "Restoring uploads directory..."
    tar xzf "$BACKUP_CONTENT/uploads.tar.gz" -C /app/ 2>&1 | tee -a "$LOG_FILE"
    log "Uploads restore complete."
else
    log "No uploads archive found, skipping."
fi

rm -rf "$RESTORE_DIR"

log "Restore completed successfully."
echo ""
echo "========================================="
echo "  Restore Complete"
echo "========================================="
echo ""
echo "If you restored PostgreSQL or Redis, you may need to restart services:"
echo "  docker-compose restart app"
