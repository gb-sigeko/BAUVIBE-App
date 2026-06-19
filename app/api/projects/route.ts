import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectStatus, Turnus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createProjectSchema = z.object({
  name: z.string().min(1).max(500),
  siteAddress: z.string().min(1).max(500),
  status: z.nativeEnum(ProjectStatus),
  turnus: z.nativeEnum(Turnus),
  contractualBegehungen: z.number().int().min(0).max(9999),
  responsibleEmployeeId: z.string().cuid(),
  code: z.string().min(2).max(48).optional(),
  client: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
});

async function allocateUniqueCode(preferred?: string | null): Promise<string> {
  const base = preferred?.trim();
  if (base) {
    const clash = await prisma.project.findUnique({ where: { code: base }, select: { id: true } });
    if (!clash) return base;
  }
  for (let i = 0; i < 40; i++) {
    const code = `P-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const clash = await prisma.project.findUnique({ where: { code }, select: { id: true } });
    if (!clash) return code;
  }
  throw new Error("Could not allocate project code");
}

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const emp = await prisma.employee.findFirst({
    where: { id: parsed.data.responsibleEmployeeId, active: true },
    select: { id: true },
  });
  if (!emp) {
    return NextResponse.json({ error: "Responsible employee not found or inactive" }, { status: 400 });
  }

  const code = await allocateUniqueCode(parsed.data.code ?? null);

  const row = await prisma.project.create({
    data: {
      code,
      name: parsed.data.name.trim(),
      siteAddress: parsed.data.siteAddress.trim(),
      status: parsed.data.status,
      turnus: parsed.data.turnus,
      contractualBegehungen: parsed.data.contractualBegehungen,
      responsibleEmployeeId: parsed.data.responsibleEmployeeId,
      client: parsed.data.client?.trim() || undefined,
      description: parsed.data.description?.trim() || undefined,
    },
  });

  return NextResponse.json(row, { status: 201 });
}
