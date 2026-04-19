import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  role: z.string().min(1).optional(),
  isMainContact: z.boolean().optional(),
  validFrom: z.string().min(1).optional(),
  validUntil: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { projectId: string; participantId: string } },
) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const existing = await prisma.projectParticipant.findFirst({
    where: { id: params.participantId, projectId: params.projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const d = parsed.data;
  const isPrimary = d.isMainContact;

  const row = await prisma.$transaction(async (tx) => {
    if (isPrimary === true) {
      await tx.projectParticipant.updateMany({
        where: { projectId: params.projectId, id: { not: existing.id } },
        data: { isPrimary: false },
      });
    }
    return tx.projectParticipant.update({
      where: { id: existing.id },
      data: {
        ...(d.role !== undefined ? { roleInProject: d.role } : {}),
        ...(isPrimary !== undefined ? { isPrimary } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.validFrom !== undefined ? { validFrom: new Date(d.validFrom) } : {}),
        ...(d.validUntil !== undefined ? { validTo: d.validUntil ? new Date(d.validUntil) : null } : {}),
      },
      include: { organization: true, contactPerson: true },
    });
  });

  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { projectId: string; participantId: string } },
) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const existing = await prisma.projectParticipant.findFirst({
    where: { id: params.participantId, projectId: params.projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectParticipant.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
