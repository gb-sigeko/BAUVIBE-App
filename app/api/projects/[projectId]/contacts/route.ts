import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z
  .object({
    contactPersonId: z.string().optional().nullable(),
    organizationId: z.string().optional().nullable(),
    role: z.string().min(1),
    isMainContact: z.boolean().optional(),
    validFrom: z.string().min(1).optional().nullable(),
    validUntil: z.string().min(1).optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine((d) => Boolean(d.contactPersonId?.trim()) || Boolean(d.organizationId?.trim()), {
    message: "contactPersonId or organizationId required",
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

  const contactId = parsed.data.contactPersonId?.trim() || null;
  const orgIdParam = parsed.data.organizationId?.trim() || null;

  let organizationId: string | null | undefined = orgIdParam ?? undefined;
  let contactPersonId: string | null = contactId;

  if (contactId) {
    const person = await prisma.contactPerson.findFirst({
      where: { id: contactId, active: true },
    });
    if (!person) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    organizationId = orgIdParam ?? person.organizationId ?? undefined;
  } else if (orgIdParam) {
    const org = await prisma.organization.findFirst({ where: { id: orgIdParam, active: true } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    organizationId = org.id;
    contactPersonId = null;
  } else {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

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
        organizationId: organizationId ?? undefined,
        contactPersonId: contactPersonId,
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
