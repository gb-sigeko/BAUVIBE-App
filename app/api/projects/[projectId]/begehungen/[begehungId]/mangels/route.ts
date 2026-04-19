import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  fotoUrl: z.string().min(1),
  beschreibung: z.string().min(1),
  regel: z.string().optional(),
  textbausteinId: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string; begehungId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { begehung, response: bRes } = await assertBegehung(params.projectId, params.begehungId);
  if (!begehung) return bRes!;

  const mangels = await prisma.mangel.findMany({
    where: { begehungId: begehung.id },
    orderBy: { createdAt: "desc" },
    include: { textbaustein: { select: { id: true, name: true } } },
  });
  return NextResponse.json(mangels);
}

export async function POST(req: Request, { params }: { params: { projectId: string; begehungId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { begehung, response: bRes } = await assertBegehung(params.projectId, params.begehungId);
  if (!begehung) return bRes!;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const m = await prisma.mangel.create({
    data: {
      begehungId: begehung.id,
      fotoUrl: parsed.data.fotoUrl,
      beschreibung: parsed.data.beschreibung,
      regel: parsed.data.regel,
      textbausteinId: parsed.data.textbausteinId,
    },
  });
  return NextResponse.json(m);
}
