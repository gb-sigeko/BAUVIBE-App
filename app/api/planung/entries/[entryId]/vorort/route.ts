import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertVorOrtRueckmeldungAccess, requireApiUser } from "@/lib/api-helpers";

const createSchema = z.object({
  aushangOk: z.boolean().optional().nullable(),
  werbungOk: z.boolean().optional().nullable(),
  unterbrechung: z.string().optional().nullable(),
  rueckmeldung: z.string().min(1),
});

export async function GET(_req: Request, { params }: { params: { entryId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const entry = await prisma.planungEntry.findUnique({
    where: { id: params.entryId },
    include: { vorOrtRueckmeldungen: { orderBy: { gemeldetAm: "desc" } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const denied = assertVorOrtRueckmeldungAccess(session, entry);
  if (denied) return denied;

  return NextResponse.json(entry.vorOrtRueckmeldungen);
}

export async function POST(req: Request, { params }: { params: { entryId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const entry = await prisma.planungEntry.findUnique({ where: { id: params.entryId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const denied = assertVorOrtRueckmeldungAccess(session, entry);
  if (denied) return denied;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const row = await prisma.vorOrtRueckmeldung.create({
    data: {
      planungId: entry.id,
      aushangOk: parsed.data.aushangOk ?? null,
      werbungOk: parsed.data.werbungOk ?? null,
      unterbrechung: parsed.data.unterbrechung ?? null,
      rueckmeldung: parsed.data.rueckmeldung,
    },
  });
  return NextResponse.json(row);
}
