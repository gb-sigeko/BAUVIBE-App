import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const rows = await prisma.employee.findMany({
    orderBy: { shortCode: "asc" },
    select: { shortCode: true, displayName: true, kind: true, active: true },
  });

  const csv = csvFromRows(
    ["shortCode", "displayName", "kind", "active"],
    rows.map((r) => [r.shortCode, r.displayName, r.kind, r.active]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="mitarbeiter.csv"',
    },
  });
}
