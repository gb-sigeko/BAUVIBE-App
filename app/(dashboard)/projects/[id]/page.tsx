import { notFound } from "next/navigation";
import { PlanungStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProjectOverviewTab } from "@/components/project/tabs/project-overview-tab";
import { ProjectBeteiligteTab, type BeteiligterRow } from "@/components/project/tabs/project-beteiligte-tab";
import { ProjectTermineTab, type PlanRow } from "@/components/project/tabs/project-termine-tab";
import { ProjectBegehungenTab, type BegehungRow } from "@/components/project/tabs/project-begehungen-tab";
import { ProjectTasksTab, type TaskRow } from "@/components/project/tabs/project-tasks-tab";
import { ProjectDokumenteTab, type DocRow } from "@/components/project/tabs/project-dokumente-tab";
import { ProjectKommunikationTab } from "@/components/project/tabs/project-kommunikation-tab";
import { ProjectChronikTab, type ChronikRow } from "@/components/project/tabs/project-chronik-tab";
import { ProjectAbrechnungTab } from "@/components/project/tabs/project-abrechnung-tab";

export const dynamic = "force-dynamic";

const TAB_VALUES = new Set([
  "overview",
  "beteiligte",
  "termine",
  "begehungen",
  "tasks",
  "docs",
  "kommunikation",
  "chronicle",
  "billing",
]);

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawTab = searchParams?.tab;
  const tabParam = typeof rawTab === "string" ? rawTab : undefined;
  const initialTab = tabParam && TAB_VALUES.has(tabParam) ? tabParam : "overview";
  const [project, organizations, contacts, employees, planUpcoming, planFixedManual] = await Promise.all([
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
        responsibleEmployee: { select: { shortCode: true } },
        substituteEmployee: { select: { shortCode: true } },
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
    prisma.planungEntry.findMany({
      where: { projectId: params.id, planungStatus: { not: PlanungStatus.ERLEDIGT } },
      include: { employee: true },
      orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.planungEntry.findMany({
      where: { projectId: params.id, planungType: "FEST", planungSource: "MANUELL" },
      include: { employee: true },
      orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  if (!project) notFound();

  const beteiligte: BeteiligterRow[] = project.projectParticipants.map((pp) => ({
    id: pp.id,
    roleInProject: pp.roleInProject,
    isPrimary: pp.isPrimary,
    validFrom: pp.validFrom.toISOString(),
    validTo: pp.validTo ? pp.validTo.toISOString() : null,
    organization: pp.organization ? { id: pp.organization.id, name: pp.organization.name } : null,
    contactPerson: pp.contactPerson ? { id: pp.contactPerson.id, name: pp.contactPerson.name } : null,
  }));

  const toPlanRow = (e: (typeof planUpcoming)[0]): PlanRow => ({
    id: e.id,
    isoYear: e.isoYear,
    isoWeek: e.isoWeek,
    planungStatus: e.planungStatus,
    planungType: e.planungType,
    planungSource: e.planungSource,
    plannedDate: e.plannedDate ? e.plannedDate.toISOString() : null,
    note: e.note,
    employee: e.employee
      ? { id: e.employee.id, shortCode: e.employee.shortCode, displayName: e.employee.displayName }
      : null,
  });

  const upcomingRows: PlanRow[] = planUpcoming.map(toPlanRow);
  const fixedRows: PlanRow[] = planFixedManual.map(toPlanRow);

  const begehungenRows: BegehungRow[] = project.begehungen.map((i) => ({
    id: i.id,
    date: i.date.toISOString(),
    title: i.title,
    mangelCount: i._count.mangels,
    protocolMissing: i.protocolMissing,
  }));

  const taskRows: TaskRow[] = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assigneeShort: t.assignee?.shortCode ?? null,
    protocolMissing: t.protocolMissing,
  }));

  const docRows: DocRow[] = project.documents.map((d) => ({
    id: d.id,
    name: d.name,
    createdAt: d.createdAt.toISOString(),
    url: d.url,
  }));

  const chronikRows: ChronikRow[] = project.chronikEntries.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    authorName: c.author?.name ?? null,
    body: c.body,
  }));

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

      <Tabs defaultValue={initialTab} key={initialTab}>
        <TabsList className="flex h-auto min-h-10 flex-wrap gap-1">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="beteiligte">Beteiligte</TabsTrigger>
          <TabsTrigger value="termine">Termine / Planung</TabsTrigger>
          <TabsTrigger value="begehungen">Begehungen</TabsTrigger>
          <TabsTrigger value="tasks">Aufgaben / Mängel</TabsTrigger>
          <TabsTrigger value="docs">Dokumente</TabsTrigger>
          <TabsTrigger value="kommunikation">Kommunikation</TabsTrigger>
          <TabsTrigger value="chronicle">Chronik</TabsTrigger>
          <TabsTrigger value="billing">Abrechnung / LV</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverviewTab
            projectId={params.id}
            description={project.description}
            targetHours={project.targetHours}
            actualHours={project.actualHours}
            code={project.code}
            client={project.client}
            siteAddress={project.siteAddress}
            status={project.status}
            turnus={project.turnus}
            startDate={project.startDate ? project.startDate.toISOString() : null}
            endDate={project.endDate ? project.endDate.toISOString() : null}
            contractualBegehungen={project.contractualBegehungen}
            completedBegehungen={project.completedBegehungen}
            responsibleShort={project.responsibleEmployee?.shortCode ?? null}
            substituteShort={project.substituteEmployee?.shortCode ?? null}
            pauseStartsOn={project.pauseStartsOn ? project.pauseStartsOn.toISOString() : null}
            pauseEndsOn={project.pauseEndsOn ? project.pauseEndsOn.toISOString() : null}
            pauseReason={project.pauseReason}
            offers={project.offers.map((o) => ({
              id: o.id,
              emailInput: o.emailInput,
              status: o.status,
              pdfUrl: o.pdfUrl,
              freigegebenVon: o.freigegebenVon,
            }))}
            vorankuendigungen={project.vorankuendigungen.map((v) => ({
              id: v.id,
              pdfFormular: v.pdfFormular,
              status: v.status,
              generiertesPdf: v.generiertesPdf,
            }))}
          />
        </TabsContent>

        <TabsContent value="beteiligte" className="mt-4">
          <ProjectBeteiligteTab projectId={params.id} initialRows={beteiligte} />
        </TabsContent>

        <TabsContent value="termine" className="mt-4">
          <ProjectTermineTab
            projectId={params.id}
            projectCode={project.code}
            initialUpcoming={upcomingRows}
            initialFixedManual={fixedRows}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="begehungen" className="mt-4">
          <ProjectBegehungenTab projectId={params.id} rows={begehungenRows} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <ProjectTasksTab tasks={taskRows} />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <ProjectDokumenteTab rows={docRows} />
        </TabsContent>

        <TabsContent value="kommunikation" className="mt-4">
          <ProjectKommunikationTab
            projectId={params.id}
            communications={project.communications.map((c) => ({
              id: c.id,
              kind: c.kind,
              occurredAt: c.occurredAt.toISOString(),
              subject: c.subject,
              body: c.body,
              organization: c.organization ? { name: c.organization.name } : null,
              contactPerson: c.contactPerson ? { name: c.contactPerson.name } : null,
              responsibleEmployee: c.responsibleEmployee,
            }))}
            telefonnotizen={project.telefonnotizen.map((n) => ({
              id: n.id,
              notiz: n.notiz,
              erfasstVon: n.erfasstVon,
              erfasstAm: n.erfasstAm.toISOString(),
              erledigt: n.erledigt,
              followUp: n.followUp ? n.followUp.toISOString() : null,
            }))}
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            contacts={contacts}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="chronicle" className="mt-4">
          <ProjectChronikTab rows={chronikRows} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <ProjectAbrechnungTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
