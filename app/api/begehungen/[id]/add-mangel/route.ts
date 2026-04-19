import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { findBegehungWithProject, begehungNotFound } from "@/lib/begehung-by-id";

const bodySchema = z.object({
  fotoUrl: z.string().min(1),
  beschreibung: z.string().min(1),
  regel: z.string().optional(),
  textbausteinId: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const b = await findBegehungWithProject(params.id);
  if (!b) return begehungNotFound();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const m = await prisma.mangel.create({
    data: {
      begehungId: b.id,
      fotoUrl: parsed.data.fotoUrl,
      beschreibung: parsed.data.beschreibung,
      regel: parsed.data.regel,
      textbausteinId: parsed.data.textbausteinId,
    },
  });
  return NextResponse.json(m, { status: 201 });
}
