import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { EmployeeKind, EmployeeJobRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { normalizeShortCode } from "@/lib/employee-shortcode";

const createSchema = z.object({
  shortCode: z.string().min(1).max(32),
  displayName: z.string().min(1).max(200),
  kind: z.nativeEnum(EmployeeKind),
  jobRole: z.nativeEnum(EmployeeJobRole).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  weeklyCapacity: z.number().int().min(1).max(7).optional(),
  qualifications: z.unknown().optional().nullable(),
  contactInfo: z.unknown().optional().nullable(),
});

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  if (session.user.role === "EXTERN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    orderBy: { shortCode: "asc" },
    select: {
      id: true,
      shortCode: true,
      displayName: true,
      kind: true,
      jobRole: true,
      active: true,
      region: true,
      weeklyCapacity: true,
    },
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const shortCode = normalizeShortCode(parsed.data.shortCode);
  const clash = await prisma.employee.findFirst({
    where: { shortCode: { equals: shortCode, mode: "insensitive" } },
    select: { id: true },
  });
  if (clash) return NextResponse.json({ error: "shortCode already exists" }, { status: 409 });

  const data: Prisma.EmployeeCreateInput = {
    shortCode,
    displayName: parsed.data.displayName.trim(),
    kind: parsed.data.kind,
    jobRole: parsed.data.jobRole ?? undefined,
    region: parsed.data.region?.trim() || undefined,
    weeklyCapacity: parsed.data.weeklyCapacity ?? undefined,
  };
  if (parsed.data.qualifications !== undefined && parsed.data.qualifications !== null) {
    data.qualifications = parsed.data.qualifications as Prisma.InputJsonValue;
  }
  if (parsed.data.contactInfo !== undefined && parsed.data.contactInfo !== null) {
    data.contactInfo = parsed.data.contactInfo as Prisma.InputJsonValue;
  }

  const row = await prisma.employee.create({ data });
  return NextResponse.json(row, { status: 201 });
}
