import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MitarbeiterAvailabilityClient } from "@/components/mitarbeiter/mitarbeiter-availability-client";

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
          {!entries.length ? (
            <p className="text-sm text-muted-foreground">Aktuell keine Planungseinträge.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KW</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Turnus</TableHead>
                  <TableHead>Notiz</TableHead>
                  <TableHead>Rückmeldung</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">
                      {e.isoWeek}/{e.isoYear}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.project.name}</div>
                      <div className="text-xs text-muted-foreground">{e.project.code}</div>
                    </TableCell>
                    <TableCell>{e.turnusLabel ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">{e.note ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] text-xs">{e.feedback ?? "—"}</TableCell>
                    <TableCell>
                      {e.conflict ? <Badge variant="warning">Konflikt</Badge> : <Badge variant="secondary">OK</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
