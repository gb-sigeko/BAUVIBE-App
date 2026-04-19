"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TelefonnotizenSection } from "@/components/project/telefonnotizen-section";
import { AddCommunicationForm } from "@/components/project/project-stakeholders-forms";

type CommRow = {
  id: string;
  kind: string;
  occurredAt: string;
  subject: string | null;
  body: string;
  organization: { name: string } | null;
  contactPerson: { name: string } | null;
  responsibleEmployee: { id: string; shortCode: string; displayName: string } | null;
};

type Note = {
  id: string;
  notiz: string;
  erfasstVon: string;
  erfasstAm: string;
  erledigt: boolean;
  followUp: string | null;
};

type OrgLite = { id: string; name: string };
type ContactLite = { id: string; name: string; organizationId: string | null };
type EmployeeLite = { id: string; shortCode: string; displayName: string };

export function ProjectKommunikationTab({
  projectId,
  communications,
  telefonnotizen,
  organizations,
  contacts,
  employees,
}: {
  projectId: string;
  communications: CommRow[];
  telefonnotizen: Note[];
  organizations: OrgLite[];
  contacts: ContactLite[];
  employees: EmployeeLite[];
}) {
  return (
    <div className="space-y-6">
      <Card data-testid="kommunikation-telefon-card">
        <CardHeader>
          <CardTitle>Telefonnotizen</CardTitle>
          <CardDescription>Kurz protokollieren, Follow-up und Erledigt-Status.</CardDescription>
        </CardHeader>
        <CardContent>
          <TelefonnotizenSection projectId={projectId} notes={telefonnotizen} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kommunikationsverlauf</CardTitle>
          <CardDescription>E-Mails, Telefonate, Termine und Notizen zum Projekt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {communications.map((c) => (
            <div key={c.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{c.kind}</Badge>
                <span>{new Date(c.occurredAt).toLocaleString("de-DE")}</span>
                {c.responsibleEmployee ? <span>SiGeKo: {c.responsibleEmployee.shortCode}</span> : null}
              </div>
              {c.subject ? <div className="mt-1 font-medium">{c.subject}</div> : null}
              <div className="mt-2 whitespace-pre-wrap">{c.body}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {[c.organization?.name, c.contactPerson?.name].filter(Boolean).join(" · ") || "Ohne Kontext"}
              </div>
            </div>
          ))}
          <AddCommunicationForm
            projectId={projectId}
            organizations={organizations}
            contacts={contacts}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}
