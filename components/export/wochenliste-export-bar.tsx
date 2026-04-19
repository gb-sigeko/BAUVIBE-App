"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WochenlisteExportBar({ weeks }: { weeks: { isoYear: number; isoWeek: number }[] }) {
  const first = weeks[0];
  const [sel, setSel] = useState(first ? `${first.isoYear}|${first.isoWeek}` : "");

  function open(fmt: "csv" | "pdf") {
    const [isoYear, kw] = sel.split("|");
    if (!isoYear || !kw) return;
    const u = `/api/export/wochenliste?isoYear=${encodeURIComponent(isoYear)}&kw=${encodeURIComponent(kw)}&format=${fmt}`;
    window.open(u, "_blank", "noopener,noreferrer");
  }

  if (!weeks.length) return null;

  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="export-wochenliste-bar">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" htmlFor="export-woche">
          Kalenderwoche
        </label>
        <select
          id="export-woche"
          className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          {weeks.map((w) => (
            <option key={`${w.isoYear}-${w.isoWeek}`} value={`${w.isoYear}|${w.isoWeek}`}>
              KW {w.isoWeek}/{w.isoYear}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" size="sm" variant="outline" data-testid="export-wochenliste-csv" onClick={() => open("csv")}>
        CSV
      </Button>
      <Button type="button" size="sm" variant="outline" data-testid="export-wochenliste-pdf" onClick={() => open("pdf")}>
        PDF
      </Button>
    </div>
  );
}
