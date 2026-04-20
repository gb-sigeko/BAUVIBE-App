"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Mangel = {
  id: string;
  fotoUrl: string;
  beschreibung: string;
  regel: string | null;
  textbausteinId: string | null;
  textbausteinName: string | null;
};

type BegehungState = {
  id: string;
  title: string | null;
  notes: string | null;
  protocolMissing: boolean;
  uebersichtFoto: string | null;
  verteiler: unknown;
  versendetAm: string | null;
  mangels: Mangel[];
};

type VEntry = { name: string; email: string; gewerk?: string; send?: boolean; manual?: boolean };

type ParticipantRow = {
  id: string;
  roleInProject: string;
  contactName: string | null;
  contactEmail: string | null;
  orgName: string | null;
};

function parseVerteiler(raw: unknown): VEntry[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map((row) => {
    const o = row as Record<string, unknown>;
    return {
      name: String(o.name ?? ""),
      email: String(o.email ?? ""),
      gewerk: o.gewerk != null ? String(o.gewerk) : undefined,
      send: o.send !== false,
      manual: Boolean(o.manual),
    };
  });
}

export function BegehungDetailClient({
  projectId,
  begehung,
  textbausteine,
  participants,
}: {
  projectId: string;
  begehung: BegehungState;
  textbausteine: { id: string; name: string }[];
  participants: ParticipantRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(begehung.title ?? "");
  const [notes, setNotes] = useState(begehung.notes ?? "");
  const [protocolMissing, setProtocolMissing] = useState(begehung.protocolMissing);
  const [uebersichtFoto, setUebersichtFoto] = useState(begehung.uebersichtFoto ?? "");
  const [busy, setBusy] = useState(false);

  const defaultVerteiler = useMemo((): VEntry[] => {
    const existing = parseVerteiler(begehung.verteiler);
    if (existing.length) return existing;
    return participants
      .filter((p) => (p.contactEmail ?? "").trim())
      .map((p) => ({
        name: (p.contactName ?? p.contactEmail) as string,
        email: (p.contactEmail ?? "") as string,
        gewerk: p.roleInProject,
        send: true,
        manual: false,
      }));
  }, [begehung.verteiler, participants]);

  const [verteiler, setVerteiler] = useState<VEntry[]>(defaultVerteiler);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const [mOpen, setMOpen] = useState(false);
  const [mDesc, setMDesc] = useState("");
  const [mTb, setMTb] = useState("");
  const [mFile, setMFile] = useState<File | null>(null);
  const [mDrag, setMDrag] = useState(false);

  const onDropM = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setMDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setMFile(f);
  }, []);

  async function saveMeta(verteilerPayload?: VEntry[]) {
    setBusy(true);
    const v = verteilerPayload ?? verteiler;
    await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        notes: notes || null,
        protocolMissing,
        uebersichtFoto: uebersichtFoto || null,
        verteiler: v,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  async function uploadUebersicht(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("role", "overview");
      const res = await fetch(`/api/begehungen/${begehung.id}/upload-foto`, { method: "POST", body: fd });
      if (!res.ok) return;
      const j = (await res.json()) as { url: string };
      setUebersichtFoto(j.url);
      await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uebersichtFoto: j.url }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addMangelFromModal() {
    if (!mDesc.trim() || !mFile) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", mFile);
      fd.set("role", "mangel");
      const up = await fetch(`/api/begehungen/${begehung.id}/upload-foto`, { method: "POST", body: fd });
      if (!up.ok) return;
      const uj = (await up.json()) as { url: string };
      await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}/mangels`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fotoUrl: uj.url,
          beschreibung: mDesc.trim(),
          textbausteinId: mTb || undefined,
        }),
      });
      setMOpen(false);
      setMDesc("");
      setMTb("");
      setMFile(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeMangel(id: string) {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}/mangels/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function generatePdf() {
    setBusy(true);
    try {
      const res = await fetch(`/api/begehungen/${begehung.id}/generate-pdf`, { method: "POST" });
      if (!res.ok) return;
      const j = (await res.json()) as { path: string };
      window.open(j.path, "_blank", "noopener,noreferrer");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendMail() {
    const to = window.prompt("Empfänger-E-Mail für Protokoll?");
    if (!to) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setBusy(false);
    router.refresh();
  }

  function toggleVerteilerEmail(email: string, checked: boolean) {
    setVerteiler((rows) => {
      const ix = rows.findIndex((r) => r.email === email);
      if (ix >= 0) {
        const next = [...rows];
        next[ix] = { ...next[ix], send: checked };
        return next;
      }
      if (checked) {
        const p = participants.find((x) => (x.contactEmail ?? "").trim() === email);
        if (p) {
          return [
            ...rows,
            {
              name: (p.contactName ?? email) as string,
              email,
              gewerk: p.roleInProject,
              send: true,
              manual: false,
            },
          ];
        }
      }
      return rows;
    });
  }

  function addManualVerteiler() {
    const em = manualEmail.trim();
    const nm = manualName.trim() || em;
    if (!em) return;
    setVerteiler((r) => [...r, { name: nm, email: em, send: true, manual: true }]);
    setManualEmail("");
    setManualName("");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void generatePdf()} data-testid="begehung-generate-pdf">
          PDF generieren
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void sendMail()}>
          Protokoll versenden
        </Button>
        {begehung.versendetAm ? (
          <span className="self-center text-xs text-muted-foreground">
            Zuletzt versendet: {new Date(begehung.versendetAm).toLocaleString("de-DE")}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Titel</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Übersichtsfoto</label>
          <Input
            type="file"
            accept="image/*"
            data-testid="begehung-uebersicht-file"
            disabled={busy}
            onChange={(e) => void uploadUebersicht(e.target.files?.[0] ?? null)}
          />
          {uebersichtFoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic user upload
            <img src={uebersichtFoto} alt="Übersicht" className="mt-2 max-h-40 rounded-md border object-contain" />
          ) : null}
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-muted-foreground">Notizen</label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={protocolMissing} onChange={(e) => setProtocolMissing(e.target.checked)} />
          Protokoll fehlt noch
        </label>
        <div className="space-y-3 md:col-span-2">
          <div className="text-sm font-medium">Verteiler</div>
          <p className="text-xs text-muted-foreground">Beteiligte auswählen und bei Bedarf weitere E-Mail-Adressen ergänzen.</p>
          <div className="space-y-2 rounded-md border p-3">
            {participants.map((p) => {
              const em = (p.contactEmail ?? "").trim();
              const row = verteiler.find((v) => v.email === em);
              const checked = row ? row.send !== false : false;
              return (
                <label key={p.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!em}
                    checked={em ? checked : false}
                    onChange={(e) => em && toggleVerteilerEmail(em, e.target.checked)}
                    data-testid={`begehung-vt-${p.id}`}
                  />
                  <span>
                    <span className="font-medium">{p.contactName ?? "—"}</span>
                    {em ? <span className="text-muted-foreground"> · {em}</span> : <span className="text-muted-foreground"> (keine E-Mail)</span>}
                    <span className="block text-xs text-muted-foreground">{p.orgName ?? ""} · {p.roleInProject}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Name (optional)" value={manualName} onChange={(e) => setManualName(e.target.value)} className="max-w-[200px]" />
            <Input placeholder="E-Mail" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="max-w-[240px]" />
            <Button type="button" size="sm" variant="secondary" onClick={addManualVerteiler}>
              E-Mail hinzufügen
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Ausgewählte Einträge: {verteiler.filter((v) => v.send !== false).length} / {verteiler.length}
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="button" disabled={busy} onClick={() => void saveMeta()}>
            Stammdaten und Verteiler speichern
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mängel</h2>
          <Button type="button" size="sm" onClick={() => setMOpen(true)} data-testid="begehung-mangel-open">
            Mangel hinzufügen
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Bild</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Baustein</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {begehung.mangels.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.fotoUrl} alt="" className="h-12 w-12 rounded object-cover" />
                </TableCell>
                <TableCell className="max-w-[280px] text-sm">{m.beschreibung}</TableCell>
                <TableCell className="text-xs">{m.textbausteinName ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void removeMangel(m.id)}>
                    Löschen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={mOpen} onOpenChange={setMOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mangel erfassen</DialogTitle>
          </DialogHeader>
          <div
            className={`rounded-md border border-dashed p-6 text-center text-sm ${mDrag ? "border-primary bg-primary/5" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setMDrag(true);
            }}
            onDragLeave={() => setMDrag(false)}
            onDrop={onDropM}
          >
            Bild per Drag und Drop ablegen oder Datei wählen.
            <Input
              type="file"
              accept="image/*"
              className="mt-3"
              onChange={(e) => setMFile(e.target.files?.[0] ?? null)}
              data-testid="begehung-mangel-file"
            />
            {mFile ? <p className="mt-2 text-xs">{mFile.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={3} data-testid="begehung-mangel-desc" />
          </div>
          <div className="space-y-2">
            <Label>Textbaustein</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={mTb}
              onChange={(e) => setMTb(e.target.value)}
              data-testid="begehung-mangel-tb"
            >
              <option value="">— optional —</option>
              {textbausteine.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" disabled={busy || !mDesc.trim() || !mFile} onClick={() => void addMangelFromModal()} data-testid="begehung-mangel-save">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
