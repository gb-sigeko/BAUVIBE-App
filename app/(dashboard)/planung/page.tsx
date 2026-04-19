import { prisma } from "@/lib/prisma";
import {
  PlanungBoard,
  type PlanungBoardEmployee,
  type PlanungBoardEntry,
  type PlanungBoardProject,
  type PlanungBoardWeek,
} from "@/components/planung-board";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";
import { syncTurnusSuggestions } from "@/lib/turnus-engine";

export const dynamic = "force-dynamic";
/** Große Raster (z. B. E2E mit ?weeks=45) dürfen länger rechnen. */
export const maxDuration = 180;

type PlanungPageProps = { searchParams?: { weeks?: string } };

export default async function PlanungPage({ searchParams }: PlanungPageProps) {
  const anchor = new Date();
  const raw = Number(searchParams?.weeks ?? "12");
  const weekCount = Number.isFinite(raw) ? Math.min(52, Math.max(4, Math.floor(raw))) : 12;
  const weeks: PlanungBoardWeek[] = buildPlanungHorizon(anchor, weekCount);
  if (process.env.SKIP_PLANUNG_SYNC !== "1") {
    await syncTurnusSuggestions(prisma, anchor, horizonToIsoWeeks(weeks));
  }

  const [projects, employees, entriesRaw] = await Promise.all([
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        turnus: true,
        responsibleEmployee: { select: { region: true, shortCode: true } },
      },
    }),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: { shortCode: "asc" },
      select: { id: true, shortCode: true, displayName: true, weeklyCapacity: true, region: true },
    }),
    prisma.planungEntry.findMany({
      where: {
        OR: weeks.map((w) => ({ isoYear: w.isoYear, isoWeek: w.isoWeek })),
      },
      include: { employee: true, _count: { select: { vorOrtRueckmeldungen: true } } },
      orderBy: [{ projectId: "asc" }, { isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const projectIds = projects.map((p) => p.id);
  const begehungen =
    projectIds.length === 0
      ? []
      : await prisma.begehung.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, date: true, laufendeNr: true },
          orderBy: { date: "desc" },
        });

  const lastByProject = new Map<string, { date: Date; laufendeNr: number | null }>();
  for (const b of begehungen) {
    if (!lastByProject.has(b.projectId)) {
      lastByProject.set(b.projectId, { date: b.date, laufendeNr: b.laufendeNr });
    }
  }

  const boardProjects: PlanungBoardProject[] = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    turnus: p.turnus,
    region: p.responsibleEmployee?.region ?? null,
    lastBegehungLabel: (() => {
      const l = lastByProject.get(p.id);
      if (!l) return null;
      const d = l.date.toISOString().slice(0, 10);
      return `Nr. ${l.laufendeNr ?? "?"} · ${d}`;
    })(),
  }));

  const boardEmployees: PlanungBoardEmployee[] = employees.map((e) => ({
    id: e.id,
    shortCode: e.shortCode,
    displayName: e.displayName,
    region: e.region ?? null,
    weeklyCapacity: e.weeklyCapacity,
  }));

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
    begehungSollNummer: e.begehungSollNummer,
    begehungIstNummer: e.begehungIstNummer,
    tourId: e.tourId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Wochenplanung</h1>
        <p className="text-muted-foreground">
          Leitstand: Filter, gespeicherte Ansichten, Kontextpanel, Statusfarben, Drag &amp; Drop für Mitarbeiterzuweisung (mit
          Chronik), Turnus-Sync für {weekCount} Wochen, Virtualisierung (react-window).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planungsraster</CardTitle>
          <CardDescription>
            KW-Verschiebung über „KW“; Rückmeldung OK / n.e. / NB / OB; Zuweisung per Ziehen des Griffs auf eine
            Mitarbeiter-Kachel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanungBoard
            projects={boardProjects}
            weeks={weeks}
            entries={boardEntries}
            employees={boardEmployees}
            horizonWeekCount={weekCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
