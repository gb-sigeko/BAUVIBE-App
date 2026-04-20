import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TourenClient } from "@/components/touren/touren-client";
import { ExportCsvButton } from "@/components/export/export-csv-button";
import { getIsoWeekParts } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TourenPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const anchor = new Date();
  const def = getIsoWeekParts(anchor);
  const isoYear = Number.parseInt(String(searchParams.isoYear ?? def.isoYear), 10) || def.isoYear;
  const isoWeek = Number.parseInt(String(searchParams.isoWeek ?? def.isoWeek), 10) || def.isoWeek;

  const tours = await prisma.tour.findMany({
    where: { isoYear, isoWeek },
    include: { employee: { select: { shortCode: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const projects = await prisma.project.findMany({ select: { id: true, code: true } });
  const projectCodes = Object.fromEntries(projects.map((p) => [p.id, p.code]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Touren</h1>
          <p className="text-muted-foreground">Manuelle Touren je Kalenderwoche, Reihenfolge per Drag &amp; Drop.</p>
        </div>
        <ExportCsvButton
          endpoint={`/api/export/tours?isoYear=${isoYear}&isoWeek=${isoWeek}`}
          downloadName={`touren-kw${isoWeek}-${isoYear}.csv`}
          label="Touren CSV"
          testId="export-tours-csv"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>KW {isoWeek} / {isoYear}</CardTitle>
          <CardDescription>Projekt-Reihenfolge in der Tour anpassen (wird in `Tour.sortOrder` gespeichert).</CardDescription>
        </CardHeader>
        <CardContent>
          <TourenClient
            isoYear={isoYear}
            isoWeek={isoWeek}
            initialTours={tours.map((t) => ({
              id: t.id,
              isoYear: t.isoYear,
              isoWeek: t.isoWeek,
              employeeId: t.employeeId,
              region: t.region,
              sortOrder: t.sortOrder as string[],
              status: t.status,
              employee: t.employee,
            }))}
            projectCodes={projectCodes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
