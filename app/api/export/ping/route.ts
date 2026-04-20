import { NextResponse } from "next/server";

/** Minimaler Export-Endpunkt (Middleware prüft Rollen; echte Exporte folgen später). */
export async function GET() {
  return NextResponse.json({ ok: true });
}
