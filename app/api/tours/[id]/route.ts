import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const putSchema = z.object({
  sortOrder: z.array(z.string()).optional(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  employeeId: z.string().optional(),
  region: z.string().optional(),
  conflictFlag: z.boolean().optional(),
  date: z.string().datetime().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const existing = await prisma.tour.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const d = parsed.data;
  const data: Prisma.TourUncheckedUpdateInput = {};
  if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;
  if (d.status !== undefined) data.status = d.status;
  if (d.notes !== undefined) data.notes = d.notes;
  if (d.employeeId !== undefined) data.employeeId = d.employeeId;
  if (d.region !== undefined) data.region = d.region;
  if (d.conflictFlag !== undefined) data.conflictFlag = d.conflictFlag;
  if (d.date !== undefined) data.date = d.date ? new Date(d.date) : null;

  const row = await prisma.tour.update({ where: { id: params.id }, data });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const existing = await prisma.tour.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tour.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
