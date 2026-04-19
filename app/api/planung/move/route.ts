import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";

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

  await recalcConflictsForWeek(oldYear, oldWeek);
  await recalcConflictsForWeek(parsed.data.targetIsoYear, parsed.data.targetIsoWeek);

  return NextResponse.json({ ok: true });
}
