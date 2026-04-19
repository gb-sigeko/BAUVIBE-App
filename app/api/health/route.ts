import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch (e) {
    console.error("[health] DB ping failed", e);
    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503 },
    );
  }
}
