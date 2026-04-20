import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  status: z.string().min(1).optional(),
  followUp: z.string().datetime().nullable().optional(),
  subject: z.string().optional().nullable(),
  body: z.string().min(1).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { projectId: string; communicationId: string } },
) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const existing = await prisma.communication.findFirst({
    where: { id: params.communicationId, projectId: params.projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const row = await prisma.communication.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.followUp !== undefined
        ? { followUp: parsed.data.followUp ? new Date(parsed.data.followUp) : null }
        : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
      ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
    },
    include: {
      organization: true,
      contactPerson: true,
      responsibleEmployee: { select: { id: true, shortCode: true, displayName: true } },
    },
  });

  return NextResponse.json(row);
}
