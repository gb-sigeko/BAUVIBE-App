import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MitarbeiterAvailabilityClient } from "@/components/mitarbeiter/mitarbeiter-availability-client";
import { MitarbeiterVertretungClient } from "@/components/mitarbeiter/mitarbeiter-vertretung-client";

export const dynamic = "force-dynamic";

export default async function MitarbeiterDetailPage({ params }: { params: { id: string } }) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
  });
  if (!employee) notFound();

  const horizonStart = new Date();
  horizonStart.setMonth(horizonStart.getMonth() - 1);
  const horizonEnd = new Date();
  horizonEnd.setMonth(horizonEnd.getMonth() + 6);
  const from = horizonStart.toISOString();
  const to = horizonEnd.toISOString();

  const availabilityRows = await prisma.availability.findMany({
    where: {
      employeeId: employee.id,
      startsOn: { lte: horizonEnd },
      endsOn: { gte: horizonStart },
    },
    orderBy: { startsOn: "asc" },
  });

  const subsAsCovered = await prisma.substitute.findMany({
    where: { coveredEmployeeId: employee.id },
    include: { delegateEmployee: { select: { id: true, shortCode: true, displayName: true } } },
    orderBy: { startsOn: "desc" },
  });

  const allEmployees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { shortCode: "asc" },
    select: { id: true, shortCode: true, displayName: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{employee.displayName}</h1>
          <p className="text-muted-foreground">
            <span className="font-mono text-sm">{employee.shortCode}</span> · {employee.kind}
            {employee.jobRole ? ` · ${employee.jobRole}` : null}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/mitarbeiter">Zurück</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stammdaten</CardTitle>
          <CardDescription>Kapazität pro Woche (Vertrag), Region, Status.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant={employee.active ? "secondary" : "destructive"}>{employee.active ? "Aktiv" : "Inaktiv"}</Badge>
          <span className="text-muted-foreground">Wochenkapazität: {employee.weeklyCapacity} Tage</span>
          {employee.region ? <span className="text-muted-foreground">Region: {employee.region}</span> : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="availability">
        <TabsList>
          <TabsTrigger value="availability">Verfügbarkeit</TabsTrigger>
          <TabsTrigger value="substitutes">Vertretungen</TabsTrigger>
        </TabsList>
        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Abwesenheiten</CardTitle>
              <CardDescription>Urlaub, Krankheit, Fortbildung — wirkt auf Turnus-Vorschläge und Vertretung.</CardDescription>
            </CardHeader>
            <CardContent>
              <MitarbeiterAvailabilityClient
                employeeId={employee.id}
                from={from}
                to={to}
                initialRows={availabilityRows.map((r) => ({
                  id: r.id,
                  startsOn: r.startsOn.toISOString(),
                  endsOn: r.endsOn.toISOString(),
                  reason: r.reason,
                  note: r.note,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="substitutes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vertretungsregeln</CardTitle>
              <CardDescription>Wer springt in welchem Zeitraum ein (optional auf Projekte begrenzt).</CardDescription>
            </CardHeader>
            <CardContent>
              <MitarbeiterVertretungClient
                coveredEmployeeId={employee.id}
                employees={allEmployees}
                initialAsCovered={subsAsCovered.map((s) => ({
                  id: s.id,
                  coveredEmployeeId: s.coveredEmployeeId,
                  delegateEmployeeId: s.delegateEmployeeId,
                  startsOn: s.startsOn.toISOString(),
                  endsOn: s.endsOn.toISOString(),
                  note: s.note,
                  priority: s.priority ?? null,
                  affectedProjectIds: s.affectedProjectIds,
                  delegateEmployee: s.delegateEmployee,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
