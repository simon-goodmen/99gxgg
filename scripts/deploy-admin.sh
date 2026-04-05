#!/bin/bash
set -euo pipefail

APP_DIR="${1:-/www/wwwroot/99/web-prototype/admin}"
APP_NAME="${2:-99gxgg-admin}"

echo "[deploy] app dir: ${APP_DIR}"
cd "${APP_DIR}"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] pm2 not found, installing globally..."
  npm install -g pm2
fi

echo "[deploy] installing dependencies..."
npm install

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  echo "[deploy] restarting ${APP_NAME}..."
  pm2 restart "${APP_NAME}"
else
  echo "[deploy] starting ${APP_NAME}..."
  pm2 start ecosystem.config.cjs --name "${APP_NAME}"
fi

pm2 save >/dev/null 2>&1 || true

echo "[deploy] local health check..."
curl --fail --silent http://127.0.0.1:5001/api/health
echo
echo "[deploy] done."
