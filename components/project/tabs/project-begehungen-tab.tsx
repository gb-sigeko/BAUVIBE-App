import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type BegehungRow = {
  id: string;
  date: string;
  title: string | null;
  mangelCount: number;
  protocolMissing: boolean;
};

export function ProjectBegehungenTab({ projectId, rows }: { projectId: string; rows: BegehungRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Begehungen</CardTitle>
        <CardDescription>Termine, Notizen und Protokollstatus.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead>Mängel</TableHead>
              <TableHead>Protokoll</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{new Date(i.date).toLocaleDateString("de-DE")}</TableCell>
                <TableCell>{i.title ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{i.mangelCount} Mängel</Badge>
                </TableCell>
                <TableCell>
                  {i.protocolMissing ? <Badge variant="destructive">Fehlt</Badge> : <Badge variant="secondary">OK</Badge>}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Link className="text-sm text-primary underline" href={`/projects/${projectId}/begehungen/${i.id}`}>
                    Bearbeiten
                  </Link>
                  <Link
                    className="text-sm text-primary underline"
                    href={`/begehungen/${i.id}/protokoll`}
                    data-testid="begehung-protokoll-link"
                  >
                    Protokoll
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
