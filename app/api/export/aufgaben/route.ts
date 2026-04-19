import { NextResponse } from "next/server";
import { TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export-access";
import { toCsv } from "@/lib/export-csv";

export async function GET(req: Request) {
  const { session, response } = await requireExportSession();
  if (!session) return response!;

  const url = new URL(req.url);
  const statusFilter = (url.searchParams.get("status") ?? "offen").toLowerCase();
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  if (format !== "csv") {
    return NextResponse.json({ error: "Nur format=csv unterstützt" }, { status: 400 });
  }

  const where =
    statusFilter === "offen" ? { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } } : {};

  const tasks = await prisma.task.findMany({
    where,
    include: { project: true, assignee: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 2000,
  });

  const csv = toCsv(
    ["Titel", "Projekt", "Status", "Priorität", "Fällig", "Zuständig"],
    tasks.map((t) => [
      t.title,
      t.project.name,
      t.status,
      t.priority,
      t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
      t.assignee?.shortCode ?? "",
    ]),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aufgaben-${statusFilter}.csv"`,
    },
  });
}
