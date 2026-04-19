import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { sendTransactionalEmail } from "@/lib/email";

const bodySchema = z.object({
  to: z.string().email(),
});

export async function POST(req: Request, { params }: { params: { projectId: string; vkId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const row = await prisma.vorankuendigung.findFirst({
    where: { id: params.vkId, projectId: params.projectId },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const send = await sendTransactionalEmail({
    to: parsed.data.to,
    subject: `Vorankündigung ${project.code}`,
    text: `Projekt: ${project.name}\nFormular: ${row.pdfFormular}\nStatus: ${row.status}`,
  });
  if (!send.ok) return NextResponse.json({ error: "E-Mail-Versand fehlgeschlagen" }, { status: 502 });

  const updated = await prisma.vorankuendigung.update({
    where: { id: row.id },
    data: { status: "VERSENDET", versendetAm: new Date() },
  });

  return NextResponse.json({ ok: true, emailMode: send.mode, row: updated });
}
