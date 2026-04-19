import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { findBegehungWithProject, begehungNotFound } from "@/lib/begehung-by-id";

const entrySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  gewerk: z.string().optional(),
  send: z.boolean().optional(),
});

const bodySchema = z.object({
  entries: z.array(entrySchema),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const b = await findBegehungWithProject(params.id);
  if (!b) return begehungNotFound();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await prisma.begehung.update({
    where: { id: b.id },
    data: { verteiler: parsed.data.entries },
  });
  return NextResponse.json({ ok: true });
}
