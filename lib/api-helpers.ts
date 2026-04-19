import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types/roles";

const WRITE_ROLES: AppRole[] = ["ADMIN", "BUERO", "SIKOGO", "GF"];

export async function requireApiUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, response: null };
}

export function requireWriteRole(role: AppRole) {
  if (!WRITE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function assertProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { project: null, response: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  return { project, response: null };
}

export async function assertBegehung(projectId: string, begehungId: string) {
  const b = await prisma.begehung.findFirst({ where: { id: begehungId, projectId } });
  if (!b) return { begehung: null, response: NextResponse.json({ error: "Begehung not found" }, { status: 404 }) };
  return { begehung: b, response: null };
}
