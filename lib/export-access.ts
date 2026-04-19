import { NextResponse } from "next/server";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";

export async function requireExportSession() {
  const { session, response } = await requireApiUser();
  if (!session) return { session: null, response: response! };
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return { session: null, response: forbidden };
  return { session, response: null };
}
