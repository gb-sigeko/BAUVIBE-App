"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type BeteiligterRow = {
  id: string;
  roleInProject: string;
  isPrimary: boolean;
  validFrom: string;
  validTo: string | null;
  organization: { id: string; name: string } | null;
  contactPerson: { id: string; name: string } | null;
};

type ContactSearchHit = {
  id: string;
  name: string;
  organization: { id: string; name: string } | null;
};

export function ProjectBeteiligteTab({ projectId, initialRows }: { projectId: string; initialRows: BeteiligterRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [openAdd, setOpenAdd] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ContactSearchHit[]>([]);
  const [selected, setSelected] = useState<ContactSearchHit | null>(null);
  const [role, setRole] = useState("");
  const [main, setMain] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  async function reload() {
    const res = await fetch(`/api/projects/${projectId}/contacts`);
    if (!res.ok) return;
    const data = (await res.json()) as Array<{
      id: string;
      roleInProject: string;
      isPrimary: boolean;
      validFrom: string;
      validTo: string | null;
      organization: { id: string; name: string } | null;
      contactPerson: { id: string; name: string } | null;
    }>;
    setRows(
      data.map((r) => ({
        id: r.id,
        roleInProject: r.roleInProject,
        isPrimary: r.isPrimary,
        validFrom: r.validFrom,
        validTo: r.validTo,
        organization: r.organization,
        contactPerson: r.contactPerson,
      })),
    );
    router.refresh();
  }

  async function searchContacts(term: string) {
    const res = await fetch(`/api/contacts?q=${encodeURIComponent(term)}`);
    if (!res.ok) return;
    const raw = (await res.json()) as Array<{
      id: string;
      name: string;
      organization: { id: string; name: string } | null;
    }>;
    setHits(raw.map((c) => ({ id: c.id, name: c.name, organization: c.organization })));
  }

  async function addParticipant() {
    if (!selected || !role.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contactPersonId: selected.id,
          organizationId: selected.organization?.id ?? null,
          role: role.trim(),
          isMainContact: main,
          validFrom: validFrom ? new Date(validFrom).toISOString() : null,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        }),
      });
      if (res.ok) {
        setOpenAdd(false);
        setSelected(null);
        setRole("");
        setMain(false);
        setValidFrom("");
        setValidUntil("");
        setQ("");
        setHits([]);
        await reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(participantId: string) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/contacts/${participantId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isMainContact: true }),
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeParticipant(participantId: string) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/contacts/${participantId}`, { method: "DELETE" });
      setDeleteId(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Beteiligte</CardTitle>
          <CardDescription>
            Rollen, Hauptansprechpartner und Gültigkeit. Kontakte stammen aus der{" "}
            <Link className="text-primary underline" href="/kontakte">
              Kontaktdatenbank
            </Link>
            .
          </CardDescription>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button size="sm" type="button">
              Hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Beteiligten hinzufügen</DialogTitle>
              <DialogDescription>Kontakt suchen und Rolle vergeben.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Suche</Label>
                <Input
                  placeholder="Name, E-Mail oder Telefon"
                  value={q}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQ(v);
                    void searchContacts(v);
                  }}
                />
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
                {hits.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">Tippe mindestens ein Zeichen, um zu suchen.</p>
                ) : (
                  hits.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className={`flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${
                        selected?.id === h.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelected(h)}
                    >
                      <span className="font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground">{h.organization?.name ?? "Ohne Organisation"}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <Label>Rolle im Projekt</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="z. B. Bauherr" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="add-main"
                  type="checkbox"
                  checked={main}
                  onChange={(e) => setMain(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="add-main" className="text-sm font-normal">
                  Hauptansprechpartner
                </Label>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Gültig ab (optional)</Label>
                  <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gültig bis (optional)</Label>
                  <Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" disabled={busy || !selected || !role.trim()} onClick={() => void addParticipant()}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kontakt</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="w-[100px] text-center">Haupt</TableHead>
              <TableHead>Gültigkeit</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((pp) => (
              <TableRow key={pp.id}>
                <TableCell className="font-medium">
                  {pp.contactPerson ? (
                    <Link className="text-primary underline" href={`/kontakte?contact=${pp.contactPerson.id}`}>
                      {pp.contactPerson.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{pp.organization?.name ?? "—"}</TableCell>
                <TableCell>{pp.roleInProject}</TableCell>
                <TableCell className="text-center">
                  <Button
                    type="button"
                    size="icon"
                    variant={pp.isPrimary ? "secondary" : "ghost"}
                    className="h-8 w-8"
                    disabled={busy || pp.isPrimary}
                    title={pp.isPrimary ? "Hauptansprechpartner" : "Als Haupt markieren"}
                    onClick={() => void setPrimary(pp.id)}
                  >
                    <Star className={`h-4 w-4 ${pp.isPrimary ? "fill-amber-400 text-amber-500" : ""}`} />
                  </Button>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(pp.validFrom).toLocaleDateString("de-DE")}
                  {pp.validTo ? ` – ${new Date(pp.validTo).toLocaleDateString("de-DE")}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Beteiligten entfernen"
                    onClick={() => setDeleteId(pp.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Beteiligten entfernen?</DialogTitle>
              <DialogDescription>Diese Verknüpfung wird gelöscht. Der Kontakt bleibt in der Datenbank.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
                Abbrechen
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => deleteId && void removeParticipant(deleteId)}>
                Entfernen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
