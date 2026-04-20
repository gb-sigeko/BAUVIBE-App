import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

export async function GET() {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  return NextResponse.json({
    ok: true,
    role: session.user.role,
    at: new Date().toISOString(),
  });
}
