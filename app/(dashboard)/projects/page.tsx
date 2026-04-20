import { prisma } from "@/lib/prisma";
import { ProjectsStammdaten } from "@/components/projects/projects-stammdaten";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, employees] = await Promise.all([
    prisma.project.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: { select: { tasks: true, begehungen: true, documents: true } },
      },
    }),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: { shortCode: "asc" },
      select: { id: true, shortCode: true, displayName: true },
    }),
  ]);

  const projectRows = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    siteAddress: p.siteAddress,
    status: p.status,
    turnus: p.turnus,
    contractualBegehungen: p.contractualBegehungen,
    responsibleEmployeeId: p.responsibleEmployeeId,
    client: p.client,
    description: p.description,
    _count: p._count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projekte</h1>
        <p className="text-muted-foreground">Projektakte mit Schnellüberblick — Stammdaten anlegen und pflegen.</p>
      </div>

      <ProjectsStammdaten initialProjects={projectRows} employees={employees} />
    </div>
  );
}
