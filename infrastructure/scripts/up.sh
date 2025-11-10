#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p ./z2m-data
docker compose --env-file ./.env -f ./docker-compose.yml up -d
docker compose --env-file ./.env -f ./docker-compose.yml ps
echo ">> Zigbee2MQTT: http://localhost:8080"
echo ">> Dozzle:      http://localhost:9090"
echo ">> dashdot:     http://localhost:4000"
echo ">> Camera Frontend: http://localhost:3000"
echo ">> Camera Backend: http://localhost:3033"
echo ">> Crudsensor App: http://localhost:3001"
echo ">> Zigbee Dashboard: http://localhost:3002"
echo ">> RGPD Module: http://localhost:3003"
