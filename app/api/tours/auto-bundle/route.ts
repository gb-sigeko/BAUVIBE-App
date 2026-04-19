import { NextResponse } from "next/server";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

export async function POST() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  return NextResponse.json({ ok: false, message: "Automatische Bündelung ist noch nicht implementiert." }, { status: 501 });
}
