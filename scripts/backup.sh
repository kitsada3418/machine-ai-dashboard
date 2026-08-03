#!/usr/bin/env bash
# Smart Factory - backup script
# Dumps the production PostgreSQL database and the Mosquitto persistence volume.
#
# Usage:
#   bash scripts/backup.sh                     # keep 14 daily backups (default)
#   bash scripts/backup.sh 30                  # keep 30 backups
#   docker compose -f docker-compose.prod.yml run --rm backup ...  (optional)

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${1:-14}"
POSTGRES_CONTAINER="smart-factory-prod-postgres"
MOSQUITTO_CONTAINER="smart-factory-prod-mosquitto"
POSTGRES_USER="${POSTGRES_USER:-sf_user}"
POSTGRES_DB="${POSTGRES_DB:-smart_factory}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "==> Backing up PostgreSQL database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$POSTGRES_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$BACKUP_DIR/db-$STAMP.dump"
echo "    -> $BACKUP_DIR/db-$STAMP.dump"

echo "==> Backing up Mosquitto persistence..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$MOSQUITTO_CONTAINER" \
  tar czf - -C /mosquitto/data . \
  > "$BACKUP_DIR/mosquitto-$STAMP.tar.gz"
echo "    -> $BACKUP_DIR/mosquitto-$STAMP.tar.gz"

echo "==> Pruning backups older than the last $KUNIQUE_KEEP runs (keeping $KEEP)..."
find "$BACKUP_DIR" -type f \( -name 'db-*.dump' -o -name 'mosquitto-*.tar.gz' \) \
  | sort | head -n -"$((KEEP * 2))" | xargs -r rm -f

echo "==> Done."
