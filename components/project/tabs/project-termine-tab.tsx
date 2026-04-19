"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export type PlanRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  planungStatus: string;
  planungType: string;
  planungSource: string;
  plannedDate: string | null;
  note: string | null;
  employee: { id: string; shortCode: string; displayName: string } | null;
};

type EmployeeOpt = { id: string; shortCode: string; displayName: string };

function formatDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProjectTermineTab({
  projectId,
  projectCode,
  initialUpcoming,
  initialFixedManual,
  employees,
}: {
  projectId: string;
  projectCode: string;
  initialUpcoming: PlanRow[];
  initialFixedManual: PlanRow[];
  employees: EmployeeOpt[];
}) {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [fixed, setFixed] = useState(initialFixedManual);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<PlanRow | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEmp, setNewEmp] = useState("");

  useEffect(() => setUpcoming(initialUpcoming), [initialUpcoming]);
  useEffect(() => setFixed(initialFixedManual), [initialFixedManual]);

  async function reload() {
    const res = await fetch(`/api/projects/${projectId}/planung-entries`);
    if (!res.ok) return;
    const j = (await res.json()) as { upcoming: PlanRow[]; fixedManual: PlanRow[] };
    setUpcoming(
      j.upcoming.map((e) => ({
        ...e,
        plannedDate: e.plannedDate,
        employee: e.employee,
      })),
    );
    setFixed(j.fixedManual);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nächste geplante Begehungen</CardTitle>
          <CardDescription>
            Aus der Wochenplanung (Status nicht „ERLEDIGT“). Projekt {projectCode} in der{" "}
            <Link href="/planung" className="text-primary underline">
              Wochenplanung
            </Link>{" "}
            öffnen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KW</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>SiGeKo</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notiz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((pe) => (
                <TableRow key={pe.id}>
                  <TableCell className="font-medium">
                    KW {pe.isoWeek}/{pe.isoYear}
                  </TableCell>
                  <TableCell>{pe.plannedDate ? new Date(pe.plannedDate).toLocaleDateString("de-DE") : "—"}</TableCell>
                  <TableCell>{pe.employee?.shortCode ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{pe.planungType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{pe.planungStatus}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm">{pe.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feste Termine (manuell)</CardTitle>
          <CardDescription>
            Werden als Planungseinträge mit Typ „FEST“ und Quelle „MANUELL“ gespeichert und in der Planung violett hervorgehoben.
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
                placeholder="z. B. Behörden-Termin"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>SiGeKo (optional)</Label>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KW</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>SiGeKo</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixed.map((pe) => (
                <TableRow key={pe.id}>
                  <TableCell>
                    KW {pe.isoWeek}/{pe.isoYear}
                  </TableCell>
                  <TableCell>{pe.plannedDate ? new Date(pe.plannedDate).toLocaleString("de-DE") : "—"}</TableCell>
                  <TableCell>{pe.employee?.shortCode ?? "—"}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{pe.note ?? "—"}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setEdit(pe)}>
                      Bearbeiten
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDel(pe.id)}>
                      Löschen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Festen Termin bearbeiten</DialogTitle>
            <DialogDescription>Datum, Beschreibung und Zuständigkeit anpassen.</DialogDescription>
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
            <DialogTitle>Termin löschen?</DialogTitle>
            <DialogDescription>Der Planungseintrag wird dauerhaft entfernt.</DialogDescription>
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
