# Deployment (Hetzner)

Diese Anleitung beschreibt ein typisches Setup mit **Ubuntu**, **Node.js 20**, **PM2**, **Nginx** als Reverse-Proxy und **Let’s Encrypt** (Certbot). Passe Hostnamen, Pfade und Benutzer an deine Umgebung an.

## Voraussetzungen

- DNS A/AAAA-Eintrag auf die Hetzner-IP
- SSH-Zugang
- Auf dem Server: `nodejs` (20+), `nginx`, `certbot`, `python3-certbot-nginx`

## Erste Einrichtung auf dem Server

1. Benutzer und App-Verzeichnis anlegen, z. B. `/opt/bauvibe/app`.
2. `.env.production` aus [.env.production.example](.env.production.example) befüllen und **nicht** ins Repository legen.
3. Nginx-Site (HTTP) für deinen Hostnamen anlegen, `proxy_pass` auf `http://127.0.0.1:3000` (oder den Port aus `ecosystem.config.cjs`).
4. `sudo certbot --nginx -d app.example.com` ausführen und TLS aktivieren.
5. `npm install --omit=dev` (oder lokal bauen und Artefakte rsync – siehe Skript).
6. `npx prisma migrate deploy`
7. `pm2 start ecosystem.config.cjs` (oder `pm2 start npm --name bauvibe -- start`)

## Skript vom Entwicklungsrechner

[scripts/deploy-to-hetzner.sh](scripts/deploy-to-hetzner.sh) synchronisiert den Code per **rsync** auf den Server, installiert Abhängigkeiten, wendet Migrationen an und startet die App per **PM2** neu.

Vor dem ersten Lauf Variablen setzen, z. B.:

```bash
export HETZNER_HOST="app.example.com"
export SSH_USER="deploy"
export REMOTE_PATH="/opt/bauvibe/app"
```

Nginx und Certbot werden im Skript nur **kommentiert** als Erinnerung erwähnt; TLS und vHost-Konfiguration sind serverseitig einmalig einzurichten (siehe oben).

## Healthcheck

Nach dem Rollout sollte `GET https://app.example.com/api/health` den Status `ok` und `database: up` liefern (siehe [app/api/health/route.ts](app/api/health/route.ts)).
