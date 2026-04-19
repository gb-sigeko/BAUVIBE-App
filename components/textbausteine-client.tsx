"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; name: string; kategorie: string; inhalt: string };

export function TextbausteineClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [kategorie, setKategorie] = useState("mangel");
  const [inhalt, setInhalt] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await fetch("/api/textbausteine");
    if (res.ok) setRows(await res.json());
  }

  async function create() {
    if (!name.trim() || !inhalt.trim()) return;
    setBusy(true);
    await fetch("/api/textbausteine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), kategorie, inhalt: inhalt.trim() }),
    });
    setName("");
    setInhalt("");
    setBusy(false);
    await reload();
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Textbaustein löschen?")) return;
    setBusy(true);
    await fetch(`/api/textbausteine/${id}`, { method: "DELETE" });
    setBusy(false);
    await reload();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Kategorie</label>
          <Input value={kategorie} onChange={(e) => setKategorie(e.target.value)} placeholder="mangel, email_betreff, …" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-muted-foreground">Inhalt (Platzhalter z. B. {"{{projektname}}"})</label>
          <Textarea rows={4} value={inhalt} onChange={(e) => setInhalt(e.target.value)} />
        </div>
        <Button type="button" disabled={busy} onClick={() => void create()}>
          Anlegen
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kategorie</TableHead>
            <TableHead>Inhalt</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.kategorie}</TableCell>
              <TableCell className="max-w-md truncate text-xs text-muted-foreground">{r.inhalt}</TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void remove(r.id)}>
                  Löschen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
