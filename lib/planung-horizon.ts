import { getIsoWeekParts } from "@/lib/utils";

export type PlanungHorizonWeek = { isoYear: number; isoWeek: number; label: string };

/** Baut die KW-Spalten wie in der Wochenplanung (inkl. Überlappungslogik mit Vorwoche). */
export function buildPlanungHorizon(anchor: Date, total: number): PlanungHorizonWeek[] {
  const out: PlanungHorizonWeek[] = [];
  const seen = new Set<string>();

  for (let i = -1; i < total; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + i * 7);
    const { isoYear, isoWeek } = getIsoWeekParts(d);
    const key = `${isoYear}-${isoWeek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      isoYear,
      isoWeek,
      label: `KW ${isoWeek} · ${isoYear}`,
    });
  }

  return out;
}

export function horizonToIsoWeeks(weeks: PlanungHorizonWeek[]) {
  return weeks.map(({ isoYear, isoWeek }) => ({ isoYear, isoWeek }));
}
