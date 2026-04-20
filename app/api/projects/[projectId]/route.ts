import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectStatus, Turnus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  siteAddress: z.string().min(1).max(500).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  turnus: z.nativeEnum(Turnus).optional(),
  contractualBegehungen: z.number().int().min(0).max(9999).optional(),
  responsibleEmployeeId: z.string().cuid().optional().nullable(),
  client: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  code: z.string().min(2).max(48).optional(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  return NextResponse.json(project);
}

export async function PATCH(req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const json = await req.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.responsibleEmployeeId !== undefined && parsed.data.responsibleEmployeeId !== null) {
    const emp = await prisma.employee.findFirst({
      where: { id: parsed.data.responsibleEmployeeId, active: true },
      select: { id: true },
    });
    if (!emp) {
      return NextResponse.json({ error: "Responsible employee not found or inactive" }, { status: 400 });
    }
  }

  if (parsed.data.code && parsed.data.code !== project.code) {
    const clash = await prisma.project.findFirst({
      where: { code: parsed.data.code, NOT: { id: project.id } },
      select: { id: true },
    });
    if (clash) return NextResponse.json({ error: "code already in use" }, { status: 409 });
  }

  const data = parsed.data;
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.siteAddress !== undefined ? { siteAddress: data.siteAddress.trim() } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.turnus !== undefined ? { turnus: data.turnus } : {}),
      ...(data.contractualBegehungen !== undefined ? { contractualBegehungen: data.contractualBegehungen } : {}),
      ...(data.responsibleEmployeeId !== undefined ? { responsibleEmployeeId: data.responsibleEmployeeId } : {}),
      ...(data.client !== undefined ? { client: data.client?.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.code !== undefined ? { code: data.code.trim() } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  await prisma.project.delete({ where: { id: project.id } });
  return NextResponse.json({ ok: true });
}
