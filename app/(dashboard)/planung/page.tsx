import { prisma } from "@/lib/prisma";
import { PlanungBoard, type PlanungBoardEntry, type PlanungBoardProject, type PlanungBoardWeek } from "@/components/planung-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";
import { syncTurnusSuggestions } from "@/lib/turnus-engine";
import { applyKrankVertretungForHorizon } from "@/lib/vertretung";

export const dynamic = "force-dynamic";

export default async function PlanungPage({
  searchParams,
}: {
  searchParams: { isoYear?: string; isoWeek?: string; projectId?: string };
}) {
  const focusIsoYear = searchParams.isoYear ? Number(searchParams.isoYear) : undefined;
  const focusIsoWeek = searchParams.isoWeek ? Number(searchParams.isoWeek) : undefined;

  const anchor = new Date();
  const weeks: PlanungBoardWeek[] = buildPlanungHorizon(anchor, 12);
  const horizon = horizonToIsoWeeks(weeks);
  await applyKrankVertretungForHorizon(prisma, horizon);
  await syncTurnusSuggestions(prisma, anchor, horizon);

  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const entriesRaw = await prisma.planungEntry.findMany({
    where: {
      OR: weeks.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek })),
    },
    include: { employee: true, tour: true, _count: { select: { vorOrtRueckmeldungen: true } } },
    orderBy: [{ projectId: "asc" }, { isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
  });

  const toursRaw = await prisma.tour.findMany({
    where: { OR: weeks.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek })) },
    select: { id: true, isoYear: true, isoWeek: true, employeeId: true, region: true },
  });

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { shortCode: "asc" },
    select: { id: true, shortCode: true, displayName: true, weeklyCapacity: true },
  });

  const weekKey = (y: number, w: number) => `${y}-${w}`;
  const visibleWeekKeys = new Set(weeks.map((w) => weekKey(w.isoYear, w.isoWeek)));
  const excludeCapStatuses = new Set(["ERLEDIGT", "ABGESAGT"]);
  const usedByEmployee = new Map<string, number>();
  for (const e of entriesRaw) {
    if (!e.employeeId) continue;
    if (!visibleWeekKeys.has(weekKey(e.isoYear, e.isoWeek))) continue;
    if (excludeCapStatuses.has(e.planungStatus)) continue;
    usedByEmployee.set(e.employeeId, (usedByEmployee.get(e.employeeId) ?? 0) + 1);
  }
  const capDen = Math.max(1, weeks.length);

  const boardProjects: PlanungBoardProject[] = projects;
  const boardEntries: PlanungBoardEntry[] = entriesRaw.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    isoYear: e.isoYear,
    isoWeek: e.isoWeek,
    sortOrder: e.sortOrder,
    employeeId: e.employeeId,
    employeeShortCode: e.employee?.shortCode ?? null,
    planungType: e.planungType,
    planungStatus: e.planungStatus,
    planungSource: e.planungSource,
    priority: e.priority,
    specialCode: e.specialCode,
    isCompletedForContract: e.isCompletedForContract,
    turnusLabel: e.turnusLabel,
    note: e.note,
    feedback: e.feedback,
    conflict: e.conflict,
    vorOrtCount: e._count.vorOrtRueckmeldungen,
    tourId: e.tourId,
  }));

  const boardTours = toursRaw.map((t) => ({
    id: t.id,
    isoYear: t.isoYear,
    isoWeek: t.isoWeek,
    employeeId: t.employeeId,
    region: t.region,
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
          <CardTitle>Kapazität (Horizont)</CardTitle>
          <CardDescription>
            Geplante Slots in den sichtbaren Kalenderwochen vs. Wochenkapazität × Anzahl Wochen ({weeks.length} Spalten).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {employees.map((emp) => {
            const used = usedByEmployee.get(emp.id) ?? 0;
            const maxSlots = Math.max(1, emp.weeklyCapacity * capDen);
            const pct = Math.min(100, Math.round((used / maxSlots) * 100));
            return (
              <div key={emp.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">
                    {emp.shortCode} · {emp.displayName}
                  </span>
                  <span className="text-muted-foreground">
                    {used} / {maxSlots} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planungsraster</CardTitle>
          <CardDescription>Ziehen Sie eine Karte auf eine andere KW-Spalte, um die Zuordnung zu verschieben.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanungBoard
            projects={boardProjects}
            weeks={weeks}
            entries={boardEntries}
            tours={boardTours}
            focusIsoYear={Number.isFinite(focusIsoYear) ? focusIsoYear : undefined}
            focusIsoWeek={Number.isFinite(focusIsoWeek) ? focusIsoWeek : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
