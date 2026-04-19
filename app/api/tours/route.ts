import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const postSchema = z.object({
  isoYear: z.number().int(),
  isoWeek: z.number().int().min(1).max(53),
  employeeId: z.string().min(1),
  region: z.string().min(1),
  sortOrder: z.array(z.string()),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  date: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  if (session.user.role === "EXTERN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const isoYear = url.searchParams.get("isoYear");
  const isoWeek = url.searchParams.get("isoWeek");
  const employeeId = url.searchParams.get("employeeId");
  if (!isoYear || !isoWeek) {
    return NextResponse.json({ error: "isoYear and isoWeek required" }, { status: 400 });
  }

  const rows = await prisma.tour.findMany({
    where: {
      isoYear: Number.parseInt(isoYear, 10),
      isoWeek: Number.parseInt(isoWeek, 10),
      ...(employeeId ? { employeeId } : {}),
    },
    include: { employee: { select: { id: true, shortCode: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const row = await prisma.tour.create({
    data: {
      isoYear: parsed.data.isoYear,
      isoWeek: parsed.data.isoWeek,
      employeeId: parsed.data.employeeId,
      region: parsed.data.region,
      sortOrder: parsed.data.sortOrder,
      status: parsed.data.status ?? "geplant",
      notes: parsed.data.notes?.trim() || undefined,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    },
    include: { employee: { select: { id: true, shortCode: true, displayName: true } } },
  });
  return NextResponse.json(row, { status: 201 });
}
