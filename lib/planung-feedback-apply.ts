import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PlanungStatus, SpecialCode } from "@/generated/prisma/client";
import { appendChronikEntry } from "@/lib/chronik";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";
import { nextFreeWeekInHorizon } from "@/lib/planung-next-free-week";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import { syncProjectCompletedBegehungenCount } from "@/lib/planung-contract-sync";
import { computeIsCompletedForContract } from "@/lib/turnus-engine";

export type PlanungFeedbackOutcome = "erledigt" | "nicht_erledigt" | "nb" | "ob";

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
    const nxt = await nextFreeWeekInHorizon(db, existing.projectId, existing.isoYear, existing.isoWeek, horizon);
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

  const weekMoved = row.isoYear !== existing.isoYear || row.isoWeek !== existing.isoWeek;
  const chronikBody =
    params.outcome === "nicht_erledigt" && weekMoved
      ? `Rückmeldung: nicht erledigt → nächste freie KW ${row.isoWeek}/${row.isoYear}`
      : `Rückmeldung Planung: ${params.outcome} (jetzt ${row.planungStatus})`;
  await appendChronikEntry({
    projectId: existing.projectId,
    body: chronikBody,
    action: "planung_rueckmeldung",
    targetType: "PlanungEntry",
    targetId: existing.id,
    details: {
      outcome: params.outcome,
      fromKw: `${existing.isoWeek}/${existing.isoYear}`,
      toKw: `${row.isoWeek}/${row.isoYear}`,
    },
  });

  await recalcConflictsForWeek(existing.isoYear, existing.isoWeek);
  if (row.isoYear !== existing.isoYear || row.isoWeek !== existing.isoWeek) {
    await recalcConflictsForWeek(row.isoYear, row.isoWeek);
  }
  await syncProjectCompletedBegehungenCount(db, existing.projectId);

  return { ok: true as const, row };
}
