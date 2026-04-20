import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextbausteineClient } from "@/components/textbausteine-client";
import { ExportCsvButton } from "@/components/export/export-csv-button";

export default async function TextbausteinePage() {
  const rows = await prisma.textbaustein.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Textbausteine</h1>
          <p className="text-muted-foreground">Vorlagen für Mängeltexte, E-Mails und Protokolle.</p>
        </div>
        <ExportCsvButton
          endpoint="/api/export/textbausteine"
          downloadName="textbausteine.csv"
          label="Textbausteine CSV"
          testId="export-textbausteine-csv"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verwaltung</CardTitle>
          <CardDescription>CRUD über API; Kategorie frei wählbar (z. B. „mangel“ für Begehungen).</CardDescription>
        </CardHeader>
        <CardContent>
          <TextbausteineClient
            initial={rows.map((r) => ({ id: r.id, name: r.name, kategorie: r.kategorie, inhalt: r.inhalt }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
