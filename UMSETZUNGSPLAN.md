# UMSETZUNGSPLAN – BAUVIBE Kernfunktionen (Soll laut `Grundidee_APP_Bauvibe.md`)

## Ziel
Vollständige, testbare Umsetzung der Prioritäten Turnus/Vertrag, Rückmeldungen, Protokoll-Workflow, Projektkontakte, virtualisiertes Planungsraster und automatisierter Testlauf gegen die echte Datenbank (`DATABASE_URL`), isoliert über `tenantId`.

## Phase 1 – Datenmodell & Vertragszählung
1. **Neues Modell `ProjectContact`**: `projectId`, `contactPersonId`, `role`, `isMainContact`, optional `validFrom`/`validTo`/`notes`; Prisma-Migration.
2. **APIs** unter `/api/projects/[projectId]/project-contacts` (GET, POST, DELETE).
3. **Projektakte Tab „Beteiligte“**: Liste aus `ProjectContact`, Formular zum Zuweisen/Entfernen; bestehende `ProjectParticipant`-Daten bleiben im Schema (Legacy), UI fokussiert auf `ProjectContact`.
4. **`syncProjectCompletedBegehungenCount`**: Setzt `Project.completedBegehungen` auf die Anzahl der `PlanungEntry` mit `isCompletedForContract === true` (vertragliche Zellen). Aufruf nach jeder relevanten Planungsänderung.

## Phase 2 – Turnus-Engine & feste Termine
1. **Referenzdatum**: Letzte `Begehung` mit `begehungStatus === DURCHGEFUEHRT` und SiGeKo-Kürzel ≠ `UF` (wie bisher); sonst `startDate` / `createdAt`.
2. **Feste Termine**: Alle `PlanungEntry` mit `planungType === FEST` im 12-Wochen-Horizont pro Projekt vorab laden → kein Turnus-Vorschlag für dieselbe `(projectId, isoYear, isoWeek)`.
3. **Turnus-Vorschläge**: Weiterhin `VORGESCHLAGEN`, Intervall w / 2w / 3w, kein Turnus bei `ABRUF` oder nicht-aktivem Projekt.
4. **Roll-Forward bei „nicht erledigt“**: Strukturierte Rückmeldung verschiebt den Eintrag in die nächste freie KW (gleiches Projekt, gleicher `employeeId`), Status bleibt nachgelagert logisch als Nacharbeit der Planung (`NICHT_ERLEDIGT` / Anpassung siehe API).

## Phase 3 – Rückmeldungen (NB/OB/UF & Bewegung)
1. **Neue Route** `POST /api/planung/entries/[entryId]/feedback` mit `outcome`: `erledigt` | `nicht_erledigt` | `nb` | `ob` → setzt `planungStatus`, `specialCode`, `isCompletedForContract`, optional Roll-Forward, danach `syncProjectCompletedBegehungenCount`.
2. **`PUT /api/planung/[id]`**: Nach Update weiterhin `computeIsCompletedForContract`; zusätzlich `syncProjectCompletedBegehungenCount`.
3. **`PUT` / `POST` Move**: Wo Planung Felder gesetzt werden, ebenfalls Zähler sync (falls zutreffend).

## Phase 4 – Begehungsprotokoll (UI + PDF + Mail)
1. **Seite** `/begehungen/[id]/protokoll`: Vollständiges UI (Foto-Upload, Mängel mit Textbaustein, Verteiler aus `ProjectContact`/`ContactPerson` mit Checkboxen, PDF, Versand).
2. **PDF** mit `@react-pdf/renderer` (zweispaltig Mängel, Kopf, Verteiler, Abschluss aus Textbaustein, Signaturfeld).
3. **E-Mail**: `sendTransactionalEmail` um optionales PDF-Anhangfeld erweitern (Resend `attachments`); Stub/Mock über `EMAIL_MOCK=1` ohne Netzwerk.
4. **APIs**: Bestehende Upload/Mangel/Verteiler/PDF/Send-Routen anbinden bzw. PDF-Route auf React-PDF umstellen.

## Phase 5 – Wochenplanung UI
1. **`react-window` `Grid`**: Spalte 0 = Projektname, Spalten 1…n = KW; Zeile 0 = optional Kopfzeile im äußeren Layout (nicht im Grid), Zeilen 1…m = Projekte.
2. **Zellinhalt**: Kürzel, Statusfarbe, Konflikt-Badge, `begehungSollNummer`/`begehungIstNummer` klein, `tourId` optional.
3. **Verschieben**: Bis Grid+DND stabil sind, „KW ändern“-Aktion pro Eintrag (Dialog → `POST /api/planung/move`), damit die Virtualisierung nicht durch DnD gebrochen wird.

## Phase 6 – Tests (Grind)
1. **Skript** `scripts/kernfunktionen-test.ts` (tsx): Legt `tenantId = e2e-kern-<timestamp>` an, 50 Projekte, 10 Mitarbeiter, generiert Turnus, prüft NB/OB/UF, festen Termin, Protokoll-PDF-Buffer, E-Mail-Mock; räumt Daten am Ende auf.
2. **`npm run test:kern`**: Muss grün sein vor Merge.
3. **Branch `feature/kernfunktionen`** + PR nach grünem Lauf.

## Abhängigkeiten npm
- `@react-pdf/renderer`, `tsx`, optional `@playwright/test` (nur wenn Browser-E2E ergänzt wird).

## Risiken / Annahmen
- Resend-Anhänge nur mit gültigem API-Key im Echtbetrieb; lokal `EMAIL_MOCK=1`.
- `completedBegehungen` ist die Summe vertraglich zählender Planungszellen (keine Doppelung durch mehrere Chips pro Zelle, wenn fachlich nur eine „Begehung“ pro Zelle erwartet wird – Abstimmung später mit Fachseite).
