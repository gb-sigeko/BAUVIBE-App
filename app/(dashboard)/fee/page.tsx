import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIsoWeekParts } from "@/lib/utils";

export default async function FeeHomePage() {
  const session = await auth();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const { isoYear, isoWeek } = getIsoWeekParts(today);

  const [openProjects, dueToday, overdue, missingTaskProtocols, missingBegehungProtocols, conflictsThisWeek] =
    await Promise.all([
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({
        where: {
          status: { not: "DONE" },
          dueDate: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.task.count({
        where: {
          status: { not: "DONE" },
          dueDate: { lt: startOfDay },
        },
      }),
      prisma.task.count({ where: { protocolMissing: true, status: { not: "DONE" } } }),
      prisma.begehung.count({ where: { protocolMissing: true } }),
      prisma.planungEntry.count({ where: { isoYear, isoWeek, conflict: true } }),
    ]);

  const missingProtocols = missingTaskProtocols + missingBegehungProtocols;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fee – Start</h1>
        <p className="text-muted-foreground">
          Willkommen{session?.user?.name ? `, ${session.user.name}` : ""}. Schnellzugriff und Tageslage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktive Projekte</CardTitle>
            <CardDescription>Projektakte im Status aktiv</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{openProjects}</div>
            <Button asChild size="sm" variant="outline">
              <Link href="/projects">Öffnen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heute fällig</CardTitle>
            <CardDescription>Aufgaben mit Fälligkeit heute</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{dueToday}</div>
            <Button asChild size="sm" variant="outline">
              <Link href="/arbeitskorb">Arbeitskorb</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Überfällig</CardTitle>
            <CardDescription>Aufgaben nach Fälligkeit</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{overdue}</div>
            <Badge variant={overdue > 0 ? "destructive" : "secondary"}>{overdue > 0 ? "Handeln" : "OK"}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fehlende Protokolle</CardTitle>
            <CardDescription>Aufgaben + Begehungen</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{missingProtocols}</div>
            <Button asChild size="sm" variant="outline">
              <Link href="/arbeitskorb">Prüfen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Wochenlage</CardTitle>
            <CardDescription>
              Planungskonflikte in der aktuellen Kalenderwoche {isoWeek}/{isoYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Konflikte entstehen, wenn dieselbe Person in derselben KW mehreren Projekten zugeordnet ist.
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-semibold">{conflictsThisWeek}</div>
              <Button asChild variant="outline">
                <Link href="/planung">Planung öffnen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kurzaktionen</CardTitle>
            <CardDescription>Häufig genutzte Bereiche</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="secondary">
              <Link href="/projects">Projektakte</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/mitarbeiter">Mitarbeiter & Verfügbarkeit</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/gf">GF-Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
