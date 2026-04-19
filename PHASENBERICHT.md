# PHASENBERICHT – BAUVIBE Vollumfang (Grundidee)

## Phase 0 – Fundament & Spez-Härtung

**Status:** abgeschlossen (Teillieferung).

### Erledigt

- **`CHECKLISTEN_MATRIX.md`:** Epic-Matrix zu Checklisten A–G (Zeilen 860–1014) mit Status *erfüllt* / *teilweise* / *offen* und Zuordnung Prisma / API / UI / Logik.
- **`.cursor/rules/bauvibe-kernregeln.mdc`:** Verbindliche Regeln zu Arbeitskorb-Schwellen (1 / 3 Tage), Priorität FEST > Vertretung > Turnus > manuell, Zähl-Logik nb/ob/UF, Chronik-Pflicht über `appendChronikEntry`.
- **Arbeitskorb:** Planungs-Rückläufe in zwei Stufen (**>1 Tag und <3 Tage** vs. **>3 Tage rot**) gemäß Grundidee; Protokoll-Frist bleibt **>3 Tage** nach Begehungsdatum.
- **Chronik:** `applyKrankVertretung` nutzt `appendChronikEntry` statt direkter Prisma-Calls (Konsistenz mit zentralem Service).
- **Tests:** `tests/automated/db-suite.ts` (Arbeitskorb-Überfälligkeit) an **3-Tage**-Schwelle angeglichen.
- **`scripts/ci.sh`:** Lint, Build, `test:automated` (ohne `migrate deploy`, da Umgebungsabhängig).

### Automatisierte Tests (Phase 0)

- Nach Merge: `npm run test:automated` bzw. `bash scripts/ci.sh` mit gesetzter `DATABASE_URL` ausführen.
- *(In dieser Session nicht erneut vollständig ausgeführt, sobald Umgebung verfügbar bitte nachziehen.)*

### Hinweis zu Phase 1–10

Die Phasen 1–10 aus dem Auftrag (Wochenplanung-Leitstand, Projektakte vollständig, Touren, Arbeitskorb-Erweiterungen, KI-Stubs, Dashboards, Exporte, Middleware-Matrix, PR `feature/vollumfang`) umfassen den **gesamten verbleibenden Realisierungsumfang** der Grundidee. Sie sind in `CHECKLISTEN_MATRIX.md` als **offen** bzw. **teilweise** dokumentiert und sollen **phasenweise** mit jeweils neuem `PHASENBERICHT`-Eintrag und grüner Testsuite abgearbeitet werden.

---
*Stand: Phase 0 abgeschlossen.*
