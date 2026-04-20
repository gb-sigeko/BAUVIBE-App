import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const rows = await prisma.contactPerson.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { organization: { select: { name: true } } },
  });

  const csv = csvFromRows(
    ["name", "email", "phone", "organization"],
    rows.map((r) => [r.name, r.email ?? "", r.phone ?? "", r.organization?.name ?? ""]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="kontakte.csv"',
    },
  });
}
