# Phasenbericht Phasen 6–8

## Phase 6 – Arbeitskorb erweitert

- **Fehlende Unterlagen:** Dokumente mit `docStatus: FEHLT`; Begehungen `DURCHGEFUEHRT` mit Begehungsdatum älter als drei Kalendertage vor heute und weiterhin fehlendem Protokoll (`protocolMissing` oder kein `protokollPdf`). Darstellung im Arbeitskorb mit Link `?tab=docs`.
- **Kommunikations-Wiedervorlagen:** Modell `Communication` um `erledigt` ergänzt (fachlich „CommunicationEntry“). API `GET /api/communication?wiedervorlage=true`, `PATCH /api/communication/[id]` mit `{ erledigt: true }`. Arbeitskorb: Liste, Buttons „Zur Quelle“ / „Erledigt“.
- **Kritische Projekte:** Aktive Projekte mit Begehungsquote &lt; 70 % (bei gesetztem `contractualBegehungen`) oder mehr als drei offene Aufgaben (`isMangel`, `priority: CRITICAL`, Status nicht erledigt).
- **Weitere Karten:** Rückmeldung Planung (`RUECKMELDUNG_OFFEN`), Aufgaben wie bisher inkl. „Erledigt“ via `PATCH /api/tasks/[id]` → `DONE`.
- **Projektakte:** Query-Parameter `?tab=…` für direkten Tab-Sprung (u. a. `docs`, `kommunikation`, `begehungen`, `tasks`).
- **Tests:** `e2e/phase6.spec.ts` prüft verzögertes Protokoll im Arbeitskorb.
- **Datenbank:** Migration `20260421120000_communication_erledigt` (Spalte `erledigt`, Index). Seed um E2E-Begehung, fehlendes Dokument und Wiedervorlage ergänzt.

## Phase 7 – Kommunikation & Vor-Ort

- **Telefonnotizen:** CRUD über `/api/projects/:id/telefonnotizen` (GET/POST) und `PATCH`/`DELETE` je Notiz; UI mit Wiedervorlage pro Zeile (Follow-up speichern).
- **E-Mail-Notizen:** Formular im Tab Kommunikation (`EmailNotizForm`), Speicherung als `Communication` mit `kind: EMAIL`, optional Empfängerzeile im Text und optionale Wiedervorlage (`followUp`).
- **Vor-Ort-Rückmeldung:** Dialog „Weitere Rückmeldung“ auf `/eigene-planung`; POST `/api/planung/entries/:entryId/vorort` – Zugriff für zugeordneten **EXTERN**-Mitarbeiter oder Büro/SiGeKo/GF (`assertVorOrtRueckmeldungAccess`).
- **Arbeitskorb:** Sektion „Vor-Ort-Rückmeldungen“ mit Link zur Projektakte Tab Termine.
- **Tests:** `e2e/phase7.spec.ts` (Extern → Fee-Arbeitskorb).

## Phase 8

_(wird nach Umsetzung ergänzt)_
