import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ChronikRow = { id: string; createdAt: string; authorName: string | null; body: string };

export function ProjectChronikTab({ rows }: { rows: ChronikRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chronik</CardTitle>
        <CardDescription>Ereignisprotokoll zum Projekt.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((c) => (
          <div key={c.id} className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">
              {new Date(c.createdAt).toLocaleString("de-DE")}
              {c.authorName ? ` · ${c.authorName}` : ""}
            </div>
            <div className="mt-2 text-sm">{c.body}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
