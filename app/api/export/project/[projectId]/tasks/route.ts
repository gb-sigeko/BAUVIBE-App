import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProject, requireApiUser } from "@/lib/api-helpers";
import { csvFromRows } from "@/lib/csv-export";

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const { session, response } = await requireApiUser();
  if (!session) return response!;

  const { project, response: p404 } = await assertProject(params.projectId);
  if (!project) return p404!;

  const tasks = await prisma.task.findMany({
    where: { projectId: params.projectId },
    orderBy: { dueDate: "asc" },
    include: { assignee: { select: { shortCode: true } } },
  });

  const csv = csvFromRows(
    ["title", "status", "priority", "dueDate", "assigneeShort", "protocolMissing"],
    tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      t.dueDate ? t.dueDate.toISOString() : "",
      t.assignee?.shortCode ?? "",
      t.protocolMissing,
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="projekt-${project.code}-aufgaben.csv"`,
    },
  });
}
