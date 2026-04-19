import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { buildBegehungProtokollPdfBuffer } from "@/lib/begehung-protokoll-reactpdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { projectId: string; begehungId: string } }) {
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

  const verteilerRaw = full.verteiler as unknown;
  const verteilerArr = Array.isArray(verteilerRaw) ? (verteilerRaw as { name?: string; email?: string }[]) : [];
  const verteilerLines = verteilerArr
    .filter((v) => v && (v.email || v.name))
    .map((v) => [v.name, v.email].filter(Boolean).join(", "));

  const closing = await prisma.textbaustein.findFirst({
    where: { OR: [{ kategorie: { contains: "Abschluss" } }, { name: { contains: "Abschluss" } }] },
  });
  const closingText = closing?.inhalt ?? "Das vorliegende Protokoll dokumentiert den Begehungstermin.";

  const bytes = await buildBegehungProtokollPdfBuffer({
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

  const pdfPath = `/api/projects/${params.projectId}/begehungen/${params.begehungId}/pdf`;
  await prisma.begehung.update({
    where: { id: full.id },
    data: { protokollPdf: pdfPath, protocolMissing: false },
  });

  await prisma.protokoll.deleteMany({ where: { begehungId: full.id } });
  await prisma.protokoll.create({
    data: {
      begehungId: full.id,
      filename: `begehung-${full.id}.pdf`,
      status: "HOCHGELADEN",
    },
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="begehung-${full.id}.pdf"`,
    },
  });
}
