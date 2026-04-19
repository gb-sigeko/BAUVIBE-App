"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assigneeShort: string | null;
  protocolMissing: boolean;
};

type Filter = "all" | "open" | "done";

function isDone(status: string) {
  return status === "DONE" || status === "CANCELLED";
}

export function ProjectTasksTab({ tasks }: { tasks: TaskRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (filter === "open") return tasks.filter((t) => !isDone(t.status));
    if (filter === "done") return tasks.filter((t) => isDone(t.status));
    return tasks;
  }, [tasks, filter]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Aufgaben / Mängel</CardTitle>
          <CardDescription>Status, Fälligkeit, Zuständigkeit.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={filter === "all" ? "secondary" : "outline"} type="button" onClick={() => setFilter("all")}>
            Alle
          </Button>
          <Button size="sm" variant={filter === "open" ? "secondary" : "outline"} type="button" onClick={() => setFilter("open")}>
            Offen
          </Button>
          <Button size="sm" variant={filter === "done" ? "secondary" : "outline"} type="button" onClick={() => setFilter("done")}>
            Erledigt
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fällig</TableHead>
              <TableHead>Zuständig</TableHead>
              <TableHead>Protokoll</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t.status}</Badge>
                </TableCell>
                <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("de-DE") : "—"}</TableCell>
                <TableCell>{t.assigneeShort ?? "—"}</TableCell>
                <TableCell>
                  {t.protocolMissing ? <Badge variant="destructive">Fehlt</Badge> : <Badge variant="secondary">OK</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
