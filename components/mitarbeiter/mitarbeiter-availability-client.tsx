"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AvRow = {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  note: string | null;
};

const reasons = ["URLAUB", "KRANKHEIT", "FORTBILDUNG", "BLOCKIERT", "FREI"] as const;

export function MitarbeiterAvailabilityClient({
  employeeId,
  initialRows,
  from,
  to,
}: {
  employeeId: string;
  initialRows: AvRow[];
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [reason, setReason] = useState<string>("URLAUB");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch(
      `/api/availability?employeeId=${encodeURIComponent(employeeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { id: string; startsOn: string; endsOn: string; reason: string; note: string | null }[];
      setRows(
        data.map((r) => ({
          id: r.id,
          startsOn: r.startsOn,
          endsOn: r.endsOn,
          reason: r.reason,
          note: r.note,
        })),
      );
    }
  }

  async function addAbsence() {
    setBusy(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employeeId,
          startsOn: new Date(startsOn).toISOString(),
          endsOn: new Date(endsOn).toISOString(),
          reason,
          note: note || null,
        }),
      });
      if (!res.ok) {
        window.alert("Speichern fehlgeschlagen");
        return;
      }
      setStartsOn("");
      setEndsOn("");
      setNote("");
      await refresh();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Eintrag löschen?")) return;
    const res = await fetch(`/api/availability/${id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert("Löschen fehlgeschlagen");
      return;
    }
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="av-start">Von (Datum/Zeit)</Label>
          <Input id="av-start" type="datetime-local" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="av-end">Bis (Datum/Zeit)</Label>
          <Input id="av-end" type="datetime-local" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="av-reason">Grund</Label>
          <select
            id="av-reason"
            data-testid="av-reason"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
          <Label htmlFor="av-note">Kommentar</Label>
          <Textarea id="av-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={() => void addAbsence()} disabled={busy || !startsOn || !endsOn} data-testid="av-submit">
            Neue Abwesenheit
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-2 text-left">Von</th>
              <th className="p-2 text-left">Bis</th>
              <th className="p-2 text-left">Grund</th>
              <th className="p-2 text-left">Kommentar</th>
              <th className="p-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-muted-foreground">
                  Keine Einträge im gewählten Zeitraum.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">{new Date(r.startsOn).toLocaleString("de-DE")}</td>
                  <td className="p-2">{new Date(r.endsOn).toLocaleString("de-DE")}</td>
                  <td className="p-2">{r.reason}</td>
                  <td className="p-2 text-muted-foreground">{r.note ?? "—"}</td>
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
