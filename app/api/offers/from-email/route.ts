import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-helpers";

const bodySchema = z.object({
  rawEmail: z.string().min(1).max(50_000),
});

/** Stub: später LLM / Parser – liefert strukturierte Vorschläge aus Freitext. */
export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const raw = parsed.data.rawEmail;
  const amountMatch = raw.match(/(\d[\d.,]*)\s*(EUR|€)/i);
  const amountGuess = amountMatch ? amountMatch[1]?.replace(/\./g, "").replace(",", ".") : null;

  return NextResponse.json({
    source: "stub",
    suggestedTitle: raw.slice(0, 80).trim() || "Angebot (Entwurf)",
    amountGuess: amountGuess != null ? Number.parseFloat(amountGuess) || null : null,
    currency: "EUR",
    confidence: 0.42,
  });
}
