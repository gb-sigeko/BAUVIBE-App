import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  emailInput: z.string().min(3),
  kalkulation: z.record(z.unknown()).optional().default({}),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const offers = await prisma.offer.findMany({
    where: { projectId: params.projectId },
    orderBy: { createdAt: "desc" },
    include: { freigegebenVon: { select: { displayName: true, shortCode: true } } },
  });
  return NextResponse.json(offers);
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const offer = await prisma.offer.create({
    data: {
      projectId: params.projectId,
      emailInput: parsed.data.emailInput,
      kalkulation: parsed.data.kalkulation as object,
    },
  });
  return NextResponse.json(offer);
}
