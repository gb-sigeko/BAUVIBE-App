import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import type { Prisma } from "@/generated/prisma/client";
import { appendChronikEntry } from "@/lib/chronik";
import { syncProjectCompletedBegehungenCount } from "@/lib/planung-contract-sync";

const bodySchema = z.object({
  entryId: z.string(),
  targetIsoYear: z.number().int(),
  targetIsoWeek: z.number().int().min(1).max(53),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "EXTERN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const entry = await prisma.planungEntry.findUnique({ where: { id: parsed.data.entryId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldYear = entry.isoYear;
  const oldWeek = entry.isoWeek;

  await prisma.planungEntry.update({
    where: { id: entry.id },
    data: {
      isoYear: parsed.data.targetIsoYear,
      isoWeek: parsed.data.targetIsoWeek,
    },
  });

  await appendChronikEntry({
    projectId: entry.projectId,
    authorId: session.user.id,
    body: `Planung verschoben: KW ${oldWeek}/${oldYear} → KW ${parsed.data.targetIsoWeek}/${parsed.data.targetIsoYear}`,
    action: "planung_moved",
    targetType: "PlanungEntry",
    targetId: entry.id,
    details: {
      from: { isoYear: oldYear, isoWeek: oldWeek },
      to: { isoYear: parsed.data.targetIsoYear, isoWeek: parsed.data.targetIsoWeek },
    } as Prisma.InputJsonValue,
  });

  await recalcConflictsForWeek(oldYear, oldWeek);
  await recalcConflictsForWeek(parsed.data.targetIsoYear, parsed.data.targetIsoWeek);
  await syncProjectCompletedBegehungenCount(prisma, entry.projectId);

  return NextResponse.json({ ok: true });
}
