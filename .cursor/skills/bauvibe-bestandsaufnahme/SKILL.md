---
name: bauvibe-bestandsaufnahme
description: >-
  Aktualisiert und pflegt die Projekt-Bestandsaufnahme (Seiten, APIs, Prisma,
  Sicherheit, fehlende Module). Nutzen bei Onboarding, Releases oder
  Architekturreviews für BAUVIBE.
---

# BAUVIBE – Bestandsaufnahme

## Wann anwenden

- Nach größeren Feature-Slices oder Schema-Änderungen.
- Wenn sich Routen, Rollen oder externe Integrationen ändern.
- Auf explizite Aufforderung im Ticket („Bestand prüfen“).

## Quelle der Wahrheit

- **Dokument:** `BESTANDSAUFNAHME.md` (Repo-Root).
- **Code:** `app/**`, `prisma/schema.prisma`, `middleware.ts`, `auth.ts`.

## Vorgehen

1. Alle `app/**/page.tsx` und `app/api/**/route.ts` gegen die Tabelle in `BESTANDSAUFNAHME.md` abgleichen.
2. Prisma-Modelle aus `prisma/schema.prisma` mit dem Abschnitt „Datenmodell“ synchronisieren (inkl. Enums und Relationen).
3. Abschnitt **Fehlende Module:** Platzhalter durch die vom Product Owner gelieferte Liste ersetzen, sobald vorhanden; bis dahin konkrete Lücken aus dem Code ableiten (z. B. neue Tabellen ohne UI).
4. **Sicherheit:** Next.js-Version, Auth, Middleware vs. implementierte Routen, SSL/Seed-Hinweise prüfen und dokumentieren.

## Ausgabe

- Änderungen nur in `BESTANDSAUFNAHME.md`, keine Spekulation über nicht einsehbare Produktionsumgebungen.
