import type { PrismaClient } from "@/generated/prisma/client";
import { mondayUtcOfIsoWeek } from "@/lib/iso-week";

export function isoWeekUtcRange(isoYear: number, isoWeek: number) {
  const mon = mondayUtcOfIsoWeek(isoYear, isoWeek);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  sun.setUTCHours(23, 59, 59, 999);
  return { mon, sun };
}

/** Abwesenheit blockiert Einsatz (alles außer FREI). */
export async function isEmployeeUnavailableInWeek(
  db: PrismaClient,
  employeeId: string,
  isoYear: number,
  isoWeek: number,
): Promise<boolean> {
  const { mon, sun } = isoWeekUtcRange(isoYear, isoWeek);
  const n = await db.availability.count({
    where: {
      employeeId,
      reason: { not: "FREI" },
      startsOn: { lte: sun },
      endsOn: { gte: mon },
    },
  });
  return n > 0;
}

export function isoWeekOverlapsSubstitute(
  sub: { startsOn: Date; endsOn: Date },
  isoYear: number,
  isoWeek: number,
) {
  const { mon, sun } = isoWeekUtcRange(isoYear, isoWeek);
  return sub.startsOn <= sun && sub.endsOn >= mon;
}
