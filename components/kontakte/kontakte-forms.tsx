"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        try {
          const res = await fetch("/api/organizations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: String(fd.get("name") || ""),
              legalForm: fd.get("legalForm") ? String(fd.get("legalForm")) : null,
              address: fd.get("address") ? String(fd.get("address")) : null,
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
      <div className="space-y-2">
        <Label htmlFor="org-name">Organisation</Label>
        <Input id="org-name" name="name" required placeholder="Name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-legal">Rechtsform</Label>
        <Input id="org-legal" name="legalForm" placeholder="z. B. GmbH" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="org-address">Adresse</Label>
        <Input id="org-address" name="address" placeholder="Straße, PLZ Ort" />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          Organisation speichern
        </Button>
      </div>
    </form>
  );
}

export function CreateContactForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dupHint, setDupHint] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        try {
          const org = fd.get("organizationId");
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              organizationId: org && String(org) !== "" ? String(org) : null,
              name: String(fd.get("name") || ""),
              functionTitle: fd.get("functionTitle") ? String(fd.get("functionTitle")) : null,
              email: fd.get("email") ? String(fd.get("email")) : null,
              phone: fd.get("phone") ? String(fd.get("phone")) : null,
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
        <Label htmlFor="c-org">Organisation (optional)</Label>
        <select
          id="c-org"
          name="organizationId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="">—</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-name">Name</Label>
        <Input id="c-name" name="name" required placeholder="Kontaktperson" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-fn">Funktion</Label>
        <Input id="c-fn" name="functionTitle" placeholder="Rolle" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-mail">E-Mail</Label>
        <Input
          id="c-mail"
          name="email"
          type="email"
          placeholder="mail@firma.de"
          onBlur={async (e) => {
            const mail = e.target.value.trim().toLowerCase();
            if (!mail || !mail.includes("@")) {
              setDupHint(null);
              return;
            }
            const res = await fetch(`/api/contacts?q=${encodeURIComponent(mail)}`);
            if (!res.ok) return;
            const rows = (await res.json()) as { email: string | null }[];
            const hit = rows.some((r) => (r.email ?? "").toLowerCase() === mail);
            setDupHint(hit ? "Es existiert bereits ein Kontakt mit dieser E-Mail (einfache Dublettenprüfung)." : null);
          }}
        />
        {dupHint ? <p className="text-xs text-amber-700 dark:text-amber-300">{dupHint}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-phone">Telefon</Label>
        <Input id="c-phone" name="phone" placeholder="+49 …" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          Kontakt speichern
        </Button>
      </div>
    </form>
  );
}
