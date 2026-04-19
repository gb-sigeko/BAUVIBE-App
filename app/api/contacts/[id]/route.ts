import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const patchSchema = z.object({
  organizationId: z.string().optional().nullable(),
  name: z.string().min(1).optional(),
  functionTitle: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  phone: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.contactPerson.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { email, ...rest } = parsed.data;
  const row = await prisma.contactPerson.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email === "" ? null : email } : {}),
    },
  });
  return NextResponse.json(row);
}
