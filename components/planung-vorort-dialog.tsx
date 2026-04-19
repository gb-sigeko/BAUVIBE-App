"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PlanungVorOrtDialog({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rueckmeldung, setRueckmeldung] = useState("");
  const [unterbrechung, setUnterbrechung] = useState("");
  const [aushangOk, setAushangOk] = useState<boolean | "">("");
  const [werbungOk, setWerbungOk] = useState<boolean | "">("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!rueckmeldung.trim()) return;
    setBusy(true);
    await fetch(`/api/planung/entries/${entryId}/vorort`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rueckmeldung: rueckmeldung.trim(),
        unterbrechung: unterbrechung.trim() || null,
        aushangOk: aushangOk === "" ? null : aushangOk,
        werbungOk: werbungOk === "" ? null : werbungOk,
      }),
    });
    setBusy(false);
    setOpen(false);
    setRueckmeldung("");
    setUnterbrechung("");
    setAushangOk("");
    setWerbungOk("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-[11px] text-primary"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Vor Ort
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vor-Ort-Rückmeldung</DialogTitle>
          <DialogDescription>SiGeKo vor Ort – Aushang, Werbung, Unterbrechung, Freitext.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0">Aushang ok?</span>
            <select
              className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              value={aushangOk === "" ? "" : aushangOk ? "ja" : "nein"}
              onChange={(e) => setAushangOk(e.target.value === "" ? "" : e.target.value === "ja")}
            >
              <option value="">—</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0">Werbung ok?</span>
            <select
              className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              value={werbungOk === "" ? "" : werbungOk ? "ja" : "nein"}
              onChange={(e) => setWerbungOk(e.target.value === "" ? "" : e.target.value === "ja")}
            >
              <option value="">—</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </label>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Unterbrechung (optional)</span>
            <Input value={unterbrechung} onChange={(e) => setUnterbrechung(e.target.value)} placeholder="z. B. Baustopp bis KW 20" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Rückmeldung</span>
            <Textarea rows={4} value={rueckmeldung} onChange={(e) => setRueckmeldung(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
