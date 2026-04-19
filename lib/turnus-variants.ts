import type { Turnus } from "@/generated/prisma/client";
import { turnusToIntervalWeeks } from "@/lib/turnus-engine";
import { getIsoWeekParts } from "@/lib/utils";
import { compareIsoWeek, isoWeekKey } from "@/lib/iso-week";

export type HorizonWeekLite = { isoYear: number; isoWeek: number };

export type TurnusAlgoId = "A" | "B" | "C";

/**
 * Best-of-N: drei Referenz-Strategien für den Turnus-Raster (ohne FEST/Vertretung).
 * A entspricht der Produktionslogik in `syncTurnusSuggestions`.
 */
export function computeTurnusWeekGrid(
  algo: TurnusAlgoId,
  input: {
    turnus: Turnus | null;
    lastInspection: Date | null;
    startDate: Date | null;
    createdAt: Date;
    horizon: HorizonWeekLite[];
  },
): Set<string> {
  const interval = turnusToIntervalWeeks(input.turnus);
  const out = new Set<string>();
  if (interval == null) return out;

  const minW = input.horizon.reduce((a, b) => (compareIsoWeek(a, b) < 0 ? a : b));
  const maxW = input.horizon.reduce((a, b) => (compareIsoWeek(a, b) > 0 ? a : b));

  const refA = input.lastInspection ?? input.startDate ?? input.createdAt;
  const refB = input.startDate ?? input.createdAt;
  const refC =
    input.lastInspection && input.startDate
      ? input.lastInspection > input.startDate
        ? input.lastInspection
        : input.startDate
      : (input.lastInspection ?? input.startDate ?? input.createdAt);

  const ref = algo === "A" ? refA : algo === "B" ? refB : refC;
  let cursor = new Date(ref);
  cursor.setUTCDate(cursor.getUTCDate() + interval * 7);

  while (true) {
    const { isoYear, isoWeek } = getIsoWeekParts(cursor);
    if (compareIsoWeek({ isoYear, isoWeek }, maxW) > 0) break;
    if (compareIsoWeek({ isoYear, isoWeek }, minW) >= 0) {
      out.add(isoWeekKey(isoYear, isoWeek));
    }
    cursor.setUTCDate(cursor.getUTCDate() + interval * 7);
  }
  return out;
}
