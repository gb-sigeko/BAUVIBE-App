import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { sendTransactionalEmail } from "@/lib/email";

const bodySchema = z.object({
  to: z.string().email(),
});

export async function POST(req: Request, { params }: { params: { projectId: string; offerId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const offer = await prisma.offer.findFirst({
    where: { id: params.offerId, projectId: params.projectId },
  });
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const send = await sendTransactionalEmail({
    to: parsed.data.to,
    subject: `Angebot ${project.code}`,
    text: `Projekt: ${project.name}\nKundeneingabe: ${offer.emailInput}\nStatus: ${offer.status}`,
  });
  if (!send.ok) return NextResponse.json({ error: "E-Mail-Versand fehlgeschlagen" }, { status: 502 });

  const updated = await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "VERSENDET" },
  });

  return NextResponse.json({ ok: true, emailMode: send.mode, offer: updated });
}
