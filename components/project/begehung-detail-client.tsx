"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export function BegehungDetailClient({
  projectId,
  begehung,
  textbausteine,
}: {
  projectId: string;
  begehung: BegehungState;
  textbausteine: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(begehung.title ?? "");
  const [notes, setNotes] = useState(begehung.notes ?? "");
  const [protocolMissing, setProtocolMissing] = useState(begehung.protocolMissing);
  const [uebersichtFoto, setUebersichtFoto] = useState(begehung.uebersichtFoto ?? "");
  const [fotoUrl, setFotoUrl] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [regel, setRegel] = useState("");
  const [tbId, setTbId] = useState("");
  const [busy, setBusy] = useState(false);

  const verteilerJson = useMemo(() => JSON.stringify(begehung.verteiler ?? [], null, 2), [begehung.verteiler]);
  const [verteilerText, setVerteilerText] = useState(verteilerJson);

  async function saveMeta() {
    setBusy(true);
    let verteiler: unknown = begehung.verteiler;
    try {
      verteiler = JSON.parse(verteilerText);
    } catch {
      alert("Verteiler: kein gültiges JSON.");
      setBusy(false);
      return;
    }
    await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        notes: notes || null,
        protocolMissing,
        uebersichtFoto: uebersichtFoto || null,
        verteiler,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  async function addMangel() {
    if (!fotoUrl.trim() || !beschreibung.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}/mangels`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fotoUrl: fotoUrl.trim(),
        beschreibung: beschreibung.trim(),
        regel: regel.trim() || undefined,
        textbausteinId: tbId || undefined,
      }),
    });
    setFotoUrl("");
    setBeschreibung("");
    setRegel("");
    setTbId("");
    setBusy(false);
    router.refresh();
  }

  async function removeMangel(id: string) {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/begehungen/${begehung.id}/mangels/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function pdf() {
    window.open(`/api/projects/${projectId}/begehungen/${begehung.id}/pdf`, "_blank");
    router.refresh();
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void pdf()}>
          PDF-Protokoll
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void sendMail()}>
          Protokoll per E-Mail
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
          <label className="text-xs text-muted-foreground">Übersichtsfoto (URL)</label>
          <Input value={uebersichtFoto} onChange={(e) => setUebersichtFoto(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-muted-foreground">Notizen</label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={protocolMissing} onChange={(e) => setProtocolMissing(e.target.checked)} />
          Protokoll fehlt noch
        </label>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-muted-foreground">Verteiler (JSON-Liste)</label>
          <Textarea rows={6} value={verteilerText} onChange={(e) => setVerteilerText(e.target.value)} className="font-mono text-xs" />
        </div>
        <div className="md:col-span-2">
          <Button type="button" disabled={busy} onClick={() => void saveMeta()}>
            Stammdaten speichern
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Mängel</h2>
        <div className="mb-4 grid gap-3 rounded-md border p-4 md:grid-cols-2">
          <Input placeholder="Foto-URL" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} />
          <Input placeholder="Arbeitsschutzregel (optional)" value={regel} onChange={(e) => setRegel(e.target.value)} />
          <div className="md:col-span-2">
            <Textarea placeholder="Beschreibung" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={tbId} onChange={(e) => setTbId(e.target.value)}>
              <option value="">— Textbaustein —</option>
              {textbausteine.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" disabled={busy} onClick={() => void addMangel()}>
              Mangel hinzufügen
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Regel</TableHead>
              <TableHead>Baustein</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {begehung.mangels.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="max-w-[280px] text-sm">{m.beschreibung}</TableCell>
                <TableCell className="text-xs">{m.regel ?? "—"}</TableCell>
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
    </div>
  );
}
