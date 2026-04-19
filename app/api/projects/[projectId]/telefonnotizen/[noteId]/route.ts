import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  notiz: z.string().min(1).optional(),
  erledigt: z.boolean().optional(),
  followUp: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { projectId: string; noteId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const row = await prisma.telefonnotiz.findFirst({
    where: { id: params.noteId, projectId: params.projectId },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.telefonnotiz.update({
    where: { id: row.id },
    data: {
      ...(parsed.data.notiz !== undefined ? { notiz: parsed.data.notiz } : {}),
      ...(parsed.data.erledigt !== undefined ? { erledigt: parsed.data.erledigt } : {}),
      ...(parsed.data.followUp !== undefined
        ? { followUp: parsed.data.followUp ? new Date(parsed.data.followUp) : null }
        : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { projectId: string; noteId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const row = await prisma.telefonnotiz.findFirst({
    where: { id: params.noteId, projectId: params.projectId },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.telefonnotiz.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
