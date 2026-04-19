import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MitarbeiterAvailabilityClient } from "@/components/mitarbeiter/mitarbeiter-availability-client";
import {
  EigenePlanungEinsaetzeClient,
  type EinsatzRow,
} from "@/components/eigene-planung/eigene-planung-einsaetze-client";

export default async function EigenePlanungPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user?.employeeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kein Mitarbeiterprofil</CardTitle>
          <CardDescription>Ihrem Benutzer ist kein Mitarbeiterdatensatz zugeordnet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const entries = await prisma.planungEntry.findMany({
    where: { employeeId: user.employeeId },
    include: { project: true },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
  });

  const horizonStart = new Date();
  horizonStart.setMonth(horizonStart.getMonth() - 1);
  const horizonEnd = new Date();
  horizonEnd.setMonth(horizonEnd.getMonth() + 6);
  const from = horizonStart.toISOString();
  const to = horizonEnd.toISOString();

  const availabilityRows = await prisma.availability.findMany({
    where: {
      employeeId: user.employeeId,
      startsOn: { lte: horizonEnd },
      endsOn: { gte: horizonStart },
    },
    orderBy: { startsOn: "asc" },
  });

  const einsatzRows: EinsatzRow[] = entries.map((e) => ({
    id: e.id,
    isoYear: e.isoYear,
    isoWeek: e.isoWeek,
    projectName: e.project.name,
    projectCode: e.project.code,
    turnusLabel: e.turnusLabel,
    note: e.note,
    feedback: e.feedback,
    conflict: e.conflict,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meine Planung</h1>
        <p className="text-muted-foreground">
          Übersicht Ihrer Einsätze (KW) inkl. Turnus, Notizen und Rückmeldungen. Änderungen erfolgen über das Büro.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meine Abwesenheiten</CardTitle>
          <CardDescription>Nur Ihre eigenen Einträge (Urlaub, Krankmeldung, …).</CardDescription>
        </CardHeader>
        <CardContent>
          <MitarbeiterAvailabilityClient
            employeeId={user.employeeId}
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

      <Card>
        <CardHeader>
          <CardTitle>Einsätze</CardTitle>
          <CardDescription>Kürzel: {user.employee?.shortCode}</CardDescription>
        </CardHeader>
        <CardContent>
          <EigenePlanungEinsaetzeClient entries={einsatzRows} />
        </CardContent>
      </Card>
    </div>
  );
}
