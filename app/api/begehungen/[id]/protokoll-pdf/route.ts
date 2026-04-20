import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";
import { findBegehungWithProject, begehungNotFound } from "@/lib/begehung-by-id";

/** Liefert das generierte Protokoll-PDF per Node-FS (zuverlässig auch wenn neue Dateien unter `public/` nicht sofort statisch ausgeliefert werden). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const b = await findBegehungWithProject(params.id);
  if (!b) return begehungNotFound();
  if (!b.protokollPdf) {
    return NextResponse.json({ error: "PDF fehlt – zuerst generieren." }, { status: 404 });
  }

  const rel = b.protokollPdf.replace(/^\//, "");
  const diskPath = path.join(process.cwd(), "public", rel);
  try {
    const buf = await readFile(diskPath);
    return new NextResponse(buf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="begehung-${b.id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF-Datei nicht gefunden." }, { status: 404 });
  }
}
