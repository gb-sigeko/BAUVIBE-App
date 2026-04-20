"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
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

type OrgSearchHit = { id: string; name: string };

const ROLE_PRESETS = ["Bauherr", "Architekt", "Bauleiter", "Fachplaner", "Behörde", "Nachunternehmer", "Auftraggeber", "Sonstige"];

export function ProjectBeteiligteTab({ projectId, initialRows }: { projectId: string; initialRows: BeteiligterRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [openAdd, setOpenAdd] = useState(false);
  const [addMode, setAddMode] = useState<"contact" | "organization">("contact");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ContactSearchHit[]>([]);
  const [orgQ, setOrgQ] = useState("");
  const [orgHits, setOrgHits] = useState<OrgSearchHit[]>([]);
  const [selected, setSelected] = useState<ContactSearchHit | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrgSearchHit | null>(null);
  const [role, setRole] = useState("");
  const [main, setMain] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<BeteiligterRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editMain, setEditMain] = useState(false);
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");

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
        validFrom: typeof r.validFrom === "string" ? r.validFrom : new Date(r.validFrom as unknown as string).toISOString(),
        validTo: r.validTo ? (typeof r.validTo === "string" ? r.validTo : new Date(r.validTo as unknown as string).toISOString()) : null,
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

  async function searchOrganizations(term: string) {
    if (!term.trim()) {
      setOrgHits([]);
      return;
    }
    const res = await fetch(`/api/organizations?q=${encodeURIComponent(term)}`);
    if (!res.ok) return;
    const raw = (await res.json()) as Array<{ id: string; name: string }>;
    setOrgHits(raw.map((o) => ({ id: o.id, name: o.name })));
  }

  async function addParticipant() {
    if (!role.trim()) return;
    if (addMode === "contact" && !selected) return;
    if (addMode === "organization" && !selectedOrg) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          addMode === "contact"
            ? {
                contactPersonId: selected!.id,
                organizationId: selected!.organization?.id ?? null,
                role: role.trim(),
                isMainContact: main,
                validFrom: validFrom ? new Date(validFrom).toISOString() : null,
                validUntil: validUntil ? new Date(validUntil).toISOString() : null,
              }
            : {
                organizationId: selectedOrg!.id,
                contactPersonId: null,
                role: role.trim(),
                isMainContact: main,
                validFrom: validFrom ? new Date(validFrom).toISOString() : null,
                validUntil: validUntil ? new Date(validUntil).toISOString() : null,
              },
        ),
      });
      if (res.ok) {
        setOpenAdd(false);
        setSelected(null);
        setSelectedOrg(null);
        setRole("");
        setMain(false);
        setValidFrom("");
        setValidUntil("");
        setQ("");
        setOrgQ("");
        setHits([]);
        setOrgHits([]);
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

  async function saveEdit() {
    if (!editRow) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/contacts/${editRow.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: editRole.trim(),
          isMainContact: editMain,
          validFrom: editValidFrom ? new Date(editValidFrom).toISOString() : undefined,
          validUntil: editValidUntil ? new Date(editValidUntil).toISOString() : null,
        }),
      });
      setEditRow(null);
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

  function openEdit(pp: BeteiligterRow) {
    setEditRow(pp);
    setEditRole(pp.roleInProject);
    setEditMain(pp.isPrimary);
    const vf = new Date(pp.validFrom);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditValidFrom(`${vf.getFullYear()}-${pad(vf.getMonth() + 1)}-${pad(vf.getDate())}T${pad(vf.getHours())}:${pad(vf.getMinutes())}`);
    if (pp.validTo) {
      const vt = new Date(pp.validTo);
      setEditValidUntil(`${vt.getFullYear()}-${pad(vt.getMonth() + 1)}-${pad(vt.getDate())}T${pad(vt.getHours())}:${pad(vt.getMinutes())}`);
    } else {
      setEditValidUntil("");
    }
  }

  function displayName(pp: BeteiligterRow) {
    if (pp.contactPerson) return pp.contactPerson.name;
    if (pp.organization) return pp.organization.name;
    return "—";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Beteiligte</CardTitle>
          <CardDescription>
            Rollen, Hauptansprechpartner (max. einer pro Projekt) und Gültigkeit. Kontakte und Organisationen aus der{" "}
            <Link className="text-primary underline" href="/kontakte">
              Datenbank
            </Link>
            .
          </CardDescription>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button size="sm" type="button" data-testid="beteiligte-add-open">
              Hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Beteiligten hinzufügen</DialogTitle>
              <DialogDescription>Kontakt oder reine Organisation zuordnen.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 py-2">
              <Button type="button" size="sm" variant={addMode === "contact" ? "secondary" : "outline"} onClick={() => setAddMode("contact")}>
                Kontakt
              </Button>
              <Button
                type="button"
                size="sm"
                variant={addMode === "organization" ? "secondary" : "outline"}
                onClick={() => setAddMode("organization")}
              >
                Organisation
              </Button>
            </div>
            {addMode === "contact" ? (
              <div className="grid gap-3 py-2">
                <div className="space-y-2">
                  <Label>Suche Kontakt</Label>
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
              </div>
            ) : (
              <div className="grid gap-3 py-2">
                <div className="space-y-2">
                  <Label>Suche Organisation</Label>
                  <Input
                    placeholder="Firmenname"
                    value={orgQ}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOrgQ(v);
                      void searchOrganizations(v);
                    }}
                  />
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
                  {orgHits.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">Suchbegriff eingeben.</p>
                  ) : (
                    orgHits.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className={`flex w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${selectedOrg?.id === h.id ? "bg-muted" : ""}`}
                        onClick={() => setSelectedOrg(h)}
                      >
                        {h.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Rolle im Projekt</Label>
              <Input
                list="role-presets"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="z. B. Bauherr"
                data-testid="beteiligte-role-input"
              />
              <datalist id="role-presets">
                {ROLE_PRESETS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="add-main"
                type="checkbox"
                checked={main}
                onChange={(e) => setMain(e.target.checked)}
                className="h-4 w-4 rounded border"
                data-testid="beteiligte-main-checkbox"
              />
              <Label htmlFor="add-main" className="text-sm font-normal">
                Hauptansprechpartner (setzt andere zurück)
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
            <DialogFooter>
              <Button
                type="button"
                disabled={busy || !role.trim() || (addMode === "contact" && !selected) || (addMode === "organization" && !selectedOrg)}
                data-testid="beteiligte-add-save"
                onClick={() => void addParticipant()}
              >
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
              <TableHead>Name</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="w-[100px] text-center">Haupt</TableHead>
              <TableHead>Gültigkeit</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((pp) => (
              <TableRow key={pp.id} data-testid={`beteiligte-row-${pp.id}`}>
                <TableCell className="font-medium">
                  {pp.contactPerson ? (
                    <Link className="text-primary underline" href={`/kontakte?contact=${pp.contactPerson.id}`}>
                      {pp.contactPerson.name}
                    </Link>
                  ) : pp.organization ? (
                    <span>{pp.organization.name}</span>
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
                <TableCell className="space-x-1 text-right">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Bearbeiten" onClick={() => openEdit(pp)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
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

        <Dialog open={editRow !== null} onOpenChange={(o) => !o && setEditRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Beteiligten bearbeiten</DialogTitle>
              <DialogDescription>{editRow ? displayName(editRow) : null}</DialogDescription>
            </DialogHeader>
            {editRow ? (
              <div className="grid gap-3 py-2">
                <div className="space-y-2">
                  <Label>Rolle</Label>
                  <Input list="role-presets-edit" value={editRole} onChange={(e) => setEditRole(e.target.value)} data-testid="beteiligte-edit-role" />
                  <datalist id="role-presets-edit">
                    {ROLE_PRESETS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-main"
                    type="checkbox"
                    checked={editMain}
                    onChange={(e) => setEditMain(e.target.checked)}
                    className="h-4 w-4 rounded border"
                  />
                  <Label htmlFor="edit-main" className="text-sm font-normal">
                    Hauptansprechpartner
                  </Label>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Gültig ab</Label>
                    <Input type="datetime-local" value={editValidFrom} onChange={(e) => setEditValidFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Gültig bis</Label>
                    <Input type="datetime-local" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Abbrechen
              </Button>
              <Button type="button" disabled={busy || !editRole.trim()} onClick={() => void saveEdit()}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Beteiligten entfernen?</DialogTitle>
              <DialogDescription>Diese Verknüpfung wird gelöscht. Stammdaten bleiben erhalten.</DialogDescription>
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
