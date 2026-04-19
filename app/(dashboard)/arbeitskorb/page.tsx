import Link from "next/link";
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

export default async function ArbeitskorbPage() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const [dueToday, overdue, missingTaskProtocols, missingBegehungProtocols] = await Promise.all([
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
      where: { protocolMissing: true },
      include: { project: true },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arbeitskorb</h1>
        <p className="text-muted-foreground">Heute fällig, überfällig und fehlende Protokolle.</p>
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
          <CardTitle>Fehlende Protokolle</CardTitle>
          <CardDescription>Aufgaben und Begehungen ohne vollständiges Protokoll.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <div className="mb-2 text-sm font-medium">Aufgaben</div>
            <TaskTable tasks={missingTaskProtocols} emptyHint="Keine Aufgaben mit fehlendem Protokoll." />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Begehungen</div>
            <BegehungTable begehungen={missingBegehungProtocols} />
          </div>
        </CardContent>
      </Card>
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
    return <p className="text-sm text-muted-foreground">Keine Begehungen mit fehlendem Protokoll.</p>;
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
                <Link href={`/projects/${i.projectId}`}>Zur Akte</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
