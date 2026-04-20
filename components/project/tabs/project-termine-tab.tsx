"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PlanRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  planungStatus: string;
  planungType: string;
  planungSource: string;
  plannedDate: string | null;
  note: string | null;
  priority: number;
  conflict: boolean;
  begehungSollNummer: number | null;
  begehungIstNummer: number | null;
  employee: { id: string; shortCode: string; displayName: string } | null;
};

type EmployeeOpt = { id: string; shortCode: string; displayName: string };

function formatDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function typeLabel(planungType: string, planungSource: string) {
  if (planungType === "FEST") return "Fest";
  if (planungType === "VERTRETUNG") return "Vertretung";
  if (planungType === "VERSCHOBEN") return "Verschoben";
  if (planungSource === "TURNUS") return "Turnus";
  if (planungSource === "MANUELL" && planungType === "REGULAER") return "Manuell";
  return planungType;
}

function statusStyle(status: string, conflict: boolean, planungType: string) {
  if (conflict) return "border border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100";
  if (planungType === "FEST") return "border border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100";
  switch (status) {
    case "ERLEDIGT":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
    case "GEPLANT":
    case "BESTAETIGT":
      return "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100";
    case "RUECKMELDUNG_OFFEN":
    case "PROTOKOLL_OFFEN":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "PAUSIERT":
      return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
    default:
      return "bg-muted text-foreground";
  }
}

function canDeleteFest(row: PlanRow) {
  return row.planungType === "FEST" && row.planungSource === "MANUELL";
}

function canEditRow(row: PlanRow) {
  return row.planungSource === "MANUELL";
}

export function ProjectTermineTab({
  projectId,
  projectCode,
  contractualBegehungen,
  initialEntries,
  employees,
}: {
  projectId: string;
  projectCode: string;
  contractualBegehungen: number | null;
  initialEntries: PlanRow[];
  employees: EmployeeOpt[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<PlanRow | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEmp, setNewEmp] = useState("");

  useEffect(() => setEntries(initialEntries), [initialEntries]);

  const soll = contractualBegehungen ?? "—";

  async function reload() {
    const res = await fetch(`/api/projects/${projectId}/planung-entries`);
    if (!res.ok) return;
    const j = (await res.json()) as { entries: PlanRow[] };
    setEntries(
      j.entries.map((e) => ({
        ...e,
        plannedDate: e.plannedDate,
        employee: e.employee,
      })),
    );
    router.refresh();
  }

  async function createFixed() {
    if (!newDate || !newDesc.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/planung-entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plannedDate: new Date(newDate).toISOString(),
          description: newDesc.trim(),
          employeeId: newEmp || null,
        }),
      });
      if (res.ok) {
        setNewDate("");
        setNewDesc("");
        setNewEmp("");
        await reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/planung/${edit.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plannedDate: edit.plannedDate ? new Date(edit.plannedDate).toISOString() : null,
          note: edit.note,
          employeeId: edit.employee?.id ?? null,
        }),
      });
      if (res.ok) {
        setEdit(null);
        await reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/planung/${del}`, { method: "DELETE" });
      if (res.ok) {
        setDel(null);
        await reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const planungHref = useMemo(() => {
    return (row: PlanRow) =>
      `/planung?isoYear=${encodeURIComponent(String(row.isoYear))}&isoWeek=${encodeURIComponent(String(row.isoWeek))}&projectId=${encodeURIComponent(projectId)}`;
  }, [projectId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Termine &amp; Planung</CardTitle>
          <CardDescription>
            Aktive Planungseinträge (ohne erledigt/abgesagt). Fester Termin blockiert Turnus-Vorschläge derselben KW (
            <span className="font-medium">Priorität: Fest &gt; Vertretung &gt; Turnus &gt; manuell</span>
            ). Projekt {projectCode} in der{" "}
            <Link href="/planung" className="text-primary underline">
              Wochenplanung
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KW</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>SiGeKo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Begehung #</TableHead>
                <TableHead>Notiz</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">
                    Keine offenen Termine.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((pe) => (
                  <TableRow key={pe.id} data-testid={`plan-entry-row-${pe.id}`}>
                    <TableCell className="font-medium">
                      KW {pe.isoWeek}/{pe.isoYear}
                    </TableCell>
                    <TableCell>{pe.plannedDate ? new Date(pe.plannedDate).toLocaleString("de-DE") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(pe.planungType, pe.planungSource)}</Badge>
                    </TableCell>
                    <TableCell>{pe.employee ? `${pe.employee.shortCode} · ${pe.employee.displayName}` : "—"}</TableCell>
                    <TableCell>
                      <Badge className={cn("font-normal", statusStyle(pe.planungStatus, pe.conflict, pe.planungType))}>
                        {pe.planungStatus}
                        {pe.conflict ? " · Konflikt" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pe.begehungIstNummer != null || pe.begehungSollNummer != null
                        ? `${pe.begehungIstNummer ?? "—"} / ${pe.begehungSollNummer ?? soll}`
                        : `— / ${soll}`}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">{pe.note ?? "—"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={planungHref(pe)} data-testid={`plan-entry-planung-link-${pe.id}`}>
                          Wochenplanung
                        </Link>
                      </Button>
                      {canEditRow(pe) ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => setEdit(pe)} data-testid={`plan-entry-edit-${pe.id}`}>
                          Bearbeiten
                        </Button>
                      ) : null}
                      {canDeleteFest(pe) ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setDel(pe.id)} data-testid={`plan-entry-delete-${pe.id}`}>
                          Löschen
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fester Termin (manuell)</CardTitle>
          <CardDescription>
            Wird als <code className="rounded bg-muted px-1">PlanungType=FEST</code>, Quelle MANUELL mit höchster Priorität gespeichert (siehe{" "}
            <code className="rounded bg-muted px-1">PLANUNG_PRIORITY.FEST</code> in der Turnus-Engine).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Datum / Uhrzeit</Label>
              <Input
                data-testid="fest-termin-datetime"
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Beschreibung</Label>
              <Input
                data-testid="fest-termin-beschreibung"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="z. B. Startgespräch mit Bauherrn"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>SiGeKo</Label>
              <select
                data-testid="fest-termin-employee"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newEmp}
                onChange={(e) => setNewEmp(e.target.value)}
              >
                <option value="">—</option>
                {employees.map((em) => (
                  <option key={em.id} value={em.id}>
                    {em.shortCode} — {em.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button
                data-testid="fest-termin-submit"
                type="button"
                disabled={busy || !newDate || !newDesc.trim()}
                onClick={() => void createFixed()}
              >
                Festen Termin anlegen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Termin bearbeiten</DialogTitle>
            <DialogDescription>Nur manuelle / feste Einträge (keine reinen Turnus-Vorschläge).</DialogDescription>
          </DialogHeader>
          {edit ? (
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="datetime-local"
                  value={edit.plannedDate ? formatDatetimeLocal(new Date(edit.plannedDate)) : ""}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      plannedDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input value={edit.note ?? ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SiGeKo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={edit.employee?.id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const em = employees.find((x) => x.id === id);
                    setEdit({ ...edit, employee: em ?? null });
                  }}
                >
                  <option value="">—</option>
                  {employees.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.shortCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEdit(null)}>
              Abbrechen
            </Button>
            <Button type="button" disabled={busy} onClick={() => void saveEdit()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={del !== null} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Festen Termin löschen?</DialogTitle>
            <DialogDescription>Nur manuell angelegte feste Termine können entfernt werden.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDel(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
