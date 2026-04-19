import { mondayUtcOfIsoWeek } from "@/lib/iso-week";

/** True if the closed ISO week [Mo..So UTC] overlaps [rangeStart, rangeEnd]. */
export function isoWeekOverlapsClosedInterval(
  isoYear: number,
  isoWeek: number,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const mon = mondayUtcOfIsoWeek(isoYear, isoWeek);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  sun.setUTCHours(23, 59, 59, 999);
  return rangeStart <= sun && rangeEnd >= mon;
}
