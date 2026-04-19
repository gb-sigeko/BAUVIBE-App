"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailNotizForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    try {
      const composed =
        (recipient.trim() ? `Empfänger: ${recipient.trim()}\n\n` : "") + body.trim();
      const payload: Record<string, unknown> = {
        kind: "EMAIL",
        subject: subject.trim() || null,
        body: composed,
      };
      if (followUp) {
        payload.followUp = new Date(followUp).toISOString();
      }
      const res = await fetch(`/api/projects/${projectId}/communications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSubject("");
        setBody("");
        setRecipient("");
        setFollowUp("");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form data-testid="email-notiz-form" className="grid gap-3 rounded-md border p-3 md:grid-cols-2" onSubmit={(ev) => void submit(ev)}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-subject">Betreff</Label>
        <Input id="em-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="optional" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-body">Inhalt</Label>
        <textarea
          id="em-body"
          data-testid="email-notiz-body"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-to">Empfänger (optional)</Label>
        <Input
          id="em-to"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="E-Mail oder Name"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="em-fu">Wiedervorlage (optional)</Label>
        <Input id="em-fu" type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          E-Mail-Notiz speichern
        </Button>
      </div>
    </form>
  );
}
