import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export-access";
import { toCsv } from "@/lib/export-csv";
import { getIsoWeekParts } from "@/lib/utils";
import { WochenlistePdf, type WochenlistePdfRow } from "@/components/pdf/wochenliste-pdf";

export async function GET(req: Request) {
  const { session, response } = await requireExportSession();
  if (!session) return response!;

  const url = new URL(req.url);
  const nowParts = getIsoWeekParts(new Date());
  let isoYear = Number.parseInt(url.searchParams.get("isoYear") ?? "", 10);
  const isoWeek = Number.parseInt(url.searchParams.get("kw") ?? url.searchParams.get("isoWeek") ?? "", 10);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  if (!Number.isFinite(isoYear)) isoYear = nowParts.isoYear;
  if (!Number.isFinite(isoWeek)) {
    return NextResponse.json({ error: "Parameter kw (Kalenderwoche) erforderlich" }, { status: 400 });
  }

  const entries = await prisma.planungEntry.findMany({
    where: { isoYear, isoWeek },
    include: { project: true, employee: true },
    orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
  });

  const rows: WochenlistePdfRow[] = entries.map((e) => ({
    project: `${e.project.code} ${e.project.name}`,
    employee: e.employee?.shortCode ?? "—",
    status: e.planungStatus,
    begehNr: e.begehungSollNummer != null ? String(e.begehungSollNummer) : "—",
  }));

  if (format === "pdf") {
    const buf = await renderToBuffer(React.createElement(WochenlistePdf, { isoYear, isoWeek, rows }) as never);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="wochenliste-${isoYear}-kw${isoWeek}.pdf"`,
      },
    });
  }

  const csv = toCsv(
    ["Projekt", "Mitarbeiter", "Status", "Begehungsnummer"],
    rows.map((r) => [r.project, r.employee, r.status, r.begehNr]),
  );
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wochenliste-${isoYear}-kw${isoWeek}.csv"`,
    },
  });
}
