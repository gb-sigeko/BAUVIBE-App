import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function findBegehungWithProject(begehungId: string) {
  return prisma.begehung.findUnique({
    where: { id: begehungId },
    include: {
      project: true,
      mangels: { include: { textbaustein: true }, orderBy: { createdAt: "asc" } },
      employee: { select: { shortCode: true, displayName: true } },
    },
  });
}

export function begehungNotFound() {
  return NextResponse.json({ error: "Begehung not found" }, { status: 404 });
}
