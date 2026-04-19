import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { buildPdfDocument } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: { projectId: string; offerId: string } }) {
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

  const kalk = JSON.stringify(offer.kalkulation, null, 2);
  const bytes = await buildPdfDocument({
    title: `Angebot · ${project.name}`,
    sections: [
      { heading: "Kundene-Mail", body: offer.emailInput },
      { heading: "Kalkulation (JSON)", body: kalk.slice(0, 8000) },
      { heading: "Status", body: offer.status },
    ],
  });

  const pdfPath = `/api/projects/${params.projectId}/offers/${params.offerId}/pdf`;
  await prisma.offer.update({
    where: { id: offer.id },
    data: { pdfUrl: pdfPath },
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="angebot-${offer.id}.pdf"`,
    },
  });
}
