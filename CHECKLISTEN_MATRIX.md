# Checklisten-Matrix (Grundidee Teil 5, Zeilen 860–1014)

Legende: **[x] erfüllt** · **[~] teilweise** · **[ ] offen**  
Komponente: **P**risma · **A**PI · **U**I · **L**ogik

*Stand: Phase 0 – manueller Abgleich Codebasis / Spez. Bei Abweichung Spez gewinnt.*

---

## A. Datenmodell (Prisma)

| # | Checklistenpunkt | Status | P/A/U/L | Kurzbeleg / Lücke |
|---|------------------|--------|---------|-------------------|
| A1 | Project inkl. tenant, turnus, contractual/completed, responsible/substitute, Pause | ~ | P | `tenantId`, `pauseStartsOn`/`pauseEndsOn`; **kein** vollständiger Status-Workflow (Anfrage→Abrechnung) |
| A2 | Employee (Kürzel, intern/extern, Kapazität, Rolle) | ~ | P | `EmployeeKind`, `weeklyCapacity`; **kein** separates HR-Feldbündel laut alter Namensliste |
| A3 | Availability | ~ | P | `Holiday`-Map, Gründe; tageweise/fein granular teilweise offen |
| A4 | Substitute + affected projects | ~ | P | `Substitute.affectedProjectIds`; Nutzung in Engine teilweise |
| A5 | PlanungEntry (KW, Typ, Quelle, Priorität, Soll/Ist-Nr., specialCode, Konflikt) | ~ | P | ISO-KW statt einzelnes `kw`-Feld; Kernfelder vorhanden |
| A6 | Begehung inkl. laufendeNr, verteiler JSON, protokollPdf | ~ | P | Felder da; **Soll/Ist-Verknüpfung** zum PlanungEntry nicht überall enforced |
| A7 | Protokoll | ~ | P | Tabelle `Protokoll`; Workflow vs. PDF-Route teils parallel |
| A8 | Task / Mangel | ~ | P | `Task`, `Mangel`; Eskalation GF / kritisch-überfällig Logik UI offen |
| A9 | Document | ~ | P | `Document`; erwartete Dokumente / Arbeitskorb „Unterlagen“ offen |
| A10 | ChronikEntry | ~ | P/L | Modell da; **nicht alle** Mutationen über `appendChronikEntry` |
| A11 | Offer | ~ | P/A | `Offer`; Pfade unter `projects/.../offers` |
| A12 | Vorankuendigung | ~ | P/A | `Vorankuendigung`; APIs teils Stub |
| A13 | Mangel, Textbaustein, Telefonnotiz, VorOrtRueckmeldung | ~ | P | Vorhanden; UI-Abdeckung variiert |
| A14 | Enums vollständig | ~ | P | `ProjectStatus` u. a. **vereinfacht** (kein Anfrage/Angebot/Abrechnung) |
| A15 | FK / onDelete | ~ | P | Prüfung im Detail offen für neue Module |

---

## B. API-Routen (Checkliste B, Zeilen 897–928)

Hinweis: Viele Begehungs-Endpunkte liegen unter **`/api/projects/[projectId]/begehungen/...`** statt flach `/api/begehungen/[id]/...` (funktional **teilweise** = erfüllt mit Abweichung).

| Route (Spez) | Status | Komponente | Bemerkung |
|--------------|--------|--------------|-----------|
| POST/GET /api/projects, GET/PATCH project by id, DELETE | ~ | A | DELETE vorhanden? prüfen Projekt-Route |
| POST/GET /api/employees, GET/PUT/DELETE [id] | ~ | A | DELETE `[id]` vorhanden |
| POST/GET /api/availability | ~ | A | |
| POST/GET /api/substitutes | ~ | A | |
| GET/POST /api/planung, PUT/DELETE /api/planung/[id], POST move | ~ | A | Range-Query ergänzt |
| Begehungen CRUD + upload + mangel + verteiler + generate + send-protokoll | ~ | A | Projekt-präfix |
| GET /api/textbausteine | ~ | A | |
| POST/GET/PUT/DELETE /api/tasks | ~ | A | |
| POST/GET/DELETE /api/documents | ~ | A | |
| GET /api/chronik?projectId | ~ | A | |
| offers from-email, approve, send | ~ | A | unter `projects/.../offers` |
| vorankuendigung create-from-pdf, fetch-arbeitsschutz, generate-pdf, send | ~ | A | teils Stub |
| telefonnotizen + PATCH | ~ | A | Projekt-gebunden + Top-Level je nach Route |
| POST vor-ort-rueckmeldung, GET planung/feedbacks | ~ | A | |
| POST email/analyze, planung/suggestions, suggestions/[id]/apply | ~ | A | KI teils Stub |
| Auth [...nextauth], session | ~ | A | |

---

## C. UI-Seiten (Checkliste C, Zeilen 930–952)

| Seite (Spez) | Status | Komponente | Bemerkung |
|--------------|--------|------------|-----------|
| `/` Fee-Arbeitsfläche mit Widgets | ~ | U | Redirect nach `/fee`; Widgets teilweise |
| `/dashboard` GF | ~ | U | `/gf` statt `/dashboard` |
| `/planung` Raster, DnD, Kontextpanel | ~ | U | Raster + Virtualisierung; **Filter, gespeicherte Ansichten, volles Kontextpanel, DnD→Chronik** lückenhaft |
| `/arbeitskorb` | ~ | U | Kernlisten; **weitere Kategorien** (Phase 6) offen |
| `/projekte`, `/projekte/[id]` Tabs | ~ | U | Akte nicht alle Tabs / Abrechnung vollständig |
| `/mitarbeiter` | ~ | U | |
| `/eigene-planung` | ~ | U | Vor-Ort-Button / Formular Phase 7 |
| `/angebote`, `/vorankuendigungen` | ~ | U | teils über Projekt / optional |
| `/begehungen/[id]/protokoll` | ~ | U | ggf. unter Projekt-Pfad; PDF-Flow teils API |

---

## D. Funktionale Kernlogik (953–981)

| # | Anforderung | Status | L | Bemerkung |
|---|-------------|--------|---|-----------|
| D1 | Turnus nächste KW, Abruf ohne Auto | ~ | L | `syncTurnusSuggestions`; Hintergrund-Job Phase 1 |
| D2 | Vorschläge 12 Wochen, Status vorgeschlagen | ~ | L | konfigurierbar; Page oft 12 |
| D3 | FEST > Vertretung > Turnus > manuell | ~ | L | `PLANUNG_PRIORITY` |
| D4 | DnD → Chronik | ~ | L | `POST /api/planung/move` schreibt Chronik; **Raster-DnD** UI offen/teils |
| D5 | Rückmeldung nb/ob, Büro-Arbeitskorb | ~ | L/A | Feedback-API; Bestätigungsworkflow Fee |
| D6 | Nicht erledigt → nächste freie KW | ~ | L | `applyPlanungFeedback` |
| D7 | isCompletedForContract / UF / nb/ob | ~ | L | `computeIsCompletedForContract` |
| D8 | Arbeitskorb >1 / >3 Tage Rückmeldung | ~ | U/L | **angepasst** Phase 0 |
| D9 | Protokoll fehlt >3 Tage | ~ | U | Begehungen-Liste |
| D10 | Chronik bei allen Änderungen | [ ] | L | Service da, **Durchsetzung** offen |
| D11 | Extern nur eigene Planung + API-Filter | ~ | L/A | Middleware prüfen (Phase 10) |
| D12 | Dashboard-KPIs exakt Formel | [ ] | U/L | `/gf` teilweise, Formeln prüfen |

---

## E. Automatisierungen (982–994)

| Thema | Status | Komponente |
|-------|--------|------------|
| Telefonnotizen Tab + CRUD | ~ | U/A |
| Vor-Ort-Rückmeldung + Arbeitskorb | ~ | A/U |
| Angebot KI/PDF/Versand | ~ | A |
| Vorankündigung PDF/Arbeitsschutz | ~ | A |
| E-Mail-Analyse + Übernahme | ~ | A |
| Begehungsprotokoll komplett | ~ | U/A |

---

## F. Qualität & Deployment (995–1010)

| # | Punkt | Status | Komponente |
|---|-------|--------|------------|
| F1 | `npm run build` | ~ | CI |
| F2 | `npm run lint` | ~ | CI |
| F3 | Middleware-Matrix Rollen | [ ] | L | `MIDDLEWARE_MATRIX.md` Phase 10 |
| F4 | .env / .env.example | ~ | Betrieb |
| F5 | prisma.config / Migrationen | ~ | P |
| F6 | Seed Demo-User | ~ | P |
| F7 | GitHub / kein Secret im Repo | ~ | Prozess |

---

## G. Standortunabhängigkeit (1012–1015)

| Punkt | Status | Bemerkung |
|-------|--------|-----------|
| G1 | Cloud-DB, gleiche DATABASE_URL | ~ | Supabase/Postgres |
| G2 | Kein SQLite-Produktivzwang | [x] | |

---

## Phasen-Zuordnung (Umsetzungsplan)

| Phase | Inhalt | Matrix-Blöcke |
|-------|--------|----------------|
| 1 | Wochenplanung-Leitstand, Turnus-Job | D1–D4, C `/planung` |
| 2 | Projektakte + Kontakte voll | A1, C, A10 |
| 3 | Verfügbarkeit, Vertretung, Kapazität | A3–A4, D, Dashboard-Anteil |
| 4 | Begehung, Protokoll, PDF, E-Mail | A6–A8, B, C, E |
| 5 | Touren Prisma + API + UI | neu Tour-Modell |
| 6 | Arbeitskorb erweitert | C `/arbeitskorb`, D8 |
| 7 | Kommunikation, Telefonnotiz, Vor-Ort, E-Mail-KI | E, B |
| 8 | Dashboards Fee/GF | C, D12 |
| 9 | Exporte, Mobile | C, Reporting |
| 10 | Middleware-Matrix, CI, Doku | F, `MIDDLEWARE_MATRIX.md` |

**Abschluss:** Alle Zeilen auf **[x]** bringen; dann Gesamtspez erfüllt.
