"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TelefonErledigtButton({ projectId, noteId }: { projectId: string; noteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="default"
      disabled={busy}
      data-testid={`arbeitskorb-telefon-erledigt-${noteId}`}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/telefonnotizen/${noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ erledigt: true }),
          });
          if (!res.ok) throw new Error(await res.text());
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : "Erledigt"}
    </Button>
  );
}

export function CommunicationErledigtButton({ projectId, communicationId }: { projectId: string; communicationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="default"
      disabled={busy}
      data-testid={`arbeitskorb-comm-erledigt-${communicationId}`}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/communications/${communicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ erledigt: true }),
          });
          if (!res.ok) throw new Error(await res.text());
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : "Erledigt"}
    </Button>
  );
}

export function VorOrtErledigtButton({ projectId, rueckmeldungId }: { projectId: string; rueckmeldungId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="default"
      disabled={busy}
      data-testid={`arbeitskorb-vorort-erledigt-${rueckmeldungId}`}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/vorort-rueckmeldungen/${rueckmeldungId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bearbeitet: true }),
          });
          if (!res.ok) throw new Error(await res.text());
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : "Als erledigt markieren"}
    </Button>
  );
}

export function QuelleLink({
  href,
  label = "Zur Quelle",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
