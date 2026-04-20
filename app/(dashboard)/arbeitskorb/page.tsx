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

  const [dueToday, overdue, missingTaskProtocols, missingBegehungProtocols, telefonWv, commWv] = await Promise.all([
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
    prisma.telefonnotiz.findMany({
      where: {
        erledigt: false,
        followUp: { not: null, lte: endOfDay },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { followUp: "asc" },
    }),
    prisma.communication.findMany({
      where: {
        followUp: { not: null, lte: endOfDay },
        status: { notIn: ["erledigt", "Erledigt", "ERLEDIGT"] },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { followUp: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arbeitskorb</h1>
        <p className="text-muted-foreground">Heute fällig, überfällig, Kommunikations-Wiedervorlagen und fehlende Protokolle.</p>
      </div>

      <Card data-testid="arbeitskorb-wiedervorlagen">
        <CardHeader>
          <CardTitle>Wiedervorlagen (Kommunikation)</CardTitle>
          <CardDescription>Telefon- und E-Mail-Notizen mit Follow-up bis heute (inkl. überfällig).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 text-sm font-medium">Telefon</div>
            {telefonWv.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Telefon-Wiedervorlagen.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {telefonWv.map((n) => (
                    <TableRow key={n.id} data-testid={`arbeitskorb-wv-telefon-${n.id}`}>
                      <TableCell>{n.project.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm">{n.notiz}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {n.followUp ? n.followUp.toLocaleString("de-DE") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/projects/${n.projectId}`}>Zur Akte</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">E-Mail / Sonstiges</div>
            {commWv.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Einträge.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Betreff / Inhalt</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commWv.map((c) => (
                    <TableRow key={c.id} data-testid={`arbeitskorb-wv-comm-${c.id}`}>
                      <TableCell>{c.project.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm">{c.subject ?? c.body}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {c.followUp ? c.followUp.toLocaleString("de-DE") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/projects/${c.projectId}`}>Zur Akte</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

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
