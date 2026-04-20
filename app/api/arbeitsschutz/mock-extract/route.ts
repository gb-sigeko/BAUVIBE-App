import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-helpers";

const bodySchema = z.object({
  fragment: z.string().min(1).max(50_000),
});

/** Stub: später echte Extraktion für VK-Arbeitsschutz-Felder (BaustellV / Gefährdung). */
export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  return NextResponse.json({
    source: "stub",
    gefahrenbereiche: ["Absturz (Stub)", "Verkehr (Stub)"],
    massnahmenVorschlag: "Persönliche Schutzausrüstung gemäß Baustellenregeln prüfen (Stub).",
    rohtextEcho: parsed.data.fragment.slice(0, 120),
  });
}
