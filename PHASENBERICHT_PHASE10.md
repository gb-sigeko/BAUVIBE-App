# Phasenbericht Phase 10 (Sicherheit & Betrieb)

## Überblick

Umsetzung der offenen Punkte aus Phase 10 im Branch `feature/phase-10-sicherheit`: robusteres Env-Checking, CI auf GitHub Actions, Deployment-Skript und Doku für Hetzner, öffentlicher Health-Endpunkt mit Datenbank-Ping, erweiterte E2E-Tests und README-Anpassung für CI-Secrets.

## Durchgeführte Schritte

1. **`scripts/check-env.ts`**  
   `import "dotenv/config"` ganz am Anfang ergänzt, damit eine lokale `.env` vor der Prüfung der Pflichtvariablen geladen wird (konsistent zu anderen Skripten).

2. **GitHub Actions**  
   Neue Workflow-Datei `.github/workflows/ci.yml`: Node 20, `npm ci`, `prisma migrate deploy` gegen die per Secret gesetzte Test-Datenbank, Playwright-Browser-Installation, anschließend `npm run test:automated` (Lint, Build, E2E mit `TEST_DATABASE_URL` als `DATABASE_URL`/`DIRECT_URL`).

3. **README**  
   Abschnitt zu CI und Tabelle der benötigten Repository-Secrets (`TEST_DATABASE_URL`, `AUTH_SECRET`) sowie Hinweis auf die fest codierten CI-Defaults (`NEXTAUTH_URL`, E-Mail-Mock).

4. **Deployment**  
   - `scripts/deploy-to-hetzner.sh`: rsync des Projekts, remote `npm ci`/`prisma migrate deploy`/PM2-Reload, Hinweise zu Nginx und Certbot.  
   - `.env.production.example`: Vorlage für Produktionsvariablen.  
   - `DEPLOYMENT.md`: Ablauf Hetzner/Ubuntu, Nginx, TLS, Healthcheck.

5. **`GET /api/health`**  
   Neue Route `app/api/health/route.ts`: JSON `{ status, database }`, DB-Ping per `SELECT 1`; bei Fehler HTTP 503. In `middleware.ts` war `/api/health` bereits ohne Auth durchgängig – unverändert genutzt.

6. **Playwright**  
   - `e2e/global-setup.ts`: zusätzlich Upsert für `extern@bauvibe.local` (Rolle EXTERN, Test-Mitarbeiter), damit der Extern-Test in CI zuverlässig funktioniert.  
   - `e2e/phase10-security.spec.ts`: öffentlicher Health-Check (200); nach Extern-Login Aufruf von `/api/export` mit erwartetem 401/403.  
   - `playwright.config.ts`: Projekt `chromium-extern` ohne Storage-State aus dem Büro-Setup, bestehendes `chromium`-Projekt ignoriert diese Spec-Datei.

7. **Bericht**  
   Dieses Dokument als Nachweis der Phase-10-Arbeiten.

## Hinweise für Betrieb

- CI benötigt eine beschreibbare Postgres-URL und ein gesetztes `AUTH_SECRET`.  
- Produktions-`.env` niemals committen; siehe `.env.production.example` und `DEPLOYMENT.md`.

## Push zu GitHub (Workflow-Datei)

GitHub verlangt für Änderungen unter `.github/workflows/` ein Token mit **`workflow`-Scope**. Ohne diesen Scope schlägt `git push` mit einer Meldung zu `ci.yml` fehl. Abhilfe z. B.:

```bash
gh auth refresh -h github.com -s workflow -s repo
git push -u origin feature/phase-10-sicherheit
```

Anschließend Pull Request von `feature/phase-10-sicherheit` nach `main` im GitHub-Web-UI anlegen.
