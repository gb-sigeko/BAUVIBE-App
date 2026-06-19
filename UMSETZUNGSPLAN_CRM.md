# BAUVIBE – Umsetzungsplan CRM/ERP (Modul-PDFs + Epics)

**Quellen:** `docs/Modul_Uebersicht.txt` (extrahiert aus *Modul Übersicht_ausführlich, ohne Wochenplanung.pdf*), `docs/Modul_Wochenplanung.txt` (*Modul Wochenplanung.pdf*), `BESTANDSAUFNAHME.md`, bestehende APIs unter `app/api/**`.

**Ziel:** Vollständige inhaltliche Abdeckung der Modulbeschreibungen, priorisiert über Epics P0–P6, mit Akzeptanzkriterien und Playwright-Abdeckung. Reihenfolge: Stammdaten → Akte → Arbeitskorb → Begehung → Exporte → Dashboards → KI (nur nach Freigabe).

---

## 1. Abdeckungsmatrix: PDF-Module → Epics

| Abschnitt Modulübersicht (TXT) | Kernanforderungen (Kurz) | Epic |
| ------------------------------ | ------------------------- | ---- |
| 0. Wochenplanung | Einsatzsteuerung, Turnus, Touren, Konflikte, Rücklauf, Kopplung Akte/Arbeitskorb | Epic 2 (Termine), Epic 3, Epic 5 (Export Wochenliste), gesamte Wochenplanung-Datei parallel |
| 1. Projektstamm / Akte | Anlage, Tabs, Chronik, Pause/Baustopp, Beteiligte, Dokumente, Kommunikation | Epic 1 + Epic 2 |
| 2. Kontakt- und Kundendatenbank | Organisation, Person, Projektzuordnung, Rollen, Historie | Epic 1 + Epic 2 (Beteiligte) |
| 3. Mitarbeiter / Verfügbarkeit | Stammdaten, Urlaub, Vertretung, Kürzel, intern/extern | Epic 1 + bestehende Detailseiten erweitern |
| 4. Tourenplanung | Bündelung, Zuordnung Mitarbeiter | Bestehend `/touren` – in Epic 2/3 einbinden |
| 5. Begehungen / Protokolle | Workflow, PDF, Verteiler, Mängel | Epic 4 |
| 6. Aufgaben / Mängel / WV | Priorität, Frist, Zuweisung, Eskalation | Epic 2 |
| 7. Dokumentenverwaltung | Ablage, Status, Versionierung | Epic 2 |
| 8. Projektchronik | Jede relevante Änderung | Epic 2 |
| 9. Kommunikationsmodul | Kanäle, Follow-up | Epic 2 |
| 10. Arbeitskorb | Kategorien, Quellen, Erledigen | Epic 3 |
| 11. Dashboard / Leitstand | Filter, KPIs, kritische Projekte | Epic 6 |
| 12. Rollen / Rechte | Büro, SiGeKo, Extern, Leitung | Querschnitt + Middleware-Review je Epic |
| 13. Vorlagen / Textbausteine | SOP, Platzhalter | Epic 4 (Mängel), bestehend `/textbausteine` |
| 14. Exportmodul | Listen, CSV/PDF | Epic 5 |
| 15. Abrechnung / LV | optional laut Spez | Nach Epic 2 – eigenes Epic sobald im TXT detailliert |
| 16. Feedback / QA | Eskalation, Nachverfolgung | Epic 3 + CI/E2E |
| 17. KI-Assistenz | E-Mail, Rückläufe | Epic 7 |

**Modul Wochenplanung (separate TXT):** Nicht-Kalender-Logik, KW-Raster, Checkbox-Rücklauf, Kürzel (case-insensitive), Turnus w/2w/3w/Abruf, S/W-Spalten-Logik, Sondercodes `nb`/`ob`, Vorausplanung + laufende Woche + Nachsteuerung, Vertretung, Touren, Konflikte, Anbindung Arbeitskorb und SiGeKo-Cockpit.

→ Technische Umsetzung: bestehendes `PlanungEntry`-Modell + UI `/planung` fortlaufend mit TXT abgleichen (Felder, Statusmaschine, Export); Abhängigkeit von **Epic 1** (Projekt-/Mitarbeiter-Stammdaten korrekt gepflegt).

---

## 2. Epics – Akzeptanzkriterien, Tests, Abhängigkeiten

### Epic 1: CRUD-UI Stammdaten (P0) — *kein Folge-Epic ohne stabile Datenbasis*

**Abhängigkeiten:** keine. **Blockiert:** Epic 2–7.

**Akzeptanzkriterien**

1. **Projekte:** Auf `/projects` können Nutzer mit Schreibrecht (ADMIN, BUERO, SIKOGO, GF) ein Projekt **anlegen**, **bearbeiten**, **löschen**. Dialog/modales Formular mit Pflichtfeldern: Titel (`name`), Ort (`siteAddress`), Status, Turnus, vertragliche Begehungen (`contractualBegehungen`), zuständiger Mitarbeiter (`responsibleEmployeeId`). Eindeutige interne `code`-Vergabe serverseitig falls nicht manuell gesetzt.
2. **Organisationen & Kontakte:** Auf `/kontakte` vollständige Erfassungsformulare inkl. optionaler Branche/Notizen für Organisationen laut API; Kontakte mit Organisation, Funktion, E-Mail, Telefon.
3. **Mitarbeiter:** Auf `/mitarbeiter` Formular zur Neuanlage (Kürzel, Anzeigename, Art intern/extern, optional Rolle).
4. Nach erfolgreicher Anlage erscheinen Einträge in den jeweiligen Tabellen ohne manuellen Reload (Router-Refresh).

**Automatische Tests (Playwright, Rolle Fee / BUERO)**

- `e2e/epic1-stammdaten.spec.ts`: drei Tests (Projekt, Organisation+Kontakt, Mitarbeiter) – jeweils Eingabe → sichtbar in Liste (`getByTestId` / eindeutiger Textmarker).

**API**

- `POST/GET` (optional) `/api/projects`, `PATCH/DELETE /api/projects/[projectId]` – Auth + `requireWriteRole`.

---

### Epic 2: Projektakte – Tabs vervollständigen (P1)

**Abhängigkeiten:** Epic 1 (Stammdaten, Beteiligte-CRUD sinnvoll erst mit verlässlichen Kontakten/Projekten).

**Akzeptanzkriterien**

- **Beteiligte:** CRUD `ProjectParticipant` inkl. Primärkennzeichen, Gültigkeit, Historie (Anzeige `validFrom`/`validTo`).
- **Termine/Planung:** Feste Termine persistieren, in `/planung` konsistent; Turnus-Sync weiter nutzbar.
- **Kommunikation:** Telefon- + E-Mail-Notizen inkl. Follow-up-Datum; Filter/Sortierung minimal.
- **Dokumente:** Upload, `DocumentStatus`, Versionisierung (mindestens „aktuelle Version“ + Historie-Liste).
- **Aufgaben/Mängel:** Priorität, Frist, Status, Zuweisung an `Employee`.
- **Chronik:** zentrale Schreibpfade für relevante Events (Middleware/Service), keine „stille“ Änderung.

**Tests:** Erweiterung `e2e/phase2.spec.ts` oder neues `epic2-projektakte.spec.ts` – je Tab ein Smoke-Flow.

---

### Epic 3: Arbeitskorb – alle Kategorien (P2)

**Abhängigkeiten:** Epic 2 (Kommunikation, Dokumente, Planung liefern Quellen).

**Akzeptanzkriterien:** Kategorien laut PDF/TXT: fehlende Unterlagen, Kommunikations-Wiedervorlagen, kritische Projekte, Vor-Ort-Rückmeldungen; Aktionen „Erledigt“ + Quellen-Link.

**Tests:** Playwright: Eintrag pro Kategorie erzeugen → in `/arbeitskorb` sichtbar → Erledigt.

---

### Epic 4: Begehungsprotokoll – Workflow (P3)

**Abhängigkeiten:** Epic 2 (Dokumente, Beteiligte), Textbausteine.

**Akzeptanzkriterien:** Drag&Drop Fotos, Mängel-Editor mit Textbausteinen, Verteiler aus Beteiligten, zweispaltiges PDF, E-Mail an Verteiler (Resend produktiv konfigurierbar).

**Tests:** E2E happy path auf `/projects/[id]/begehungen/[begehungId]` (oder zentraler Protokoll-Pfad).

---

### Epic 5: Exporte (P4)

**Abhängigkeiten:** Epic 1–2 Datenqualität; Planung für Wochenliste.

**Akzeptanzkriterien:** Wochenliste PDF/CSV auf `/planung`, Projektliste PDF/CSV auf `/projects`, Aufgaben CSV auf `/arbeitskorb`; Download + MIME korrekt; Rechte laut Rolle.

**Tests:** Playwright `download`-Event oder API-GET mit Session.

---

### Epic 6: Dashboard interaktiv (P5)

**Abhängigkeiten:** Epic 3 (Kategorien + Filterziele).

**Akzeptanzkriterien:** `/fee` Widgets verlinken auf gefilterte Listen; `/gf` Export kritische Projekte, optional Diagramme.

**Tests:** Klickpfad + erwartete URL-Parameter.

---

### Epic 7: KI-Features (P6)

**Abhängigkeiten:** alle anderen Epics grün; rechtliche/Freigabe-Klärung für KI und E-Mail-Inhalte.

**Akzeptanzkriterien:** Angebot aus E-Mail (Extraktion, Kalkulation, Freigabe, PDF, Versand); Rückläufer-Erkennung mit Vorschlag Planung.

**Tests:** Contract-Tests gegen Mock-Provider + manuelle Stichprobe Fee.

---

## 3. Empfohlene Umsetzungsreihenfolge (Gantt-logisch, ohne Kalenderdatum)

1. **Epic 1** (P0) – sofort  
2. **Epic 2** Tab „Beteiligte“ + „Chronik-Pipeline“ – parallel Teile von Dokumente/Kommunikation  
3. **Epic 3** – anbinden an bestehende `arbeitskorb`-Logik  
4. **Epic 4** – Protokoll hart an PDF-Spez  
5. **Epic 5** – Exporte (nutzt `middleware` Export-Rollen)  
6. **Epic 6** – Dashboard  
7. **Epic 7** – nur nach Checkliste „alle P0–P5 E2E grün“

**Parallele Arbeit:** Wochenplanung-TXT vs. `lib/planung-conflicts`, `syncTurnusSuggestions` – eigener technischer Stream nach Epic 1, damit Stammdaten (Turnus, Soll-Begehungen) korrekt in die Planung fließen.

---

## 4. Teststrategie (durchgängig Fee / BUERO)

- **Global:** `e2e/auth.setup.ts` (Fee-Login) beibehalten.  
- **Pro Epic:** mindestens ein neuer Spec oder Erweiterung bestehender Phasen-Specs.  
- **CI:** `.github/workflows/ci.yml` – `npm run test:e2e` beibehalten; neue Specs in `chromium`-Projekt einbinden.  
- **Definition of Ready für Produktion:** alle PDF-Module laut Matrix „erfüllt“ oder explizit „out of scope“ dokumentiert.

---

## 5. Referenz Skripte

- PDF → Text: `npx tsx scripts/extract-module-pdfs.ts` (Ausgabe unter `docs/`).

---

*Stand: automatisch erzeugt im Zuge von Epic 1; Inhalt der `docs/*.txt` ist die fachliche Wahrheit für Rückverfolgbarkeit.*
