import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export async function recalcConflictsForWeek(
  isoYear: number,
  isoWeek: number,
  db: PrismaClient = defaultPrisma,
) {
  const entries = await db.planungEntry.findMany({
    where: { isoYear, isoWeek, employeeId: { not: null } },
    select: { id: true, employeeId: true, projectId: true },
  });

  const projectSets = new Map<string, Set<string>>();
  for (const e of entries) {
    if (!e.employeeId) continue;
    if (!projectSets.has(e.employeeId)) projectSets.set(e.employeeId, new Set());
    projectSets.get(e.employeeId)!.add(e.projectId);
  }

  const conflictByEntryId = new Map<string, boolean>();
  for (const e of entries) {
    if (!e.employeeId) continue;
    const set = projectSets.get(e.employeeId);
    conflictByEntryId.set(e.id, (set?.size ?? 0) > 1);
  }

  await db.$transaction(
    entries.map((e) =>
      db.planungEntry.update({
        where: { id: e.id },
        data: { conflict: conflictByEntryId.get(e.id) ?? false },
      }),
    ),
  );

  await db.planungEntry.updateMany({
    where: { isoYear, isoWeek, employeeId: null },
    data: { conflict: false },
  });
}
