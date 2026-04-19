import { NextResponse } from "next/server";
import { z } from "zod";
import { PlanungStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { getIsoWeekParts } from "@/lib/utils";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import { PLANUNG_PRIORITY, computeIsCompletedForContract } from "@/lib/turnus-engine";

const createFestSchema = z.object({
  plannedDate: z.string().min(1),
  description: z.string().min(1),
  employeeId: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const upcoming = await prisma.planungEntry.findMany({
    where: {
      projectId: params.projectId,
      planungStatus: { not: PlanungStatus.ERLEDIGT },
    },
    include: { employee: true },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
  });

  const fixedManual = await prisma.planungEntry.findMany({
    where: {
      projectId: params.projectId,
      planungType: "FEST",
      planungSource: "MANUELL",
    },
    include: { employee: true },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({ upcoming, fixedManual });
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const json = await req.json().catch(() => null);
  const parsed = createFestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const planned = new Date(parsed.data.plannedDate);
  if (Number.isNaN(planned.getTime())) {
    return NextResponse.json({ error: "Invalid plannedDate" }, { status: 400 });
  }

  const { isoYear, isoWeek } = getIsoWeekParts(planned);
  const agg = await prisma.planungEntry.aggregate({
    where: { projectId: params.projectId, isoYear, isoWeek },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const employeeId = parsed.data.employeeId && parsed.data.employeeId !== "" ? parsed.data.employeeId : null;
  const emp = employeeId ? await prisma.employee.findUnique({ where: { id: employeeId } }) : null;

  const row = await prisma.planungEntry.create({
    data: {
      projectId: params.projectId,
      isoYear,
      isoWeek,
      sortOrder,
      plannedDate: planned,
      note: parsed.data.description,
      employeeId: employeeId ?? undefined,
      planungType: "FEST",
      planungSource: "MANUELL",
      priority: PLANUNG_PRIORITY.FEST,
      planungStatus: "GEPLANT",
      isCompletedForContract: computeIsCompletedForContract({
        planungStatus: "GEPLANT",
        specialCode: "NONE",
        employeeShortCode: emp?.shortCode,
      }),
    },
    include: { employee: true },
  });

  await recalcConflictsForWeek(isoYear, isoWeek);
  return NextResponse.json(row, { status: 201 });
}
