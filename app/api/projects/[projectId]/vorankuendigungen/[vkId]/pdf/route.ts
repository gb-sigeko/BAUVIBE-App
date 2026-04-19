import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { buildPdfDocument } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: { projectId: string; vkId: string } }) {
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

  const apiPath = `/api/projects/${params.projectId}/vorankuendigungen/${params.vkId}/pdf`;
  const bytes = await buildPdfDocument({
    title: `Vorankündigung · ${project.name}`,
    sections: [
      { heading: "PDF-Formular (URL)", body: row.pdfFormular },
      { heading: "Arbeitsschutz (Auszug)", body: JSON.stringify(row.arbeitsschutzAntworten, null, 2).slice(0, 6000) },
      { heading: "Status", body: row.status },
    ],
  });

  await prisma.vorankuendigung.update({
    where: { id: row.id },
    data: {
      generiertesPdf: apiPath,
      status: "PDF_ERZEUGT",
    },
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vorankuendigung-${row.id}.pdf"`,
    },
  });
}
