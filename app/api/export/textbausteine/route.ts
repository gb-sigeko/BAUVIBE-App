import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const rows = await prisma.textbaustein.findMany({
    orderBy: { name: "asc" },
    select: { name: true, kategorie: true },
  });

  const csv = csvFromRows(
    ["name", "kategorie"],
    rows.map((r) => [r.name, r.kategorie]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="textbausteine.csv"',
    },
  });
}
