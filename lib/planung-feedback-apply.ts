import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PlanungStatus, SpecialCode } from "@/generated/prisma/client";
import { addIsoWeeks, horizonKeySet, isoWeekKey } from "@/lib/iso-week";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import { syncProjectCompletedBegehungenCount } from "@/lib/planung-contract-sync";
import { computeIsCompletedForContract } from "@/lib/turnus-engine";

export type PlanungFeedbackOutcome = "erledigt" | "nicht_erledigt" | "nb" | "ob";

async function cellOccupied(db: PrismaClient, projectId: string, isoYear: number, isoWeek: number) {
  const n = await db.planungEntry.count({ where: { projectId, isoYear, isoWeek } });
  return n > 0;
}

/**
 * Nächste freie Planungszelle: bevorzugt KW+1, sonst erste freie KW im Horizont.
 */
async function nextFreeWeekInHorizon(
  db: PrismaClient,
  projectId: string,
  fromIsoYear: number,
  fromIsoWeek: number,
  horizonKeys: Set<string>,
) {
  const immediate = addIsoWeeks(fromIsoYear, fromIsoWeek, 1);
  if (
    horizonKeys.has(isoWeekKey(immediate.isoYear, immediate.isoWeek)) &&
    !(await cellOccupied(db, projectId, immediate.isoYear, immediate.isoWeek))
  ) {
    return immediate;
  }

  let y = fromIsoYear;
  let w = fromIsoWeek;
  for (let step = 0; step < 120; step++) {
    const nxt = addIsoWeeks(y, w, 1);
    y = nxt.isoYear;
    w = nxt.isoWeek;
    if (!horizonKeys.has(isoWeekKey(y, w))) return null;
    if (!(await cellOccupied(db, projectId, y, w))) return { isoYear: y, isoWeek: w };
  }
  return null;
}

export type ApplyPlanungFeedbackParams = {
  entryId: string;
  outcome: PlanungFeedbackOutcome;
  /** Anzahl Wochen ab heute für Roll-Forward bei „nicht erledigt“ (Standard 52). */
  horizonWeekCount?: number;
};

/** Kernlogik aus POST /api/planung/entries/[id]/feedback – für Tests und API-Route. */
export async function applyPlanungFeedback(db: PrismaClient, params: ApplyPlanungFeedbackParams) {
  const existing = await db.planungEntry.findUnique({
    where: { id: params.entryId },
    include: { employee: true },
  });
  if (!existing) return { ok: false as const, error: "not_found" as const };

  const anchor = new Date();
  const horizonWeekCount = params.horizonWeekCount ?? 52;
  const horizon = horizonToIsoWeeks(buildPlanungHorizon(anchor, horizonWeekCount));
  const hKeys = horizonKeySet(horizon);

  const data: Prisma.PlanungEntryUpdateInput = {
    feedback:
      params.outcome === "nicht_erledigt"
        ? "Rückmeldung: nicht erledigt (Roll-Forward in nächste freie KW im Horizont)"
        : `Rückmeldung: ${params.outcome}`,
  };

  if (params.outcome === "erledigt") {
    data.planungStatus = "ERLEDIGT";
    data.specialCode = "NONE";
  } else if (params.outcome === "nb") {
    data.planungStatus = "ERLEDIGT";
    data.specialCode = "NB";
  } else if (params.outcome === "ob") {
    data.planungStatus = "ERLEDIGT";
    data.specialCode = "OB";
  } else if (params.outcome === "nicht_erledigt") {
    data.planungStatus = "NICHT_ERLEDIGT";
    data.specialCode = "NONE";
    const nxt = await nextFreeWeekInHorizon(db, existing.projectId, existing.isoYear, existing.isoWeek, hKeys);
    if (nxt) {
      data.isoYear = nxt.isoYear;
      data.isoWeek = nxt.isoWeek;
      data.planungType = "VERSCHOBEN";
      data.planungSource = "RUECKLAUF";
    }
  }

  const nextEmpId = existing.employeeId;
  const nextStatus = (data.planungStatus as PlanungStatus | undefined) ?? existing.planungStatus;
  const nextSpecial = (data.specialCode as SpecialCode | undefined) ?? existing.specialCode;
  const emp = nextEmpId ? await db.employee.findUnique({ where: { id: nextEmpId } }) : existing.employee;

  data.isCompletedForContract = computeIsCompletedForContract({
    planungStatus: nextStatus,
    specialCode: nextSpecial,
    employeeShortCode: emp?.shortCode,
  });

  const row = await db.planungEntry.update({
    where: { id: existing.id },
    data,
  });

  await recalcConflictsForWeek(existing.isoYear, existing.isoWeek);
  if (row.isoYear !== existing.isoYear || row.isoWeek !== existing.isoWeek) {
    await recalcConflictsForWeek(row.isoYear, row.isoWeek);
  }
  await syncProjectCompletedBegehungenCount(db, existing.projectId);

  return { ok: true as const, row };
}
