#!/usr/bin/env bash
# Smart Factory - issue a Let's Encrypt certificate and enable HTTPS.
#
# Prerequisites (run on the server):
#   1. DNS A record for $DOMAIN already points to this machine.
#   2. The production stack is running on ports 80/443
#      (docker compose -f docker-compose.prod.yml --env-file .env.production up -d)
#   3. certbot is installed: apt install -y certbot
#
# What it does:
#   - Requests the certificate via the webroot method (no downtime).
#   - Writes docker/nginx/ssl.conf (443 + http->https redirect) from the example.
#   - Reloads nginx so HTTPS goes live immediately.
#
# Usage:
#   bash scripts/issue-cert.sh

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE (cp .env.production.example .env.production first)" >&2
  exit 1
fi

DOMAIN="$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"
ACME_EMAIL="$(grep -E '^ACME_EMAIL=' "$ENV_FILE" | cut -d= -f2-)"

if [ -z "$DOMAIN" ] || [ -z "$ACME_EMAIL" ]; then
  echo "DOMAIN and ACME_EMAIL must be set in $ENV_FILE" >&2
  exit 1
fi

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Certificate already exists for $DOMAIN - skipping issuance."
else
  echo "==> Issuing certificate for $DOMAIN..."
  certbot certonly \
    --webroot \
    --webroot-path ./certbot-www \
    --email "$ACME_EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"
fi

echo "==> Writing docker/nginx/ssl.conf..."
sed "s/DOMAIN/$DOMAIN/g" docker/nginx/ssl.conf.example > docker/nginx/ssl.conf

echo "==> Reloading nginx..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -t
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -s reload

echo "==> HTTPS enabled: https://$DOMAIN"
echo "    Renewal: certbot renew runs automatically via /etc/cron.d/certbot;"
echo "    reload nginx after each renewal with:"
echo "      echo \"0 3 * * * root docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec nginx nginx -s reload\" > /etc/cron.d/smart-factory-nginx-reload"
