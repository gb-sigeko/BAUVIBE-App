import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  contactPersonId: z.string().min(1),
  organizationId: z.string().optional().nullable(),
  role: z.string().min(1),
  isMainContact: z.boolean().optional(),
  validFrom: z.string().min(1).optional().nullable(),
  validUntil: z.string().min(1).optional().nullable(),
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

  const person = await prisma.contactPerson.findFirst({
    where: { id: parsed.data.contactPersonId, active: true },
  });
  if (!person) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const organizationId = parsed.data.organizationId ?? person.organizationId ?? undefined;
  const isPrimary = parsed.data.isMainContact ?? false;
  const validFrom = parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined;
  const validTo = parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined;

  const row = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.projectParticipant.updateMany({
        where: { projectId: params.projectId },
        data: { isPrimary: false },
      });
    }
    return tx.projectParticipant.create({
      data: {
        projectId: params.projectId,
        organizationId,
        contactPersonId: person.id,
        roleInProject: parsed.data.role,
        isPrimary,
        notes: parsed.data.notes ?? undefined,
        ...(validFrom ? { validFrom } : {}),
        ...(validTo !== undefined ? { validTo } : {}),
      },
      include: { organization: true, contactPerson: true },
    });
  });

  return NextResponse.json(row, { status: 201 });
}
