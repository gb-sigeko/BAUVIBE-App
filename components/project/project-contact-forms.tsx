"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactLite = { id: string; name: string };

export function AddProjectContactForm({ projectId, contacts }: { projectId: string; contacts: ContactLite[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 grid gap-3 rounded-md border p-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/project-contacts`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contactPersonId: String(fd.get("contactPersonId") || ""),
              role: String(fd.get("role") || ""),
              isMainContact: fd.get("isMainContact") === "on",
            }),
          });
          if (res.ok) {
            (e.target as HTMLFormElement).reset();
            router.refresh();
          }
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="pc-contact">Kontakt</Label>
        <select
          id="pc-contact"
          name="contactPersonId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pc-role">Rolle im Projekt</Label>
        <Input id="pc-role" name="role" required placeholder="z. B. Bauherr" />
      </div>
      <div className="flex items-end gap-2 pb-1">
        <input id="pc-main" name="isMainContact" type="checkbox" className="h-4 w-4 rounded border" />
        <Label htmlFor="pc-main" className="text-sm font-normal">
          Hauptansprechpartner
        </Label>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Zuordnung speichern
        </Button>
      </div>
    </form>
  );
}

export function RemoveProjectContactButton({ projectId, linkId }: { projectId: string; linkId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/project-contacts/${linkId}`, { method: "DELETE" });
          if (res.ok) router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      Entfernen
    </Button>
  );
}
