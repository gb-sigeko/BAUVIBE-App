import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { sendTransactionalEmail } from "@/lib/email";
import { buildBegehungProtokollPdfBuffer } from "@/lib/begehung-protokoll-reactpdf";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().optional(),
  includePdf: z.boolean().optional(),
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
  const text = `Projekt: ${full.project.name}\nDatum: ${full.date.toLocaleDateString("de-DE")}\nTitel: ${full.title ?? "—"}\n\nMängel:\n${mangels || "—"}\n\nPDF siehe Anhang (falls gewählt).`;

  const attachments = [];
  if (parsed.data.includePdf) {
    const verteilerRaw = full.verteiler as unknown;
    const verteilerArr = Array.isArray(verteilerRaw) ? (verteilerRaw as { name?: string; email?: string }[]) : [];
    const verteilerLines = verteilerArr
      .filter((v) => v && (v.email || v.name))
      .map((v) => [v.name, v.email].filter(Boolean).join(", "));
    const closing = await prisma.textbaustein.findFirst({
      where: { OR: [{ kategorie: { contains: "Abschluss" } }, { name: { contains: "Abschluss" } }] },
    });
    const closingText = closing?.inhalt ?? "Das vorliegende Protokoll dokumentiert den Begehungstermin.";
    const buf = await buildBegehungProtokollPdfBuffer({
      projectName: full.project.name,
      projectCode: full.project.code,
      siteAddress: full.project.siteAddress,
      dateLabel: full.date.toLocaleDateString("de-DE"),
      title: full.title,
      notes: full.notes,
      uebersichtFoto: full.uebersichtFoto,
      mangels: full.mangels.map((m) => ({
        beschreibung: m.beschreibung,
        fotoUrl: m.fotoUrl,
        regel: m.regel,
      })),
      verteilerLines,
      closingText,
    });
    attachments.push({
      filename: `begehung-${full.id}.pdf`,
      contentBase64: buf.toString("base64"),
    });
  }

  const send = await sendTransactionalEmail({ to: parsed.data.to, subject, text, attachments });
  if (!send.ok) return NextResponse.json({ error: "E-Mail-Versand fehlgeschlagen" }, { status: 502 });

  await prisma.begehung.update({
    where: { id: full.id },
    data: { versendetAm: new Date() },
  });

  return NextResponse.json({ ok: true, emailMode: send.mode });
}
