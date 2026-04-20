import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";
import { getIsoWeekParts } from "@/lib/utils";

export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const url = new URL(req.url);
  const def = getIsoWeekParts(new Date());
  const isoYear = Number.parseInt(url.searchParams.get("isoYear") ?? String(def.isoYear), 10) || def.isoYear;
  const isoWeek = Number.parseInt(url.searchParams.get("isoWeek") ?? String(def.isoWeek), 10) || def.isoWeek;

  const tours = await prisma.tour.findMany({
    where: { isoYear, isoWeek },
    orderBy: { createdAt: "asc" },
    include: {
      employee: { select: { shortCode: true, displayName: true } },
      entries: { orderBy: { sortOrder: "asc" }, include: { project: { select: { code: true } } } },
    },
  });

  const lines: (string | number | boolean | null | undefined)[][] = [];
  for (const t of tours) {
    const emp = t.employee?.shortCode ?? "";
    for (const e of t.entries) {
      lines.push([isoYear, isoWeek, emp, t.region, e.sortOrder, e.project.code]);
    }
  }

  const csv = csvFromRows(["isoYear", "isoWeek", "employeeShort", "region", "sortOrder", "projectCode"], lines);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="touren-kw${isoWeek}-${isoYear}.csv"`,
    },
  });
}
