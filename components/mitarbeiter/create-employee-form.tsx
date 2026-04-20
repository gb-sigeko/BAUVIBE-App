"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmployeeKind, EmployeeJobRole } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KIND_OPTS: { value: EmployeeKind; label: string }[] = [
  { value: "INTERN", label: "Intern" },
  { value: "EXTERN", label: "Extern" },
];

const JOB_OPTS: { value: EmployeeJobRole; label: string }[] = [
  { value: "SIKOGO", label: "SiGeKo" },
  { value: "BUERO", label: "Büro" },
  { value: "GF", label: "GF" },
  { value: "EXTERN", label: "Extern (Rolle)" },
];

export function CreateEmployeeForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      data-testid="employee-create-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        try {
          const job = String(fd.get("jobRole") || "");
          const res = await fetch("/api/employees", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              shortCode: String(fd.get("shortCode") || "").trim(),
              displayName: String(fd.get("displayName") || "").trim(),
              kind: String(fd.get("kind") || "INTERN") as EmployeeKind,
              jobRole: job ? (job as EmployeeJobRole) : null,
              region: fd.get("region") ? String(fd.get("region")) : null,
            }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(j.error ?? `Fehler ${res.status}`);
            return;
          }
          (e.target as HTMLFormElement).reset();
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="emp-sc">Kürzel *</Label>
        <Input id="emp-sc" name="shortCode" required data-testid="employee-short-code-input" placeholder="z. B. AB" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-dn">Anzeigename *</Label>
        <Input id="emp-dn" name="displayName" required data-testid="employee-display-name-input" placeholder="Vorname Nachname" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-kind">Art *</Label>
        <select
          id="emp-kind"
          name="kind"
          data-testid="employee-kind-select"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue="INTERN"
        >
          {KIND_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-job">Rolle im Einsatz (optional)</Label>
        <select
          id="emp-job"
          name="jobRole"
          data-testid="employee-job-role-select"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="">—</option>
          {JOB_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="emp-region">Region (optional)</Label>
        <Input id="emp-region" name="region" data-testid="employee-region-input" placeholder="z. B. Nord" />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" data-testid="employee-create-submit" disabled={pending}>
          Mitarbeiter speichern
        </Button>
      </div>
    </form>
  );
}
