import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

export async function DELETE(_req: Request, { params }: { params: { projectId: string; linkId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const row = await prisma.projectContact.findFirst({
    where: { id: params.linkId, projectId: params.projectId },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectContact.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
