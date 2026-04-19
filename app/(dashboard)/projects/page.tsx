import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ProjekteExportBar } from "@/components/export/projekte-export-bar";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { tasks: true, begehungen: true, documents: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projekte</h1>
          <p className="text-muted-foreground">Projektakte mit Schnellüberblick.</p>
        </div>
        <ProjekteExportBar />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Projektakte</CardTitle>
          <CardDescription>Öffnen Sie eine Akte für Tabs (Übersicht, Begehungen, Aufgaben, Dokumente, Chronik).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aufgaben</TableHead>
                <TableHead className="text-right">Begehungen</TableHead>
                <TableHead className="text-right">Dokumente</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{p._count.tasks}</TableCell>
                  <TableCell className="text-right">{p._count.begehungen}</TableCell>
                  <TableCell className="text-right">{p._count.documents}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/projects/${p.id}`}>Öffnen</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
