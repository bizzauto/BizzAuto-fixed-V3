#!/bin/bash
# fix-n8n.sh — Fix n8n encryption key mismatch & redeploy
# Run this on your VPS as root
# Usage: bash scripts/fix-n8n.sh

set -e

CONTAINER_NAME="n8n-f9r1ronzihzfr986e9jo5vz0"

echo "=================================="
echo "  n8n Encryption Key Fix Script"
echo "=================================="
echo ""

# Step 1: Stop n8n container
echo "[1/4] Stopping n8n container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || echo "  ⚠️  Container not running, skipping stop"
echo "  ✅ Done"

# Step 2: Remove n8n container
echo "[2/4] Removing n8n container..."
docker rm "$CONTAINER_NAME" 2>/dev/null || echo "  ⚠️  Container not found, skipping remove"
echo "  ✅ Done"

# Step 3: Find and remove n8n volume
echo "[3/4] Finding & removing n8n volume (deletes stale encryption key)..."
VOLUME_NAME=$(docker volume ls --filter name=n8n-f9r1ronzihzfr986e9jo5vz0 -q)
if [ -n "$VOLUME_NAME" ]; then
  docker volume rm "$VOLUME_NAME"
  echo "  ✅ Volume '$VOLUME_NAME' removed"
else
  echo "  ⚠️  No volume found for n8n"
fi

# Step 4: Verify
echo "[4/4] Verifying cleanup..."
docker ps -a --filter name=n8n --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "=================================="
echo "  ✅ Cleanup complete!"
echo "=================================="
echo ""
echo "Next step: Go to Coolify Dashboard →"
echo "  n8n resource → click Redeploy"
echo ""
echo "After redeploy, verify with:"
echo "  curl -sk https://n8n.bizzautoai.com/healthz"
echo ""

