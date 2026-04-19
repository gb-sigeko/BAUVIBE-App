import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  protocolMissing: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.task.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status ?? undefined,
      protocolMissing: parsed.data.protocolMissing ?? undefined,
    },
    include: { project: { select: { id: true, code: true, name: true } }, assignee: true },
  });
  return NextResponse.json(row);
}
