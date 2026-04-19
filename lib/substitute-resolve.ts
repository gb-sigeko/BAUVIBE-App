import type { PrismaClient } from "@/generated/prisma/client";
import type { Substitute } from "@/generated/prisma/client";
import { isoWeekOverlapsSubstitute } from "@/lib/availability-week";

function affectedIds(sub: Substitute): string[] {
  const raw = sub.affectedProjectIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

/**
 * Leeres `affectedProjectIds` = alle aktiven Projekte, in denen der Abwesende SiGeKo ist.
 */
export async function findDelegateForCoveredInWeek(
  db: PrismaClient,
  input: {
    coveredEmployeeId: string;
    projectId: string;
    isoYear: number;
    isoWeek: number;
  },
): Promise<string | null> {
  const subs = await db.substitute.findMany({
    where: { coveredEmployeeId: input.coveredEmployeeId },
    orderBy: { startsOn: "asc" },
  });
  subs.sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999));

  const responsibleProjects = await db.project.findMany({
    where: { responsibleEmployeeId: input.coveredEmployeeId, status: "ACTIVE" },
    select: { id: true },
  });
  const responsibleSet = new Set(responsibleProjects.map((p) => p.id));

  for (const sub of subs) {
    if (!isoWeekOverlapsSubstitute(sub, input.isoYear, input.isoWeek)) continue;
    const affected = affectedIds(sub);
    if (affected.length === 0) {
      if (responsibleSet.has(input.projectId)) {
        return sub.delegateEmployeeId;
      }
    } else if (affected.includes(input.projectId)) {
      return sub.delegateEmployeeId;
    }
  }
  return null;
}
