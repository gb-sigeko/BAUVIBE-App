# Marktreife-Testbericht (automatisiert)

Stand: Branch `feature/epic3-7` nach Umsetzung **Epic 3** und erfolgreichem Lauf `npm run test:automated`.

## Zusammenfassung

| Bereich | Status |
|--------|--------|
| Lint + Production-Build | bestanden |
| Playwright (alle Specs inkl. Epic 2, Epic 3, Phase 2–5) | 13/13 bestanden |
| **Epic 3 – Arbeitskorb** | umgesetzt (siehe unten) |
| **Epic 4 – Begehungsprotokoll (vollständig laut Spez)** | nicht erneut spezifiziert abgearbeitet; bestehende Phase-4-Tests decken einen Kernworkflow ab |
| **Epic 5 – Exporte überall** | nicht umgesetzt (keine neuen Export-Buttons/Routen in diesem Schritt) |
| **Epic 6 – Dashboards Fee/GF** | nicht erweitert (keine neuen Widgets/KPIs in diesem Schritt) |
| **Epic 7 – KI-Stubs** | nicht umgesetzt (keine neuen `/api/offers/from-email`, `/api/email/analyze`, Arbeitsschutz-Mock in diesem Schritt) |
| Simuliertes 5er-KI-Team (manueller Volltest) | nicht durchgeführt |

**Bewertung: MARKTREIFE NICHT BESTÄTIGT** – begründet durch fehlende Lieferung der Epics 5–7 und fehlende explizite Abnahme von Epic 4/6/7 gegen die oben zitierte Spezifikation. Epic 3 ist in sich schlüssig und grün getestet.

## Epic 3 – Umsetzung (kurz)

- Planung: **heute fällige** und **überfällige** `RUECKMELDUNG_OFFEN`-Einträge; überfällig >3 Tage rot hinterlegt.
- **Fehlende Protokolle** (Begehungen `DURCHGEFUEHRT`/`NACHZUARBEITEN`, `protocolMissing`, Begehungsdatum in der Vergangenheit).
- **Telefon-Wiedervorlagen** mit Follow-up bis heute; **Kommunikation** nur `EMAIL` und `NOTE` mit Follow-up bis heute; **Erledigt** + Chronik.
- **Vor-Ort-Rückmeldungen** (`bearbeitet` am Modell); **Erledigt** + Chronik; API `PATCH /api/projects/[projectId]/vorort-rueckmeldungen/[rid]`.
- **Kritische Projekte** (>3 offene kritische Mängel-Aufgaben oder Begehungsquote <70 %).
- **Zur Quelle**-Links inkl. `?tab=` für Projektakte; Begehung direkt zur Detail-URL.
- Chronik-Helfer `lib/chronik.ts` bei Erledigen von Telefon/Kommunikation/Vor-Ort.

## Datenbank

Migration `prisma/migrations/20260420140000_vorort_bearbeitet/migration.sql` (Spalte `VorOrtRueckmeldung.bearbeitet`).  
Auf Umgebungen ohne angewandte Migration: SQL ausführen:

```sql
ALTER TABLE "VorOrtRueckmeldung" ADD COLUMN IF NOT EXISTS "bearbeitet" BOOLEAN NOT NULL DEFAULT false;
```

(`prisma db push` kann wegen Schema-Drift an `Communication` warnen – Migration/`db execute` bevorzugen.)

## Empfohlene nächste Schritte

1. Epics **4–7** strikt nach Akzeptanzkriterien nachziehen (eigene Commits, erneut `npm run test:automated` pro Epic).
2. Danach erneut dieses Dokument aktualisieren und **MARKTREIFE BESTÄTIGT** nur bei vollständiger Abdeckung.
3. Pull Request `feature/epic3-7` → `main` (URL in GitHub/GitLab nach `git push`).
