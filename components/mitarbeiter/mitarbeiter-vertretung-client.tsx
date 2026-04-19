"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Emp = { id: string; shortCode: string; displayName: string };
type SubRow = {
  id: string;
  coveredEmployeeId: string;
  delegateEmployeeId: string;
  startsOn: string;
  endsOn: string;
  note: string | null;
  priority: number | null;
  affectedProjectIds: unknown;
  delegateEmployee: Emp;
};

export function MitarbeiterVertretungClient({
  coveredEmployeeId,
  employees,
  initialAsCovered,
}: {
  coveredEmployeeId: string;
  employees: Emp[];
  initialAsCovered: SubRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialAsCovered);
  const [delegateId, setDelegateId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [priority, setPriority] = useState("");
  const [note, setNote] = useState("");
  const [projectIds, setProjectIds] = useState("");
  const [busy, setBusy] = useState(false);

  const choices = useMemo(() => employees.filter((e) => e.id !== coveredEmployeeId), [employees, coveredEmployeeId]);

  async function refresh() {
    const res = await fetch("/api/substitutes");
    if (!res.ok) return;
    const all = (await res.json()) as SubRow[];
    setRows(all.filter((s) => s.coveredEmployeeId === coveredEmployeeId));
  }

  async function addRule() {
    setBusy(true);
    try {
      const affected = projectIds
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/substitutes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromEmployeeId: coveredEmployeeId,
          toEmployeeId: delegateId,
          startDate: new Date(start).toISOString(),
          endDate: new Date(end).toISOString(),
          affectedProjects: affected.length ? affected : [],
          priority: priority === "" ? null : Number.parseInt(priority, 10),
          note: note || null,
        }),
      });
      if (!res.ok) {
        window.alert("Speichern fehlgeschlagen");
        return;
      }
      setDelegateId("");
      setStart("");
      setEnd("");
      setPriority("");
      setNote("");
      setProjectIds("");
      await refresh();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Vertretungsregel löschen?")) return;
    const res = await fetch(`/api/substitutes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert("Löschen fehlgeschlagen");
      return;
    }
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="sub-delegate">Vertreter</Label>
          <select
            id="sub-delegate"
            data-testid="sub-delegate"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={delegateId}
            onChange={(e) => setDelegateId(e.target.value)}
          >
            <option value="">— wählen —</option>
            {choices.map((e) => (
              <option key={e.id} value={e.id}>
                {e.shortCode} — {e.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub-start">Von</Label>
          <Input id="sub-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub-end">Bis</Label>
          <Input id="sub-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub-prio">Priorität (optional)</Label>
          <Input id="sub-prio" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="0 = höchste" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="sub-proj">Projekt-IDs (optional, leer = alle Projekte mit diesem SiGeKo)</Label>
          <Input
            id="sub-proj"
            value={projectIds}
            onChange={(e) => setProjectIds(e.target.value)}
            placeholder="cuid1 cuid2 …"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
          <Label htmlFor="sub-note">Notiz</Label>
          <Textarea id="sub-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={() => void addRule()} disabled={busy || !delegateId || !start || !end} data-testid="sub-submit">
            Vertretung speichern
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-2 text-left">Vertreter</th>
              <th className="p-2 text-left">Von</th>
              <th className="p-2 text-left">Bis</th>
              <th className="p-2 text-left">Prio</th>
              <th className="p-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-muted-foreground">
                  Keine Vertretungsregeln.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">
                    {r.delegateEmployee.shortCode} — {r.delegateEmployee.displayName}
                  </td>
                  <td className="p-2">{new Date(r.startsOn).toLocaleString("de-DE")}</td>
                  <td className="p-2">{new Date(r.endsOn).toLocaleString("de-DE")}</td>
                  <td className="p-2">{r.priority ?? "—"}</td>
                  <td className="p-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => void remove(r.id)}>
                      Löschen
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
