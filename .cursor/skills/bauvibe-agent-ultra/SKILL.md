---
name: bauvibe-agent-ultra
description: >-
  Agent-Workflow für BAUVIBE: Plan-First, MCP (GitHub, Supabase), sinnvoller
  Einsatz von Subagenten, YOLO, Grind und Best-of-N mit klaren Risikogrenzen.
---

# BAUVIBE – Agent-Workflow (Ultra-orientiert)

## Plan-First

- Größere Änderungen: zuerst kurzen Plan (Scope, betroffene Dateien, Migration ja/nein), dann Code.
- Datenbank: immer Prisma-Migration, kein `db push` für produktionsrelevante Änderungen ohne Absprache.

## MCP

- **GitHub:** Pushes und PRs über MCP, sobald der Server in Cursor konfiguriert ist (Token nicht ins Repo committen).
- **Supabase:** Schema lesen, SQL erklären, RLS/Policy-Diskussion – bevorzugt über Supabase-MCP statt Vermutungen.

## Subagenten (bis ca. 8 parallel)

- Für unabhängige Recherche/Exploration parallel nutzen; Ergebnisse im Parent zusammenführen.

## YOLO-Modus (risikoarm)

- Nur für lokale, reversible Schritte (Lint-Autofix, Format, kleine Texte). Kein YOLO bei Migrationen, Auth oder Lösch-Cascades.

## Grind-Modus (Tests/Lint)

- Gezielt für automatisierte Fix-Schleifen: `npm run lint`, `npm run build`; nach jedem Schritt Diff prüfen.

## Best-of-N

- Nur bei echten Architektur-Gabelungen (z. B. zwei persistierbare Designs); Ergebnisse vergleichen und eine Option begründet auswählen.

## Projektbezogene Skills

- Bestandsaufnahme: `bauvibe-bestandsaufnahme`.
- Prisma: `bauvibe-prisma-domains`.
