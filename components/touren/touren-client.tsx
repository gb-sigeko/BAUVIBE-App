"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TourRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  employeeId: string;
  region: string;
  sortOrder: string[];
  status: string;
  employee: { shortCode: string; displayName: string };
};

function SortItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`tour-sort-row-${id}`}
      className="flex items-center gap-2 rounded border bg-card px-2 py-1 text-sm"
      {...attributes}
      {...listeners}
    >
      {label}
    </div>
  );
}

export function TourenClient({
  isoYear: initialY,
  isoWeek: initialW,
  initialTours,
  projectCodes,
}: {
  isoYear: number;
  isoWeek: number;
  initialTours: TourRow[];
  projectCodes: Record<string, string>;
}) {
  const router = useRouter();
  const [y, setY] = useState(String(initialY));
  const [w, setW] = useState(String(initialW));
  const [tours, setTours] = useState(initialTours);
  const [pending, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function goKw() {
    router.push(`/touren?isoYear=${encodeURIComponent(y)}&isoWeek=${encodeURIComponent(w)}`);
  }

  async function onDragEnd(event: DragEndEvent, tourId: string, order: string[]) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    start(async () => {
      const res = await fetch(`/api/tours/${tourId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: next }),
      });
      if (res.ok) {
        setTours((prev) => prev.map((t) => (t.id === tourId ? { ...t, sortOrder: next } : t)));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label>ISO-Jahr</Label>
          <Input type="number" value={y} data-testid="tour-kw-year" onChange={(e) => setY(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>KW</Label>
          <Input type="number" value={w} data-testid="tour-kw-week" onChange={(e) => setW(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={goKw}>
          Anzeigen
        </Button>
      </div>

      {tours.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Touren in dieser KW.</p>
      ) : (
        tours.map((t) => {
          const order = t.sortOrder as string[];
          return (
            <div key={t.id} className="space-y-2 rounded-lg border p-4">
              <div className="text-sm font-medium">
                Tour {t.id.slice(0, 6)} · {t.employee.shortCode} · {t.region} · {t.status}
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e, t.id, order)}>
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1">
                    {order.map((pid, idx) => (
                      <SortItem
                        key={`${t.id}-${pid}-${idx}`}
                        id={pid}
                        label={`${idx + 1}. ${projectCodes[pid] ?? pid.slice(0, 6)}`}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })
      )}
      {pending ? <p className="text-xs text-muted-foreground">Speichere …</p> : null}
    </div>
  );
}
