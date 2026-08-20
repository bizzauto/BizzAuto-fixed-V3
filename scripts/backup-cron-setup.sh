#!/bin/bash
# ============================================================
# Cron Setup for Automated Database Backups
# Run this once to install the backup cron job
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Define cron job
# Daily at 2:00 AM IST (Asia/Kolkata)
CRON_SCHEDULE="0 2 * * *"
CRON_COMMAND="cd $(dirname "$SCRIPT_DIR") && ${BACKUP_SCRIPT} >> /var/log/bizzauto-backup.log 2>&1"

# Check if cron job already exists
EXISTING_CRON=$(crontab -l 2>/dev/null || true)

if echo "$EXISTING_CRON" | grep -qF "backup-database.sh"; then
  echo "Backup cron job already installed."
  echo "Current schedule:"
  echo "$EXISTING_CRON" | grep "backup-database.sh"
  echo ""
  read -p "Update to new schedule? (y/N): " UPDATE
  if [ "$UPDATE" = "y" ] || [ "$UPDATE" = "Y" ]; then
    # Remove old entry and add new one
    NEW_CRON=$(echo "$EXISTING_CRON" | grep -v "backup-database.sh")
    echo "${NEW_CRON}
${CRON_SCHEDULE} ${CRON_COMMAND}" | crontab -
    echo "Cron job updated."
  fi
else
  # Add new cron job
  (echo "$EXISTING_CRON"; echo "${CRON_SCHEDULE} ${CRON_COMMAND}") | crontab -
  echo "Backup cron job installed!"
  echo "  Schedule: Daily at 2:00 AM"
  echo "  Script: ${BACKUP_SCRIPT}"
  echo "  Log: /var/log/bizzauto-backup.log"
fi

echo ""
echo "Current crontab:"
crontab -l 2>/dev/null || echo "(no cron jobs)"

echo ""
echo "To test manually: ${BACKUP_SCRIPT}"
echo "To uninstall: crontab -e (remove the backup-database.sh line)"
