import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { PlanungStatus, SpecialCode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { recalcConflictsForWeek } from "@/lib/planung-conflicts";
import { computeIsCompletedForContract } from "@/lib/turnus-engine";
import { getIsoWeekParts } from "@/lib/utils";

const updateSchema = z.object({
  employeeId: z.string().optional().nullable(),
  isoYear: z.number().int().optional(),
  isoWeek: z.number().int().min(1).max(53).optional(),
  feedback: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
  planungStatus: z.nativeEnum(PlanungStatus).optional(),
  isCompletedForContract: z.boolean().optional(),
  specialCode: z.nativeEnum(SpecialCode).optional(),
  tourId: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const existing = await prisma.planungEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const d = parsed.data;
  const data: Prisma.PlanungEntryUncheckedUpdateInput = {};
  if (d.employeeId !== undefined) data.employeeId = d.employeeId;
  if (d.isoYear !== undefined) data.isoYear = d.isoYear;
  if (d.isoWeek !== undefined) data.isoWeek = d.isoWeek;
  if (d.feedback !== undefined) data.feedback = d.feedback;
  if (d.note !== undefined) data.note = d.note;
  if (d.plannedDate !== undefined) {
    const dt =
      d.plannedDate === null || d.plannedDate === "" ? null : new Date(d.plannedDate);
    if (dt && Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "Invalid plannedDate" }, { status: 400 });
    }
    data.plannedDate = dt;
    if (dt) {
      const parts = getIsoWeekParts(dt);
      data.isoYear = parts.isoYear;
      data.isoWeek = parts.isoWeek;
    }
  }
  if (d.planungStatus !== undefined) data.planungStatus = d.planungStatus;
  if (d.tourId !== undefined) data.tourId = d.tourId;
  if (d.specialCode !== undefined) data.specialCode = d.specialCode;

  const nextStatus = d.planungStatus ?? existing.planungStatus;
  const nextSpecial = d.specialCode ?? existing.specialCode;
  const nextEmpId = d.employeeId !== undefined ? d.employeeId : existing.employeeId;
  if (d.planungStatus !== undefined || d.specialCode !== undefined || d.employeeId !== undefined) {
    const emp = nextEmpId ? await prisma.employee.findUnique({ where: { id: nextEmpId } }) : null;
    data.isCompletedForContract = computeIsCompletedForContract({
      planungStatus: nextStatus,
      specialCode: nextSpecial,
      employeeShortCode: emp?.shortCode,
    });
  } else if (d.isCompletedForContract !== undefined) {
    data.isCompletedForContract = d.isCompletedForContract;
  }

  const row = await prisma.planungEntry.update({
    where: { id: params.id },
    data,
  });
  await recalcConflictsForWeek(row.isoYear, row.isoWeek);
  if (existing.isoYear !== row.isoYear || existing.isoWeek !== row.isoWeek) {
    await recalcConflictsForWeek(existing.isoYear, existing.isoWeek);
  }
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const existing = await prisma.planungEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.planungEntry.delete({ where: { id: params.id } });
  await recalcConflictsForWeek(existing.isoYear, existing.isoWeek);
  return NextResponse.json({ ok: true });
}
