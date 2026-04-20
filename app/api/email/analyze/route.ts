import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-helpers";

const bodySchema = z.object({
  text: z.string().min(1).max(50_000),
});

/** Stub: später Sentiment / Themenklassifikation. */
export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const lower = parsed.data.text.toLowerCase();
  const topics: string[] = [];
  if (/(mangel|defekt|schaden)/i.test(parsed.data.text)) topics.push("mangel");
  if (/(termin|frist|datum)/i.test(parsed.data.text)) topics.push("termin");
  if (topics.length === 0) topics.push("allgemein");

  const sentiment = lower.includes("beschwerde") || lower.includes("ärger") ? "negativ" : "neutral";

  return NextResponse.json({
    source: "stub",
    topics,
    sentiment,
    summary: parsed.data.text.slice(0, 200),
  });
}
