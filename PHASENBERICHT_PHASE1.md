# Phase 1 – Kernlogik Wochenplanung (abgeschlossen)

**Ziel:** Checkliste D (Grundidee 953–981) und Leitstand `/planung` (Spez Phase 1).

## Turnus, Abruf, Pause, Roll-Forward

| Thema | Umsetzung |
|--------|-----------|
| 12-Wochen-Horizont (konfigurierbar) | Unverändert: `buildPlanungHorizon(anchor, weekCount)` auf der Planungsseite; Standard 12, Query `?weeks=`. |
| Pausierte / nicht-aktive Projekte | Turnus-Sync lädt nur `Project.status === ACTIVE`; Pausenfenster `pauseStartsOn`/`pauseEndsOn` überspringt KW im Turnus-Loop (`syncTurnusSuggestions`). |
| Abruf | `ABRUF` → kein Turnus-Intervall (`turnusToIntervalWeeks`); keine automatischen Turnus-Vorschläge. |
| Roll-Forward „nicht erledigt“ | **`rollForwardNotCompleted`** nutzt jetzt dieselbe Logik wie die Rückmeldung: **`nextFreeWeekInHorizon`** aus neuem Modul `lib/planung-next-free-week.ts` (nächste freie KW im Sync-Horizont statt blind +1). |
| On-Demand / API | `POST /api/planung/sync-turnus` und Server-Render `/planung` rufen weiter `syncTurnusSuggestions` auf (Hintergrund-Cron optional, nicht Teil dieses Commits). |

## Rückmeldungen, Zählung, Chronik

| Thema | Umsetzung |
|--------|-----------|
| nb / ob / UF / `isCompletedForContract` | Unverändert über `applyPlanungFeedback` + `computeIsCompletedForContract` + `syncProjectCompletedBegehungenCount`. |
| „Nicht erledigt“ → nächste freie KW | Bereits in `applyPlanungFeedback`; Horizont weiterhin konfigurierbar (`horizonWeekCount`, API 52). |
| Chronik bei Rückmeldung | **`applyPlanungFeedback`** schreibt nach jedem Outcome einen **`ChronikEntry`** (`appendChronikEntry`, `action: planung_rueckmeldung`). |
| Chronik bei Mitarbeiter-DnD | **`PUT /api/planung/[id]`** bei geändertem `employeeId`: **`appendChronikEntry`** (`action: planung_mitarbeiter_zugewiesen`). KW-Verschiebung bleibt bei **`POST /api/planung/move`** mit Chronik. |

## Leitstand-UI `/planung`

| Anforderung | Umsetzung |
|-------------|-----------|
| Filter | Mitarbeiter (Einträge im Horizont), Region (Verantwortlicher), Planungs-Status, Turnus (Projekt) – clientseitig, reduziert sichtbare Projektzeilen. |
| Gespeicherte Ansichten | **localStorage**-Key `bauvibe-planung-views-v1`: Name + Filter + `weeks`; „Speichern“ / Klick auf gespeicherte Ansicht (lädt `?weeks=…` neu). |
| Kontextpanel | Rechte Spalte: Projekt, Turnus, Region, letzte Begehung (Server: erste Begehung pro Projekt absteigend nach Datum), KW/Status, Link zur Projektakte, Rückmelde-Buttons. |
| Farblogik | Bestehende `statusAccentClass` + **Legende** oberhalb des Rasters. |
| Drag & Drop Mitarbeiter | **`@dnd-kit`**: Griff **⣿** am Eintrag → Ziehen auf **Mitarbeiter-Kachel** → `PUT /api/planung/:id` mit `employeeId` → Chronik (siehe oben). |
| Tour-ID | Unverändert in der Zelle, wenn `tourId` gesetzt. |
| Kapazitätsbalken | Pro Mitarbeiter-Kachel: Anzahl Einträge im geladenen Horizont vs. `weeklyCapacity * weekCount` als Fortschrittsbalken + Text `… / N KW`. |
| Virtualisierung | Beibehalten: **`react-window` `Grid`** für Zeilen × KW-Spalten. |
| Serverdaten | `/planung` lädt zusätzlich **aktive Mitarbeiter**, **Projekt-Turnus/Region**, **letzte Begehung** pro Projekt (eine zusätzliche Abfrage über alle Projekt-IDs). |

## Tests & CI-Härtung (Grind)

| Kommando | Ergebnis (Stand Phase 1) |
|----------|-------------------------|
| `npm run lint` | grün |
| `npm run build` | grün |
| `npm run test:automated` | **grün** |

**Playwright / NextAuth:** Dev-Server für E2E auf festem Port **`3017`** (`PLAYWRIGHT_DEV_PORT` überschreibbar), **`NEXTAUTH_URL`** + **`AUTH_TRUST_HOST`** im `webServer`-Env → kein `MissingCSRF` bei Credentials-Login. **`test.describe.configure({ timeout: 120_000 })`** für E2E-Serial-Suite.

## Geänderte / neue Dateien (Kern)

- `lib/planung-next-free-week.ts` (neu)
- `lib/planung-feedback-apply.ts` (Chronik; nutzt `nextFreeWeekInHorizon`)
- `lib/turnus-engine.ts` (`rollForwardNotCompleted` → `nextFreeWeekInHorizon`)
- `app/api/planung/[id]/route.ts` (Chronik bei Zuweisung)
- `components/planung-board.tsx` (Filter, Views, DnD, Legende, Kapazität, Kontext)
- `app/(dashboard)/planung/page.tsx` (Daten für Leitstand)
- `playwright.config.ts` (Port, `NEXTAUTH_URL`, Timeouts)
- `tests/automated/e2e/begehung-and-perf.spec.ts` (Describe-Timeout)

## Offen / spätere Phasen

- **Tour-Objekt** (Phase 5): `tourId` wird angezeigt; Persistenz/Tour-API bleibt Phase 5.
- **Hintergrund-Cron** für Turnus-Sync: weiterhin on-demand + manueller API-Call ausreichend dokumentiert.
- **„Nächster Turnus“** im Kontextpanel als berechnetes Datum: aktuell nur Projekt-Turnus-Enum; optional Feinschliff.

---

*Phase 1 abgeschlossen – alle relevanten automatisierten Tests grün.*
