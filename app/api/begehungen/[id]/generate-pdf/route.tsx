import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireApiUser, requireWriteRole } from "@/lib/api-helpers";
import { findBegehungWithProject, begehungNotFound } from "@/lib/begehung-by-id";
import { BegehungProtokollPdfDocument, type ProtokollMangelPdf } from "@/lib/begehung-protokoll-pdf";

function toAbsImagePath(fotoUrl: string | null): string | null {
  if (!fotoUrl) return null;
  if (fotoUrl.startsWith("http")) return fotoUrl;
  const rel = fotoUrl.replace(/^\//, "");
  const disk = path.join(process.cwd(), "public", rel);
  if (!existsSync(disk)) return null;
  return disk;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;
  const forbidden = requireWriteRole(session.user.role);
  if (forbidden) return forbidden;

  const b = await findBegehungWithProject(params.id);
  if (!b) return begehungNotFound();

  const verteilerRaw = b.verteiler;
  const verteilerArr = Array.isArray(verteilerRaw)
    ? (verteilerRaw as { name?: string; email?: string; gewerk?: string }[])
    : [];
  const verteilerLines = verteilerArr.map((v) => `${v.name ?? "—"} · ${v.email ?? ""}${v.gewerk ? ` · ${v.gewerk}` : ""}`);

  const tb = await prisma.textbaustein.findFirst({
    where: { kategorie: { contains: "mangel", mode: "insensitive" } },
  });
  let abschluss = `Abschluss: Protokoll für ${b.project.name}.`;
  if (tb?.inhalt) {
    abschluss = tb.inhalt.replace(/\{\{projektname\}\}/gi, b.project.name);
  }

  const mangels: ProtokollMangelPdf[] = b.mangels.map((m) => ({
    id: m.id,
    beschreibung: m.beschreibung,
    fotoUrl: m.fotoUrl,
    absUrl: toAbsImagePath(m.fotoUrl),
  }));

  const doc = (
    <BegehungProtokollPdfDocument
      projectName={b.project.name}
      projectCode={b.project.code}
      siteAddress={b.project.siteAddress}
      dateLabel={b.date.toLocaleDateString("de-DE")}
      title={b.title}
      mangels={mangels}
      verteilerLines={verteilerLines.length ? verteilerLines : ["—"]}
      abschluss={abschluss}
    />
  );

  const pdfBuf = await renderToBuffer(doc);
  const outDir = path.join(process.cwd(), "public", "protokolle");
  await mkdir(outDir, { recursive: true });
  const fileName = `begehung-${b.id}.pdf`;
  const diskPath = path.join(outDir, fileName);
  await writeFile(diskPath, pdfBuf);
  const publicPath = `/protokolle/${fileName}`;
  await prisma.begehung.update({
    where: { id: b.id },
    data: { protokollPdf: publicPath },
  });

  const head = await readFile(diskPath).then((x) => x.subarray(0, 4).toString("ascii"));
  if (head !== "%PDF") {
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }

  return NextResponse.json({ path: publicPath });
}
