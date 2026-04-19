import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { findBegehungWithProject, begehungNotFound } from "@/lib/begehung-by-id";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const b = await findBegehungWithProject(params.id);
  if (!b) return begehungNotFound();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const role = String(form.get("role") ?? "overview");

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const prefix = role === "mangel" ? "mangel" : "uebersicht";
  const name = `${prefix}-${Date.now()}.${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", "begehungen", b.id);
  await mkdir(dir, { recursive: true });
  const diskPath = path.join(dir, name);
  await writeFile(diskPath, buf);
  const url = `/uploads/begehungen/${b.id}/${name}`;
  if (role !== "mangel") {
    await prisma.begehung.update({
      where: { id: b.id },
      data: { uebersichtFoto: url },
    });
  }
  return NextResponse.json({ url });
}
