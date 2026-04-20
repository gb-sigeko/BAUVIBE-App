import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function appendChronikEntry(opts: {
  projectId: string;
  authorId: string | null;
  body: string;
  action?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.chronikEntry.create({
    data: {
      projectId: opts.projectId,
      authorId: opts.authorId,
      body: opts.body,
      action: opts.action ?? undefined,
      targetType: opts.targetType ?? undefined,
      targetId: opts.targetId ?? undefined,
      ...(opts.details !== undefined ? { details: opts.details } : {}),
    },
  });
}
