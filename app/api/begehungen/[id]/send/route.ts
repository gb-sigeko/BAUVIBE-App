import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { findBegehungWithProject, begehungNotFound } from "@/lib/begehung-by-id";
import { sendTransactionalEmail } from "@/lib/email";

const bodySchema = z.object({
  emails: z.array(z.string().email()).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const b = await findBegehungWithProject(params.id);
  if (!b) return begehungNotFound();

  if (!b.protokollPdf) {
    return NextResponse.json({ error: "PDF fehlt – zuerst generieren." }, { status: 400 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const extraEmails = parsed.data.emails;

  const rel = b.protokollPdf.replace(/^\//, "");
  const diskPath = path.join(process.cwd(), "public", rel);
  const pdfBuf = await readFile(diskPath);

  const verteilerRaw = b.verteiler;
  const verteilerArr = Array.isArray(verteilerRaw)
    ? (verteilerRaw as { email?: string; send?: boolean }[])
    : [];
  const fromVerteiler = verteilerArr
    .filter((v) => v.email && (v.send === undefined || v.send === true))
    .map((v) => v.email!);
  const targets = extraEmails?.length ? extraEmails : fromVerteiler;
  if (!targets.length) {
    return NextResponse.json({ error: "Keine Empfänger" }, { status: 400 });
  }

  const subject = `Begehungsprotokoll ${b.project.code}`;
  const text = `Anbei das Protokoll zur Begehung am ${b.date.toLocaleDateString("de-DE")} (${b.project.name}).`;

  for (const to of targets) {
    const send = await sendTransactionalEmail({
      to,
      subject,
      text,
      attachments: [{ filename: `protokoll-${b.id}.pdf`, content: pdfBuf, contentType: "application/pdf" }],
    });
    if (!send.ok) return NextResponse.json({ error: "Versand fehlgeschlagen", to }, { status: 502 });
  }

  await prisma.begehung.update({
    where: { id: b.id },
    data: { versendetAm: new Date() },
  });

  return NextResponse.json({ ok: true, sent: targets.length });
}
