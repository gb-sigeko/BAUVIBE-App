import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  contactPersonId: z.string().min(1),
  role: z.string().min(1),
  isMainContact: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const rows = await prisma.projectContact.findMany({
    where: { projectId: params.projectId },
    include: { contactPerson: { include: { organization: true } } },
    orderBy: [{ isMainContact: "desc" }, { validFrom: "desc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const row = await prisma.projectContact.create({
    data: {
      projectId: params.projectId,
      contactPersonId: parsed.data.contactPersonId,
      role: parsed.data.role,
      isMainContact: parsed.data.isMainContact ?? false,
      notes: parsed.data.notes ?? undefined,
    },
    include: { contactPerson: { include: { organization: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}
