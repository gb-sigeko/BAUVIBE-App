"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PlanungVorOrtDialog } from "@/components/planung-vorort-dialog";

export type PlanungBoardEntry = {
  id: string;
  projectId: string;
  isoYear: number;
  isoWeek: number;
  sortOrder: number;
  employeeId: string | null;
  employeeShortCode: string | null;
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
      className={cn("min-h-[72px] rounded-md border border-dashed p-2 transition-colors", isOver ? "bg-muted" : "bg-background")}
    >
      {children}
    </div>
  );
}

function DraggableChip({ entry }: { entry: PlanungBoardEntry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entry.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "mb-2 w-full cursor-grab rounded-md border bg-card px-2 py-1 text-left text-xs shadow-sm active:cursor-grabbing",
        isDragging && "opacity-60",
        entry.conflict && "border-amber-500/70",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{entry.employeeShortCode ?? "—"}</span>
        {entry.conflict ? <Badge variant="warning">Konflikt</Badge> : null}
      </div>
      {entry.turnusLabel ? <div className="text-[11px] text-muted-foreground">Turnus: {entry.turnusLabel}</div> : null}
      {entry.note ? <div className="text-[11px] text-muted-foreground line-clamp-2">{entry.note}</div> : null}
      {entry.feedback ? <div className="text-[11px]">Rückmeldung: {entry.feedback}</div> : null}
      <div className="mt-1 flex items-center justify-between gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-muted-foreground">Vor-Ort: {entry.vorOrtCount}</span>
        <PlanungVorOrtDialog entryId={entry.id} />
      </div>
    </button>
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
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-semibold">Projekt</th>
              {weeks.map((w) => (
                <th key={droppableId(w.isoYear, w.isoWeek)} className="px-2 py-2 text-left font-semibold">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-3 py-2 align-top">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.code}</div>
                </td>
                {weeks.map((w) => {
                  const key = `${p.id}:${w.isoYear}:${w.isoWeek}`;
                  const cellEntries = entriesByProjectWeek.get(key) ?? [];
                  return (
                    <td key={key} className="align-top p-2">
                      <DroppableCell isoYear={w.isoYear} isoWeek={w.isoWeek}>
                        {cellEntries.map((e) => (
                          <DraggableChip key={e.id} entry={e} />
                        ))}
                      </DroppableCell>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending ? <p className="mt-2 text-xs text-muted-foreground">Aktualisiere Planung…</p> : null}
    </DndContext>
  );
}
