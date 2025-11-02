#!/usr/bin/env bash
set -euo pipefail

# Deb/Ubuntu install
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Repo Docker oficial
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Usar docker sin sudo (necesita relogin)
sudo usermod -aG docker "$USER"
echo ">> Re-login required for docker group to take effect."
