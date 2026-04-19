import { NextResponse } from "next/server";
import { z } from "zod";
import { CommunicationKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  kind: z.nativeEnum(CommunicationKind),
  body: z.string().min(1),
  subject: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
  contactPersonId: z.string().optional().nullable(),
  occurredAt: z.string().datetime().optional(),
  responsibleEmployeeId: z.string().optional().nullable(),
  status: z.string().optional(),
  followUp: z.string().datetime().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const rows = await prisma.communication.findMany({
    where: { projectId: params.projectId },
    include: {
      organization: true,
      contactPerson: true,
      responsibleEmployee: { select: { id: true, shortCode: true, displayName: true } },
    },
    orderBy: { occurredAt: "desc" },
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

  const row = await prisma.communication.create({
    data: {
      projectId: params.projectId,
      kind: parsed.data.kind,
      body: parsed.data.body,
      subject: parsed.data.subject ?? undefined,
      organizationId: parsed.data.organizationId ?? undefined,
      contactPersonId: parsed.data.contactPersonId ?? undefined,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
      responsibleEmployeeId: parsed.data.responsibleEmployeeId ?? undefined,
      status: parsed.data.status ?? undefined,
      followUp: parsed.data.followUp ? new Date(parsed.data.followUp) : undefined,
    },
    include: {
      organization: true,
      contactPerson: true,
      responsibleEmployee: { select: { id: true, shortCode: true, displayName: true } },
    },
  });
  return NextResponse.json(row, { status: 201 });
}
