import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const row = await prisma.availability.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "EXTERN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employeeId: true },
    });
    if (!me?.employeeId || me.employeeId !== row.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const forbidden = requireWriteRole(session.user.role);
    if (forbidden) return forbidden;
  }

  await prisma.availability.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
