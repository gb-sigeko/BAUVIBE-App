"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type BegehungRow = {
  id: string;
  date: string;
  title: string | null;
  mangelCount: number;
  protocolMissing: boolean;
};

type EmpOpt = { id: string; shortCode: string; displayName: string };

export function ProjectBegehungenTab({
  projectId,
  rows,
  employees,
}: {
  projectId: string;
  rows: BegehungRow[];
  employees: EmpOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");

  async function createBegehung() {
    if (!date) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/begehungen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          employeeId: employeeId || null,
          title: title.trim() || null,
        }),
      });
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      setOpen(false);
      setDate("");
      setEmployeeId("");
      setTitle("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Begehungen</CardTitle>
          <CardDescription>Termine, Notizen und Protokollstatus.</CardDescription>
        </div>
        <Button type="button" size="sm" data-testid="begehung-neu-open" onClick={() => setOpen(true)}>
          Neue Begehung
        </Button>
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
              <TableRow key={i.id} data-testid={`begehung-row-${i.id}`}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Begehung</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="bg-datum">Datum und Uhrzeit</Label>
              <Input id="bg-datum" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} data-testid="begehung-neu-datetime" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bg-mit">Mitarbeiter (SiGeKo vor Ort)</Label>
              <select
                id="bg-mit"
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                data-testid="begehung-neu-employee"
              >
                <option value="">— optional —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.shortCode} · {e.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bg-titel">Titel (optional)</Label>
              <Input id="bg-titel" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="begehung-neu-title" />
            </div>
            <p className="text-xs text-muted-foreground">Die laufende Nummer wird automatisch vergeben.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" disabled={busy || !date} onClick={() => void createBegehung()} data-testid="begehung-neu-save">
              {busy ? "Speichern…" : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
