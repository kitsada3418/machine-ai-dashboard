#!/usr/bin/env bash
# Smart Factory - restore script
# Restores a PostgreSQL dump (and optionally the Mosquitto data volume) produced
# by scripts/backup.sh.
#
# Usage:
#   bash scripts/restore.sh backups/db-20260101-000000.dump
#   bash scripts/restore.sh backups/db-20260101-000000.dump backups/mosquitto-20260101-000000.tar.gz
#
# NOTE: The stack must be running for `docker compose exec` to work. The database
# is dropped and recreated, so this operation is destructive.

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
POSTGRES_CONTAINER="smart-factory-prod-postgres"
MOSQUITTO_CONTAINER="smart-factory-prod-mosquitto"
POSTGRES_USER="${POSTGRES_USER:-sf_user}"
POSTGRES_DB="${POSTGRES_DB:-smart_factory}"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <db-dump-file> [mosquitto-tar-file]" >&2
  exit 1
fi

DB_DUMP="$1"
MOSQUITTO_TAR="${2:-}"

if [ ! -f "$DB_DUMP" ]; then
  echo "Dump file not found: $DB_DUMP" >&2
  exit 1
fi

echo "==> Restoring database from $DB_DUMP..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$POSTGRES_CONTAINER" \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < "$DB_DUMP"

if [ -n "$MOSQUITTO_TAR" ]; then
  if [ ! -f "$MOSQUITTO_TAR" ]; then
    echo "Mosquitto archive not found: $MOSQUITTO_TAR" >&2
    exit 1
  fi
  echo "==> Restoring Mosquitto persistence from $MOSQUITTO_TAR..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$MOSQUITTO_CONTAINER" \
    tar xzf - -C /mosquitto/data \
    < "$MOSQUITTO_TAR"
fi

echo "==> Done. Restart the stack to apply: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart backend"
