import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const rows = await prisma.project.findMany({
    orderBy: { code: "asc" },
    select: { code: true, name: true, status: true, client: true, siteAddress: true },
  });

  const csv = csvFromRows(
    ["code", "name", "status", "client", "siteAddress"],
    rows.map((r) => [r.code, r.name, r.status, r.client ?? "", r.siteAddress ?? ""]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="projekte.csv"',
    },
  });
}
