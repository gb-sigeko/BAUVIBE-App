import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

export async function DELETE(
  _req: Request,
  { params }: { params: { projectId: string; begehungId: string; mangelId: string } },
) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { begehung, response: bRes } = await assertBegehung(params.projectId, params.begehungId);
  if (!begehung) return bRes!;

  const m = await prisma.mangel.findFirst({
    where: { id: params.mangelId, begehungId: begehung.id },
  });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mangel.delete({ where: { id: m.id } });
  return NextResponse.json({ ok: true });
}
