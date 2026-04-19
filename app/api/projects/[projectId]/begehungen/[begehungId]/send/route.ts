import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { sendTransactionalEmail } from "@/lib/email";

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { projectId: string; begehungId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { begehung, response: bRes } = await assertBegehung(params.projectId, params.begehungId);
  if (!begehung) return bRes!;

  const full = await prisma.begehung.findUnique({
    where: { id: begehung.id },
    include: { project: true, mangels: true },
  });
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const subject = parsed.data.subject ?? `Begehungsprotokoll ${full.project.code}`;
  const mangels = full.mangels.map((m) => `- ${m.beschreibung}`).join("\n");
  const text = `Projekt: ${full.project.name}\nDatum: ${full.date.toLocaleDateString("de-DE")}\nTitel: ${full.title ?? "—"}\n\nMängel:\n${mangels || "—"}`;

  const send = await sendTransactionalEmail({ to: parsed.data.to, subject, text });
  if (!send.ok) return NextResponse.json({ error: "E-Mail-Versand fehlgeschlagen" }, { status: 502 });

  await prisma.begehung.update({
    where: { id: full.id },
    data: { versendetAm: new Date() },
  });

  return NextResponse.json({ ok: true, emailMode: send.mode });
}
