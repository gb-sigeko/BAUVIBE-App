import type { PrismaClient } from "@/generated/prisma/client";
import type { PlanungStatus } from "@/generated/prisma/client";
import type { HorizonWeek } from "@/lib/turnus-engine";
import { isoWeekKey } from "@/lib/iso-week";
import { isEmployeeUnavailableInWeek } from "@/lib/availability-week";
import { findDelegateForCoveredInWeek } from "@/lib/substitute-resolve";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import { computeIsCompletedForContract } from "@/lib/turnus-engine";

const REASSIGN_STATUSES: PlanungStatus[] = [
  "VORGESCHLAGEN",
  "GEPLANT",
  "BESTAETIGT",
  "IN_DURCHFUEHRUNG",
  "NICHT_ERLEDIGT",
  "VERSCHOBEN",
  "PAUSIERT",
  "VERTRETUNG_AKTIV",
  "RUECKMELDUNG_OFFEN",
  "PROTOKOLL_OFFEN",
  "NACHARBEIT_ERFORDERLICH",
];

/**
 * Plant Begehungen (Planungseinträge) von abwesenden Mitarbeitenden auf registrierte Vertretung um.
 */
export async function applyKrankVertretungForHorizon(db: PrismaClient, horizon: HorizonWeek[]) {
  if (!horizon.length) return;
  const keys = new Set(horizon.map((w) => isoWeekKey(w.isoYear, w.isoWeek)));
  const orWeeks = horizon.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek }));

  const entries = await db.planungEntry.findMany({
    where: {
      OR: orWeeks,
      employeeId: { not: null },
      planungStatus: { in: REASSIGN_STATUSES },
    },
    include: { employee: true },
  });

  const touchedWeeks = new Set<string>();

  for (const e of entries) {
    if (!e.employeeId) continue;
    const wk = isoWeekKey(e.isoYear, e.isoWeek);
    if (!keys.has(wk)) continue;

    const away = await isEmployeeUnavailableInWeek(db, e.employeeId, e.isoYear, e.isoWeek);
    if (!away) continue;

    const delegateId = await findDelegateForCoveredInWeek(db, {
      coveredEmployeeId: e.employeeId,
      projectId: e.projectId,
      isoYear: e.isoYear,
      isoWeek: e.isoWeek,
    });
    if (!delegateId || delegateId === e.employeeId) continue;

    const emp = await db.employee.findUnique({ where: { id: delegateId } });
    await db.planungEntry.update({
      where: { id: e.id },
      data: {
        employeeId: delegateId,
        planungType: "VERTRETUNG",
        note: e.note ? `${e.note} · Vertretung (automatisch)` : "Vertretung (automatisch)",
        isCompletedForContract: computeIsCompletedForContract({
          planungStatus: e.planungStatus,
          specialCode: e.specialCode,
          employeeShortCode: emp?.shortCode,
        }),
      },
    });
    touchedWeeks.add(wk);
  }

  for (const w of horizon) {
    const k = isoWeekKey(w.isoYear, w.isoWeek);
    if (touchedWeeks.has(k)) await recalcConflictsForWeek(w.isoYear, w.isoWeek);
  }
}
