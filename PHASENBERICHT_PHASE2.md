# Phasenbericht Phase 2 – Projektakte & Kontakte

## Implementierte Tabs (`/projects/[id]`)

Reihenfolge gemäß Grundidee:

| Tab | Komponente | Funktion |
|-----|------------|----------|
| Übersicht | `ProjectOverviewTab` | Kernfelder (Status, Turnus, Stunden, SiGeKo, Vertretung, Zeitraum, Pause), integrierte **Angebote** und **Vorankündigungen** |
| Beteiligte | `ProjectBeteiligteTab` | Tabelle, Suche/Hinzufügen-Dialog, Hauptansprechpartner (exklusiv), Gültigkeit, Links zu `/kontakte`, Entfernen mit Bestätigung |
| Termine / Planung | `ProjectTermineTab` | Nicht erledigte `PlanungEntry`, feste manuelle Termine (CRUD), Verweis auf Wochenplanung |
| Begehungen | `ProjectBegehungenTab` | Liste wie zuvor |
| Aufgaben / Mängel | `ProjectTasksTab` | Filter Alle / Offen / Erledigt |
| Dokumente | `ProjectDokumenteTab` | Liste wie zuvor |
| Kommunikation | `ProjectKommunikationTab` | Telefonnotizen + Kommunikationsverlauf + Formular (E-Mail/Telefon/Notiz) |
| Chronik | `ProjectChronikTab` | Timeline |
| Abrechnung / LV | `ProjectAbrechnungTab` | Platzhalter „später“ |

## Datenmodell „ProjectContact“

Es besteht bereits **`ProjectParticipant`** (`projectId`, `organisationId`, `contactPersonId`, `roleInProject`, `isPrimary`, `validFrom`, `validTo`, `notes`). Dieses Modell erfüllt die Anforderung; zusätzliche Tabelle `ProjectContact` wäre redundant.

## Neue / angepasste API-Routen

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/api/projects/[projectId]/contacts` | Beteiligte (wie bisherige Participants-Liste) |
| `POST` | `/api/projects/[projectId]/contacts` | Kontakt hinzufügen (`contactPersonId`, `role`, `isMainContact`, optional `validFrom`/`validUntil`) |
| `PATCH` | `/api/projects/[projectId]/contacts/[participantId]` | Rolle, Hauptkontakt, Gültigkeit |
| `DELETE` | `/api/projects/[projectId]/contacts/[participantId]` | Verknüpfung entfernen |
| `GET` | `/api/projects/[projectId]/planung-entries` | `{ upcoming, fixedManual }` |
| `POST` | `/api/projects/[projectId]/planung-entries` | Fester Termin: `planungType=FEST`, `planungSource=MANUELL`, `priority` wie Turnus-Engine |
| `PUT` | `/api/planung/[id]` | Erweitert um `note`, `plannedDate` (inkl. Neuzuordnung ISO-KW) |

`POST /api/projects/[projectId]/participants` setzt bei `isPrimary` ebenfalls alle anderen Haupt-Flags zurück (Konsistenz).

## Kontakte (`/kontakte`)

- Suchleiste mit URL-Parameter `q`, Hervorhebung per `?contact=<id>`.
- Dubletten-Hinweis bei gleicher E-Mail im Neuanlage-Formular (API-Abfrage).

## Weitere Korrekturen

- `telefonnotizen`: Chronik-Eintrag über `chronikEntry` (vorher falscher Client-Name); `GET` ohne Schreibrecht.
- **NextAuth**: `secret` aus `AUTH_SECRET` oder `NEXTAUTH_SECRET`; Middleware liest dasselbe Geheimnis.
- **Mitarbeiter-Seite**: `holidays` → `availabilities` (Prisma-Relation).

## Testsuite

- `npm run lint` – grün  
- `npm run build` – grün  
- `npm run test:e2e` bzw. `npm run test:suite` (`scripts/run-full-test-suite.ts`): **4 Playwright-Tests grün** (Auth-Setup + Beteiligte + fester Termin in Planung + Telefonnotiz).

Playwright startet `next start` auf Port **3005** mit `NEXTAUTH_URL=http://localhost:3005`. Die vollständige Suite führt zuerst `build` aus und setzt `PW_USE_EXISTING_BUILD=1`, damit kein zweites `next build` im WebServer nötig ist.

`e2e/global-setup.ts` stellt per Upsert sicher, dass `fee@bauvibe.local` mit Passwort `Bauvibe2026!` existiert (ohne vollständigen Seed).

## Bekannte Einschränkungen

- E2E setzen ein erreichbares **PostgreSQL** mit Migration/Seed-Daten voraus (Projekte, Planungshorizont); ohne DB schlägt der Login fehl.
- Playwright gegen `next dev` war in dieser Umgebung fehleranfällig (Webpack-Cache/Auth); der stabile Pfad ist **`next start`** wie in der Konfiguration.
- `e2e/.auth/user.json` wird lokal generiert und ist git-ignoriert.
