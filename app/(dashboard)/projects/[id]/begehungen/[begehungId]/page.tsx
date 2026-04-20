import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BegehungDetailClient } from "@/components/project/begehung-detail-client";
import { Button } from "@/components/ui/button";

export default async function BegehungDetailPage({
  params,
}: {
  params: { id: string; begehungId: string };
}) {
  const begehung = await prisma.begehung.findFirst({
    where: { id: params.begehungId, projectId: params.id },
    include: {
      project: { select: { id: true, name: true, code: true } },
      mangels: { orderBy: { createdAt: "desc" }, include: { textbaustein: { select: { id: true, name: true } } } },
    },
  });

  if (!begehung) notFound();

  const textbausteine = await prisma.textbaustein.findMany({
    where: { kategorie: "mangel" },
    orderBy: { name: "asc" },
    take: 50,
  });

  const participants = await prisma.projectParticipant.findMany({
    where: { projectId: params.id },
    include: {
      contactPerson: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { validFrom: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Begehung</h1>
          <p className="text-muted-foreground">
            {begehung.project.code} · {begehung.project.name} · {begehung.date.toLocaleDateString("de-DE")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${params.id}`}>Zurück zur Akte</Link>
        </Button>
      </div>

      <BegehungDetailClient
        projectId={params.id}
        begehung={{
          id: begehung.id,
          title: begehung.title,
          notes: begehung.notes,
          protocolMissing: begehung.protocolMissing,
          uebersichtFoto: begehung.uebersichtFoto,
          verteiler: begehung.verteiler,
          versendetAm: begehung.versendetAm?.toISOString() ?? null,
          mangels: begehung.mangels.map((m) => ({
            id: m.id,
            fotoUrl: m.fotoUrl,
            beschreibung: m.beschreibung,
            regel: m.regel,
            textbausteinId: m.textbausteinId,
            textbausteinName: m.textbaustein?.name ?? null,
          })),
        }}
        textbausteine={textbausteine.map((t) => ({ id: t.id, name: t.name }))}
        participants={participants.map((p) => ({
          id: p.id,
          roleInProject: p.roleInProject,
          contactName: p.contactPerson?.name ?? null,
          contactEmail: p.contactPerson?.email ?? null,
          orgName: p.organization?.name ?? null,
        }))}
      />
    </div>
  );
}
