import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-helpers";

/** Globale Kommunikationsliste (z. B. Wiedervorlagen für Arbeitskorb). */
export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { searchParams } = new URL(req.url);
  const wiedervorlage = searchParams.get("wiedervorlage") === "true";

  if (!wiedervorlage) {
    return NextResponse.json({ error: "Query wiedervorlage=true erforderlich" }, { status: 400 });
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const rows = await prisma.communication.findMany({
    where: {
      followUp: { not: null, lte: endOfToday },
      erledigt: false,
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      contactPerson: { select: { id: true, name: true } },
    },
    orderBy: { followUp: "asc" },
  });

  return NextResponse.json(rows);
}
