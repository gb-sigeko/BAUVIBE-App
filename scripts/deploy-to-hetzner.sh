#!/usr/bin/env bash
# Vorlage: Deployment auf Hetzner (nicht automatisch ausführen).
# DNS für buehler.zone muss vorher auf die Server-IP zeigen.

set -euo pipefail

SERVER="root@178.104.128.73"
REMOTE_DIR="/opt/bauvibe"
DOMAIN="buehler.zone"

echo "==> Build lokal"
npm run build

echo "==> rsync nach ${SERVER}:${REMOTE_DIR}"
rsync -az --delete --exclude node_modules --exclude .git --exclude .env ./ "${SERVER}:${REMOTE_DIR}/"

echo "==> Remote: Abhängigkeiten & Prisma"
ssh "${SERVER}" "cd ${REMOTE_DIR} && npm install --production && npx prisma migrate deploy && npx prisma db seed"

echo "==> PM2"
ssh "${SERVER}" "cd ${REMOTE_DIR} && pm2 delete bauvibe 2>/dev/null || true && pm2 start npm --name bauvibe -- start"

echo "==> Nginx + SSL (Certbot) — manuell prüfen"
cat <<EOF
Beispiel server block (HTTP → Node 3000):

server {
  server_name ${DOMAIN};
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection upgrade;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

Dann: certbot --nginx -d ${DOMAIN}
EOF
