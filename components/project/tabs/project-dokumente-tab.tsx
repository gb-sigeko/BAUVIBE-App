import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DocRow = { id: string; name: string; createdAt: string; url: string | null };

export function ProjectDokumenteTab({ rows }: { rows: DocRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumente</CardTitle>
        <CardDescription>Zentrale Ablage (MVP: Metadaten und Link).</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{new Date(d.createdAt).toLocaleDateString("de-DE")}</TableCell>
                <TableCell>{d.url ? <a className="text-primary underline" href={d.url}>Öffnen</a> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
