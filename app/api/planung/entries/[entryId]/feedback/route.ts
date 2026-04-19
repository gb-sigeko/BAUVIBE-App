import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { PlanungStatus, SpecialCode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import { syncProjectCompletedBegehungenCount } from "@/lib/planung-contract-sync";
import { computeIsCompletedForContract } from "@/lib/turnus-engine";
import { addIsoWeeks, horizonKeySet, isoWeekKey } from "@/lib/iso-week";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";

const bodySchema = z.object({
  outcome: z.enum(["erledigt", "nicht_erledigt", "nb", "ob"]),
});

async function cellOccupied(projectId: string, isoYear: number, isoWeek: number) {
  const n = await prisma.planungEntry.count({ where: { projectId, isoYear, isoWeek } });
  return n > 0;
}

async function nextFreeWeekInHorizon(projectId: string, fromIsoYear: number, fromIsoWeek: number, horizonKeys: Set<string>) {
  let y = fromIsoYear;
  let w = fromIsoWeek;
  for (let step = 0; step < 60; step++) {
    const nxt = addIsoWeeks(y, w, 1);
    y = nxt.isoYear;
    w = nxt.isoWeek;
    if (!horizonKeys.has(isoWeekKey(y, w))) return null;
    if (!(await cellOccupied(projectId, y, w))) return { isoYear: y, isoWeek: w };
  }
  return null;
}

export async function POST(req: Request, { params }: { params: { entryId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const existing = await prisma.planungEntry.findUnique({
    where: { id: params.entryId },
    include: { employee: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const anchor = new Date();
  const horizon = horizonToIsoWeeks(buildPlanungHorizon(anchor, 12));
  const hKeys = horizonKeySet(horizon);

  const data: Prisma.PlanungEntryUpdateInput = {
    feedback:
      parsed.data.outcome === "nicht_erledigt"
        ? "Rückmeldung: nicht erledigt (Roll-Forward in nächste freie KW im Horizont)"
        : `Rückmeldung: ${parsed.data.outcome}`,
  };

  if (parsed.data.outcome === "erledigt") {
    data.planungStatus = "ERLEDIGT";
    data.specialCode = "NONE";
  } else if (parsed.data.outcome === "nb") {
    data.planungStatus = "ERLEDIGT";
    data.specialCode = "NB";
  } else if (parsed.data.outcome === "ob") {
    data.planungStatus = "ERLEDIGT";
    data.specialCode = "OB";
  } else if (parsed.data.outcome === "nicht_erledigt") {
    data.planungStatus = "NICHT_ERLEDIGT";
    data.specialCode = "NONE";
    const nxt = await nextFreeWeekInHorizon(existing.projectId, existing.isoYear, existing.isoWeek, hKeys);
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
  const emp = nextEmpId ? await prisma.employee.findUnique({ where: { id: nextEmpId } }) : existing.employee;

  data.isCompletedForContract = computeIsCompletedForContract({
    planungStatus: nextStatus,
    specialCode: nextSpecial,
    employeeShortCode: emp?.shortCode,
  });

  const row = await prisma.planungEntry.update({
    where: { id: existing.id },
    data,
  });

  await recalcConflictsForWeek(existing.isoYear, existing.isoWeek);
  if (row.isoYear !== existing.isoYear || row.isoWeek !== existing.isoWeek) {
    await recalcConflictsForWeek(row.isoYear, row.isoWeek);
  }
  await syncProjectCompletedBegehungenCount(prisma, existing.projectId);

  return NextResponse.json(row);
}
