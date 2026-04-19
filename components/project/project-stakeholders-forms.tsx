"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgLite = { id: string; name: string };
type ContactLite = { id: string; name: string; organizationId: string | null };
type EmployeeLite = { id: string; shortCode: string; displayName: string };

export function AddParticipantForm({
  projectId,
  organizations,
  contacts,
}: {
  projectId: string;
  organizations: OrgLite[];
  contacts: ContactLite[];
}) {
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
          const org = fd.get("organizationId");
          const contact = fd.get("contactPersonId");
          const res = await fetch(`/api/projects/${projectId}/participants`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              organizationId: org && String(org) !== "" ? String(org) : null,
              contactPersonId: contact && String(contact) !== "" ? String(contact) : null,
              roleInProject: String(fd.get("roleInProject") || ""),
              isPrimary: fd.get("isPrimary") === "on",
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
        <Label htmlFor="pp-org">Organisation</Label>
        <select
          id="pp-org"
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
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="pp-contact">Kontakt aus Datenbank</Label>
        <select
          id="pp-contact"
          name="contactPersonId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="">—</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pp-role">Rolle im Projekt</Label>
        <Input id="pp-role" name="roleInProject" required placeholder="z. B. Bauherr" />
      </div>
      <div className="flex items-end gap-2 pb-1">
        <input id="pp-primary" name="isPrimary" type="checkbox" className="h-4 w-4 rounded border" />
        <Label htmlFor="pp-primary" className="text-sm font-normal">
          Primärkontakt
        </Label>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Beteiligten hinzufügen
        </Button>
      </div>
    </form>
  );
}

const KINDS = ["EMAIL", "PHONE", "MEETING", "LETTER", "NOTE"] as const;

export function AddCommunicationForm({
  projectId,
  organizations,
  contacts,
  employees,
}: {
  projectId: string;
  organizations: OrgLite[];
  contacts: ContactLite[];
  employees: EmployeeLite[];
}) {
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
          const org = fd.get("organizationId");
          const contact = fd.get("contactPersonId");
          const emp = fd.get("responsibleEmployeeId");
          const res = await fetch(`/api/projects/${projectId}/communications`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind: String(fd.get("kind") || "NOTE"),
              subject: fd.get("subject") ? String(fd.get("subject")) : null,
              body: String(fd.get("body") || ""),
              organizationId: org && String(org) !== "" ? String(org) : null,
              contactPersonId: contact && String(contact) !== "" ? String(contact) : null,
              responsibleEmployeeId: emp && String(emp) !== "" ? String(emp) : null,
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
        <Label htmlFor="cm-kind">Kanal</Label>
        <select
          id="cm-kind"
          name="kind"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue="NOTE"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cm-subject">Betreff</Label>
        <Input id="cm-subject" name="subject" placeholder="optional" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="cm-body">Inhalt</Label>
        <textarea
          id="cm-body"
          name="body"
          required
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cm-org">Organisation</Label>
        <select
          id="cm-org"
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
        <Label htmlFor="cm-contact">Kontakt</Label>
        <select
          id="cm-contact"
          name="contactPersonId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="">—</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="cm-emp">Zuständig (SiGeKo)</Label>
        <select
          id="cm-emp"
          name="responsibleEmployeeId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="">—</option>
          {employees.map((em) => (
            <option key={em.id} value={em.id}>
              {em.shortCode} — {em.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Eintrag speichern
        </Button>
      </div>
    </form>
  );
}
