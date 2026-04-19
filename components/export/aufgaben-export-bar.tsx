"use client";

import { Button } from "@/components/ui/button";

export function AufgabenExportBar() {
  return (
    <div data-testid="export-aufgaben-bar">
      <Button type="button" size="sm" variant="outline" data-testid="export-aufgaben-csv" onClick={() => window.open("/api/export/aufgaben?status=offen&format=csv", "_blank", "noopener,noreferrer")}>
        Aufgaben exportieren (CSV)
      </Button>
    </div>
  );
}
