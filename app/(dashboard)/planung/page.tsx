import { prisma } from "@/lib/prisma";
import { PlanungBoard, type PlanungBoardEntry, type PlanungBoardProject, type PlanungBoardWeek } from "@/components/planung-board";
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
          Virtualisiertes Raster (KW × Projekte), Statusfarben, Konflikt-Hinweis, Begehungsnummern, Turnus-Sync und strukturierte Rückmeldungen (inkl. Roll-Forward).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planungsraster</CardTitle>
          <CardDescription>KW-Verschiebung pro Eintrag über den Button „KW“; schnelle Rückmeldungen über OK / n.e. / NB / OB.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanungBoard projects={boardProjects} weeks={weeks} entries={boardEntries} />
        </CardContent>
      </Card>
    </div>
  );
}
