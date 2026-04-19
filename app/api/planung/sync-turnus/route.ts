import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { syncTurnusSuggestions } from "@/lib/turnus-engine";
import { applyKrankVertretungForHorizon } from "@/lib/vertretung";
import { buildPlanungHorizon, horizonToIsoWeeks } from "@/lib/planung-horizon";

const bodySchema = z
  .object({
    weeks: z.array(z.object({ isoYear: z.number(), isoWeek: z.number() })).optional(),
    anchor: z.string().datetime().optional(),
  })
  .optional();

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const anchor = parsed.data?.anchor ? new Date(parsed.data.anchor) : new Date();
  const weeks = parsed.data?.weeks?.length ? parsed.data.weeks : horizonToIsoWeeks(buildPlanungHorizon(anchor, 12));

  await applyKrankVertretungForHorizon(prisma, weeks);
  await syncTurnusSuggestions(prisma, anchor, weeks);
  return NextResponse.json({ ok: true, weeks: weeks.length });
}
