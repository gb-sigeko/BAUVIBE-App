import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export-access";
import { toCsv } from "@/lib/export-csv";
import { ProjektePdf, type ProjektPdfRow } from "@/components/pdf/projekte-pdf";

export async function GET(req: Request) {
  const { session, response } = await requireExportSession();
  if (!session) return response!;

  const format = (new URL(req.url).searchParams.get("format") ?? "csv").toLowerCase();

  const projects = await prisma.project.findMany({
    orderBy: { code: "asc" },
    select: {
      code: true,
      name: true,
      status: true,
      turnus: true,
      contractualBegehungen: true,
      completedBegehungen: true,
    },
  });

  const rows: ProjektPdfRow[] = projects.map((p) => {
    const c = p.contractualBegehungen ?? 0;
    const pct = c > 0 ? `${p.completedBegehungen}/${c}` : "—";
    return {
      code: p.code,
      name: p.name,
      status: p.status,
      turnus: p.turnus ?? "—",
      fortschritt: pct,
    };
  });

  if (format === "pdf") {
    const buf = await renderToBuffer(React.createElement(ProjektePdf, { rows }) as never);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="projektliste.pdf"',
      },
    });
  }

  const csv = toCsv(
    ["Code", "Name", "Status", "Turnus", "Fortschritt Begehungen"],
    rows.map((r) => [r.code, r.name, r.status, r.turnus, r.fortschritt]),
  );
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="projektliste.csv"',
    },
  });
}
