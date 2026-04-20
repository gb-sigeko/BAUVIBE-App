import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  legalForm: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const q = new URL(req.url).searchParams.get("q")?.trim();

  const rows = await prisma.organization.findMany({
    where: {
      active: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { contacts: true } },
    },
    orderBy: { name: "asc" },
    take: q ? 50 : undefined,
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

  const row = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      legalForm: parsed.data.legalForm ?? undefined,
      address: parsed.data.address ?? undefined,
      industry: parsed.data.industry ?? undefined,
      notes: parsed.data.notes ?? undefined,
      active: parsed.data.active ?? true,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
