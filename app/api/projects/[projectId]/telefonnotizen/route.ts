import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser, requireWriteRole } from "@/lib/api-helpers";

const createSchema = z.object({
  notiz: z.string().min(1),
  followUp: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const { project, response: pRes } = await assertProject(params.projectId);
  if (!project) return pRes!;

  const rows = await prisma.telefonnotiz.findMany({
    where: { projectId: params.projectId },
    orderBy: { erfasstAm: "desc" },
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

  const name = session.user.name ?? session.user.email ?? session.user.id;
  const row = await prisma.telefonnotiz.create({
    data: {
      projectId: params.projectId,
      notiz: parsed.data.notiz,
      erfasstVon: name,
      followUp: parsed.data.followUp ? new Date(parsed.data.followUp) : null,
    },
  });

  await prisma.chronicleEntry.create({
    data: {
      projectId: params.projectId,
      authorId: session.user.id,
      body: `Telefonnotiz: ${parsed.data.notiz}`,
    },
  });

  return NextResponse.json(row);
}
