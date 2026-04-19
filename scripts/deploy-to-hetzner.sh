#!/usr/bin/env bash
set -euo pipefail

# Deployment auf einen Hetzner- (oder beliebigen) Ubuntu-Server.
# Voraussetzung: SSH-Key, rsync, auf dem Server Node 20+, PM2, Nginx (optional manuell).
#
# Konfiguration per Umgebungsvariablen:
#   HETZNER_HOST   – Hostname oder IP (Pflicht)
#   SSH_USER       – SSH-Benutzer (Standard: deploy)
#   REMOTE_PATH    – Zielverzeichnis auf dem Server (Standard: /opt/bauvibe/app)
#   PM2_APP_NAME   – PM2-Prozessname (Standard: bauvibe)
#
# Hinweis: .env.production muss auf dem Server liegen (nicht per rsync aus dem Repo).

HETZNER_HOST="${HETZNER_HOST:?Setze HETZNER_HOST (z. B. app.example.com)}"
SSH_USER="${SSH_USER:-deploy}"
REMOTE_PATH="${REMOTE_PATH:-/opt/bauvibe/app}"
PM2_APP_NAME="${PM2_APP_NAME:-bauvibe}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Rsync Projekt nach ${SSH_USER}@${HETZNER_HOST}:${REMOTE_PATH}"
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  --exclude e2e/.auth \
  --exclude "*.log" \
  "${ROOT_DIR}/" "${SSH_USER}@${HETZNER_HOST}:${REMOTE_PATH}/"

echo "==> Remote: npm ci / install, Prisma, PM2"
ssh "${SSH_USER}@${HETZNER_HOST}" bash -s <<EOF
set -euo pipefail
cd "${REMOTE_PATH}"
export NODE_ENV=production
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi
npx prisma generate
npx prisma migrate deploy
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
    pm2 reload "${PM2_APP_NAME}" --update-env
  else
    pm2 start npm --name "${PM2_APP_NAME}" -- start
    pm2 save
  fi
else
  echo "WARNUNG: pm2 nicht gefunden – bitte App manuell starten (npm run start)."
fi
EOF

echo "==> Fertig."
echo "    Nginx: Location / → proxy_pass http://127.0.0.1:3000; (oder dein PM2-Port)"
echo "    TLS: sudo certbot --nginx -d <dein-hostname> (einmalig / Renewal per Cron)"
echo "    Health: curl -fsS https://${HETZNER_HOST}/api/health"
