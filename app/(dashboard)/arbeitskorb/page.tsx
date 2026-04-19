import Link from "next/link";
import { ArbeitskorbContextCards } from "@/components/arbeitskorb-context-cards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  projectId: string;
  project: { name: string };
  assignee: { shortCode: string } | null;
};

type BegehungRow = {
  id: string;
  date: Date;
  title: string | null;
  projectId: string;
  project: { name: string };
};

type PlanungRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  planungStatus: string;
  updatedAt: Date;
  project: { name: string; id: string };
  employee: { shortCode: string } | null;
};

export default async function ArbeitskorbPage() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const oneDayAgo = new Date(startOfDay);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const threeDaysAgo = new Date(startOfDay);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [dueToday, overdue, missingTaskProtocols, missingBegehungProtocols, offeneRueckmeldungen, overdueRueckmeldungen] =
    await Promise.all([
      prisma.task.findMany({
        where: { status: { not: "DONE" }, dueDate: { gte: startOfDay, lte: endOfDay } },
        include: { project: true, assignee: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.findMany({
        where: { status: { not: "DONE" }, dueDate: { lt: startOfDay } },
        include: { project: true, assignee: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.findMany({
        where: { protocolMissing: true, status: { not: "DONE" } },
        include: { project: true, assignee: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.begehung.findMany({
        where: { protocolMissing: true, date: { lte: threeDaysAgo } },
        include: { project: true },
        orderBy: { date: "desc" },
      }),
      prisma.planungEntry.findMany({
        where: {
          planungStatus: { in: ["RUECKMELDUNG_OFFEN", "VORGESCHLAGEN"] },
          updatedAt: { lt: oneDayAgo, gte: threeDaysAgo },
        },
        include: { project: true, employee: true },
        orderBy: { updatedAt: "asc" },
        take: 50,
      }),
      prisma.planungEntry.findMany({
        where: {
          planungStatus: { in: ["RUECKMELDUNG_OFFEN", "VORGESCHLAGEN"] },
          updatedAt: { lt: threeDaysAgo },
        },
        include: { project: true, employee: true },
        orderBy: { updatedAt: "asc" },
        take: 50,
      }),
    ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(320px,100%)] lg:items-start">
      <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arbeitskorb</h1>
        <p className="text-muted-foreground">Heute fällig, überfällig, Rückläufe und fehlende Protokolle (&gt;3 Tage).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heute fällig</CardTitle>
          <CardDescription>Aufgaben mit Fälligkeit heute.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskTable tasks={dueToday} emptyHint="Heute nichts Fälliges – gut so." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Überfällig</CardTitle>
          <CardDescription>Aufgaben mit Fälligkeit vor heute.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskTable tasks={overdue} emptyHint="Keine überfälligen Aufgaben." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fehlende Rückläufe (Planung)</CardTitle>
          <CardDescription>
            Einträge mit offener Rückmeldung / Vorschlag, älter als 1 Tag (heute) bzw. rot ab 3 Tagen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 text-sm font-medium">Heute relevant (&gt;1 Tag ohne Bearbeitung)</div>
            <PlanungTable entries={offeneRueckmeldungen} emptyHint="Keine offenen Rückläufe." />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-destructive">Überfällig (&gt;3 Tage)</div>
            <PlanungTable entries={overdueRueckmeldungen} emptyHint="Keine überfälligen Rückläufe." highlight />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fehlende Protokolle</CardTitle>
          <CardDescription>Begehungen ohne Protokoll, Datum mindestens 3 Tage zurück (Spez D).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <div className="mb-2 text-sm font-medium">Aufgaben (Protokoll-Marker)</div>
            <TaskTable tasks={missingTaskProtocols} emptyHint="Keine Aufgaben mit fehlendem Protokoll." />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Begehungen</div>
            <BegehungTable begehungen={missingBegehungProtocols} />
          </div>
        </CardContent>
      </Card>
      </div>

      <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <ArbeitskorbContextCards />
      </aside>
    </div>
  );
}

function TaskTable({ tasks, emptyHint }: { tasks: TaskRow[]; emptyHint: string }) {
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aufgabe</TableHead>
          <TableHead>Projekt</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fällig</TableHead>
          <TableHead>Zuständig</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>{t.project.name}</TableCell>
            <TableCell>
              <Badge variant="secondary">{t.status}</Badge>
            </TableCell>
            <TableCell>{t.dueDate ? t.dueDate.toLocaleDateString("de-DE") : "—"}</TableCell>
            <TableCell>{t.assignee?.shortCode ?? "—"}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/${t.projectId}`}>Zur Akte</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BegehungTable({ begehungen }: { begehungen: BegehungRow[] }) {
  if (!begehungen.length) {
    return <p className="text-sm text-muted-foreground">Keine Begehungen mit fehlendem Protokoll (&gt;3 Tage).</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Titel</TableHead>
          <TableHead>Projekt</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {begehungen.map((i) => (
          <TableRow key={i.id}>
            <TableCell>{i.date.toLocaleDateString("de-DE")}</TableCell>
            <TableCell className="font-medium">{i.title ?? "—"}</TableCell>
            <TableCell>{i.project.name}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/${i.projectId}/begehungen/${i.id}`}>Protokoll</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PlanungTable({ entries, emptyHint, highlight }: { entries: PlanungRow[]; emptyHint: string; highlight?: boolean }) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>KW</TableHead>
          <TableHead>Projekt</TableHead>
          <TableHead>MA</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Letzte Änderung</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id} className={highlight ? "bg-destructive/5" : undefined}>
            <TableCell className="font-mono text-xs">
              {e.isoWeek}/{e.isoYear}
            </TableCell>
            <TableCell>{e.project.name}</TableCell>
            <TableCell>{e.employee?.shortCode ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={highlight ? "destructive" : "secondary"}>{e.planungStatus}</Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{e.updatedAt.toLocaleString("de-DE")}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/${e.project.id}`}>Zur Quelle</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
