import Link from "next/link";
import { auth } from "@/auth";
import { PlanungStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIsoWeekParts } from "@/lib/utils";
import { isoWeekForOffset } from "@/lib/iso-week";

export default async function FeeHomePage() {
  const session = await auth();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const { isoYear, isoWeek } = getIsoWeekParts(today);
  const next = isoWeekForOffset(today, 7);

  const [
    openProjects,
    dueToday,
    overdue,
    missingTaskProtocols,
    missingBegehungProtocols,
    conflictsThisWeek,
    topTasksToday,
    turnusNext,
    chronik,
  ] = await Promise.all([
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
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { gte: startOfDay, lte: endOfDay } },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    prisma.planungEntry.findMany({
      where: {
        isoYear: next.isoYear,
        isoWeek: next.isoWeek,
        planungStatus: PlanungStatus.VORGESCHLAGEN,
      },
      include: { project: true, employee: true },
      orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
      take: 12,
    }),
    prisma.chronikEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: true },
    }),
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Planung</CardTitle>
            <CardDescription>Wochenraster &amp; Export</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/planung">Öffnen</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Arbeitskorb</CardTitle>
            <CardDescription>Offene Punkte</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/arbeitskorb">Öffnen</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Projekte</CardTitle>
            <CardDescription>Alle Akten</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/projects">Öffnen</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Mitarbeiter</CardTitle>
            <CardDescription>Profile &amp; Verfügbarkeit</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/mitarbeiter">Öffnen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Heute fällige Rückmeldungen</CardTitle>
            <CardDescription>Top 3 Aufgaben aus dem Arbeitskorb (Fälligkeit heute).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!topTasksToday.length ? (
              <p className="text-sm text-muted-foreground">Heute nichts Fälliges.</p>
            ) : (
              topTasksToday.map((t) => (
                <div key={t.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.project.name}</div>
                  <Button asChild size="sm" variant="link" className="h-auto px-0 pt-1">
                    <Link href={`/projects/${t.projectId}?tab=tasks`}>Zur Quelle</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Turnusvorschläge nächste Woche</CardTitle>
            <CardDescription>
              Status „vorgeschlagen“, KW {next.isoWeek}/{next.isoYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!turnusNext.length ? (
              <p className="text-muted-foreground">Keine Vorschläge für diese KW.</p>
            ) : (
              <ul className="space-y-2">
                {turnusNext.map((e) => (
                  <li key={e.id} className="rounded-md border p-2">
                    <div className="font-medium">{e.project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.employee?.shortCode ?? "—"} · {e.project.code}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/planung">Zur Planung</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letzte Projektaktivitäten</CardTitle>
            <CardDescription>Neueste Chronik-Einträge (quer über alle Projekte).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!chronik.length ? (
              <p className="text-muted-foreground">Noch keine Chronik.</p>
            ) : (
              chronik.map((c) => (
                <div key={c.id} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    {c.project.name} · {c.createdAt.toLocaleString("de-DE")}
                  </div>
                  <div className="mt-1 line-clamp-3">{c.body}</div>
                  <Button asChild size="sm" variant="link" className="h-auto px-0 pt-1">
                    <Link href={`/projects/${c.projectId}?tab=chronicle`}>Zur Chronik</Link>
                  </Button>
                </div>
              ))
            )}
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
