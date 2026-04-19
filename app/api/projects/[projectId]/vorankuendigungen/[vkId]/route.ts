import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import type { VKStatus } from "@/generated/prisma/client";

const patchSchema = z.object({
  status: z.enum(["ENTWURF", "PDF_ERZEUGT", "VERSENDET"]).optional(),
  pdfFormular: z.string().min(1).optional(),
  arbeitsschutzAntworten: z.record(z.unknown()).optional(),
  generiertesPdf: z.string().nullable().optional(),
  versendetAm: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { projectId: string; vkId: string } }) {
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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: {
    status?: VKStatus;
    pdfFormular?: string;
    arbeitsschutzAntworten?: object;
    generiertesPdf?: string | null;
    versendetAm?: Date | null;
  } = {};
  if (parsed.data.status) data.status = parsed.data.status as VKStatus;
  if (parsed.data.pdfFormular) data.pdfFormular = parsed.data.pdfFormular;
  if (parsed.data.arbeitsschutzAntworten) data.arbeitsschutzAntworten = parsed.data.arbeitsschutzAntworten as object;
  if (parsed.data.generiertesPdf !== undefined) data.generiertesPdf = parsed.data.generiertesPdf;
  if (parsed.data.versendetAm !== undefined) data.versendetAm = parsed.data.versendetAm ? new Date(parsed.data.versendetAm) : null;

  const updated = await prisma.vorankuendigung.update({ where: { id: row.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { projectId: string; vkId: string } }) {
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

  await prisma.vorankuendigung.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
