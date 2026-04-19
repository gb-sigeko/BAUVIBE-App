# Phasenbericht Phasen 3–5

Kurzdokumentation der Umsetzung auf Branch `feature/phasen-3-5`.

## Phase 3 – Mitarbeiter, Verfügbarkeit, Vertretung, Kapazität

### Datenmodell

- `Employee`: optional `jobRole` (`EmployeeJobRole`: SiGeKo, Büro, GF, Extern), `qualifications` und `contactInfo` als JSON; bestehende Felder `displayName`, `kind`, `shortCode`, `weeklyCapacity`, `active`, `region` bleiben die fachliche Grundlage (Mapping zur Spez: „name“ = `displayName`, „type“ = `kind`, „isActive“ = `active`).
- `Substitute` (`Substitution`): optionales Feld `priority` (niedrigere Zahl = höhere Priorität bei der Auflösung).
- Eindeutigkeit `shortCode`: normalisiert als **Großbuchstaben** beim Anlegen; zusätzliche Suche per `mode: "insensitive"` gegen Kollisionen.

### APIs

- `GET/POST /api/availability`, `DELETE /api/availability/[id]` (EXTERN: nur eigene `employeeId`).
- `GET/POST /api/substitutes`, `DELETE /api/substitutes/[id]` (nur Schreibrollen).
- `GET/POST /api/employees` (Liste + Anlage, keine EXTERN-Nutzung).
- `GET /api/planung` mit Horizont-Query: **EXTERN** erhalten nur Einträge mit ihrer `employeeId` (Session enthält `employeeId` aus Login).

### Logik

- `syncTurnusSuggestions`: Turnus-Zelle wird nicht mit abwesendem SiGeKo besetzt; bei passender Vertretung wird der **Vertreter** vorgeschlagen, sonst keine neue Zelle. Substitute mit leerem `affectedProjectIds` gelten für alle aktiven Projekte, in denen der Abwesende **verantwortlicher** SiGeKo ist.
- `applyKrankVertretungForHorizon`: bucht bestehende Planungseinträge (außer erledigt/abgesagt) von abwesenden Mitarbeitenden auf den ermittelten Vertreter um; wird vor Turnus-Sync auf der Planungsseite und in `POST /api/planung/sync-turnus` ausgeführt.

### UI

- Mitarbeiter-Detail `/mitarbeiter/[id]`: Tabs **Verfügbarkeit** und **Vertretungen** inkl. Formularen.
- Wochenplanung: **Kapazitäts-Karte** (geplante Slots vs. `weeklyCapacity` × Anzahl KW-Spalten).
- `eigene-planung`: externes Personal kann **eigene Abwesenheiten** pflegen (gleiche Availability-API).
- Planungsraster: `data-testid` auf Zeilen (`planung-row-{code}`) und Zellen (`planung-cell-{year}-{week}`) für E2E.

### Tests

- `e2e/phase3.spec.ts`: keine Anzeige „MW“ in KW 19/2026 für PRJ-2401 bei Urlaub; Vertretungstest mit festem Termin (MW) → Anzeige „TK“ nach Laden der Planung.

### Konfiguration

- `npm run test:automated` → identisch zu `test:suite` (Lint, Build, Playwright).
- E-Mail: `EMAIL_MOCK=1` erzwingt Logging statt Versand (`lib/email.ts`).
