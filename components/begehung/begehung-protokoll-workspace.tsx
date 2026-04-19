"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Textbaustein = { id: string; name: string; kategorie: string; inhalt: string };
type MangelRow = { id: string; beschreibung: string; fotoUrl: string; regel: string | null; textbausteinId: string | null };
type ContactRow = { id: string; name: string; email: string | null; organizationName: string | null };

export function BegehungProtokollWorkspace({
  projectId,
  begehungId,
  initialTitle,
  initialNotes,
  initialFoto,
  initialVerteiler,
  mangels,
  textbausteine,
  contacts,
}: {
  projectId: string;
  begehungId: string;
  initialTitle: string | null;
  initialNotes: string | null;
  initialFoto: string | null;
  initialVerteiler: { contactPersonId: string; name: string; email: string | null; selected: boolean }[];
  mangels: MangelRow[];
  textbausteine: Textbaustein[];
  contacts: ContactRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [foto, setFoto] = useState(initialFoto ?? "");
  const [verteiler, setVerteiler] = useState(initialVerteiler);
  const [desc, setDesc] = useState("");
  const [tbId, setTbId] = useState<string>("");
  const [pending, setPending] = useState(false);

  const pdfUrl = `/api/projects/${projectId}/begehungen/${begehungId}/pdf`;

  const verteilerPayload = useMemo(
    () =>
      verteiler
        .filter((v) => v.selected && v.email)
        .map((v) => ({ contactPersonId: v.contactPersonId, name: v.name, email: v.email })),
    [verteiler],
  );

  async function saveVerteiler() {
    setPending(true);
    try {
      await fetch(`/api/projects/${projectId}/begehungen/${begehungId}/verteiler`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verteiler: verteilerPayload }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function uploadFoto(file: File | null) {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setPending(true);
    try {
      await fetch(`/api/projects/${projectId}/begehungen/${begehungId}/upload-foto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      setFoto(dataUrl);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function addMangel() {
    if (!desc.trim()) return;
    setPending(true);
    try {
      const placeholder = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      await fetch(`/api/projects/${projectId}/begehungen/${begehungId}/mangels`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          beschreibung: desc,
          fotoUrl: placeholder,
          textbausteinId: tbId || null,
        }),
      });
      setDesc("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function patchBegehung() {
    setPending(true);
    try {
      await fetch(`/api/projects/${projectId}/begehungen/${begehungId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function sendFirst() {
    const first = verteilerPayload[0];
    if (!first?.email) return;
    setPending(true);
    try {
      await fetch(`/api/projects/${projectId}/begehungen/${begehungId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: first.email, includePdf: true }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Begehungsprotokoll</h1>
          <p className="text-sm text-muted-foreground">
            Projekt:{" "}
            <Link className="text-primary underline" href={`/projects/${projectId}`}>
              Zur Projektakte
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              PDF erzeugen / laden
            </a>
          </Button>
          <Button type="button" disabled={pending || !verteilerPayload.length} onClick={sendFirst}>
            PDF testweise an ersten Verteiler
          </Button>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Stammdaten</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notizen</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={patchBegehung}>
          Speichern
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Übersichtsfoto</h2>
        <Input type="file" accept="image/*" onChange={(e) => uploadFoto(e.target.files?.[0] ?? null)} />
        {foto ? <p className="text-xs text-muted-foreground">Foto gesetzt ({foto.slice(0, 28)}…)</p> : null}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Verteiler (Projektkontakte)</h2>
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Projektkontakte – bitte im Tab Beteiligte anlegen.</p>
          ) : (
            contacts.map((c) => {
              const row = verteiler.find((v) => v.contactPersonId === c.id);
              const checked = row?.selected ?? false;
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setVerteiler((prev) => {
                        const other = prev.filter((x) => x.contactPersonId !== c.id);
                        return [
                          ...other,
                          {
                            contactPersonId: c.id,
                            name: c.name,
                            email: c.email,
                            selected: e.target.checked,
                          },
                        ];
                      });
                    }}
                  />
                  <span>
                    {c.name} {c.organizationName ? `(${c.organizationName})` : ""} — {c.email ?? "ohne E-Mail"}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={saveVerteiler}>
          Verteiler speichern
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Mängel</h2>
        <ul className="space-y-2 text-sm">
          {mangels.map((m) => (
            <li key={m.id} className="rounded border p-2">
              {m.beschreibung}
            </li>
          ))}
        </ul>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Textbaustein</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tbId}
              onChange={(e) => setTbId(e.target.value)}
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
        <Button type="button" size="sm" disabled={pending} onClick={addMangel}>
          Mangel hinzufügen
        </Button>
      </section>
    </div>
  );
}
