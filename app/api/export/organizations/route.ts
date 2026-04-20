import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const rows = await prisma.organization.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { name: true, legalForm: true, address: true, active: true },
  });

  const csv = csvFromRows(
    ["name", "legalForm", "address", "active"],
    rows.map((r) => [r.name, r.legalForm ?? "", r.address ?? "", r.active]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="organisationen.csv"',
    },
  });
}
