import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const postSchema = z.object({
  fromEmployeeId: z.string().min(1),
  toEmployeeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  affectedProjects: z.array(z.string()).optional(),
  priority: z.number().int().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  if (session.user.role === "EXTERN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.substitute.findMany({
    orderBy: [{ startsOn: "desc" }],
    include: {
      coveredEmployee: { select: { id: true, shortCode: true, displayName: true } },
      delegateEmployee: { select: { id: true, shortCode: true, displayName: true } },
    },
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

  if (parsed.data.fromEmployeeId === parsed.data.toEmployeeId) {
    return NextResponse.json({ error: "from and to must differ" }, { status: 400 });
  }

  const startsOn = new Date(parsed.data.startDate);
  const endsOn = new Date(parsed.data.endDate);
  if (Number.isNaN(startsOn.getTime()) || Number.isNaN(endsOn.getTime()) || endsOn < startsOn) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const affected = parsed.data.affectedProjects ?? [];
  const row = await prisma.substitute.create({
    data: {
      coveredEmployeeId: parsed.data.fromEmployeeId,
      delegateEmployeeId: parsed.data.toEmployeeId,
      startsOn,
      endsOn,
      note: parsed.data.note?.trim() || undefined,
      priority: parsed.data.priority ?? undefined,
      affectedProjectIds: affected,
    },
    include: {
      coveredEmployee: { select: { id: true, shortCode: true, displayName: true } },
      delegateEmployee: { select: { id: true, shortCode: true, displayName: true } },
    },
  });
  return NextResponse.json(row, { status: 201 });
}
