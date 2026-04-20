"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  endpoint: string;
  downloadName: string;
  label?: string;
  testId?: string;
};

export function ExportCsvButton({ endpoint, downloadName, label = "CSV exportieren", testId }: Props) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const r = await fetch(endpoint);
      if (!r.ok) return;
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} data-testid={testId} onClick={() => void onClick()}>
      {label}
    </Button>
  );
}
