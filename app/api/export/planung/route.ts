import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";
import { buildPlanungHorizon } from "@/lib/planung-horizon";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const anchor = new Date();
  const weeks = buildPlanungHorizon(anchor, 12);

  const entries = await prisma.planungEntry.findMany({
    where: { OR: weeks.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek })) },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { projectId: "asc" }, { sortOrder: "asc" }],
    include: {
      project: { select: { code: true } },
      employee: { select: { shortCode: true } },
    },
  });

  const csv = csvFromRows(
    ["isoYear", "isoWeek", "projectCode", "employeeShort", "planungStatus", "planungType", "sortOrder"],
    entries.map((e) => [
      e.isoYear,
      e.isoWeek,
      e.project.code,
      e.employee?.shortCode ?? "",
      e.planungStatus,
      e.planungType,
      e.sortOrder,
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="planung-export.csv"',
    },
  });
}
