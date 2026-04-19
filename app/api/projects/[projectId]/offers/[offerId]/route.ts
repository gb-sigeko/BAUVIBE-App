import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import type { OfferStatus } from "@/generated/prisma/client";

const patchSchema = z.object({
  status: z.enum(["ENTWURF", "FREIGEGEBEN", "VERSENDET", "ABGELEHNT"]).optional(),
  emailInput: z.string().min(3).optional(),
  kalkulation: z.record(z.unknown()).optional(),
  freigabe: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { projectId: string; offerId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const offer = await prisma.offer.findFirst({
    where: { id: params.offerId, projectId: params.projectId },
  });
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  let freigegebenVonId: string | null | undefined = undefined;
  let freigabeAm: Date | null | undefined = undefined;
  if (parsed.data.freigabe) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employeeId: true },
    });
    freigegebenVonId = user?.employeeId ?? null;
    freigabeAm = new Date();
  }

  const data: {
    status?: OfferStatus;
    emailInput?: string;
    kalkulation?: object;
    freigegebenVonId?: string | null;
    freigabeAm?: Date | null;
  } = {};
  if (parsed.data.status) data.status = parsed.data.status as OfferStatus;
  if (parsed.data.emailInput) data.emailInput = parsed.data.emailInput;
  if (parsed.data.kalkulation) data.kalkulation = parsed.data.kalkulation as object;
  if (parsed.data.freigabe !== undefined) {
    data.freigegebenVonId = freigegebenVonId ?? null;
    data.freigabeAm = freigabeAm ?? null;
    if (parsed.data.freigabe) data.status = "FREIGEGEBEN";
  }

  const updated = await prisma.offer.update({ where: { id: offer.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { projectId: string; offerId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const offer = await prisma.offer.findFirst({
    where: { id: params.offerId, projectId: params.projectId },
  });
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.offer.delete({ where: { id: offer.id } });
  return NextResponse.json({ ok: true });
}
