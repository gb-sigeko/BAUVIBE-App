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

---

## Phase 4 – Begehungsprotokoll (PDF, E-Mail, UI)

### APIs (`/api/begehungen/[id]/…`)

- `POST …/upload-foto` – Multipart `file`, optional `role`: `overview` (setzt `uebersichtFoto`) oder `mangel` (nur Datei-URL, ohne Übersichtsfoto zu überschreiben). Ablage unter `public/uploads/begehungen/{id}/`.
- `POST …/add-mangel` – analog zu Projekt-Mängel-API.
- `PUT …/verteiler` – JSON `{ entries: [{ name, email, gewerk?, send? }] }`.
- `POST …/generate-pdf` – `@react-pdf/renderer`, zweispaltige Mängelzeilen (Text / Bild), Speicherung `public/protokolle/begehung-{id}.pdf`, Update `protokollPdf`.
- `POST …/send` – Versand per `sendTransactionalEmail` inkl. PDF-Anhang; `EMAIL_SERVER` (nodemailer-SMTP-String) oder `RESEND_API_KEY`; `EMAIL_FROM` / `EMAIL_MOCK`.

### UI

- Seite `/begehungen/[id]/protokoll` mit Upload, Mängel-Modal, Verteiler (inkl. Projektbeteiligte), PDF- und Versand-Buttons.
- Projekt-Tab „Begehungen“: Link **Protokoll**.

### Daten / Seed

- Textbaustein „Abschluss Protokoll“ (`kategorie: mangel`, Platzhalter `{{projektname}}`).

### Tests

- `e2e/phase4.spec.ts` – Upload, Mangel, Verteiler, PDF (%PDF + Text „Mangel“ via `pdf-parse`), Versand (Mock).
- Playwright `webServer.env`: `EMAIL_MOCK=1`.

---

## Phase 5 – Tourenplanung

### Datenmodell

- `Tour`: `isoYear`, `isoWeek`, optional `date`, `employeeId`, `region`, `sortOrder` (JSON-Array von Projekt-IDs), `status`, `conflictFlag`, `notes`; `PlanungEntry.tourId` optional mit `onDelete: SetNull`.

### APIs

- `GET/POST /api/tours` (Query `isoYear`, `isoWeek`, optional `employeeId`).
- `PUT/DELETE /api/tours/[id]` – u. a. `sortOrder` aktualisieren.
- `POST /api/tours/auto-bundle` – Platzhalter (501).

### Logik

- `applyKrankVertretungForHorizon`: nach Umbuchung von Planungseinträgen werden Touren mit gleichem `employeeId` auf den Vertreter umgestellt, sofern die Tour über betroffene Projekte im `sortOrder` abdeckbar ist.

### UI

- Wochenplanung: Tour-Kürzel (`Tour xxxxxx`), Hervorhebung bei mehreren Einträgen derselben Tour, Dropdown **Zu Tour** pro Zelle.
- Seite `/touren`: Touren je KW, Drag & Drop zur Änderung von `sortOrder`.
- Navigation: Eintrag **Touren** (Rollen wie Planung).

### Tests

- `e2e/phase5.spec.ts`: zwei Projekte einer KW einer Tour zuordnen → Tour-ID in beiden Rasterzellen; Reihenfolge per `PUT /api/tours/[id]` (wie nach DnD im Client) → Reload `/touren` zeigt neue Nummerierung; `GET /api/tours` liefert vertauschte `sortOrder`.
