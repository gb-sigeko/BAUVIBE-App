import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  organizationId: z.string().optional().nullable(),
  name: z.string().min(1),
  functionTitle: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  phone: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const q = searchParams.get("q")?.trim();

  const rows = await prisma.contactPerson.findMany({
    where: {
      active: true,
      ...(organizationId ? { organizationId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { organization: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const email = parsed.data.email === "" || parsed.data.email == null ? null : parsed.data.email;

  const row = await prisma.contactPerson.create({
    data: {
      organizationId: parsed.data.organizationId ?? undefined,
      name: parsed.data.name,
      functionTitle: parsed.data.functionTitle ?? undefined,
      email: email ?? undefined,
      phone: parsed.data.phone ?? undefined,
      active: parsed.data.active ?? true,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
