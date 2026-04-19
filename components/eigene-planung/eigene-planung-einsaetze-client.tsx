"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EinsatzRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  projectName: string;
  projectCode: string;
  turnusLabel: string | null;
  note: string | null;
  feedback: string | null;
  conflict: boolean;
};

function JaNein({
  value,
  onChange,
  name,
  testJa,
  testNein,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  name: string;
  testJa: string;
  testNein: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" name={name} data-testid={testJa} checked={value === true} onChange={() => onChange(true)} />
        Ja
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" name={name} data-testid={testNein} checked={value === false} onChange={() => onChange(false)} />
        Nein
      </label>
    </div>
  );
}

export function EigenePlanungEinsaetzeClient({ entries }: { entries: EinsatzRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [aushangOk, setAushangOk] = useState<boolean | null>(null);
  const [werbungOk, setWerbungOk] = useState<boolean | null>(null);
  const [unterbrechung, setUnterbrechung] = useState("");
  const [busy, setBusy] = useState(false);

  function openFor(eid: string) {
    setEntryId(eid);
    setAushangOk(null);
    setWerbungOk(null);
    setUnterbrechung("");
    setOpen(true);
  }

  async function submit() {
    if (!entryId || aushangOk === null || werbungOk === null) return;
    const lines: string[] = [];
    lines.push(`Aushang aktuell/lesbar: ${aushangOk ? "ja" : "nein"}`);
    lines.push(`Werbung hängt: ${werbungOk ? "ja" : "nein"}`);
    if (unterbrechung.trim()) lines.push(`Unterbrechung: ${unterbrechung.trim()}`);
    const rueckmeldung = lines.join("\n");

    setBusy(true);
    try {
      const res = await fetch(`/api/planung/entries/${entryId}/vorort`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aushangOk,
          werbungOk,
          unterbrechung: unterbrechung.trim() || null,
          rueckmeldung,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Aktuell keine Planungseinträge.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>KW</TableHead>
            <TableHead>Projekt</TableHead>
            <TableHead>Turnus</TableHead>
            <TableHead>Notiz</TableHead>
            <TableHead>Rückmeldung</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id} data-testid={`eigene-planung-row-${e.id}`}>
              <TableCell className="font-mono text-xs">
                {e.isoWeek}/{e.isoYear}
              </TableCell>
              <TableCell>
                <div className="font-medium">{e.projectName}</div>
                <div className="text-xs text-muted-foreground">{e.projectCode}</div>
              </TableCell>
              <TableCell>{e.turnusLabel ?? "—"}</TableCell>
              <TableCell className="max-w-[280px] text-xs text-muted-foreground">{e.note ?? "—"}</TableCell>
              <TableCell className="max-w-[220px] text-xs">{e.feedback ?? "—"}</TableCell>
              <TableCell>
                {e.conflict ? <Badge variant="warning">Konflikt</Badge> : <Badge variant="secondary">OK</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" data-testid="vorort-open" onClick={() => openFor(e.id)}>
                  Weitere Rückmeldung
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vor-Ort-Rückmeldung</DialogTitle>
            <DialogDescription>Kurze Rückmeldung vom Einsatz für das Büro (Fee).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Aushang aktuell / lesbar?</Label>
              <JaNein name="aushang" testJa="vorort-aushang-ja" testNein="vorort-aushang-nein" value={aushangOk} onChange={setAushangOk} />
            </div>
            <div className="space-y-2">
              <Label>Werbung hängt?</Label>
              <JaNein name="werbung" testJa="vorort-werbung-ja" testNein="vorort-werbung-nein" value={werbungOk} onChange={setWerbungOk} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unterbrechung">Unterbrechung (optional)</Label>
              <Textarea
                id="unterbrechung"
                data-testid="vorort-unterbrechung"
                value={unterbrechung}
                onChange={(ev) => setUnterbrechung(ev.target.value)}
                placeholder="z. B. Baustopp bis KW …"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              data-testid="vorort-submit"
              disabled={busy || aushangOk === null || werbungOk === null}
              onClick={() => void submit()}
            >
              Senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
