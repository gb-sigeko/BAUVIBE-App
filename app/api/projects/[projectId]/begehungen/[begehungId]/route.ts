import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertBegehung, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  protocolMissing: z.boolean().optional(),
  uebersichtFoto: z.string().nullable().optional(),
  protokollPdf: z.string().nullable().optional(),
  textbausteine: z.unknown().optional(),
  verteiler: z.unknown().optional(),
  versendetAm: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { projectId: string; begehungId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { begehung, response: bRes } = await assertBegehung(params.projectId, params.begehungId);
  if (!begehung) return bRes!;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.begehung.update({
    where: { id: begehung.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.protocolMissing !== undefined ? { protocolMissing: parsed.data.protocolMissing } : {}),
      ...(parsed.data.uebersichtFoto !== undefined ? { uebersichtFoto: parsed.data.uebersichtFoto } : {}),
      ...(parsed.data.protokollPdf !== undefined ? { protokollPdf: parsed.data.protokollPdf } : {}),
      ...(parsed.data.textbausteine !== undefined ? { textbausteine: parsed.data.textbausteine as object } : {}),
      ...(parsed.data.verteiler !== undefined ? { verteiler: parsed.data.verteiler as object } : {}),
      ...(parsed.data.versendetAm !== undefined
        ? { versendetAm: parsed.data.versendetAm ? new Date(parsed.data.versendetAm) : null }
        : {}),
    },
  });
  return NextResponse.json(updated);
}
