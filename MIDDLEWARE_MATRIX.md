# Middleware- und Zugriffsmatrix (Phase 10)

Rolle `EXTERN` ist ein eingeschränkter Mandanten-Login. Alle übrigen Rollen gelten als **intern** (`ADMIN`, `BUERO`, `SIKOGO`, `GF`), sofern nicht weiter eingeschränkt.

Legende: **M** = `middleware.ts` · **A** = API-Route prüft selbst (`auth` / `requireWriteRole` / …)

## Öffentlich (ohne Session)

| Pfad | Zweck |
|------|--------|
| `/login` | Anmeldung |
| `/api/auth/*` | NextAuth |
| `/api/health` | Health-Check (DB-Ping) |

## Nur `EXTERN`

| Pfad | Methoden | M | Anmerkung |
|------|----------|---|-----------|
| `/eigene-planung` | GET | ✓ | Andere Rollen → Redirect `/fee` |
| `/api/planung` | GET | ✓ | Nur mit Query `filter=own` |
| `/api/planung/entries/:id/vorort` | GET, POST | ✓ | Zusätzlich Zuweisung in der Route |
| `/api/availability` | * | ✓ | Eigene Abwesenheiten |

## Nur `GF` und `ADMIN`

| Pfad | M |
|------|---|
| `/gf` | ✓ |
| `/api/gf/*` | ✓ (falls Routen existieren) |

## Nur `BUERO`, `ADMIN`, `GF` (Export)

| Pfad | M |
|------|---|
| `/api/export/*` | ✓ |

## `POST` / `PATCH` / `PUT` / `DELETE` nur `BUERO`, `ADMIN`, `SIKOGO`

| Pfad | M |
|------|---|
| `/api/communication` | ✓ |
| `/api/communication/*` | ✓ |

`GET` auf diese Pfade bleibt für interne Rollen mit Session möglich (`ADMIN`, `BUERO`, `SIKOGO`, `GF`), sofern die Route existiert.

## Interne App (Dashboard) – nicht `EXTERN`

Seiten unter `app/(dashboard)/…` inkl. u. a.:

| Pfad (Beispiele) | Rollen |
|------------------|--------|
| `/fee`, `/planung`, `/projects`, `/arbeitskorb`, `/mitarbeiter`, `/kontakte`, `/touren`, `/textbausteine`, `/begehungen/…` | `ADMIN`, `BUERO`, `SIKOGO`, `GF` |

`EXTERN` wird auf `/eigene-planung` umgeleitet bzw. für APIs mit `403` beantwortet.

## API-Routen (Überblick, zusätzlich Route-Logik)

Grundsätzlich: **keine Session → 401** in der Route, sofern nicht öffentlich.

| Bereich | Typische Rollen (Route) |
|---------|-------------------------|
| `/api/projects/...` | Schreibzugriff i. d. R. `requireWriteRole` → `ADMIN`, `BUERO`, `SIKOGO`, `GF` |
| `/api/planung/...` (außer GET `/api/planung?filter=own` für EXTERN) | Intern; schreibend nach `requireWriteRole` |
| `/api/begehungen/...` | Intern, schreibend nach Helfern |
| `/api/tours/...`, `/api/substitutes/...`, `/api/organizations/...`, `/api/contacts/...`, `/api/employees/...`, `/api/textbausteine/...` | Intern |
| `/api/availability/...` | Intern oder `EXTERN` nur eigene Daten (Route + Middleware) |

Diese Tabelle ist eine **Checkliste**; einzelne Handler können schärfer sein (z. B. nur `ADMIN`).
