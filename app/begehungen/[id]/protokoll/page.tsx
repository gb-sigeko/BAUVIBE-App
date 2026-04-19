import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BegehungProtokollWorkspace } from "@/components/begehung/begehung-protokoll-workspace";

export const dynamic = "force-dynamic";

export default async function BegehungProtokollPage({ params }: { params: { id: string } }) {
  const full = await prisma.begehung.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      mangels: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!full) notFound();

  const [projectContacts, textbausteine] = await Promise.all([
    prisma.projectContact.findMany({
      where: { projectId: full.projectId },
      include: { contactPerson: { include: { organization: true } } },
    }),
    prisma.textbaustein.findMany({ orderBy: { name: "asc" }, take: 400 }),
  ]);

  const rawVert = full.verteiler as unknown;
  const arr = Array.isArray(rawVert) ? (rawVert as { contactPersonId?: string; email?: string; name?: string }[]) : [];
  const selectedIds = new Set(arr.map((x) => x.contactPersonId).filter(Boolean) as string[]);

  const initialVerteiler = projectContacts.map((pc) => ({
    contactPersonId: pc.contactPersonId,
    name: pc.contactPerson.name,
    email: pc.contactPerson.email,
    selected: selectedIds.has(pc.contactPersonId),
  }));

  const contacts = projectContacts.map((pc) => ({
    id: pc.contactPersonId,
    name: pc.contactPerson.name,
    email: pc.contactPerson.email,
    organizationName: pc.contactPerson.organization?.name ?? null,
  }));

  return (
    <BegehungProtokollWorkspace
      projectId={full.projectId}
      begehungId={full.id}
      initialTitle={full.title}
      initialNotes={full.notes}
      initialFoto={full.uebersichtFoto}
      initialVerteiler={initialVerteiler}
      mangels={full.mangels.map((m) => ({
        id: m.id,
        beschreibung: m.beschreibung,
        fotoUrl: m.fotoUrl,
        regel: m.regel,
        textbausteinId: m.textbausteinId,
      }))}
      textbausteine={textbausteine.map((t) => ({ id: t.id, name: t.name, kategorie: t.kategorie, inhalt: t.inhalt }))}
      contacts={contacts}
    />
  );
}
