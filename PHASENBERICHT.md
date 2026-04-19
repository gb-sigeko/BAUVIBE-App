# PHASENBERICHT – BAUVIBE Vollumfang (Grundidee)

## Phase 0 – Fundament & Spez-Härtung

**Status:** abgeschlossen (inkl. Grind-Iteration bis grüne Testsuite).

### Erledigt

- **`CHECKLISTEN_MATRIX.md`:** Epic-Matrix Checklisten A–G (Grundidee Zeilen 860–1014) mit Status und Komponenten-Zuordnung.
- **`.cursor/rules/bauvibe-kernregeln.mdc`:** Bindende Regeln – Arbeitskorb-Schwellen (Rückmeldung >1 / >3 Tage; fehlende Protokolle bei erledigter Begehung >3 Tage ohne Protokoll), Priorität FEST > Vertretung > Turnus > manuell, `isCompletedForContract` / nb / ob / UF, Chronik-Pflicht über `appendChronikEntry`.
- **Turnus-Sync Mandanten-Scope:** `syncTurnusSuggestions` / `rollForwardNotCompleted` / `applyKrankVertretungForHorizon` akzeptieren optional `{ tenantId }`. Tests und `generate-test-data` nutzen `bauvibe-auto-42` bzw. Kern-Test-Tag – verhindert Minuten-Läufe und Seiteneffekte auf fremde Mandanten in Cloud-DBs. Produktion/API `/planung/sync-turnus` und `/planung`-Seite bleiben ohne Filter (gesamte DB wie bisher).
- **E2E-Stabilität:** `scripts/generate-test-data.ts` upsertet Demo-User (`fee@bauvibe.local`, `admin@bauvibe.de`, …) mit Passwort `Bauvibe2026!`, damit Playwright auch ohne vorheriges `db seed` anmeldet. Login-Helper: Timeout 90s, `waitUntil: "domcontentloaded"`.
- **`scripts/kernfunktionen-test.ts`:** Turnus-Sync mit `{ tenantId: tag }` für isolierte Läufe.

### Automatisierte Tests (Phase 0, dieser Stand)

| Kommando | Ergebnis |
|----------|----------|
| `npm run lint` | grün |
| `npm run build` | grün |
| `npm run test:automated` | **grün** (generate-test-data → DB-Suite → API-Suite → Playwright; Laufzeit je nach DB ~7–8 Min) |

### Grind-Iterationen (kurz dokumentiert)

1. Erster Lauf: Playwright-Login-Timeout (Demo-User fehlten nach frischer DB / langsamer Navigation) → Upsert Demo-User im Generator + robusteres `waitForURL`.
2. Vorher: Turnus-Sync ohne Mandantenfilter → extrem lange oder hängende Suite bei großer Cloud-DB → optionaler `tenantId`-Filter.

---

## Phase 1–10 (Kernlogik, Akte, Touren, Arbeitskorb, Kommunikation, Dashboards, Exporte, Middleware/CI)

**Status:** gemäß `CHECKLISTEN_MATRIX.md` weiterhin überwiegend **teilweise** / **offen** (vollständige Grundidee-Umsetzung ist der verbleibende Hauptblock).

Geplanter Ablauf: je Phase Matrix aktualisieren, `npm run test:automated` erneut grün, dann nächste Phase.

---

*Letzte Aktualisierung: Phase-0-Abschluss inkl. grüner Lint/Build/Tests.*
