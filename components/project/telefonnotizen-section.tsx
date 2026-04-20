"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Note = {
  id: string;
  notiz: string;
  erfasstVon: string;
  erfasstAm: string;
  erledigt: boolean;
  followUp: string | null;
};

export function TelefonnotizenSection({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const router = useRouter();
  const [notiz, setNotiz] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function create() {
    if (!notiz.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/telefonnotizen`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        notiz: notiz.trim(),
        followUp: followUp ? new Date(followUp).toISOString() : null,
      }),
    });
    setNotiz("");
    setFollowUp("");
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function toggle(id: string, erledigt: boolean) {
    await fetch(`/api/projects/${projectId}/telefonnotizen/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ erledigt: !erledigt }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="secondary" data-testid="telefonnotiz-dialog-open" onClick={() => setOpen(true)}>
        Neue Telefonnotiz
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Telefonnotiz</DialogTitle>
            <DialogDescription>Notiz und optionales Follow-up-Datum.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notiz</label>
              <Textarea data-testid="telefonnotiz-text" value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Follow-up (optional)</label>
              <Input type="datetime-local" data-testid="telefonnotiz-followup" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button data-testid="telefonnotiz-save" type="button" disabled={busy} onClick={() => void create()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notiz</TableHead>
            <TableHead>Erfasst</TableHead>
            <TableHead>Follow-up</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Erledigt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notes.map((n) => (
            <TableRow key={n.id} data-testid={`telefonnotiz-row-${n.id}`}>
              <TableCell className="max-w-[320px] text-sm">{n.notiz}</TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(n.erfasstAm).toLocaleString("de-DE")}
                <div>{n.erfasstVon}</div>
              </TableCell>
              <TableCell className="text-xs">{n.followUp ? new Date(n.followUp).toLocaleString("de-DE") : "—"}</TableCell>
              <TableCell>
                {n.erledigt ? <Badge variant="secondary">Erledigt</Badge> : <Badge variant="outline">Offen</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" data-testid={`telefonnotiz-toggle-${n.id}`} onClick={() => void toggle(n.id, n.erledigt)}>
                  {n.erledigt ? "Wieder öffnen" : "Erledigt"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
