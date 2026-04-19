# Ticket 1 – Arbeitskorb-Hinweise (Kontextkarten)

## Umsetzung

- **Komponente:** `components/arbeitskorb-context-cards.tsx` – vier Lesekarten (Vorankündigung § 2 Abs. 2, SiGe-Plan § 2 Abs. 3, Koordination § 3, Ordnungswidrigkeiten § 7) plus einheitlicher Disclaimer-Footer.
- **Daten:** `lib/arbeitskorb-rechtshinweise.ts` – kuratierte, UTF-8-saubere Texte und URLs. Inhaltlich abgestimmt mit den Artefakten aus `feature/recherche-erweitert` (`recherche_erweitert_baua.json`, `quellenverzeichnis_erweitert.md`), die zur Nachvollziehbarkeit unter `lib/` abgelegt wurden.
- **Layout:** `app/(dashboard)/arbeitskorb/page.tsx` – zweispaltiges Raster: bestehende Listen unverändert links, **sticky** Sidebar rechts (`lg`), ohne Überlagerung der Aktionen.
- **Abgrenzung:** Keine DB, keine neuen APIs, keine Änderung der Tabellenlogik.

## Quellen (Primärlinks in den Karten)

| Thema | Primärlink |
|-------|------------|
| BaustellV | `https://www.gesetze-im-internet.de/baustellv/` |
| RAB 31 | `https://www.baua.de/DE/Angebote/Rechtstexte-und-Technische-Regeln/Regelwerk/RAB/RAB-31.html` |
| SiGe-Plan BAuA | Themenseite BAuA (siehe Konstante) |
| ArbSchG (Kontext) | `https://www.gesetze-im-internet.de/arbschg/` |
| BG BAU Überblick | `https://www.bgbau.de/themen/sicherheit-und-gesundheit/vorschriften-und-regeln` |

## Integrationsplan / Qualität

- Keine **falsche DIN-EN-1961-Zuordnung** oder automatische Norm→Gefahr-Ketten (laut `INTEGRATIONSPLAN_RECHERCHE.md` ausgeschlossen).
- **§ 7 / OWi:** nur neutraler Rahmen, kein personalisiertes „Strafbarkeits“-Forecast.
- Footer entspricht dem Recherche-Disclaimer („AI-Recherche … keine rechtsverbindliche Auskunft … Originalquelle“).

## Tests

- Neu: **`Test 8`** in `tests/automated/e2e/begehung-and-perf.spec.ts` (gleicher `describe` wie Test 6/7, damit der Dev-Server vor dem ersten UI-Login warm ist und NextAuth-CSRF stabil bleibt). Prüft Sichtbarkeit der Karten, `href` für BaustellV und RAB 31, Disclaimer-Text.
- Ausführung: `npm run test:automated` (inkl. bestehender Suite).

## Branch

- `feature/arbeitskorb-hinweise` (Commit auf diesem Branch, Push zu `origin`).
