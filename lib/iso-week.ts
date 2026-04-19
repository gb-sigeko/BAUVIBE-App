import { getIsoWeekParts } from "@/lib/utils";

/** Montag 00:00 UTC der ISO-Kalenderwoche. */
export function mondayUtcOfIsoWeek(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dow + 1);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return monday;
}

export function addIsoWeeks(isoYear: number, isoWeek: number, deltaWeeks: number) {
  const mon = mondayUtcOfIsoWeek(isoYear, isoWeek);
  mon.setUTCDate(mon.getUTCDate() + deltaWeeks * 7);
  return getIsoWeekParts(mon);
}

export function compareIsoWeek(a: { isoYear: number; isoWeek: number }, b: { isoYear: number; isoWeek: number }) {
  if (a.isoYear !== b.isoYear) return a.isoYear - b.isoYear;
  return a.isoWeek - b.isoWeek;
}

export function isIsoWeekBefore(
  a: { isoYear: number; isoWeek: number },
  b: { isoYear: number; isoWeek: number },
) {
  return compareIsoWeek(a, b) < 0;
}

export function isoWeekKey(y: number, w: number) {
  return `${y}-${w}`;
}
