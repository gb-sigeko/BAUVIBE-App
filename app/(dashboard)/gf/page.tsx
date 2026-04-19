import Link from "next/link";
import { PlanungStatus, TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { isoWeekForOffset } from "@/lib/iso-week";

const CAPACITY_EXCLUDED: PlanungStatus[] = [
  PlanungStatus.ERLEDIGT,
  PlanungStatus.ABGESAGT,
  PlanungStatus.VERSCHOBEN,
  PlanungStatus.PAUSIERT,
];

export default async function GfDashboardPage() {
  const nextWeek = isoWeekForOffset(new Date(), 7);

  const [
    projectsHours,
    plannedNextWeek,
    capacityAgg,
    criticalMangelOverdue,
    missingTaskProtocols,
    missingBegehungProtocols,
    projectsAmpelBase,
    begehungProjects,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true, targetHours: true, actualHours: true },
    }),
    prisma.planungEntry.count({
      where: {
        isoYear: nextWeek.isoYear,
        isoWeek: nextWeek.isoWeek,
        employeeId: { not: null },
        planungStatus: { notIn: CAPACITY_EXCLUDED },
      },
    }),
    prisma.employee.aggregate({
      where: { active: true },
      _sum: { weeklyCapacity: true },
    }),
    prisma.task.count({
      where: { priority: TaskPriority.CRITICAL, status: TaskStatus.OVERDUE },
    }),
    prisma.task.count({ where: { protocolMissing: true, status: { not: "DONE" } } }),
    prisma.begehung.count({ where: { protocolMissing: true } }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        name: true,
        contractualBegehungen: true,
        completedBegehungen: true,
        _count: {
          select: {
            tasks: {
              where: {
                isMangel: true,
                priority: TaskPriority.CRITICAL,
                status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
              },
            },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE", contractualBegehungen: { not: null, gt: 0 } },
      select: { completedBegehungen: true, contractualBegehungen: true },
    }),
  ]);

  const soll = projectsHours.reduce((sum, p) => sum + (p.targetHours ?? 0), 0);
  const ist = projectsHours.reduce((sum, p) => sum + (p.actualHours ?? 0), 0);
  const hoursUtilPct = soll > 0 ? Math.round((ist / soll) * 100) : null;

  const availDays = capacityAgg._sum.weeklyCapacity ?? 0;
  const nextWeekUtilPct =
    availDays > 0 ? Math.min(100, Math.round((plannedNextWeek / Math.max(1, availDays)) * 100)) : null;

  const sumSollBg = begehungProjects.reduce((s, p) => s + (p.contractualBegehungen ?? 0), 0);
  const sumIstBg = begehungProjects.reduce((s, p) => s + p.completedBegehungen, 0);
  const begehungQuotePct = sumSollBg > 0 ? Math.round((sumIstBg / sumSollBg) * 100) : null;

  const missingProtocols = missingTaskProtocols + missingBegehungProtocols;

  const criticalProjects = projectsAmpelBase
    .map((p) => {
      const contractual = p.contractualBegehungen ?? 0;
      const pct = contractual > 0 ? p.completedBegehungen / contractual : 1;
      const lowCompletion = contractual > 0 && pct < 0.7;
      const manyCritical = p._count.tasks > 3;
      if (!lowCompletion && !manyCritical) return null;
      const reasons: string[] = [];
      if (lowCompletion) reasons.push(`Begehungsquote ${Math.round(pct * 100)} %`);
      if (manyCritical) reasons.push(`${p._count.tasks} kritische Mängel offen`);
      return { id: p.id, code: p.code, name: p.name, reason: reasons.join(" · ") };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">GF-Dashboard</h1>
        <p className="text-muted-foreground">
          Auslastung nächste ISO-Woche, kritische überfällige Mängel, Soll/Ist-Begehungen und Projekt-Soll/Ist-Stunden.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auslastung (nächste KW)</CardTitle>
            <CardDescription>
              Geplante Slots KW {nextWeek.isoWeek}/{nextWeek.isoYear} ÷ Summe Wochenkapazitäten aktiver Mitarbeiter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold">{nextWeekUtilPct === null ? "—" : `${nextWeekUtilPct}%`}</div>
            <div className="text-xs text-muted-foreground">
              Geplant: {plannedNextWeek} · Kapazitätssumme: {availDays} (Wochenslots)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offene kritische Mängel</CardTitle>
            <CardDescription>Aufgaben Priorität „kritisch“, Status „überfällig“</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold">{criticalMangelOverdue}</div>
            <Button asChild size="sm" variant="outline">
              <Link href="/arbeitskorb">Zum Arbeitskorb</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Soll/Ist-Begehungen (gesamt)</CardTitle>
            <CardDescription>Aktive Projekte mit Sollvorgabe Begehungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold">{begehungQuotePct === null ? "—" : `${begehungQuotePct}%`}</div>
            <div className="text-xs text-muted-foreground">
              Erledigt: {sumIstBg} · Soll: {sumSollBg}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fehlende Protokolle</CardTitle>
            <CardDescription>Aufgaben + Begehungen</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{missingProtocols}</div>
            <Button asChild variant="outline">
              <Link href="/arbeitskorb">Zum Arbeitskorb</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Soll/Ist-Stunden je Projekt</CardTitle>
          <CardDescription>Summe Ist- / Soll-Stunden (wie bisher)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            Auslastungsquote (Stunden): {hoursUtilPct === null ? "—" : `${hoursUtilPct}%`} · Ist: {ist} h · Soll: {soll} h
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead className="text-right">Soll (h)</TableHead>
                <TableHead className="text-right">Ist (h)</TableHead>
                <TableHead className="text-right">Quote</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsHours.map((p) => {
                const pct =
                  p.targetHours && p.targetHours > 0 && p.actualHours != null
                    ? Math.round((p.actualHours / p.targetHours) * 100)
                    : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.targetHours ?? "—"}</TableCell>
                    <TableCell className="text-right">{p.actualHours ?? "—"}</TableCell>
                    <TableCell className="text-right">{pct === null ? "—" : `${pct}%`}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${p.id}`}>Akte</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kritische Projekte (Ampel)</CardTitle>
          <CardDescription>Begehungsquote unter 70 % oder mehr als drei offene kritische Mängel-Aufgaben.</CardDescription>
        </CardHeader>
        <CardContent>
          {!criticalProjects.length ? (
            <p className="text-sm text-muted-foreground">Keine kritischen Projekte nach dieser Definition.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.reason}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${p.id}`}>Akte</Link>
                      </Button>
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
