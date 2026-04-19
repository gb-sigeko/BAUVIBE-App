import type { PrismaClient } from "@/generated/prisma/client";

/** Zählt alle Planungszellen mit vertraglich relevantem Abschluss und schreibt sie nach `Project.completedBegehungen`. */
export async function syncProjectCompletedBegehungenCount(db: PrismaClient, projectId: string) {
  const n = await db.planungEntry.count({
    where: { projectId, isCompletedForContract: true },
  });
  await db.project.update({
    where: { id: projectId },
    data: { completedBegehungen: n },
  });
}
