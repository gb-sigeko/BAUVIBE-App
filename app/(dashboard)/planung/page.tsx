import { prisma } from "@/lib/prisma";
import { getIsoWeekParts } from "@/lib/utils";
import { PlanungBoard, type PlanungBoardEntry, type PlanungBoardProject, type PlanungBoardWeek } from "@/components/planung-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function buildWeeks(anchor: Date, total: number): PlanungBoardWeek[] {
  const out: PlanungBoardWeek[] = [];
  const seen = new Set<string>();

  for (let i = -1; i < total; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + i * 7);
    const { isoYear, isoWeek } = getIsoWeekParts(d);
    const key = `${isoYear}-${isoWeek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      isoYear,
      isoWeek,
      label: `KW ${isoWeek} · ${isoYear}`,
    });
  }

  return out;
}

export default async function PlanungPage() {
  const anchor = new Date();
  const weeks = buildWeeks(anchor, 8);

  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const entriesRaw = await prisma.planungEntry.findMany({
    where: {
      OR: weeks.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek })),
    },
    include: { employee: true, _count: { select: { vorOrtRueckmeldungen: true } } },
    orderBy: [{ projectId: "asc" }, { isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
  });

  const boardProjects: PlanungBoardProject[] = projects;
  const boardEntries: PlanungBoardEntry[] = entriesRaw.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    isoYear: e.isoYear,
    isoWeek: e.isoWeek,
    sortOrder: e.sortOrder,
    employeeId: e.employeeId,
    employeeShortCode: e.employee?.shortCode ?? null,
    turnusLabel: e.turnusLabel,
    note: e.note,
    feedback: e.feedback,
    conflict: e.conflict,
    vorOrtCount: e._count.vorOrtRueckmeldungen,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Wochenplanung</h1>
        <p className="text-muted-foreground">
          Projektzeilen, KW-Spalten, Drag &amp; Drop zwischen Wochen, Turnus- und Rückmeldefelder. Konflikte werden automatisch markiert.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planungsraster</CardTitle>
          <CardDescription>Ziehen Sie eine Karte auf eine andere KW-Spalte, um die Zuordnung zu verschieben.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanungBoard projects={boardProjects} weeks={weeks} entries={boardEntries} />
        </CardContent>
      </Card>
    </div>
  );
}
