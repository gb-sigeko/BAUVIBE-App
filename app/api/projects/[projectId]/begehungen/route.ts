import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { BegehungStatus } from "@/generated/prisma/client";

const createSchema = z.object({
  date: z.string().min(1),
  employeeId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const d = new Date(parsed.data.date);
  if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const agg = await prisma.begehung.aggregate({
    where: { projectId: project.id },
    _max: { laufendeNr: true },
  });
  const nextNr = (agg._max.laufendeNr ?? 0) + 1;

  const empId = parsed.data.employeeId?.trim() || null;
  if (empId) {
    const emp = await prisma.employee.findFirst({ where: { id: empId, active: true } });
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 400 });
  }

  const row = await prisma.begehung.create({
    data: {
      projectId: project.id,
      date: d,
      title: parsed.data.title?.trim() || null,
      employeeId: empId,
      laufendeNr: nextNr,
      begehungStatus: BegehungStatus.GEPLANT,
      protocolMissing: true,
    },
  });

  return NextResponse.json(row, { status: 201 });
}
