"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OfferRow = {
  id: string;
  emailInput: string;
  status: string;
  pdfUrl: string | null;
  freigegebenVon: { displayName: string } | null;
};

export function OffersSection({ projectId, offers }: { projectId: string; offers: OfferRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function create() {
    if (!email.trim()) return;
    setBusy("new");
    await fetch(`/api/projects/${projectId}/offers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emailInput: email.trim(), kalkulation: { version: 1 } }),
    });
    setEmail("");
    setBusy(null);
    router.refresh();
  }

  async function freigabe(id: string) {
    setBusy(id);
    await fetch(`/api/projects/${projectId}/offers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ freigabe: true }),
    });
    setBusy(null);
    router.refresh();
  }

  async function pdf(id: string) {
    window.open(`/api/projects/${projectId}/offers/${id}/pdf`, "_blank");
    router.refresh();
  }

  async function send(id: string, to: string) {
    setBusy(id);
    await fetch(`/api/projects/${projectId}/offers/${id}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Kundene-Mail (Anfrage)</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kunde@example.com" />
        </div>
        <Button type="button" disabled={busy === "new"} onClick={() => void create()}>
          Angebot anlegen
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>E-Mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Freigabe</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.emailInput}</TableCell>
              <TableCell>
                <Badge variant="secondary">{o.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{o.freigegebenVon?.displayName ?? "—"}</TableCell>
              <TableCell className="space-x-2 text-right">
                <Button type="button" size="sm" variant="outline" disabled={busy === o.id} onClick={() => void freigabe(o.id)}>
                  Freigeben
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy === o.id} onClick={() => void pdf(o.id)}>
                  PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === o.id}
                  onClick={() => {
                    const to = window.prompt("Empfänger-E-Mail für Versand?");
                    if (to) void send(o.id, to);
                  }}
                >
                  E-Mail
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
