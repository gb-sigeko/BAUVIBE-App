"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const initialFollowDraft = useMemo(() => {
    const o: Record<string, string> = {};
    for (const n of notes) {
      o[n.id] = n.followUp ? new Date(n.followUp).toISOString().slice(0, 16) : "";
    }
    return o;
  }, [notes]);

  const [followDraft, setFollowDraft] = useState<Record<string, string>>(initialFollowDraft);
  useEffect(() => {
    setFollowDraft(initialFollowDraft);
  }, [initialFollowDraft]);

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

  async function saveFollowUp(id: string) {
    const raw = followDraft[id]?.trim();
    const iso = raw ? new Date(raw).toISOString() : null;
    await fetch(`/api/projects/${projectId}/telefonnotizen/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ followUp: iso }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Notiz</label>
          <Textarea data-testid="telefonnotiz-text" value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Follow-up (optional, Datum/Zeit lokal)</label>
          <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          <Button data-testid="telefonnotiz-save" type="button" className="mt-2" disabled={busy} onClick={() => void create()}>
            Speichern
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notiz</TableHead>
            <TableHead>Erfasst</TableHead>
            <TableHead>Follow-up</TableHead>
            <TableHead>Wiedervorlage setzen</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Erledigt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notes.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="max-w-[320px] text-sm">{n.notiz}</TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(n.erfasstAm).toLocaleString("de-DE")}
                <div>{n.erfasstVon}</div>
              </TableCell>
              <TableCell className="text-xs">{n.followUp ? new Date(n.followUp).toLocaleString("de-DE") : "—"}</TableCell>
              <TableCell className="min-w-[200px]">
                <div className="flex flex-col gap-1">
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={followDraft[n.id] ?? ""}
                    onChange={(e) => setFollowDraft((d) => ({ ...d, [n.id]: e.target.value }))}
                  />
                  <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => void saveFollowUp(n.id)}>
                    Speichern
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {n.erledigt ? <Badge variant="secondary">Erledigt</Badge> : <Badge variant="outline">Offen</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => void toggle(n.id, n.erledigt)}>
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
