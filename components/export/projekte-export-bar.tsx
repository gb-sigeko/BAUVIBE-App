"use client";

import { Button } from "@/components/ui/button";

export function ProjekteExportBar() {
  return (
    <div className="flex flex-wrap gap-2" data-testid="export-projekte-bar">
      <Button type="button" size="sm" variant="outline" data-testid="export-projekte-csv" onClick={() => window.open("/api/export/projekte?format=csv", "_blank", "noopener,noreferrer")}>
        Export CSV
      </Button>
      <Button type="button" size="sm" variant="outline" data-testid="export-projekte-pdf" onClick={() => window.open("/api/export/projekte?format=pdf", "_blank", "noopener,noreferrer")}>
        Export PDF
      </Button>
    </div>
  );
}
