import { NextResponse } from "next/server";
import { z } from "zod";
import { AvailabilityReason } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const postSchema = z.object({
  employeeId: z.string().min(1),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
  reason: z.nativeEnum(AvailabilityReason).optional(),
  note: z.string().max(2000).optional().nullable(),
});

export async function GET(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!employeeId || !from || !to) {
    return NextResponse.json({ error: "employeeId, from, to required" }, { status: 400 });
  }

  if (session.user.role === "EXTERN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employeeId: true },
    });
    if (!me?.employeeId || me.employeeId !== employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const fromD = new Date(from);
  const toD = new Date(to);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const rows = await prisma.availability.findMany({
    where: {
      employeeId,
      startsOn: { lte: toD },
      endsOn: { gte: fromD },
    },
    orderBy: { startsOn: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (session.user.role === "EXTERN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employeeId: true },
    });
    if (!me?.employeeId || me.employeeId !== parsed.data.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const forbidden = requireWriteRole(session.user.role);
    if (forbidden) return forbidden;
  }

  const startsOn = new Date(parsed.data.startsOn);
  const endsOn = new Date(parsed.data.endsOn);
  if (Number.isNaN(startsOn.getTime()) || Number.isNaN(endsOn.getTime()) || endsOn < startsOn) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const row = await prisma.availability.create({
    data: {
      employeeId: parsed.data.employeeId,
      startsOn,
      endsOn,
      reason: parsed.data.reason ?? "URLAUB",
      note: parsed.data.note?.trim() || undefined,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
