"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MangelRow = {
  id: string;
  fotoUrl: string;
  beschreibung: string;
  textbaustein: { id: string; name: string } | null;
};

type TbOpt = { id: string; name: string; kategorie: string };

type VEntry = { name: string; email: string; gewerk?: string; send?: boolean; manual?: boolean };

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function BegehungProtokollClient({
  begehungId,
  initialMangels,
  textbausteine,
  initialVerteiler,
  participantSuggestions,
  uebersichtFoto,
  protokollPdf,
  versendetAm,
}: {
  begehungId: string;
  initialMangels: MangelRow[];
  textbausteine: TbOpt[];
  initialVerteiler: VEntry[];
  participantSuggestions: VEntry[];
  uebersichtFoto: string | null;
  protokollPdf: string | null;
  versendetAm: string | null;
}) {
  const router = useRouter();
  const [mangels, setMangels] = useState(initialMangels);
  const [foto, setFoto] = useState(uebersichtFoto);
  const [pdfPath, setPdfPath] = useState(protokollPdf);
  const [sent, setSent] = useState(versendetAm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [mOpen, setMOpen] = useState(false);
  const [mDesc, setMDesc] = useState("");
  const [mTb, setMTb] = useState("");
  const [mFile, setMFile] = useState<File | null>(null);

  const verteilerState = useMemo(() => {
    if (initialVerteiler.length) return initialVerteiler;
    return participantSuggestions.map((p) => ({ ...p, send: true }));
  }, [initialVerteiler, participantSuggestions]);
  const [verteiler, setVerteiler] = useState<VEntry[]>(verteilerState);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");

  async function uploadUebersicht(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("role", "overview");
      const res = await fetch(`/api/begehungen/${begehungId}/upload-foto`, { method: "POST", body: fd });
      if (!res.ok) {
        setMsg("Upload fehlgeschlagen");
        return;
      }
      const j = (await res.json()) as { url: string };
      setFoto(j.url);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveVerteiler() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/begehungen/${begehungId}/verteiler`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: verteiler }),
      });
      setMsg(res.ok ? "Verteiler gespeichert." : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function addMangel() {
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set(
        "file",
        mFile ?? new File([tinyPng], "m.png", { type: "image/png" }),
      );
      fd.set("role", "mangel");
      const up = await fetch(`/api/begehungen/${begehungId}/upload-foto`, { method: "POST", body: fd });
      if (!up.ok) {
        setMsg("Mangel-Bild-Upload fehlgeschlagen");
        return;
      }
      const uj = (await up.json()) as { url: string };
      const fotoUrl = uj.url;

      const res = await fetch(`/api/begehungen/${begehungId}/add-mangel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fotoUrl,
          beschreibung: mDesc.trim(),
          textbausteinId: mTb || undefined,
        }),
      });
      if (!res.ok) {
        setMsg("Mangel speichern fehlgeschlagen");
        return;
      }
      const row = (await res.json()) as MangelRow;
      setMangels((prev) => [{ ...row, textbaustein: textbausteine.find((t) => t.id === mTb) ?? null }, ...prev]);
      setMOpen(false);
      setMDesc("");
      setMTb("");
      setMFile(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function generatePdf() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/begehungen/${begehungId}/generate-pdf`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "PDF fehlgeschlagen");
        return;
      }
      setPdfPath(j.path ?? null);
      setMsg("PDF erzeugt.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendMail() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/begehungen/${begehungId}/send`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "Versand fehlgeschlagen");
        return;
      }
      setSent(new Date().toISOString());
      setMsg("Protokoll versendet.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function toggleSend(i: number) {
    setVerteiler((prev) => prev.map((e, idx) => (idx === i ? { ...e, send: !(e.send !== false) } : e)));
  }

  function addManual() {
    const em = manualEmail.trim();
    if (!em) return;
    setVerteiler((prev) => [...prev, { name: manualName.trim() || em, email: em, send: true, manual: true }]);
    setManualEmail("");
    setManualName("");
  }

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Übersichtsfoto</CardTitle>
          <CardDescription>Foto der Baustelle für den Protokollkopf.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            data-testid="proto-uebersicht-file"
            type="file"
            accept="image/*"
            className="max-w-xs"
            onChange={(e) => void uploadUebersicht(e.target.files?.[0] ?? null)}
          />
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Übersicht" className="h-24 rounded border object-cover" width={120} height={96} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mängel</CardTitle>
            <CardDescription>Erfassung mit Bild und Textbaustein.</CardDescription>
          </div>
          <Button type="button" variant="secondary" data-testid="proto-mangel-open" onClick={() => setMOpen(true)}>
            Neuen Mangel
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {mangels.map((m) => (
            <div key={m.id} className="flex gap-2 rounded-md border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.fotoUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" width={64} height={64} />
              <div className="min-w-0 text-sm">
                <div className="font-medium">{m.beschreibung}</div>
                {m.textbaustein ? <div className="text-xs text-muted-foreground">TB: {m.textbaustein.name}</div> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verteiler</CardTitle>
          <CardDescription>Empfänger auswählen und speichern.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {verteiler.map((v, i) => (
            <label key={`${v.email}-${i}`} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={v.send !== false} onChange={() => toggleSend(i)} />
              <span className="truncate">
                {v.name} · {v.email}
                {v.gewerk ? ` · ${v.gewerk}` : ""}
              </span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Input placeholder="Name (optional)" value={manualName} onChange={(e) => setManualName(e.target.value)} className="max-w-[200px]" />
            <Input placeholder="E-Mail" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="max-w-[240px]" />
            <Button type="button" variant="outline" size="sm" onClick={addManual}>
              Hinzufügen
            </Button>
          </div>
          <Button type="button" data-testid="proto-verteiler-save" onClick={() => void saveVerteiler()} disabled={busy}>
            Verteiler speichern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF & Versand</CardTitle>
          <CardDescription>@react-pdf/renderer, zweispaltige Mängeltabelle.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" data-testid="proto-pdf-gen" onClick={() => void generatePdf()} disabled={busy}>
            PDF generieren
          </Button>
          {pdfPath ? (
            <a className="text-sm text-primary underline" href={pdfPath} data-testid="proto-pdf-link">
              Download PDF
            </a>
          ) : null}
          <Button type="button" data-testid="proto-send" variant="secondary" onClick={() => void sendMail()} disabled={busy || !pdfPath}>
            Protokoll versenden
          </Button>
          {sent ? <span className="text-xs text-muted-foreground">Versendet: {new Date(sent).toLocaleString("de-DE")}</span> : null}
        </CardContent>
      </Card>

      <Dialog open={mOpen} onOpenChange={setMOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Mangel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Bild</Label>
              <Input type="file" accept="image/*" data-testid="proto-mangel-file" onChange={(e) => setMFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={3} data-testid="proto-mangel-desc" />
            </div>
            <div className="space-y-1.5">
              <Label>Textbaustein</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={mTb}
                onChange={(e) => setMTb(e.target.value)}
                data-testid="proto-mangel-tb"
              >
                <option value="">—</option>
                {textbausteine.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.kategorie})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" data-testid="proto-mangel-save" disabled={!mDesc.trim() || busy} onClick={() => void addMangel()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
