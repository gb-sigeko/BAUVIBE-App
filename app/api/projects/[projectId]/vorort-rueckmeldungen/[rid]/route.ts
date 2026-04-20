import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { appendChronikEntry } from "@/lib/chronik";

const patchSchema = z.object({
  bearbeitet: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: { projectId: string; rid: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const row = await prisma.vorOrtRueckmeldung.findFirst({
    where: { id: params.rid, planung: { projectId: params.projectId } },
    include: { planung: { select: { id: true, isoYear: true, isoWeek: true } } },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const becameDone = parsed.data.bearbeitet === true && !row.bearbeitet;

  const updated = await prisma.vorOrtRueckmeldung.update({
    where: { id: row.id },
    data: { bearbeitet: parsed.data.bearbeitet },
  });

  if (becameDone) {
    await appendChronikEntry({
      projectId: params.projectId,
      authorId: session.user.id,
      body: `Vor-Ort-Rückmeldung als erledigt markiert (KW ${row.planung.isoWeek}/${row.planung.isoYear}).`,
      action: "ARBEITSKORB_ERLEDIGT",
      targetType: "VorOrtRueckmeldung",
      targetId: updated.id,
    });
  }

  return NextResponse.json(updated);
}
