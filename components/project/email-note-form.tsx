"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgLite = { id: string; name: string };
type ContactLite = { id: string; name: string; organizationId: string | null };
type EmployeeLite = { id: string; shortCode: string; displayName: string };

export function EmailNoteForm({
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
      data-testid="email-note-form"
      className="grid gap-3 rounded-md border p-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        try {
          const org = fd.get("organizationId");
          const contact = fd.get("contactPersonId");
          const emp = fd.get("responsibleEmployeeId");
          const subject = String(fd.get("subject") || "").trim();
          const bodyRaw = String(fd.get("body") || "").trim();
          const recipient = String(fd.get("recipient") || "").trim();
          const followUpRaw = fd.get("followUp");
          const body =
            recipient.length > 0 ? `Empfänger: ${recipient}\n\n${bodyRaw}` : bodyRaw;
          const res = await fetch(`/api/projects/${projectId}/communications`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind: "EMAIL",
              subject: subject.length ? subject : null,
              body,
              organizationId: org && String(org) !== "" ? String(org) : null,
              contactPersonId: contact && String(contact) !== "" ? String(contact) : null,
              responsibleEmployeeId: emp && String(emp) !== "" ? String(emp) : null,
              followUp: followUpRaw ? new Date(String(followUpRaw)).toISOString() : null,
              status: "offen",
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
        <Label htmlFor="em-subject">Betreff</Label>
        <Input id="em-subject" name="subject" data-testid="email-note-subject" placeholder="optional" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-body">Inhalt *</Label>
        <textarea
          id="em-body"
          name="body"
          required
          data-testid="email-note-body"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-recipient">Empfänger (optional, Freitext)</Label>
        <Input id="em-recipient" name="recipient" data-testid="email-note-recipient" placeholder="z. B. bauherr@firma.de" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-follow">Follow-up (optional)</Label>
        <Input id="em-follow" name="followUp" type="datetime-local" data-testid="email-note-followup" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="em-org">Organisation</Label>
        <select
          id="em-org"
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
        <Label htmlFor="em-contact">Kontakt</Label>
        <select
          id="em-contact"
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
        <Label htmlFor="em-emp">Zuständig (SiGeKo)</Label>
        <select
          id="em-emp"
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
        <Button type="submit" size="sm" disabled={pending} data-testid="email-note-submit">
          E-Mail-Notiz speichern
        </Button>
      </div>
    </form>
  );
}
