#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------------
# LISA bootstrap: infra (Docker) + app (Node)
# --------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="${ROOT_DIR}/infrastructure"
INFRA_ENV="${INFRA_DIR}/.env"
COMPOSE="${INFRA_DIR}/docker-compose.yml"

APP_ENV="${ROOT_DIR}/.env"
NODE_MIN=20
NPM_MIN=10

usage() {
  cat <<EOF
Usage: $0 [command]

Commands:
  infra:up           Pull & start Zigbee2MQTT, Dozzle, dashdot
  infra:down         Stop infrastructure stack
  infra:status       Show compose services
  app:dev            Install deps (if needed) and start LISA in dev mode
  app:prod           Build and start LISA in production mode
  all:dev            Run infra:up + app:dev
  all:prod           Run infra:up + app:prod
  check              Run prerequisite checks
  help               Show this help

Examples:
  $0 all:dev
  $0 infra:up
  $0 app:dev
EOF
}

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo ">> $*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

check_node_npm() {
  require_cmd node
  require_cmd npm
  local nodev npmver
  nodev="$(node -v | sed 's/^v//')"
  npmver="$(npm -v)"
  info "Node: $nodev, npm: $npmver"
}

check_docker() {
  require_cmd docker
  docker info >/dev/null 2>&1 || fail "Docker daemon not responding"
  if ! docker compose version >/dev/null 2>&1; then
    fail "Docker Compose plugin missing. Install Docker Compose v2."
  fi
}

ensure_infra_env() {
  mkdir -p "${INFRA_DIR}"
  if [[ ! -f "${INFRA_ENV}" ]]; then
    info "Creating ${INFRA_ENV}"
    cat > "${INFRA_ENV}" <<'ENV'
TZ=Europe/Madrid
Z2M_DATA=./z2m-data
# Adjust to your USB adapter path (check with: ls -l /dev/serial/by-id/)
Z2M_ADAPTER=/dev/serial/by-id/usb-Texas_Instruments_TI_CC2531_USB_CDC___0X00124B0018ED3DDF-if00
#DOZZLE_USER=admin
#DOZZLE_PASS=change-me
ENV
  fi
}


adapter_exists() {
  local adapter
  adapter="$(grep '^Z2M_ADAPTER=' "${INFRA_ENV}" | cut -d= -f2- || true)"
  [[ -n "${adapter:-}" && -e "$adapter" ]]
}

#check_adapter() {
#  local adapter
#  adapter="$(grep '^Z2M_ADAPTER=' "${INFRA_ENV}" | cut -d= -f2- || true)"
#  if [[ -n "${adapter:-}" && ! -e "$adapter" ]]; then
#    echo "WARNING: Zigbee adapter not found at: $adapter"
#    echo "         Update infrastructure/.env → Z2M_ADAPTER=... (ls -l /dev/serial/by-id/)"
#  else
#    info "Zigbee adapter OK: $adapter"
#  fi
#}

infra_up() {
  check_docker
  ensure_infra_env

  local compose_files=("${COMPOSE}")
  if ! adapter_exists; then
    echo
    echo "################################################################"
    echo "#  WARNING: Zigbee adapter not found. Starting Z2M WITHOUT USB #"
    echo "#  - Update infrastructure/.env → Z2M_ADAPTER=...               #"
    echo "#  - You can still access Zigbee2MQTT UI, but no hardware I/O  #"
    echo "################################################################"
    echo
    compose_files+=("${INFRA_DIR}/docker-compose.nodongle.yml")
  else
    info "Zigbee adapter detected. Starting with USB mapping."
  fi

  info "Pulling images..."
  (cd "${INFRA_DIR}" && docker compose --env-file ./.env -f "${compose_files[0]}" ${compose_files[1]:+-f "${compose_files[1]}"} pull)

  info "Starting stack..."
  (cd "${INFRA_DIR}" && docker compose --env-file ./.env -f "${compose_files[0]}" ${compose_files[1]:+-f "${compose_files[1]}"} up -d)

  (cd "${INFRA_DIR}" && docker compose --env-file ./.env -f "${compose_files[0]}" ${compose_files[1]:+-f "${compose_files[1]}"} ps)

  echo
  echo "Services:"
  echo "  Zigbee2MQTT: http://localhost:8080"
  echo "  Dozzle:      http://localhost:9090"
  echo "  dashdot:     http://localhost:4000"
}

infra_down() {
  check_docker
  (cd "${INFRA_DIR}" && docker compose --env-file ./.env -f "${COMPOSE}" down)
}

infra_status() {
  check_docker
  (cd "${INFRA_DIR}" && docker compose --env-file ./.env -f "${COMPOSE}" ps)
}

app_dev() {
  check_node_npm
  cd "${ROOT_DIR}"
  if [[ ! -d node_modules ]]; then
    info "Installing dependencies (npm ci)..."
    npm ci
  fi
  if [[ ! -f "${APP_ENV}" ]]; then
    info "Creating ${APP_ENV} (copy from .env.example)"
    [[ -f .env.example ]] && cp .env.example .env || echo "SESSION_SECRET=replace_me" > .env
  fi
  info "Starting LISA in dev mode..."
  npm run dev
}

app_prod() {
  check_node_npm
  cd "${ROOT_DIR}"
  if [[ ! -d node_modules ]]; then
    info "Installing dependencies (npm ci)..."
    npm ci
  fi
  info "Building..."
  npm run build
  info "Starting LISA in production mode..."
  npm start
}

dev_stack() {
  info "Starting full LISA stack in development mode"

  # 1) Infraestructura Docker
  infra_up

  # 2) App en dev → proceso background (con pidfile)
  info "Starting LISA app (npm run dev)..."
  npm run dev & echo $! > .lisa_app.pid

  info "✅ LISA development stack running!"
  echo "-----------------------------------------------------"
  echo " Web UI:         http://localhost:5000"
  echo " Zigbee2MQTT UI: http://localhost:${Z2M_PORT:-8080}"
  echo " Dozzle:         http://localhost:9090  (logs docker)"
  echo " Dashdot:        http://localhost:4000 (host metrics)"
  echo "-----------------------------------------------------"
}

down_stack() {
  info "Stopping LISA app and infrastructure..."

  # 1) App
  if [[ -f .lisa_app.pid ]]; then
    pid="$(cat .lisa_app.pid)"
    info "Stopping app (pid=$pid)..."
    kill "$pid" 2>/dev/null || wait "$pid" 2>/dev/null || true
    rm -f .lisa_app.pid
  fi

  # 2) Infraestructura Docker
  info "Stopping Docker infrastructure..."
  (cd "${INFRA_DIR}" && docker compose --env-file ./.env rm -sf)

  info "✅ Everything stopped cleanly"
}


check_all() {
  check_docker
  check_node_npm
  ensure_infra_env
  check_adapter
  info "Checks OK."
}

cmd="${1:-help}"
case "$cmd" in
  infra:up)      infra_up ;;
  infra:down)    infra_down ;;
  infra:status)  infra_status ;;
  app:dev)       app_dev ;;
  app:prod)      app_prod ;;
  all:dev)       infra_up; app_dev ;;
  all:prod)      infra_up; app_prod ;;
  check)         check_all ;;
  dev)           dev_stack ;;
  down)          down_stack ;;
  help|*)        usage ;;
esac
