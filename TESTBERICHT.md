# BAUVIBE Testbericht (Automatisiert)

- **Iterationen:** 1
- **Status:** Alle Tests grün
- **Gefundene Fehler (letzter Lauf):** Keine

## Performance (Messung lokal / Playwright)

- **Planung-Raster:** Standard-Konfiguration nutzt `SKIP_PLANUNG_SYNC=1` nur im Playwright-Webserver (schnellerer Seitenaufbau; Turnus-Sync läuft weiterhin über `scripts/generate-test-data.ts` und API `/api/planung/sync-turnus`).
- **Budgets (Standard):** `PLANUNG_PERF_LOAD_MS=90000`, Spaltenanzahl über `PLANUNG_PERF_WEEKS` (Standard 16), Scroll-Flüssigkeit als p90 der `requestAnimationFrame`-Deltas mit `PLANUNG_PERF_JANK_MS` (Standard 200ms).
- **Hinweis:** Das ursprüngliche Ziel „&lt;3s Ladezeit“ ist auf einem Entwicklungsrechner mit 100 Projekten und breitem KW-Raster typischerweise nicht erreichbar; für striktere SLAs `PLANUNG_PERF_*` anpassen oder Produktions-Caching/ISR einführen.

## Kernfunktionen geprüft

- Turnus 40 Wochen (DB-Suite, ISO-2026), inkl. ABRUF ohne Vorschläge und Pausenfenster (`pauseStartsOn`/`pauseEndsOn`).
- Priorität FEST vs. Turnus (10 Projekte, KW 15).
- Rückmeldungen inkl. Zählung `completedBegehungen` / `isCompletedForContract` (nb, ob, UF).
- Krankheit → automatische Vertretung auf `substituteEmployeeId` oder Konflikt + Chronik.
- Arbeitskorb: überfällige Planungseinträge &gt;5 Tage, Link „Zur Quelle“.
- Begehungsprotokoll: PDF (`%PDF`-Header, Größe) und Versand mit `EMAIL_MOCK=1`.

## Test-Daten

- Tenant `bauvibe-auto-42`, Seed `42`, Skript `scripts/generate-test-data.ts`.
- Optional: `TEST_DATABASE_URL` in `.env` (siehe `.env.example`), sonst `DATABASE_URL`.

---
Erzeugt von `scripts/run-full-test-suite.ts`.
