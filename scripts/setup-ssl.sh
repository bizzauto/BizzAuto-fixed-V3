#!/bin/bash
# ==============================================
# BizzAuto CRM - SSL Certificate Setup Script
# ==============================================
# Usage: ./scripts/setup-ssl.sh your-domain.com your-email@domain.com

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
WEBROOT="/var/www/certbot"
SSL_DIR="./nginx/ssl"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[SSL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Validate arguments
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 bizzautoai.com admin@bizzautoai.com"
    exit 1
fi

log "Setting up SSL for: $DOMAIN"
log "Contact email: $EMAIL"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    log "Installing certbot..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        yum install -y epel-release && yum install -y certbot
    elif command -v apk &> /dev/null; then
        apk add --no-cache certbot
    else
        error "Cannot install certbot automatically. Please install it manually."
    fi
fi

# Create required directories
log "Creating directories..."
mkdir -p "$SSL_DIR"
mkdir -p "$WEBROOT/.well-known/acme-challenge"

# Request certificate
log "Requesting SSL certificate for $DOMAIN..."
certbot certonly \
    --webroot \
    --webroot-path "$WEBROOT" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Copy certs to nginx ssl directory
log "Copying certificates to $SSL_DIR..."
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/fullchain.pem"

# Setup auto-renewal cron
log "Setting up auto-renewal cron job..."
CRON_JOB="0 3 * * * certbot renew --webroot -w $WEBROOT --quiet --deploy-hook 'cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/privkey.pem'"
(crontab -l 2>/dev/null | grep -v "certbot renew" ; echo "$CRON_JOB") | crontab -

log "Auto-renewal cron job installed (runs daily at 3 AM)"

# Update nginx.conf with the actual domain
log "Updating nginx.conf with domain $DOMAIN..."
if [ -f "./nginx/nginx.conf" ]; then
    sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "./nginx/nginx.conf"
    log "nginx.conf updated"
fi

log "SSL setup complete!"
log "Certificate files:"
log "  - $SSL_DIR/fullchain.pem"
log "  - $SSL_DIR/privkey.pem"
log ""
log "Next steps:"
log "  1. Start the production stack: docker compose -f docker-compose.prod.yml up -d"
log "  2. Verify SSL: https://$DOMAIN"
log "  3. Check auto-renewal: certbot renew --dry-run"
