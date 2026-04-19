import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BegehungProtokollClient } from "@/components/begehungen/begehung-protokoll-client";

export const dynamic = "force-dynamic";

type VEntry = { name: string; email: string; gewerk?: string; send?: boolean; manual?: boolean };

export default async function BegehungProtokollPage({ params }: { params: { id: string } }) {
  const b = await prisma.begehung.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      mangels: { include: { textbaustein: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) notFound();

  const textbausteine = await prisma.textbaustein.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, kategorie: true },
  });

  const participants = await prisma.projectParticipant.findMany({
    where: { projectId: b.projectId },
    include: {
      contactPerson: { select: { name: true, email: true, functionTitle: true } },
      organization: { select: { name: true } },
    },
  });

  const participantSuggestions: VEntry[] = [];
  for (const p of participants) {
    const email = p.contactPerson?.email?.trim();
    if (!email) continue;
    participantSuggestions.push({
      name: p.contactPerson?.name ?? email,
      email,
      gewerk: p.roleInProject,
      send: true,
    });
  }

  const verteilerRaw = b.verteiler;
  const initialVerteiler: VEntry[] = Array.isArray(verteilerRaw)
    ? (verteilerRaw as unknown[]).map((row) => {
        const o = row as Record<string, unknown>;
        return {
          name: String(o.name ?? ""),
          email: String(o.email ?? ""),
          gewerk: o.gewerk != null ? String(o.gewerk) : undefined,
          send: o.send !== false,
          manual: Boolean(o.manual),
        };
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Begehungsprotokoll</h1>
          <p className="text-muted-foreground">
            {b.project.name} · {b.project.code} · {new Date(b.date).toLocaleDateString("de-DE")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/projects/${b.projectId}`}>Zur Projektakte</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daten</CardTitle>
          <CardDescription>{b.title ?? "—"}</CardDescription>
        </CardHeader>
      </Card>

      <BegehungProtokollClient
        begehungId={b.id}
        initialMangels={b.mangels.map((m) => ({
          id: m.id,
          fotoUrl: m.fotoUrl,
          beschreibung: m.beschreibung,
          textbaustein: m.textbaustein,
        }))}
        textbausteine={textbausteine}
        initialVerteiler={initialVerteiler}
        participantSuggestions={participantSuggestions}
        uebersichtFoto={b.uebersichtFoto}
        protokollPdf={b.protokollPdf}
        versendetAm={b.versendetAm?.toISOString() ?? null}
      />
    </div>
  );
}
