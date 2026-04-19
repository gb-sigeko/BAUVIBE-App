import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { buildPdfDocument } from "@/lib/pdf";

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

  const mangelText = full.mangels
    .map((m) => `• ${m.beschreibung}${m.regel ? ` (${m.regel})` : ""}`)
    .join("\n");

  const verteiler =
    typeof full.verteiler === "string"
      ? full.verteiler
      : JSON.stringify(full.verteiler, null, 2);

  const bytes = await buildPdfDocument({
    title: `Begehungsprotokoll · ${full.project.name}`,
    sections: [
      { heading: "Datum", body: full.date.toISOString() },
      { heading: "Titel", body: full.title ?? "—" },
      { heading: "Notizen", body: full.notes ?? "—" },
      { heading: "Übersichtsfoto", body: full.uebersichtFoto ?? "—" },
      { heading: "Mängel", body: mangelText || "Keine erfasst." },
      { heading: "Verteiler (JSON)", body: verteiler.slice(0, 4000) },
    ],
  });

  const pdfPath = `/api/projects/${params.projectId}/begehungen/${params.begehungId}/pdf`;
  await prisma.begehung.update({
    where: { id: full.id },
    data: { protokollPdf: pdfPath },
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="begehung-${full.id}.pdf"`,
    },
  });
}
