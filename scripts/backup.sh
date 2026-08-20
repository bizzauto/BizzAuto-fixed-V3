#!/bin/bash
# ================================================
# BizzAuto CRM — Production Backup Script v2
# Features: encryption, offsite (R2/S3), SHA256 checksum, Redis sync, Slack alert
# Schedule: 0 2 * * * (daily at 2 AM)
# ==============================================
set -euo pipefail

# === CONFIG (override via env) ===
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
S3_BUCKET="${S3_BUCKET:-}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
S3_ACCESS_KEY="${S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${S3_SECRET_KEY:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="${LOG_FILE:-/var/log/bizzauto-backup.log}"

# Prevent concurrent runs
LOCKFILE="/tmp/bizzauto-backup.lock"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

log() { echo "$LOG_PREFIX $1" | tee -a "$LOG_FILE" 2>/dev/null || echo "$LOG_PREFIX $1"; }
log_error() { echo "$LOG_PREFIX ERROR: $1" | tee -a "$LOG_FILE" 2>/dev/null; }

send_slack() {
  local status="$1"
  local message="$2"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"BizzAuto Backup [$status]: $message\"}" > /dev/null 2>&1 || true
  fi
}

# Exit if already running
if [[ -f "$LOCKFILE" ]]; then
  log "Backup already running (lockfile exists). Exiting."
  exit 0
fi
trap "rm -f '$LOCKFILE'" EXIT
echo $$ > "$LOCKFILE"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR_TS="$BACKUP_DIR/$TIMESTAMP"
mkdir -p "$BACKUP_DIR_TS"
log "=== Starting backup ==="

# === PostgreSQL backup (app DB) ===
log "Backing up PostgreSQL (app DB)..."
if pg_dump "${DATABASE_URL}" 2>/dev/null | gzip > "$BACKUP_DIR_TS/postgres_app.sql.gz.tmp"; then
  mv "$BACKUP_DIR_TS/postgres_app.sql.gz.tmp" "$BACKUP_DIR_TS/postgres_app.sql.gz"
  log "PostgreSQL app DB backed up"
else
  log_error "PostgreSQL app DB backup FAILED"
  send_slack "FAILED" "PostgreSQL app DB backup failed"
  exit 1
fi

# === PostgreSQL backup (Evolution DB) ===
log "Backing up PostgreSQL (Evolution DB)..."
EVOLUTION_DB_URL="${EVOLUTION_DATABASE_URL:-${DATABASE_URL/ whatsapp_saas/ evolution_db}}"
if pg_dump "$EVOLUTION_DB_URL" 2>/dev/null | gzip > "$BACKUP_DIR_TS/postgres_evolution.sql.gz.tmp"; then
  mv "$BACKUP_DIR_TS/postgres_evolution.sql.gz.tmp" "$BACKUP_DIR_TS/postgres_evolution.sql.gz"
  log "PostgreSQL Evolution DB backed up"
else
  log "Warning: Evolution DB backup failed (DB may not exist)"
fi

# === Redis backup (synchronous, not BGSAVE race) ===
log "Backing up Redis..."
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/data}"
if [[ -f "$REDIS_DATA_DIR/dump.rdb" ]]; then
  redis-cli -a "${REDIS_PASSWORD:-}" REWRITE
  redis-cli -a "${REDIS_PASSWORD:-}" SAVE > /dev/null 2>&1 || true
  LASTSAVE_BEFORE=$(redis-cli -a "${REDIS_PASSWORD:-}" LASTSAVE)
  sleep 2
  LASTSAVE_AFTER=$(redis-cli -a "${REDIS_PASSWORD:-}" LASTSAVE)
  if [[ "$LASTSAVE_AFTER" -ge "$LASTSAVE_BEFORE" ]]; then
    cp "$REDIS_DATA_DIR/dump.rdb" "$BACKUP_DIR_TS/redis_dump.rdb"
    gzip "$BACKUP_DIR_TS/redis_dump.rdb"
    log "Redis backed up"
  else
    log_error "Redis SAVE failed (LASTSAVE did not update)"
    send_slack "FAILED" "Redis SAVE failed during backup"
    exit 1
  fi
else
  log "Warning: Redis dump.rdb not found"
fi

# === Uploads backup ===
log "Backing up uploads..."
if [[ -d /app/uploads ]] && [[ -n "$(ls -A /app/uploads 2>/dev/null)" ]]; then
  tar czf "$BACKUP_DIR_TS/uploads.tar.gz" -C / app/uploads 2>/dev/null || log "Warning: uploads backup failed"
else
  log "Warning: uploads directory empty or not found"
fi

# === N8N data backup ===
log "Backing up N8N data..."
if [[ -d /home/node/.n8n ]]; then
  tar czf "$BACKUP_DIR_TS/n8n_data.tar.gz" -C /home/node/.n8n . 2>/dev/null || log "Warning: N8N backup failed"
else
  log "Warning: N8N data directory not found"
fi

# === SHA256 checksum ===
log "Generating SHA256 checksum..."
SHA_FILE="$BACKUP_DIR_TS/checksum.sha256"
find "$BACKUP_DIR_TS" -maxdepth 1 -name '*.gz' -o -name '*.rdb.gz' -o -name '*.tar.gz' 2>/dev/null | while read -r f; do
  sha256sum "$f" >> "$SHA_FILE"
done
log "Checksum generated"

# === GPG encryption (if key provided) ===
if [[ -n "$ENCRYPTION_KEY" ]]; then
  log "Encrypting backup with GPG..."
  echo "$ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 \
    -o "$BACKUP_DIR_TS/backup.tar.gz.gpg" \
    <(tar czf - -C "$BACKUP_DIR_TS" .) 2>/dev/null || {
    log_error "GPG encryption failed"
    send_slack "FAILED" "GPG encryption failed"
    exit 1
  }
  rm -rf "$BACKUP_DIR_TS"
  ARCHIVE_PATH="$BACKUP_DIR_TS/backup.tar.gz.gpg"
  log "Backup encrypted"
else
  ARCHIVE_PATH="$BACKUP_DIR.tar.gz"
  tar czf "$ARCHIVE_PATH" -C "$BACKUP_DIR" "$(basename "$BACKUP_DIR_TS")" 2>/dev/null
  rm -rf "$BACKUP_DIR_TS"
  log "Backup archived (no encryption — set BACKUP_ENCRYPTION_KEY to enable)"
fi

# === Offsite upload to R2/S3 ===
if [[ -n "$S3_BUCKET" && -n "$S3_ACCESS_KEY" && -n "$S3_SECRET_KEY" ]]; then
  log "Uploading to S3/R2..."
  export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
  S3CMD_ENDPOINT=""
  if [[ -n "$S3_ENDPOINT" ]]; then
    S3CMD_ENDPOINT="--host=${S3_ENDPOINT}"
  fi
  if command -v aws &>/dev/null; then
    aws s3 cp "$ARCHIVE_PATH" "s3://${S3_BUCKET}/bizzauto-backup/$(basename "$ARCHIVE_PATH")" \
      --content-type "application/gzip" \
      ${S3CMD_ENDPOINT:+"$S3CMD_ENDPOINT"} 2>/dev/null && log "Uploaded to S3" || {
      log_error "S3 upload failed"
      send_slack "WARNING" "S3 offsite backup upload failed"
    }
  elif command -v rclone &>/dev/null; then
    rclone copyto "$ARCHIVE_PATH" "remote:${S3_BUCKET}/bizzauto-backup/$(basename "$ARCHIVE_PATH")" \
      --config /dev/null 2>/dev/null && log "Uploaded via rclone" || {
      log_error "rclone upload failed"
    }
  else
    log "Warning: aws CLI or rclone not found — skipping offsite upload"
  fi
fi

# === Cleanup old local backups ===
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.tar.gz*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.gpg" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

# === Final validation ===
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" 2>/dev/null | cut -f1 || echo "unknown")
log "=== Backup completed: $ARCHIVE_PATH ($ARCHIVE_SIZE) ==="
send_slack "SUCCESS" "Backup completed: $(basename "$ARCHIVE_PATH") ($ARCHIVE_SIZE)"