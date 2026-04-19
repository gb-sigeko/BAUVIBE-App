import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";

/** GET: Planungseinträge für den Raster-Horizont (EXTERN nur eigene Zeilen). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const anchorParam = url.searchParams.get("anchor");
  const anchor = anchorParam ? new Date(anchorParam) : new Date();
  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json({ error: "Invalid anchor" }, { status: 400 });
  }
  const weeksParam = url.searchParams.get("weeks");
  const total = weeksParam ? Math.min(52, Math.max(1, Number.parseInt(weeksParam, 10) || 12)) : 12;
  const boardWeeks = buildPlanungHorizon(anchor, total);
  const isoWeeks = horizonToIsoWeeks(boardWeeks);
  const weekOr = isoWeeks.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek }));

  if (session.user.role === "EXTERN") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employeeId: true },
    });
    if (!user?.employeeId) {
      return NextResponse.json({ weeks: boardWeeks, entries: [] });
    }
    const entries = await prisma.planungEntry.findMany({
      where: { AND: [{ OR: weekOr }, { employeeId: user.employeeId }] },
      include: { employee: true, project: { select: { id: true, code: true, name: true } } },
      orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ weeks: boardWeeks, entries });
  }

  const entries = await prisma.planungEntry.findMany({
    where: { OR: weekOr },
    include: { employee: true, project: { select: { id: true, code: true, name: true } } },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ weeks: boardWeeks, entries });
}
