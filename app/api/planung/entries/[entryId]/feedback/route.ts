import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { applyPlanungFeedback } from "@/lib/planung-feedback-apply";

const bodySchema = z.object({
  outcome: z.enum(["erledigt", "nicht_erledigt", "nb", "ob"]),
});

export async function POST(req: Request, { params }: { params: { entryId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const result = await applyPlanungFeedback(prisma, {
    entryId: params.entryId,
    outcome: parsed.data.outcome,
    horizonWeekCount: 52,
  });
  if (!result.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(result.row);
}
