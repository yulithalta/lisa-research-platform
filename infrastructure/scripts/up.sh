#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p ./z2m-data
docker compose --env-file ./.env -f ./docker-compose.yml up -d
docker compose --env-file ./.env -f ./docker-compose.yml ps
echo ">> Zigbee2MQTT: http://localhost:8080"
echo ">> Dozzle:      http://localhost:9090"
echo ">> dashdot:     http://localhost:4000"
