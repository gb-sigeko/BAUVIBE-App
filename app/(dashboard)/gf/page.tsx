import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportCsvButton } from "@/components/export/export-csv-button";

export default async function GfDashboardPage() {
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true, targetHours: true, actualHours: true },
  });

  const soll = projects.reduce((sum, p) => sum + (p.targetHours ?? 0), 0);
  const ist = projects.reduce((sum, p) => sum + (p.actualHours ?? 0), 0);
  const utilizationPct = soll > 0 ? Math.round((ist / soll) * 100) : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [openHighRiskTasks, overdueTasks, missingTaskProtocols, missingBegehungProtocols] = await Promise.all([
    prisma.task.count({
      where: {
        status: { not: "DONE" },
        OR: [{ title: { contains: "Mangel", mode: "insensitive" } }, { title: { contains: "Absturz", mode: "insensitive" } }],
      },
    }),
    prisma.task.count({
      where: { status: { not: "DONE" }, dueDate: { lt: startOfToday } },
    }),
    prisma.task.count({ where: { protocolMissing: true, status: { not: "DONE" } } }),
    prisma.begehung.count({ where: { protocolMissing: true } }),
  ]);

  const missingProtocols = missingTaskProtocols + missingBegehungProtocols;

  const criticalSignals = openHighRiskTasks + overdueTasks;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">GF-Dashboard</h1>
          <p className="text-muted-foreground">Auslastung (Soll/Ist), kritische Themen und operative Risiken.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton
            endpoint="/api/export/projects"
            downloadName="projekte.csv"
            label="Projekte CSV"
            testId="export-gf-projects-csv"
          />
          <ExportCsvButton
            endpoint="/api/export/organizations"
            downloadName="organisationen.csv"
            label="Organisationen CSV"
            testId="export-gf-organizations-csv"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auslastung (Soll/Ist)</CardTitle>
            <CardDescription>Summe aktiver Projekte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold">{utilizationPct === null ? "—" : `${utilizationPct}%`}</div>
            <div className="text-xs text-muted-foreground">
              Ist: {ist} h · Soll: {soll} h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kritische Signale</CardTitle>
            <CardDescription>Heuristisch: Mängel-/Absturz-Themen + überfällige Aufgaben</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold">{criticalSignals}</div>
            <div className="text-xs text-muted-foreground">
              Mängel/Absturz offen: {openHighRiskTasks} · Überfällig: {overdueTasks}
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
          <CardTitle>Soll/Ist je Projekt</CardTitle>
          <CardDescription>Transparente Steuerungsgrundlage für Ressourcenentscheidungen.</CardDescription>
        </CardHeader>
        <CardContent>
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
              {projects.map((p) => {
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
    </div>
  );
}
