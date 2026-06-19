"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ProjectStatus, Turnus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type EmployeeOption = { id: string; shortCode: string; displayName: string };

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  siteAddress: string | null;
  status: ProjectStatus;
  turnus: Turnus | null;
  contractualBegehungen: number | null;
  responsibleEmployeeId: string | null;
  client: string | null;
  description: string | null;
  _count?: { tasks: number; begehungen: number; documents: number };
};

const STATUS_OPTS: { value: ProjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "PAUSED", label: "Pausiert" },
  { value: "DONE", label: "Abgeschlossen" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const TURNUS_OPTS: { value: Turnus; label: string }[] = [
  { value: "W", label: "Wöchentlich (W)" },
  { value: "W2", label: "14-tägig (W2)" },
  { value: "W3", label: "3-Wochen (W3)" },
  { value: "ABRUF", label: "Abruf" },
];

function defaultForm(employees: EmployeeOption[]) {
  return {
    name: "",
    siteAddress: "",
    status: "ACTIVE" as ProjectStatus,
    turnus: "W2" as Turnus,
    contractualBegehungen: "4",
    responsibleEmployeeId: employees[0]?.id ?? "",
    client: "",
    description: "",
    code: "",
  };
}

export function ProjectsStammdaten({
  initialProjects,
  employees,
}: {
  initialProjects: ProjectRow[];
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProjectRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(() => defaultForm(employees));

  const empLabel = useMemo(() => {
    const m = new Map(employees.map((e) => [e.id, `${e.shortCode} — ${e.displayName}`] as const));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [employees]);

  function openCreate() {
    setError(null);
    setForm(defaultForm(employees));
    setCreateOpen(true);
  }

  function openEdit(p: ProjectRow) {
    setError(null);
    setForm({
      name: p.name,
      siteAddress: p.siteAddress ?? "",
      status: p.status,
      turnus: (p.turnus ?? "W2") as Turnus,
      contractualBegehungen: String(p.contractualBegehungen ?? 0),
      responsibleEmployeeId: p.responsibleEmployeeId ?? employees[0]?.id ?? "",
      client: p.client ?? "",
      description: p.description ?? "",
      code: p.code,
    });
    setEditRow(p);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          siteAddress: form.siteAddress,
          status: form.status,
          turnus: form.turnus,
          contractualBegehungen: Number(form.contractualBegehungen),
          responsibleEmployeeId: form.responsibleEmployeeId,
          code: form.code.trim() || undefined,
          client: form.client.trim() || null,
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Fehler ${res.status}`);
        return;
      }
      setCreateOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${editRow.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          siteAddress: form.siteAddress,
          status: form.status,
          turnus: form.turnus,
          contractualBegehungen: Number(form.contractualBegehungen),
          responsibleEmployeeId: form.responsibleEmployeeId || null,
          code: form.code.trim(),
          client: form.client.trim() || null,
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Fehler ${res.status}`);
        return;
      }
      setEditRow(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function removeProject(p: ProjectRow) {
    if (!window.confirm(`Projekt „${p.name}“ wirklich löschen?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Fehler ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Alle Projektakte</CardTitle>
            <CardDescription>Öffnen Sie eine Akte für Tabs (Übersicht, Begehungen, Aufgaben, Dokumente, Chronik).</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              data-testid="project-create-open"
              onClick={openCreate}
              disabled={employees.length === 0}
              title={employees.length === 0 ? "Zuerst einen aktiven Mitarbeitenden anlegen" : undefined}
            >
              Neues Projekt
            </Button>
            {error ? <span className="text-sm text-destructive">{error}</span> : null}
          </div>
        </CardHeader>
        <CardContent>
          <CardTable
            projects={initialProjects}
            empLabel={empLabel}
            onEdit={openEdit}
            onDelete={removeProject}
            pending={pending}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>Projekt anlegen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="pc-name">Titel / Bauvorhaben *</Label>
                <Input
                  id="pc-name"
                  data-testid="project-name-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-ort">Ort / Adresse *</Label>
                <Input
                  id="pc-ort"
                  data-testid="project-site-input"
                  value={form.siteAddress}
                  onChange={(e) => setForm((f) => ({ ...f, siteAddress: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <select
                    data-testid="project-status-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                  >
                    {STATUS_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Turnus *</Label>
                  <select
                    data-testid="project-turnus-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.turnus}
                    onChange={(e) => setForm((f) => ({ ...f, turnus: e.target.value as Turnus }))}
                  >
                    {TURNUS_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-vb">Vertragliche Begehungen (Soll) *</Label>
                <Input
                  id="pc-vb"
                  data-testid="project-contractual-input"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.contractualBegehungen}
                  onChange={(e) => setForm((f) => ({ ...f, contractualBegehungen: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Zuständiger Mitarbeiter *</Label>
                <select
                  data-testid="project-responsible-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.responsibleEmployeeId}
                  onChange={(e) => setForm((f) => ({ ...f, responsibleEmployeeId: e.target.value }))}
                  required
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.shortCode} — {e.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-code">Interne Projektnummer (optional)</Label>
                <Input
                  id="pc-code"
                  data-testid="project-code-input"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Leer = automatisch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-client">Auftraggeber (optional)</Label>
                <Input
                  id="pc-client"
                  value={form.client}
                  onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-desc">Beschreibung (optional)</Label>
                <Input id="pc-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" data-testid="project-create-submit" disabled={pending}>
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Projekt bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="pe-name">Titel / Bauvorhaben *</Label>
                <Input
                  id="pe-name"
                  data-testid="project-edit-name-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe-ort">Ort / Adresse *</Label>
                <Input
                  id="pe-ort"
                  data-testid="project-edit-site-input"
                  value={form.siteAddress}
                  onChange={(e) => setForm((f) => ({ ...f, siteAddress: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                  >
                    {STATUS_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Turnus *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.turnus}
                    onChange={(e) => setForm((f) => ({ ...f, turnus: e.target.value as Turnus }))}
                  >
                    {TURNUS_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe-vb">Vertragliche Begehungen *</Label>
                <Input
                  id="pe-vb"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.contractualBegehungen}
                  onChange={(e) => setForm((f) => ({ ...f, contractualBegehungen: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Zuständiger Mitarbeiter *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.responsibleEmployeeId}
                  onChange={(e) => setForm((f) => ({ ...f, responsibleEmployeeId: e.target.value }))}
                  required
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.shortCode} — {e.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe-code">Interne Projektnummer *</Label>
                <Input id="pe-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe-client">Auftraggeber (optional)</Label>
                <Input id="pe-client" value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe-desc">Beschreibung (optional)</Label>
                <Input id="pe-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Abbrechen
              </Button>
              <Button type="submit" data-testid="project-edit-submit" disabled={pending}>
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}

function CardTable({
  projects,
  empLabel,
  onEdit,
  onDelete,
  pending,
}: {
  projects: ProjectRow[];
  empLabel: (id: string | null) => string;
  onEdit: (p: ProjectRow) => void;
  onDelete: (p: ProjectRow) => void;
  pending: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Zuständig</TableHead>
          <TableHead className="text-right">Aufgaben</TableHead>
          <TableHead className="text-right">Begehungen</TableHead>
          <TableHead className="text-right">Dokumente</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => (
          <TableRow key={p.id} data-project-id={p.id}>
            <TableCell className="font-mono text-xs">{p.code}</TableCell>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.status}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{empLabel(p.responsibleEmployeeId)}</TableCell>
            <TableCell className="text-right">{p._count?.tasks ?? "—"}</TableCell>
            <TableCell className="text-right">{p._count?.begehungen ?? "—"}</TableCell>
            <TableCell className="text-right">{p._count?.documents ?? "—"}</TableCell>
            <TableCell className="space-x-2 text-right">
              <Button asChild size="sm" variant="secondary">
                <Link href={`/projects/${p.id}`}>Öffnen</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onEdit(p)} data-testid="project-edit-open">
                Bearbeiten
              </Button>
              <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => onDelete(p)} data-testid="project-delete">
                Löschen
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
