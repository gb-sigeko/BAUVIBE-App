"use client";

import type { CSSProperties, ReactElement } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Grid } from "react-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlanungVorOrtDialog } from "@/components/planung-vorort-dialog";
import { cn } from "@/lib/utils";

const ROW_H = 104;
const COL_PROJECT = 240;
const COL_WEEK = 130;

export type PlanungBoardEntry = {
  id: string;
  projectId: string;
  isoYear: number;
  isoWeek: number;
  sortOrder: number;
  employeeId: string | null;
  employeeShortCode: string | null;
  planungType: string;
  planungStatus: string;
  planungSource: string;
  priority: number;
  specialCode: string;
  isCompletedForContract: boolean;
  turnusLabel: string | null;
  note: string | null;
  feedback: string | null;
  conflict: boolean;
  vorOrtCount: number;
  begehungSollNummer: number | null;
  begehungIstNummer: number | null;
  tourId: string | null;
};

export type PlanungBoardProject = { id: string; code: string; name: string };

export type PlanungBoardWeek = { isoYear: number; isoWeek: number; label: string };

function statusAccentClass(status: string) {
  switch (status) {
    case "ERLEDIGT":
      return "border-l-emerald-500";
    case "NICHT_ERLEDIGT":
    case "ABGESAGT":
      return "border-l-red-500";
    case "RUECKMELDUNG_OFFEN":
    case "PROTOKOLL_OFFEN":
      return "border-l-orange-500";
    case "BESTAETIGT":
    case "GEPLANT":
    case "IN_DURCHFUEHRUNG":
      return "border-l-blue-500";
    case "VORGESCHLAGEN":
      return "border-l-slate-400";
    case "VERTRETUNG_AKTIV":
      return "border-l-purple-500";
    default:
      return "border-l-gray-300";
  }
}

function PlanMoveDialog({
  open,
  onOpenChange,
  entry,
  weeks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: PlanungBoardEntry | null;
  weeks: PlanungBoardWeek[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState("");

  const submit = () => {
    if (!entry || !target) return;
    const [y, w] = target.split("-").map(Number);
    startTransition(async () => {
      const res = await fetch("/api/planung/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, targetIsoYear: y, targetIsoWeek: w }),
      });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>KW verschieben</DialogTitle>
        </DialogHeader>
        {entry ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Eintrag {entry.employeeShortCode ?? "—"} für Projekt-Zelle neu zuordnen.
            </p>
            <div className="space-y-2">
              <Label>Ziel-KW</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Bitte wählen…</option>
                {weeks.map((wk) => (
                  <option key={`${wk.isoYear}-${wk.isoWeek}`} value={`${wk.isoYear}-${wk.isoWeek}`}>
                    {wk.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="button" disabled={pending || !target} onClick={submit}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackMini({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (outcome: "erledigt" | "nicht_erledigt" | "nb" | "ob") => {
    startTransition(async () => {
      const res = await fetch(`/api/planung/entries/${entryId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (res.ok) router.refresh();
    });
  };
  return (
    <div className="mt-1 flex flex-wrap gap-0.5">
      <Button type="button" variant="outline" size="sm" className="h-6 px-1 text-[9px]" disabled={pending} onClick={() => run("erledigt")}>
        OK
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-6 px-1 text-[9px]" disabled={pending} onClick={() => run("nicht_erledigt")}>
        n.e.
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-6 px-1 text-[9px]" disabled={pending} onClick={() => run("nb")}>
        NB
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-6 px-1 text-[9px]" disabled={pending} onClick={() => run("ob")}>
        OB
      </Button>
    </div>
  );
}

function EntryCard({
  entry,
  onMove,
}: {
  entry: PlanungBoardEntry;
  onMove: (e: PlanungBoardEntry) => void;
}) {
  const typeLabel =
    entry.planungType === "FEST"
      ? "FEST"
      : entry.planungType === "VERTRETUNG"
        ? "Vertretung"
        : entry.planungType === "VERSCHOBEN"
          ? "Verschoben"
          : null;

  return (
    <div
      className={cn(
        "mb-1 rounded-md border bg-card px-1.5 py-1 text-left text-[10px] shadow-sm border-l-4",
        statusAccentClass(entry.planungStatus),
        entry.conflict && "ring-1 ring-amber-400",
        entry.planungType === "FEST" && "border-violet-500/40",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-0.5">
        <span className="font-semibold">{entry.employeeShortCode ?? "—"}</span>
        <div className="flex flex-wrap justify-end gap-0.5">
          {entry.conflict ? <span title="Konflikt">⚠</span> : null}
          {typeLabel ? (
            <Badge variant="secondary" className="px-1 py-0 text-[8px]">
              {typeLabel}
            </Badge>
          ) : null}
          {entry.specialCode !== "NONE" ? (
            <Badge variant="outline" className="px-1 py-0 text-[8px]">
              {entry.specialCode}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="text-[9px] text-muted-foreground">{entry.planungStatus}</div>
      {entry.begehungSollNummer != null || entry.begehungIstNummer != null ? (
        <div className="text-[9px] text-muted-foreground">
          Bg. {entry.begehungIstNummer ?? "—"}/{entry.begehungSollNummer ?? "—"}
        </div>
      ) : null}
      {entry.tourId ? <div className="text-[9px] text-violet-700">Tour {entry.tourId}</div> : null}
      {entry.turnusLabel ? <div className="line-clamp-1 text-[9px] text-muted-foreground">{entry.turnusLabel}</div> : null}
      {entry.note ? <div className="line-clamp-1 text-[9px] text-muted-foreground">{entry.note}</div> : null}
      <div className="mt-0.5 flex items-center justify-between gap-0.5">
        <span className="text-[8px] text-muted-foreground">V-O {entry.vorOrtCount}</span>
        <PlanungVorOrtDialog entryId={entry.id} />
      </div>
      <div className="mt-0.5 flex gap-0.5">
        <Button type="button" variant="ghost" size="sm" className="h-6 px-1 text-[9px]" onClick={() => onMove(entry)}>
          KW
        </Button>
      </div>
      <FeedbackMini entryId={entry.id} />
    </div>
  );
}

type CellProps = {
  projects: PlanungBoardProject[];
  weeks: PlanungBoardWeek[];
  entriesByProjectWeek: Map<string, PlanungBoardEntry[]>;
  onMoveEntry: (e: PlanungBoardEntry) => void;
};

function PlanGridCell({
  columnIndex,
  rowIndex,
  style,
  ariaAttributes,
  projects,
  weeks,
  entriesByProjectWeek,
  onMoveEntry,
}: {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  ariaAttributes: { "aria-colindex": number; role: "gridcell" };
} & CellProps): ReactElement {
  const p = projects[rowIndex];
  if (!p) return <div {...ariaAttributes} style={style} />;

  if (columnIndex === 0) {
    return (
      <div {...ariaAttributes} style={style} className="box-border flex flex-col justify-center border-b border-r bg-background px-2 py-1">
        <div className="text-xs font-medium leading-snug">{p.name}</div>
        <div className="text-[10px] text-muted-foreground">{p.code}</div>
      </div>
    );
  }

  const w = weeks[columnIndex - 1];
  if (!w) return <div {...ariaAttributes} style={style} />;

  const key = `${p.id}:${w.isoYear}:${w.isoWeek}`;
  const list = entriesByProjectWeek.get(key) ?? [];

  return (
    <div {...ariaAttributes} style={style} className="box-border overflow-auto border-b border-r bg-background p-1">
      <div className="flex min-h-[92px] flex-col gap-0.5 rounded border border-dashed border-muted p-0.5">
        {list.map((e) => (
          <EntryCard key={e.id} entry={e} onMove={onMoveEntry} />
        ))}
      </div>
    </div>
  );
}

export function PlanungBoard({
  projects,
  weeks,
  entries,
}: {
  projects: PlanungBoardProject[];
  weeks: PlanungBoardWeek[];
  entries: PlanungBoardEntry[];
}) {
  const [moveEntry, setMoveEntry] = useState<PlanungBoardEntry | null>(null);

  const entriesByProjectWeek = useMemo(() => {
    const map = new Map<string, PlanungBoardEntry[]>();
    for (const e of entries) {
      const key = `${e.projectId}:${e.isoYear}:${e.isoWeek}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [entries]);

  const cellProps = useMemo<CellProps>(
    () => ({
      projects,
      weeks,
      entriesByProjectWeek,
      onMoveEntry: setMoveEntry,
    }),
    [projects, weeks, entriesByProjectWeek],
  );

  const columnCount = 1 + weeks.length;
  const rowCount = projects.length;
  const totalWidth = COL_PROJECT + weeks.length * COL_WEEK;
  const gridHeight = Math.min(620, Math.max(rowCount ? ROW_H : 0, rowCount * ROW_H));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="flex border-b bg-muted/40" style={{ width: totalWidth, minWidth: totalWidth }}>
        <div className="shrink-0 px-2 py-2 text-left text-sm font-semibold" style={{ width: COL_PROJECT }}>
          Projekt
        </div>
        {weeks.map((w) => (
          <div
            key={`${w.isoYear}-${w.isoWeek}`}
            className="shrink-0 px-1 py-2 text-left text-sm font-semibold leading-tight"
            style={{ width: COL_WEEK }}
          >
            {w.label}
          </div>
        ))}
      </div>
      {projects.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Keine aktiven Projekte.</p>
      ) : (
        <Grid
          cellComponent={PlanGridCell}
          cellProps={cellProps}
          columnCount={columnCount}
          columnWidth={(index: number) => (index === 0 ? COL_PROJECT : COL_WEEK)}
          defaultHeight={gridHeight}
          defaultWidth={totalWidth}
          rowCount={rowCount}
          rowHeight={ROW_H}
          overscanCount={2}
          style={{ height: gridHeight, width: totalWidth, minWidth: totalWidth }}
        />
      )}
      <PlanMoveDialog open={moveEntry != null} onOpenChange={(o) => !o && setMoveEntry(null)} entry={moveEntry} weeks={weeks} />
    </div>
  );
}
