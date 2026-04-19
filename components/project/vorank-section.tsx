"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type VkRow = { id: string; pdfFormular: string; status: string; generiertesPdf: string | null };

export function VorankSection({ projectId, rows }: { projectId: string; rows: VkRow[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function create() {
    if (!url.trim()) return;
    setBusy("new");
    await fetch(`/api/projects/${projectId}/vorankuendigungen`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pdfFormular: url.trim(), arbeitsschutzAntworten: {} }),
    });
    setUrl("");
    setBusy(null);
    router.refresh();
  }

  async function pdf(id: string) {
    window.open(`/api/projects/${projectId}/vorankuendigungen/${id}/pdf`, "_blank");
    router.refresh();
  }

  async function send(id: string, to: string) {
    setBusy(id);
    await fetch(`/api/projects/${projectId}/vorankuendigungen/${id}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">PDF-Formular (URL oder Platzhalter)</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <Button type="button" disabled={busy === "new"} onClick={() => void create()}>
          Vorankündigung erfassen
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Formular</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>PDF</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="max-w-[280px] truncate text-sm">{r.pdfFormular}</TableCell>
              <TableCell>
                <Badge variant="secondary">{r.status}</Badge>
              </TableCell>
              <TableCell className="text-sm">{r.generiertesPdf ? "Ja" : "—"}</TableCell>
              <TableCell className="space-x-2 text-right">
                <Button type="button" size="sm" variant="outline" disabled={busy === r.id} onClick={() => void pdf(r.id)}>
                  PDF erzeugen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === r.id}
                  onClick={() => {
                    const to = window.prompt("Empfänger-E-Mail?");
                    if (to) void send(r.id, to);
                  }}
                >
                  E-Mail
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
