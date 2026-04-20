# BAUVIBE-App

Standardbranch für Pull Requests. Anwendungscode liegt auf feat/domain-modules-ui-api.

## GitHub Actions (CI)

Der Workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) nutzt eine **Test-Postgres-Instanz** (`TEST_DATABASE_URL` als `DATABASE_URL` / `DIRECT_URL`) und führt `npm run test:automated` aus (Lint, Build, Playwright).

### Repository-Secrets

| Secret | Verwendung |
| --- | --- |
| `TEST_DATABASE_URL` | Verbindungs-URL zur CI-Datenbank (wird für `DATABASE_URL` und `DIRECT_URL` gesetzt; z.?B. Supabase-Branch oder dedizierte Test-DB). |
| `AUTH_SECRET` | Zufälliger String für NextAuth / Auth.js in der CI-Umgebung (analog zu lokalem `AUTH_SECRET`). |

Zusätzlich setzt der Workflow feste, unkritische Werte: `NEXTAUTH_URL=http://localhost:3005` (Playwright-Port), `EMAIL_MOCK=1`, Platzhalter für `EMAIL_SERVER` / `EMAIL_FROM`.

**Hinweis:** Zum Pushen von `.github/workflows/ci.yml` benötigt das verwendete GitHub-Token den Scope **`workflow`** (siehe [GitHub-Dokumentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)).
