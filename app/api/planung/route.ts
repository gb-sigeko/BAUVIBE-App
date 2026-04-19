import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";

const createSchema = z.object({
  projectId: z.string(),
  isoYear: z.number().int(),
  isoWeek: z.number().int().min(1).max(53),
  employeeId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  planungStatus: z
    .enum([
      "VORGESCHLAGEN",
      "GEPLANT",
      "BESTAETIGT",
      "IN_DURCHFUEHRUNG",
      "ERLEDIGT",
      "NICHT_ERLEDIGT",
      "VERSCHOBEN",
      "PAUSIERT",
      "ABGESAGT",
      "VERTRETUNG_AKTIV",
      "RUECKMELDUNG_OFFEN",
      "PROTOKOLL_OFFEN",
      "NACHARBEIT_ERFORDERLICH",
    ])
    .optional(),
});

export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  const isoYear = url.searchParams.get("isoYear");
  const isoWeek = url.searchParams.get("isoWeek");
  const projectId = url.searchParams.get("projectId");
  const rangeYear = url.searchParams.get("rangeYear");
  const weekFrom = url.searchParams.get("weekFrom");
  const weekTo = url.searchParams.get("weekTo");
  /** Alias: kwStart/kwEnd mit rangeYear (z. B. 2026) für automatisierte Tests */
  const kwStart = url.searchParams.get("kwStart");
  const kwEnd = url.searchParams.get("kwEnd");

  const where: Record<string, unknown> = {};
  if (isoYear && isoWeek) {
    where.isoYear = Number(isoYear);
    where.isoWeek = Number(isoWeek);
  }
  if (projectId) where.projectId = projectId;

  const y = rangeYear ? Number(rangeYear) : undefined;
  const wf = weekFrom ?? kwStart;
  const wt = weekTo ?? kwEnd;
  if (y != null && Number.isFinite(y) && wf && wt) {
    const a = Number(wf);
    const b = Number(wt);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const or: { isoYear: number; isoWeek: number }[] = [];
      for (let w = lo; w <= hi; w++) {
        or.push({ isoYear: y, isoWeek: w });
      }
      where.OR = or;
    }
  }

  const rows = await prisma.planungEntry.findMany({
    where,
    include: { employee: true, project: { select: { id: true, name: true, code: true } } },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { projectId: "asc" }],
    take: 20000,
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const row = await prisma.planungEntry.create({
    data: {
      projectId: parsed.data.projectId,
      isoYear: parsed.data.isoYear,
      isoWeek: parsed.data.isoWeek,
      employeeId: parsed.data.employeeId ?? undefined,
      sortOrder: parsed.data.sortOrder ?? 0,
      planungStatus: parsed.data.planungStatus ?? "GEPLANT",
    },
  });
  await recalcConflictsForWeek(parsed.data.isoYear, parsed.data.isoWeek);
  return NextResponse.json(row, { status: 201 });
}
