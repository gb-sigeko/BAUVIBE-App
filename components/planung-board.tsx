"use client";

import type { CSSProperties, ReactElement } from "react";
import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { List } from "react-window";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PlanungVorOrtDialog } from "@/components/planung-vorort-dialog";

const ROW_H = 100;
const COL_PROJECT = 240;
const COL_WEEK = 128;

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
};

export type PlanungBoardProject = { id: string; code: string; name: string };

export type PlanungBoardWeek = { isoYear: number; isoWeek: number; label: string };

function droppableId(isoYear: number, isoWeek: number) {
  return `week-${isoYear}-${isoWeek}`;
}

function parseDroppableId(id: string) {
  const m = /^week-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { isoYear: Number(m[1]), isoWeek: Number(m[2]) };
}

function DroppableCell({
  isoYear,
  isoWeek,
  children,
}: {
  isoYear: number;
  isoWeek: number;
  children: React.ReactNode;
}) {
  const id = droppableId(isoYear, isoWeek);
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[84px] rounded-md border border-dashed p-1.5 transition-colors",
        isOver ? "bg-muted" : "bg-background",
      )}
    >
      {children}
    </div>
  );
}

function DraggableChip({ entry }: { entry: PlanungBoardEntry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const typeLabel =
    entry.planungType === "FEST"
      ? "Fester Termin"
      : entry.planungType === "VERTRETUNG"
        ? "Vertretung"
        : entry.planungType === "VERSCHOBEN"
          ? "Verschoben"
          : null;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "mb-1.5 w-full cursor-grab rounded-md border bg-card px-2 py-1 text-left text-xs shadow-sm active:cursor-grabbing",
        isDragging && "opacity-60",
        entry.conflict && "border-amber-500/70",
        entry.planungType === "FEST" && "border-violet-500/50",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="font-semibold">{entry.employeeShortCode ?? "—"}</span>
        <div className="flex flex-wrap justify-end gap-0.5">
          {entry.conflict ? <Badge variant="warning">Konflikt</Badge> : null}
          {typeLabel ? (
            <Badge variant="secondary" className="text-[10px]">
              {typeLabel}
            </Badge>
          ) : null}
          {entry.specialCode !== "NONE" ? (
            <Badge variant="outline" className="text-[10px]">
              {entry.specialCode}
            </Badge>
          ) : null}
          {entry.isCompletedForContract ? (
            <Badge variant="secondary" className="text-[10px]">
              Soll erfüllt
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">{entry.planungStatus}</div>
      {entry.turnusLabel ? <div className="text-[11px] text-muted-foreground">Turnus: {entry.turnusLabel}</div> : null}
      {entry.note ? <div className="line-clamp-2 text-[11px] text-muted-foreground">{entry.note}</div> : null}
      {entry.feedback ? <div className="text-[11px]">Rückmeldung: {entry.feedback}</div> : null}
      <div className="mt-1 flex items-center justify-between gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-muted-foreground">Vor-Ort: {entry.vorOrtCount}</span>
        <PlanungVorOrtDialog entryId={entry.id} />
      </div>
    </button>
  );
}

type RowProps = {
  projects: PlanungBoardProject[];
  weeks: PlanungBoardWeek[];
  entriesByProjectWeek: Map<string, PlanungBoardEntry[]>;
};

function PlanungRow({
  index,
  style,
  ariaAttributes,
  projects,
  weeks,
  entriesByProjectWeek,
}: {
  index: number;
  style: CSSProperties;
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" };
} & RowProps): ReactElement {
  const p = projects[index];
  if (!p) {
    return <div {...ariaAttributes} style={style} />;
  }

  return (
    <div {...ariaAttributes} style={style} className="flex border-b bg-background">
      <div
        className="shrink-0 border-r bg-background px-2 py-2 align-top"
        style={{ width: COL_PROJECT, minWidth: COL_PROJECT }}
      >
        <div className="text-sm font-medium leading-snug">{p.name}</div>
        <div className="text-xs text-muted-foreground">{p.code}</div>
      </div>
      {weeks.map((w) => {
        const key = `${p.id}:${w.isoYear}:${w.isoWeek}`;
        const cellEntries = entriesByProjectWeek.get(key) ?? [];
        return (
          <div
            key={key}
            className="shrink-0 border-r p-1 align-top"
            style={{ width: COL_WEEK, minWidth: COL_WEEK }}
          >
            <DroppableCell isoYear={w.isoYear} isoWeek={w.isoWeek}>
              {cellEntries.map((e) => (
                <DraggableChip key={e.id} entry={e} />
              ))}
            </DroppableCell>
          </div>
        );
      })}
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const rowProps = useMemo<RowProps>(
    () => ({ projects, weeks, entriesByProjectWeek }),
    [projects, weeks, entriesByProjectWeek],
  );

  const totalWidth = COL_PROJECT + weeks.length * COL_WEEK;
  const listHeight = Math.min(560, Math.max(projects.length ? ROW_H : 0, projects.length * ROW_H));

  async function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;
    const target = parseDroppableId(overId);
    if (!target) return;

    const entry = entries.find((e) => e.id === activeId);
    if (!entry) return;
    if (entry.isoYear === target.isoYear && entry.isoWeek === target.isoWeek) return;

    startTransition(async () => {
      const res = await fetch("/api/planung/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryId: activeId,
          targetIsoYear: target.isoYear,
          targetIsoWeek: target.isoWeek,
        }),
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-x-auto rounded-lg border">
        <div className="flex border-b bg-muted/40" style={{ width: totalWidth, minWidth: totalWidth }}>
          <div
            className="shrink-0 px-2 py-2 text-left text-sm font-semibold"
            style={{ width: COL_PROJECT, minWidth: COL_PROJECT }}
          >
            Projekt
          </div>
          {weeks.map((w) => (
            <div
              key={droppableId(w.isoYear, w.isoWeek)}
              className="shrink-0 px-1 py-2 text-left text-sm font-semibold leading-tight"
              style={{ width: COL_WEEK, minWidth: COL_WEEK }}
            >
              {w.label}
            </div>
          ))}
        </div>
        {projects.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Keine aktiven Projekte.</p>
        ) : (
          <List
            defaultHeight={560}
            overscanCount={5}
            rowCount={projects.length}
            rowHeight={ROW_H}
            rowProps={rowProps}
            rowComponent={PlanungRow}
            style={{ height: listHeight, width: totalWidth, minWidth: totalWidth }}
          />
        )}
      </div>
      {pending ? <p className="mt-2 text-xs text-muted-foreground">Aktualisiere Planung…</p> : null}
    </DndContext>
  );
}
