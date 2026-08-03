#!/usr/bin/env bash
# Generate Mosquitto credentials for the Smart Factory broker (Ubuntu / production).
# Creates docker/mosquitto/config/passwd + docker/mosquitto/config/acl
#
# Machine password format: {MACHINE_CODE}@SmartFactory  (e.g. M001@SmartFactory)
# Backend password from MQTT_PASSWORD env or defaults to SmartFactory@123.
#
# Usage:
#   bash docker/mosquitto/scripts/create-credentials.sh
#   docker compose restart mosquitto

set -euo pipefail

MACHINE_COUNT="${1:-30}"
MACHINE_PREFIX="machine_"
BACKEND_USER="backend"
BACKEND_PASSWORD="${MQTT_PASSWORD:-SmartFactory@123}"
CONFIG_DIR="$(cd "$(dirname "$0")/.." && pwd)/config"
PASSWD_FILE="$CONFIG_DIR/passwd"
ACL_FILE="$CONFIG_DIR/acl"

# Generate the passwd file with a throwaway container (no running broker needed).
passwd_cmd() {
  docker run --rm -v "$CONFIG_DIR:/mosquitto/config" eclipse-mosquitto:2 \
    mosquitto_passwd -b /mosquitto/config/passwd "$@"
}

rm -f "$PASSWD_FILE"

echo "Creating $BACKEND_USER account..."
passwd_cmd -c "$BACKEND_USER" "$BACKEND_PASSWORD"

for i in $(seq 1 "$MACHINE_COUNT"); do
  code=$(printf "M%03d" "$i")
  passwd_cmd "${MACHINE_PREFIX}${code}" "${code}@SmartFactory"
done

{
  echo "# Smart Factory MQTT ACL"
  echo ""
  echo "user $BACKEND_USER"
  echo "topic read factory/#"
  echo "topic read \$SYS/#"
  echo ""
  for i in $(seq 1 "$MACHINE_COUNT"); do
    code=$(printf "M%03d" "$i")
    echo "user ${MACHINE_PREFIX}${code}"
    echo "topic write factory/machine/${code}/#"
    echo ""
  done
} > "$ACL_FILE"

# Mosquitto runs as the "mosquitto" user - make the files readable by it.
docker run --rm -v "$CONFIG_DIR:/mosquitto/config" eclipse-mosquitto:2 \
  sh -c "chmod 644 /mosquitto/config/passwd /mosquitto/config/acl"

echo "Credentials written to $PASSWD_FILE and $ACL_FILE"
echo "Next step: docker compose restart mosquitto"
