import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OffersSection } from "@/components/project/offers-section";
import { VorankSection } from "@/components/project/vorank-section";
import { TelefonnotizenSection } from "@/components/project/telefonnotizen-section";
import { AddCommunicationForm, AddParticipantForm } from "@/components/project/project-stakeholders-forms";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, organizations, contacts, employees] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: {
        begehungen: {
          orderBy: { date: "desc" },
          include: { _count: { select: { mangels: true } } },
        },
        tasks: { orderBy: { dueDate: "asc" }, include: { assignee: true } },
        documents: { orderBy: { createdAt: "desc" } },
        chronikEntries: { orderBy: { createdAt: "desc" }, include: { author: true } },
        offers: { orderBy: { createdAt: "desc" }, include: { freigegebenVon: { select: { displayName: true } } } },
        vorankuendigungen: { orderBy: { createdAt: "desc" } },
        telefonnotizen: { orderBy: { erfasstAm: "desc" } },
        projectParticipants: {
          orderBy: [{ isPrimary: "desc" }, { validFrom: "desc" }],
          include: { organization: true, contactPerson: true },
        },
        communications: {
          orderBy: { occurredAt: "desc" },
          include: {
            organization: true,
            contactPerson: true,
            responsibleEmployee: { select: { id: true, shortCode: true, displayName: true } },
          },
        },
        planEntries: {
          where: { planungType: "FEST" },
          orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
          include: { employee: true },
        },
      },
    }),
    prisma.organization.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.contactPerson.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, organizationId: true },
    }),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: { shortCode: "asc" },
      select: { id: true, shortCode: true, displayName: true },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <Badge variant="secondary">{project.status}</Badge>
        </div>
        <p className="text-muted-foreground">
          {project.code} · {project.client ?? "Ohne Bauherr"} · {project.siteAddress ?? "Ohne Einsatzort"}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="begehungen">Begehungen</TabsTrigger>
          <TabsTrigger value="tasks">Aufgaben</TabsTrigger>
          <TabsTrigger value="docs">Dokumente</TabsTrigger>
          <TabsTrigger value="chronicle">Chronik</TabsTrigger>
          <TabsTrigger value="angebote">Angebote</TabsTrigger>
          <TabsTrigger value="vorank">Vorankündigung</TabsTrigger>
          <TabsTrigger value="tel">Telefonnotizen</TabsTrigger>
          <TabsTrigger value="beteiligte">Beteiligte</TabsTrigger>
          <TabsTrigger value="kommunikation">Kommunikation</TabsTrigger>
          <TabsTrigger value="termine">Termine</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Projektüberblick</CardTitle>
              <CardDescription>Kurzsteckbrief und Soll/Ist-Stunden (falls gepflegt).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>{project.description ?? "Keine Beschreibung hinterlegt."}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Soll-Stunden</div>
                  <div className="text-2xl font-semibold">{project.targetHours ?? "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Ist-Stunden</div>
                  <div className="text-2xl font-semibold">{project.actualHours ?? "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="begehungen">
          <Card>
            <CardHeader>
              <CardTitle>Begehungen</CardTitle>
              <CardDescription>Termine, Notizen und Protokollstatus.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Mängel</TableHead>
                    <TableHead>Protokoll</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.begehungen.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.date.toLocaleDateString("de-DE")}</TableCell>
                      <TableCell>{i.title ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{i._count.mangels} Mängel</Badge>
                      </TableCell>
                      <TableCell>
                        {i.protocolMissing ? <Badge variant="destructive">Fehlt</Badge> : <Badge variant="secondary">OK</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link className="text-sm text-primary underline" href={`/projects/${params.id}/begehungen/${i.id}`}>
                          Bearbeiten
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Aufgaben</CardTitle>
              <CardDescription>Status, Fälligkeit, Zuständigkeit.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fällig</TableHead>
                    <TableHead>Zuständig</TableHead>
                    <TableHead>Protokoll</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.status}</Badge>
                      </TableCell>
                      <TableCell>{t.dueDate ? t.dueDate.toLocaleDateString("de-DE") : "—"}</TableCell>
                      <TableCell>{t.assignee?.shortCode ?? "—"}</TableCell>
                      <TableCell>
                        {t.protocolMissing ? <Badge variant="destructive">Fehlt</Badge> : <Badge variant="secondary">OK</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Dokumente</CardTitle>
              <CardDescription>Zentrale Ablage (MVP: Metadaten + Link).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.createdAt.toLocaleDateString("de-DE")}</TableCell>
                      <TableCell>{d.url ? <a className="text-primary underline" href={d.url}>Öffnen</a> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chronicle">
          <Card>
            <CardHeader>
              <CardTitle>Chronik</CardTitle>
              <CardDescription>Ereignisprotokoll zum Projekt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.chronikEntries.map((c) => (
                <div key={c.id} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    {c.createdAt.toLocaleString("de-DE")}
                    {c.author?.name ? ` · ${c.author.name}` : ""}
                  </div>
                  <div className="mt-2 text-sm">{c.body}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="angebote">
          <Card>
            <CardHeader>
              <CardTitle>Angebotserstellung</CardTitle>
              <CardDescription>Angebote erfassen, freigeben, PDF erzeugen und per E-Mail versenden.</CardDescription>
            </CardHeader>
            <CardContent>
              <OffersSection
                projectId={params.id}
                offers={project.offers.map((o) => ({
                  id: o.id,
                  emailInput: o.emailInput,
                  status: o.status,
                  pdfUrl: o.pdfUrl,
                  freigegebenVon: o.freigegebenVon,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vorank">
          <Card>
            <CardHeader>
              <CardTitle>Vorankündigungen</CardTitle>
              <CardDescription>Formular-URL, PDF-Erzeugung und Versand.</CardDescription>
            </CardHeader>
            <CardContent>
              <VorankSection
                projectId={params.id}
                rows={project.vorankuendigungen.map((v) => ({
                  id: v.id,
                  pdfFormular: v.pdfFormular,
                  status: v.status,
                  generiertesPdf: v.generiertesPdf,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tel">
          <Card>
            <CardHeader>
              <CardTitle>Telefonnotizen</CardTitle>
              <CardDescription>Werden zusätzlich als Chronik-Eintrag protokolliert.</CardDescription>
            </CardHeader>
            <CardContent>
              <TelefonnotizenSection
                projectId={params.id}
                notes={project.telefonnotizen.map((n) => ({
                  id: n.id,
                  notiz: n.notiz,
                  erfasstVon: n.erfasstVon,
                  erfasstAm: n.erfasstAm.toISOString(),
                  erledigt: n.erledigt,
                  followUp: n.followUp ? n.followUp.toISOString() : null,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beteiligte">
          <Card>
            <CardHeader>
              <CardTitle>Beteiligte</CardTitle>
              <CardDescription>Rollen im Projekt, verknüpft mit Organisationen und Kontakten aus der Datenbank.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Primär</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.projectParticipants.map((pp) => (
                    <TableRow key={pp.id}>
                      <TableCell className="font-medium">{pp.roleInProject}</TableCell>
                      <TableCell>{pp.organization?.name ?? "—"}</TableCell>
                      <TableCell>{pp.contactPerson?.name ?? "—"}</TableCell>
                      <TableCell>{pp.isPrimary ? <Badge variant="secondary">Ja</Badge> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <AddParticipantForm
                projectId={params.id}
                organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
                contacts={contacts}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kommunikation">
          <Card>
            <CardHeader>
              <CardTitle>Kommunikationsverlauf</CardTitle>
              <CardDescription>E-Mails, Telefonate, Termine und Notizen zum Projekt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.communications.map((c) => (
                <div key={c.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{c.kind}</Badge>
                    <span>{c.occurredAt.toLocaleString("de-DE")}</span>
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
                projectId={params.id}
                organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
                contacts={contacts}
                employees={employees}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="termine">
          <Card>
            <CardHeader>
              <CardTitle>Feste Termine (Planung)</CardTitle>
              <CardDescription>Einträge mit Typ „FEST“ aus der Wochenplanung für dieses Projekt.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kalenderwoche</TableHead>
                    <TableHead>SiGeKo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Geplanter Tag</TableHead>
                    <TableHead>Notiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.planEntries.map((pe) => (
                    <TableRow key={pe.id}>
                      <TableCell className="font-medium">
                        KW {pe.isoWeek} · {pe.isoYear}
                      </TableCell>
                      <TableCell>{pe.employee?.shortCode ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pe.planungStatus}</Badge>
                      </TableCell>
                      <TableCell>{pe.plannedDate ? pe.plannedDate.toLocaleDateString("de-DE") : "—"}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{pe.note ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
