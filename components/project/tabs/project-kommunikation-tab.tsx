"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TelefonnotizenSection } from "@/components/project/telefonnotizen-section";
import { EmailNoteForm } from "@/components/project/email-note-form";

type CommRow = {
  id: string;
  kind: string;
  occurredAt: string;
  subject: string | null;
  body: string;
  status: string;
  followUp: string | null;
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

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

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
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const wiedervorlagen = useMemo(() => {
    const start = startOfToday().getTime();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const endMs = end.getTime();
    const items: { kind: "telefon" | "email"; id: string; label: string; due: string; overdue: boolean }[] = [];
    for (const n of telefonnotizen) {
      if (!n.followUp || n.erledigt) continue;
      const t = new Date(n.followUp).getTime();
      if (t <= endMs) {
        items.push({
          kind: "telefon",
          id: n.id,
          label: n.notiz.slice(0, 80) + (n.notiz.length > 80 ? "…" : ""),
          due: n.followUp,
          overdue: t < start,
        });
      }
    }
    for (const c of communications) {
      if (!c.followUp) continue;
      if ((c.status ?? "").toLowerCase() === "erledigt") continue;
      const t = new Date(c.followUp).getTime();
      if (t <= endMs) {
        items.push({
          kind: "email",
          id: c.id,
          label: (c.subject ?? c.body).slice(0, 80),
          due: c.followUp,
          overdue: t < start,
        });
      }
    }
    items.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    return items;
  }, [communications, telefonnotizen]);

  async function markCommDone(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/projects/${projectId}/communications/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "erledigt" }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card data-testid="kommunikation-wv-card">
        <CardHeader>
          <CardTitle>Wiedervorlagen</CardTitle>
          <CardDescription>Heute fällig oder überfällig (Telefon + E-Mail-Notizen mit Follow-up).</CardDescription>
        </CardHeader>
        <CardContent>
          {wiedervorlagen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Wiedervorlagen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Inhalt</TableHead>
                  <TableHead>Fällig</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wiedervorlagen.map((w) => (
                  <TableRow key={`${w.kind}-${w.id}`} data-testid={`wv-row-${w.kind}-${w.id}`}>
                    <TableCell>{w.kind === "telefon" ? "Telefon" : "E-Mail"}</TableCell>
                    <TableCell className="max-w-[320px] text-sm">{w.label}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(w.due).toLocaleString("de-DE")}
                      {w.overdue ? <Badge className="ml-2" variant="destructive">überfällig</Badge> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {w.kind === "email" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === w.id}
                          data-testid={`wv-email-done-${w.id}`}
                          onClick={() => void markCommDone(w.id)}
                        >
                          Erledigt
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">im Tab Telefon erledigen</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="kommunikation-telefon-card">
        <CardHeader>
          <CardTitle>Telefonnotizen</CardTitle>
          <CardDescription>Mit Follow-up (erscheint zusätzlich im Arbeitskorb, sobald fällig).</CardDescription>
        </CardHeader>
        <CardContent>
          <TelefonnotizenSection projectId={projectId} notes={telefonnotizen} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Notiz (manuell)</CardTitle>
          <CardDescription>Wird als Communication mit Kanal E-Mail gespeichert; optional Follow-up.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailNoteForm projectId={projectId} organizations={organizations} contacts={contacts} employees={employees} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kommunikationsverlauf</CardTitle>
          <CardDescription>Alle Einträge inkl. Follow-up und Status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {communications.map((c) => (
            <div key={c.id} className="rounded-md border p-3 text-sm" data-testid={`comm-row-${c.id}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{c.kind}</Badge>
                <span>{new Date(c.occurredAt).toLocaleString("de-DE")}</span>
                {c.responsibleEmployee ? <span>SiGeKo: {c.responsibleEmployee.shortCode}</span> : null}
                {c.followUp ? <span>WV: {new Date(c.followUp).toLocaleString("de-DE")}</span> : null}
                <Badge variant={c.status?.toLowerCase() === "erledigt" ? "secondary" : "outline"}>{c.status}</Badge>
              </div>
              {c.subject ? <div className="mt-1 font-medium">{c.subject}</div> : null}
              <div className="mt-2 whitespace-pre-wrap">{c.body}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {[c.organization?.name, c.contactPerson?.name].filter(Boolean).join(" · ") || "Ohne Kontext"}
              </div>
              {c.followUp && c.status?.toLowerCase() !== "erledigt" ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid={`comm-done-${c.id}`}
                    disabled={busyId === c.id}
                    onClick={() => void markCommDone(c.id)}
                  >
                    Erledigt
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
