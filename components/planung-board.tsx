"use client";

import type { CSSProperties, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Grid } from "react-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanungVorOrtDialog } from "@/components/planung-vorort-dialog";
import { cn } from "@/lib/utils";

const ROW_H = 104;
const COL_PROJECT = 240;
const COL_WEEK = 130;
const VIEWS_STORAGE_KEY = "bauvibe-planung-views-v1";

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

export type PlanungBoardProject = {
  id: string;
  code: string;
  name: string;
  turnus: string | null;
  region: string | null;
  lastBegehungLabel: string | null;
};

export type PlanungBoardWeek = { isoYear: number; isoWeek: number; label: string };

export type PlanungBoardEmployee = {
  id: string;
  shortCode: string;
  displayName: string;
  region: string | null;
  weeklyCapacity: number;
};

type SavedView = {
  name: string;
  weeks: number;
  employeeId: string;
  region: string;
  status: string;
  turnus: string;
};

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

function EmployeeDropSlot({
  employee,
  plannedSlots,
  weekCount,
}: {
  employee: PlanungBoardEmployee;
  plannedSlots: number;
  weekCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `emp:${employee.id}` });
  const denom = Math.max(1, employee.weeklyCapacity * weekCount);
  const pct = Math.min(100, Math.round((plannedSlots / denom) * 100));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[100px] max-w-[140px] flex-col rounded-md border bg-muted/30 px-2 py-1.5 text-xs transition-colors",
        isOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
      )}
    >
      <div className="font-mono font-semibold">{employee.shortCode}</div>
      <div className="text-[10px] text-muted-foreground line-clamp-1">{employee.displayName}</div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/80 transition-all"
          style={{ width: `${pct}%` }}
          title={`${plannedSlots} Einträge im Horizont`}
        />
      </div>
      <div className="mt-0.5 text-[9px] text-muted-foreground">{plannedSlots} / {weekCount} KW</div>
    </div>
  );
}

function EntryCard({
  entry,
  onMove,
  onSelect,
  isSelected,
}: {
  entry: PlanungBoardEntry;
  onMove: (e: PlanungBoardEntry) => void;
  onSelect: (e: PlanungBoardEntry) => void;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry:${entry.id}`,
    data: { entry },
  });
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined;

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
      ref={setNodeRef}
      className={cn(
        "mb-1 rounded-md border bg-card px-1.5 py-1 text-left text-[10px] shadow-sm border-l-4",
        statusAccentClass(entry.planungStatus),
        entry.conflict && "ring-1 ring-amber-400",
        entry.planungType === "FEST" && "border-violet-500/40",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-60",
      )}
      style={dragStyle}
      onClick={() => onSelect(entry)}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onSelect(entry);
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-0.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="cursor-grab touch-none rounded border border-muted px-0.5 text-[9px] text-muted-foreground hover:bg-muted"
            title="Auf Mitarbeiter-Kachel ziehen"
            {...listeners}
            {...attributes}
          >
            ⣿
          </button>
          <span className="font-semibold">{entry.employeeShortCode ?? "—"}</span>
        </div>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-[9px]"
          onClick={(ev) => {
            ev.stopPropagation();
            onMove(entry);
          }}
        >
          KW
        </Button>
      </div>
      <div onClick={(ev) => ev.stopPropagation()}>
        <FeedbackMini entryId={entry.id} />
      </div>
    </div>
  );
}

type CellProps = {
  projects: PlanungBoardProject[];
  weeks: PlanungBoardWeek[];
  entriesByProjectWeek: Map<string, PlanungBoardEntry[]>;
  onMoveEntry: (e: PlanungBoardEntry) => void;
  onSelectEntry: (e: PlanungBoardEntry) => void;
  selectedId: string | null;
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
  onSelectEntry,
  selectedId,
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
        {p.turnus ? <div className="text-[9px] text-muted-foreground">Turnus {p.turnus}</div> : null}
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
          <EntryCard
            key={e.id}
            entry={e}
            onMove={onMoveEntry}
            onSelect={onSelectEntry}
            isSelected={selectedId === e.id}
          />
        ))}
      </div>
    </div>
  );
}

function ColorLegend() {
  const items: { label: string; cls: string }[] = [
    { label: "Erledigt", cls: "border-l-emerald-500" },
    { label: "Offen / Rücklauf", cls: "border-l-orange-500" },
    { label: "Geplant", cls: "border-l-blue-500" },
    { label: "Vorschlag", cls: "border-l-slate-400" },
    { label: "Vertretung", cls: "border-l-purple-500" },
    { label: "Problem", cls: "border-l-red-500" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Legende:</span>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1">
          <span className={cn("inline-block h-3 w-1 rounded-sm border-l-4 bg-card", i.cls)} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function PlanungBoard({
  projects,
  weeks,
  entries,
  employees,
  horizonWeekCount,
}: {
  projects: PlanungBoardProject[];
  weeks: PlanungBoardWeek[];
  entries: PlanungBoardEntry[];
  employees: PlanungBoardEmployee[];
  horizonWeekCount: number;
}) {
  const router = useRouter();
  const [moveEntry, setMoveEntry] = useState<PlanungBoardEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PlanungBoardEntry | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTurnus, setFilterTurnus] = useState("");
  const [viewName, setViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEWS_STORAGE_KEY);
      if (raw) setSavedViews(JSON.parse(raw) as SavedView[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persistViews = useCallback((views: SavedView[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views));
    } catch {
      /* ignore */
    }
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterTurnus && (p.turnus ?? "") !== filterTurnus) return false;
      if (filterRegion && (p.region ?? "") !== filterRegion) return false;
      const projEntries = entries.filter((e) => e.projectId === p.id);
      if (filterEmployee && !projEntries.some((e) => e.employeeId === filterEmployee)) return false;
      if (filterStatus && !projEntries.some((e) => e.planungStatus === filterStatus)) return false;
      return true;
    });
  }, [projects, entries, filterEmployee, filterRegion, filterStatus, filterTurnus]);

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

  const plannedByEmployee = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of employees) m.set(e.id, 0);
    for (const e of entries) {
      if (!e.employeeId) continue;
      m.set(e.employeeId, (m.get(e.employeeId) ?? 0) + 1);
    }
    return m;
  }, [entries, employees]);

  const selectedProject = useMemo(
    () => (selectedEntry ? projects.find((p) => p.id === selectedEntry.projectId) ?? null : null),
    [selectedEntry, projects],
  );

  const regionOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of projects) {
      if (p.region) s.add(p.region);
    }
    return [...s].sort();
  }, [projects]);

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith("entry:")) return;
    const entryId = activeId.slice("entry:".length);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId.startsWith("emp:")) return;
    const employeeId = overId.slice("emp:".length);
    startTransition(async () => {
      const res = await fetch(`/api/planung/${entryId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (res.ok) router.refresh();
    });
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) return;
    const v: SavedView = {
      name,
      weeks: horizonWeekCount,
      employeeId: filterEmployee,
      region: filterRegion,
      status: filterStatus,
      turnus: filterTurnus,
    };
    persistViews([...savedViews.filter((x) => x.name !== name), v]);
    setViewName("");
  };

  const applyView = (v: SavedView) => {
    setFilterEmployee(v.employeeId);
    setFilterRegion(v.region);
    setFilterStatus(v.status);
    setFilterTurnus(v.turnus);
    const u = new URL(window.location.href);
    u.searchParams.set("weeks", String(v.weeks));
    window.location.href = u.toString();
  };

  const cellProps = useMemo<CellProps>(
    () => ({
      projects: filteredProjects,
      weeks,
      entriesByProjectWeek,
      onMoveEntry: setMoveEntry,
      onSelectEntry: setSelectedEntry,
      selectedId: selectedEntry?.id ?? null,
    }),
    [filteredProjects, weeks, entriesByProjectWeek, selectedEntry?.id],
  );

  const columnCount = 1 + weeks.length;
  const rowCount = filteredProjects.length;
  const totalWidth = COL_PROJECT + weeks.length * COL_WEEK;
  const gridHeight = Math.min(620, Math.max(rowCount ? ROW_H : 0, rowCount * ROW_H));

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4" data-testid="planung-board">
        <ColorLegend />

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Mitarbeiter</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              >
                <option value="">Alle</option>
                {employees.map((em) => (
                  <option key={em.id} value={em.id}>
                    {em.shortCode} – {em.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Region (Projekt)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
              >
                <option value="">Alle</option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Planungs-Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Alle</option>
                {[
                  "VORGESCHLAGEN",
                  "GEPLANT",
                  "BESTAETIGT",
                  "ERLEDIGT",
                  "NICHT_ERLEDIGT",
                  "RUECKMELDUNG_OFFEN",
                  "PROTOKOLL_OFFEN",
                  "VERTRETUNG_AKTIV",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Turnus (Projekt)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={filterTurnus}
                onChange={(e) => setFilterTurnus(e.target.value)}
              >
                <option value="">Alle</option>
                {["W", "W2", "W3", "ABRUF"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-end gap-2">
            <div className="flex min-w-[200px] flex-1 flex-col gap-1">
              <Label className="text-xs">Ansicht speichern</Label>
              <div className="flex gap-2">
                <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="Name" className="h-9" />
                <Button type="button" size="sm" variant="secondary" onClick={saveCurrentView}>
                  Speichern
                </Button>
              </div>
            </div>
          </div>
          {savedViews.length > 0 ? (
            <div className="flex w-full flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Gespeichert:</span>
              {savedViews.map((v) => (
                <Button key={v.name} type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyView(v)}>
                  {v.name}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Mitarbeiterzuweisung (Drag &amp; Drop): Eintrag am Griff ⣿ auf Kürzel-Kachel ziehen. Erzeugt Chronik-Eintrag.
          </p>
          <div className="flex flex-wrap gap-2">
            {employees.map((em) => (
              <EmployeeDropSlot
                key={em.id}
                employee={em}
                plannedSlots={plannedByEmployee.get(em.id) ?? 0}
                weekCount={weeks.length}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border">
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
            {filteredProjects.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Keine Projekte für die aktuellen Filter.</p>
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

          <aside className="shrink-0 space-y-3 rounded-lg border bg-card p-4 lg:w-80">
            <h3 className="text-sm font-semibold">Kontext</h3>
            {!selectedEntry || !selectedProject ? (
              <p className="text-sm text-muted-foreground">Eintrag im Raster anklicken für Details und Rückmeldung.</p>
            ) : (
              <>
                <div>
                  <div className="text-sm font-medium">{selectedProject.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedProject.code}</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Turnus: </span>
                    {selectedProject.turnus ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Region: </span>
                    {selectedProject.region ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Letzte Begehung: </span>
                    {selectedProject.lastBegehungLabel ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">KW: </span>
                    {selectedEntry.isoWeek}/{selectedEntry.isoYear}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    {selectedEntry.planungStatus}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/projects/${selectedProject.id}`}>Zur Projektakte</Link>
                </Button>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Rückmeldung</p>
                  <FeedbackMini entryId={selectedEntry.id} />
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </DndContext>
  );
}
