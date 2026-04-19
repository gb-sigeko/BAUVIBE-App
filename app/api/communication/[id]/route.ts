import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  erledigt: z.boolean().optional(),
  followUp: z.string().datetime().optional().nullable(),
  body: z.string().min(1).optional(),
  subject: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.communication.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.communication.update({
    where: { id: params.id },
    data: {
      erledigt: parsed.data.erledigt ?? undefined,
      followUp: parsed.data.followUp === undefined ? undefined : parsed.data.followUp ? new Date(parsed.data.followUp) : null,
      body: parsed.data.body,
      subject: parsed.data.subject === undefined ? undefined : parsed.data.subject,
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      contactPerson: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(row);
}
