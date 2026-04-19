import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  organizationId: z.string().optional().nullable(),
  contactPersonId: z.string().optional().nullable(),
  roleInProject: z.string().min(1),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const rows = await prisma.projectParticipant.findMany({
    where: { projectId: params.projectId },
    include: { organization: true, contactPerson: true },
    orderBy: [{ isPrimary: "desc" }, { validFrom: "desc" }],
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

  const row = await prisma.projectParticipant.create({
    data: {
      projectId: params.projectId,
      organizationId: parsed.data.organizationId ?? undefined,
      contactPersonId: parsed.data.contactPersonId ?? undefined,
      roleInProject: parsed.data.roleInProject,
      isPrimary: parsed.data.isPrimary ?? false,
      notes: parsed.data.notes ?? undefined,
    },
    include: { organization: true, contactPerson: true },
  });
  return NextResponse.json(row, { status: 201 });
}
