import type { PrismaClient } from "@/generated/prisma/client";
import { addIsoWeeks, horizonKeySet, isoWeekKey } from "@/lib/iso-week";

export async function cellOccupied(db: PrismaClient, projectId: string, isoYear: number, isoWeek: number) {
  const n = await db.planungEntry.count({ where: { projectId, isoYear, isoWeek } });
  return n > 0;
}

/**
 * Nächste freie Planungszelle im gegebenen KW-Horizont: bevorzugt KW+1, sonst erste freie KW.
 */
export async function nextFreeWeekInHorizon(
  db: PrismaClient,
  projectId: string,
  fromIsoYear: number,
  fromIsoWeek: number,
  horizon: { isoYear: number; isoWeek: number }[],
) {
  const horizonKeys = horizonKeySet(horizon);
  const immediate = addIsoWeeks(fromIsoYear, fromIsoWeek, 1);
  if (
    horizonKeys.has(isoWeekKey(immediate.isoYear, immediate.isoWeek)) &&
    !(await cellOccupied(db, projectId, immediate.isoYear, immediate.isoWeek))
  ) {
    return immediate;
  }

  let y = fromIsoYear;
  let w = fromIsoWeek;
  for (let step = 0; step < 120; step++) {
    const nxt = addIsoWeeks(y, w, 1);
    y = nxt.isoYear;
    w = nxt.isoWeek;
    if (!horizonKeys.has(isoWeekKey(y, w))) return null;
    if (!(await cellOccupied(db, projectId, y, w))) return { isoYear: y, isoWeek: w };
  }
  return null;
}
