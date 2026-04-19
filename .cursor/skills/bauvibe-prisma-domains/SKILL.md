---
name: bauvibe-prisma-domains
description: >-
  Prisma-7-Workflow für BAUVIBE: Schema, Migrationen, Seed-Reihenfolge,
  generierter Client unter generated/prisma. Nutzen bei DB-Änderungen.
---

# BAUVIBE – Prisma & Domänenmodelle

## Konventionen

- **Konfiguration:** `prisma.config.ts` – `DATABASE_URL` aus Umgebung.
- **Schema:** `prisma/schema.prisma`.
- **Client-Ausgabe:** `generated/prisma` (Import aus `@/lib/prisma` bzw. `../generated/prisma/client` im Seed).
- **Begehungen:** Prisma-Modell `Begehung`, physische Tabelle `Inspection` (`@@map("Inspection")`).

## Migrationen

```bash
npx prisma migrate dev --name kurze_beschreibung
```

- Keine manuellen Änderungen an bereits angewandten Migrationen.
- Nach Schemaänderung: `npx prisma generate` (läuft auch in `npm run build`).

## Seed

- Datei: `prisma/seed.ts`.
- **Reihenfolge:** abhängige Datensätze zuerst löschen (`Mangel`, `VorOrtRueckmeldung`, …), dann `User` / `Project` / `Employee` wie im Seed vorgegeben.

## Enums mit @map

- `OfferStatus`, `VKStatus`: Prisma-Enum-Namen in `SCREAMING_CASE`, DB-Werte per `@map("...")` (Kleinbuchstaben), damit API und DB konsistent bleiben.
