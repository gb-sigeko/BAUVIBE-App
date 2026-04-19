import type { PrismaClient } from "@/generated/prisma/client";
import type { PlanungSource, PlanungStatus, PlanungType, SpecialCode, Turnus } from "@/generated/prisma/client";
import {
  addIsoWeeks,
  compareIsoWeek,
  horizonKeySet,
  isIsoWeekBefore,
  isoWeekKey,
  mondayUtcOfIsoWeek,
} from "@/lib/iso-week";
import { getIsoWeekParts } from "@/lib/utils";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";

/** Priorität: fester Termin (0) > Vertretung (1) > Turnus (2) > manuell (3). */
export const PLANUNG_PRIORITY = {
  FEST: 0,
  VERTRETUNG: 1,
  TURNUS: 2,
  MANUELL: 3,
} as const;

export function turnusToIntervalWeeks(turnus: Turnus | null): number | null {
  if (!turnus || turnus === "ABRUF") return null;
  if (turnus === "W") return 1;
  if (turnus === "W2") return 2;
  if (turnus === "W3") return 3;
  return null;
}

export function computeIsCompletedForContract(input: {
  planungStatus: PlanungStatus;
  specialCode: SpecialCode;
  employeeShortCode: string | null | undefined;
}) {
  if (input.planungStatus !== "ERLEDIGT") return false;
  /* Vertraglich zählt nur „normale“ Erledigung: kein NB/OB, kein UF. */
  if (input.specialCode !== "NONE") return false;
  const code = input.employeeShortCode?.trim().toUpperCase();
  if (!code || code === "UF") return false;
  return true;
}

export type HorizonWeek = { isoYear: number; isoWeek: number };

function festCellKey(projectId: string, isoYear: number, isoWeek: number) {
  return `${projectId}:${isoWeekKey(isoYear, isoWeek)}`;
}

function weekInSubstitute(sub: { startsOn: Date; endsOn: Date }, isoYear: number, isoWeek: number) {
  const mon = mondayUtcOfIsoWeek(isoYear, isoWeek);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  sun.setUTCHours(23, 59, 59, 999);
  return sub.startsOn <= sun && sub.endsOn >= mon;
}

async function hasCellEntry(
  db: PrismaClient,
  projectId: string,
  isoYear: number,
  isoWeek: number,
): Promise<boolean> {
  const n = await db.planungEntry.count({ where: { projectId, isoYear, isoWeek } });
  return n > 0;
}

/** Entfernt nur schwächere automatische Turnus-Vorschläge, damit Vertretung (höhere Priorität) greifen kann. */
async function clearTurnusSuggestionsForCell(db: PrismaClient, projectId: string, isoYear: number, isoWeek: number) {
  await db.planungEntry.deleteMany({
    where: {
      projectId,
      isoYear,
      isoWeek,
      planungStatus: "VORGESCHLAGEN",
      planungSource: { in: ["TURNUS", "RUECKLAUF"] },
      priority: { gte: PLANUNG_PRIORITY.TURNUS },
    },
  });
}

async function createIfEmpty(
  db: PrismaClient,
  data: {
    projectId: string;
    isoYear: number;
    isoWeek: number;
    employeeId?: string | null;
    planungStatus: PlanungStatus;
    planungType: PlanungType;
    planungSource: PlanungSource;
    priority: number;
    turnusLabel?: string | null;
    note?: string | null;
    plannedDate?: Date | null;
  },
) {
  if (await hasCellEntry(db, data.projectId, data.isoYear, data.isoWeek)) return;
  await db.planungEntry.create({
    data: {
      projectId: data.projectId,
      isoYear: data.isoYear,
      isoWeek: data.isoWeek,
      sortOrder: data.priority,
      employeeId: data.employeeId ?? undefined,
      planungStatus: data.planungStatus,
      planungType: data.planungType,
      planungSource: data.planungSource,
      priority: data.priority,
      turnusLabel: data.turnusLabel ?? undefined,
      note: data.note ?? undefined,
      plannedDate: data.plannedDate ?? undefined,
    },
  });
  await recalcConflictsForWeek(data.isoYear, data.isoWeek);
}

/**
 * Nicht erledigte Einträge aus vergangenen Wochen eine KW nach vorne schieben (Roll-Forward).
 */
export async function rollForwardNotCompleted(db: PrismaClient, anchor: Date, horizon: HorizonWeek[]) {
  const current = getIsoWeekParts(anchor);
  const keys = horizonKeySet(horizon);

  const stale = await db.planungEntry.findMany({
    where: {
      planungStatus: "NICHT_ERLEDIGT",
    },
  });

  for (const e of stale) {
    const pos = { isoYear: e.isoYear, isoWeek: e.isoWeek };
    if (!isIsoWeekBefore(pos, current)) continue;
    const next = addIsoWeeks(e.isoYear, e.isoWeek, 1);
    if (!keys.has(isoWeekKey(next.isoYear, next.isoWeek))) continue;

    const targetOccupied = await hasCellEntry(db, e.projectId, next.isoYear, next.isoWeek);
    if (targetOccupied) continue;

    await db.planungEntry.update({
      where: { id: e.id },
      data: {
        isoYear: next.isoYear,
        isoWeek: next.isoWeek,
        planungType: "VERSCHOBEN",
        planungSource: "RUECKLAUF",
        planungStatus: "NICHT_ERLEDIGT",
        priority: e.priority,
      },
    });
    await recalcConflictsForWeek(e.isoYear, e.isoWeek);
    await recalcConflictsForWeek(next.isoYear, next.isoWeek);
  }
}

/**
 * Turnus-Vorschläge (12 Wochen-Horizont), Vertretungs-Hinweise, ohne ABRUF/pausierte Projekte.
 */
export async function syncTurnusSuggestions(db: PrismaClient, anchor: Date, horizon: HorizonWeek[]) {
  await rollForwardNotCompleted(db, anchor, horizon);
  const keys = horizonKeySet(horizon);
  const minW = horizon.reduce((a, b) => (compareIsoWeek(a, b) < 0 ? a : b));
  const maxW = horizon.reduce((a, b) => (compareIsoWeek(a, b) > 0 ? a : b));

  const festRows = await db.planungEntry.findMany({
    where: {
      planungType: "FEST",
      OR: horizon.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek })),
    },
    select: { projectId: true, isoYear: true, isoWeek: true },
  });
  const festCells = new Set(festRows.map((r) => festCellKey(r.projectId, r.isoYear, r.isoWeek)));

  const projects = await db.project.findMany({
    where: { status: "ACTIVE", turnus: { not: null } },
    include: { responsibleEmployee: true },
  });

  const subs = await db.substitute.findMany({
    include: { delegateEmployee: true, coveredEmployee: true },
  });

  for (const sub of subs) {
    const affected = Array.isArray(sub.affectedProjectIds)
      ? (sub.affectedProjectIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    for (const w of horizon) {
      if (!weekInSubstitute(sub, w.isoYear, w.isoWeek)) continue;
      for (const projectId of affected) {
        await clearTurnusSuggestionsForCell(db, projectId, w.isoYear, w.isoWeek);
        await createIfEmpty(db, {
          projectId,
          isoYear: w.isoYear,
          isoWeek: w.isoWeek,
          employeeId: sub.delegateEmployeeId,
          planungStatus: "VORGESCHLAGEN",
          planungType: "VERTRETUNG",
          planungSource: "MANUELL",
          priority: PLANUNG_PRIORITY.VERTRETUNG,
          turnusLabel: `Vertretung ${sub.delegateEmployee.shortCode}`,
          note: `Vertretung für ${sub.coveredEmployee.shortCode}`,
        });
      }
    }
  }

  for (const p of projects) {
    const interval = turnusToIntervalWeeks(p.turnus);
    if (interval == null) continue;

    const completed = await db.begehung.findMany({
      where: { projectId: p.id, begehungStatus: "DURCHGEFUEHRT" },
      orderBy: { date: "desc" },
      take: 30,
      include: { employee: true },
    });
    const lastOk = completed.find((b) => {
      const sc = b.employee?.shortCode?.toUpperCase();
      return !sc || sc !== "UF";
    });
    const ref = lastOk?.date ?? p.startDate ?? p.createdAt;

    let cursor = new Date(ref);
    cursor.setUTCDate(cursor.getUTCDate() + interval * 7);

    while (true) {
      const { isoYear, isoWeek } = getIsoWeekParts(cursor);
      if (compareIsoWeek({ isoYear, isoWeek }, maxW) > 0) break;
      if (compareIsoWeek({ isoYear, isoWeek }, minW) >= 0 && keys.has(isoWeekKey(isoYear, isoWeek))) {
        if (festCells.has(festCellKey(p.id, isoYear, isoWeek))) {
          cursor.setUTCDate(cursor.getUTCDate() + interval * 7);
          continue;
        }
        const blocksHigher = await db.planungEntry.count({
          where: {
            projectId: p.id,
            isoYear,
            isoWeek,
            priority: { lt: PLANUNG_PRIORITY.TURNUS },
          },
        });
        if (blocksHigher === 0) {
          await createIfEmpty(db, {
            projectId: p.id,
            isoYear,
            isoWeek,
            employeeId: p.responsibleEmployeeId,
            planungStatus: "VORGESCHLAGEN",
            planungType: "REGULAER",
            planungSource: "TURNUS",
            priority: PLANUNG_PRIORITY.TURNUS,
            turnusLabel: p.turnus ?? undefined,
            note: `Turnus-Vorschlag (${p.turnus})`,
          });
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + interval * 7);
    }
  }
}
