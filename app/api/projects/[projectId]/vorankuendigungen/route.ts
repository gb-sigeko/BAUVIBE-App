import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  pdfFormular: z.string().min(1),
  arbeitsschutzAntworten: z.record(z.unknown()).optional().default({}),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const rows = await prisma.vorankuendigung.findMany({
    where: { projectId: params.projectId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

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

  const row = await prisma.vorankuendigung.create({
    data: {
      projectId: params.projectId,
      pdfFormular: parsed.data.pdfFormular,
      arbeitsschutzAntworten: parsed.data.arbeitsschutzAntworten as object,
    },
  });
  return NextResponse.json(row);
}
