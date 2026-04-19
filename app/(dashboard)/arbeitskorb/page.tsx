import { prisma } from "@/lib/prisma";
import { PlanungStatus } from "@/generated/prisma/client";
import {
  ArbeitskorbClient,
  type BegehungRow,
  type CommRow,
  type DocRow,
  type PlanRueckRow,
  type ProjectAmpelRow,
  type TaskRow,
} from "@/components/arbeitskorb/arbeitskorb-client";

export const dynamic = "force-dynamic";

function subDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
}

export default async function ArbeitskorbPage() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  const protocolDueCutoff = subDays(startOfDay, 3);

  const [
    dueToday,
    overdue,
    missingTaskProtocols,
    missingBegehungProtocols,
    missingDocuments,
    delayedProtocolBegehungen,
    followUps,
    planRueckmeldungOffen,
    projectsAmpelBase,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { gte: startOfDay, lte: endOfDay } },
      include: { project: true, assignee: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { lt: startOfDay } },
      include: { project: true, assignee: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { protocolMissing: true, status: { not: "DONE" } },
      include: { project: true, assignee: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.begehung.findMany({
      where: { protocolMissing: true },
      include: { project: true },
      orderBy: { date: "desc" },
    }),
    prisma.document.findMany({
      where: { docStatus: "FEHLT" },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.begehung.findMany({
      where: {
        begehungStatus: "DURCHGEFUEHRT",
        date: { lt: protocolDueCutoff },
        OR: [{ protocolMissing: true }, { protokollPdf: null }],
      },
      include: { project: true },
      orderBy: { date: "asc" },
    }),
    prisma.communication.findMany({
      where: {
        followUp: { not: null, lte: endOfDay },
        erledigt: false,
      },
      include: { project: true },
      orderBy: { followUp: "asc" },
    }),
    prisma.planungEntry.findMany({
      where: { planungStatus: PlanungStatus.RUECKMELDUNG_OFFEN },
      include: { project: true, employee: true },
      orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
      take: 80,
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        name: true,
        contractualBegehungen: true,
        completedBegehungen: true,
        _count: {
          select: {
            tasks: {
              where: {
                isMangel: true,
                priority: "CRITICAL",
                status: { notIn: ["DONE", "CANCELLED"] },
              },
            },
          },
        },
      },
    }),
  ]);

  const criticalProjects: ProjectAmpelRow[] = projectsAmpelBase
    .map((p) => {
      const contractual = p.contractualBegehungen ?? 0;
      const pct = contractual > 0 ? p.completedBegehungen / contractual : 1;
      const lowCompletion = contractual > 0 && pct < 0.7;
      const manyCritical = p._count.tasks > 3;
      if (!lowCompletion && !manyCritical) return null;
      const reasons: string[] = [];
      if (lowCompletion) reasons.push(`Begehungsquote ${Math.round(pct * 100)} % (< 70 %)`);
      if (manyCritical) reasons.push(`${p._count.tasks} offene kritische Mängel-Aufgaben (> 3)`);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        reason: reasons.join(" · "),
      };
    })
    .filter((x): x is ProjectAmpelRow => x != null);

  const toTaskRow = (t: (typeof dueToday)[0]): TaskRow => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId,
    projectName: t.project.name,
    assigneeShort: t.assignee?.shortCode ?? null,
  });

  const toBegehRow = (i: (typeof missingBegehungProtocols)[0]): BegehungRow => ({
    id: i.id,
    date: i.date.toISOString(),
    title: i.title,
    projectId: i.projectId,
    projectName: i.project.name,
  });

  const toDocRow = (d: (typeof missingDocuments)[0]): DocRow => ({
    id: d.id,
    name: d.name,
    projectId: d.projectId,
    projectName: d.project.name,
  });

  const toCommRow = (c: (typeof followUps)[0]): CommRow => ({
    id: c.id,
    kind: c.kind,
    subject: c.subject,
    body: c.body,
    followUp: c.followUp!.toISOString(),
    projectId: c.projectId,
    projectName: c.project.name,
  });

  const toPlanRow = (r: (typeof planRueckmeldungOffen)[0]): PlanRueckRow => ({
    id: r.id,
    projectId: r.projectId,
    projectName: r.project.name,
    projectCode: r.project.code,
    isoYear: r.isoYear,
    isoWeek: r.isoWeek,
    employeeShort: r.employee?.shortCode ?? null,
  });

  return (
    <ArbeitskorbClient
      dueToday={dueToday.map(toTaskRow)}
      overdue={overdue.map(toTaskRow)}
      missingTaskProtocols={missingTaskProtocols.map(toTaskRow)}
      missingBegehungProtocols={missingBegehungProtocols.map(toBegehRow)}
      missingDocuments={missingDocuments.map(toDocRow)}
      delayedProtocolBegehungen={delayedProtocolBegehungen.map(toBegehRow)}
      followUps={followUps.map(toCommRow)}
      criticalProjects={criticalProjects}
      planRueckmeldungOffen={planRueckmeldungOffen.map(toPlanRow)}
    />
  );
}
