import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function MitarbeiterPage() {
  const employees = await prisma.employee.findMany({
    orderBy: { shortCode: "asc" },
    include: {
      availabilities: true,
      coveredBy: { include: { delegateEmployee: true, coveredEmployee: true } },
      coveringFor: { include: { delegateEmployee: true, coveredEmployee: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Mitarbeiter & Verfügbarkeit</h1>
        <p className="text-muted-foreground">Intern/extern, Kürzel, Urlaub und Vertretung.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teamübersicht</CardTitle>
          <CardDescription>Urlaub und Vertretungen werden je Mitarbeitenden angezeigt.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kürzel</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urlaub</TableHead>
                <TableHead>Vertretung</TableHead>
                <TableHead className="text-right">Profil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.shortCode}</TableCell>
                  <TableCell className="font-medium">{e.displayName}</TableCell>
                  <TableCell>
                    <Badge variant={e.kind === "EXTERN" ? "outline" : "secondary"}>{e.kind}</Badge>
                  </TableCell>
                  <TableCell>{e.active ? <Badge variant="secondary">Aktiv</Badge> : <Badge variant="destructive">Inaktiv</Badge>}</TableCell>
                  <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                    {e.availabilities.length
                      ? e.availabilities
                          .map((h) => `${h.startsOn.toLocaleDateString("de-DE")}–${h.endsOn.toLocaleDateString("de-DE")}${h.note ? ` (${h.note})` : ""}`)
                          .join(" · ")
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[320px] text-xs text-muted-foreground">
                    {e.coveredBy.length
                      ? e.coveredBy
                          .map(
                            (s) =>
                              `${s.startsOn.toLocaleDateString("de-DE")}–${s.endsOn.toLocaleDateString("de-DE")}: ${s.delegateEmployee.shortCode} für ${s.coveredEmployee.shortCode}`,
                          )
                          .join(" · ")
                      : e.coveringFor.length
                        ? e.coveringFor
                            .map(
                              (s) =>
                                `${s.startsOn.toLocaleDateString("de-DE")}–${s.endsOn.toLocaleDateString("de-DE")}: vertritt ${s.coveredEmployee.shortCode}`,
                            )
                            .join(" · ")
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/mitarbeiter/${e.id}`}>Öffnen</Link>
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
