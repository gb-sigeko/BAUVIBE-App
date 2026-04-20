import Link from "next/link";
import { BegehungStatus, CommunicationKind, PlanungStatus, TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CommunicationErledigtButton,
  QuelleLink,
  TelefonErledigtButton,
  VorOrtErledigtButton,
} from "@/components/arbeitskorb/arbeitskorb-actions";

type PlanungRueckRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  plannedDate: Date | null;
  projectId: string;
  project: { name: string };
  employee: { shortCode: string } | null;
};

type BegehungRow = {
  id: string;
  date: Date;
  title: string | null;
  projectId: string;
  project: { name: string };
};

type VorOrtRow = {
  id: string;
  aushangOk: boolean | null;
  werbungOk: boolean | null;
  unterbrechung: string | null;
  rueckmeldung: string;
  gemeldetAm: Date;
  planung: {
    id: string;
    isoYear: number;
    isoWeek: number;
    projectId: string;
    project: { name: string };
  };
};

type CriticalProject = { id: string; name: string; code: string; reason: string };

function startEndToday() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  const d3 = new Date(startOfDay);
  d3.setDate(d3.getDate() - 3);
  return { startOfDay, endOfDay, d3 };
}

function isSameDay(d: Date, ref: Date) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

export default async function ArbeitskorbPage() {
  const { startOfDay, endOfDay, d3 } = startEndToday();

  const [
    rueckEntries,
    missingBegehungProtocols,
    telefonWv,
    commWv,
    vorOrtOpen,
    projectsForCritical,
  ] = await Promise.all([
    prisma.planungEntry.findMany({
      where: { planungStatus: PlanungStatus.RUECKMELDUNG_OFFEN },
      include: { project: { select: { id: true, name: true } }, employee: { select: { shortCode: true } } },
      orderBy: [{ plannedDate: "asc" }, { updatedAt: "asc" }],
    }),
    prisma.begehung.findMany({
      where: {
        protocolMissing: true,
        begehungStatus: { in: [BegehungStatus.DURCHGEFUEHRT, BegehungStatus.NACHZUARBEITEN] },
        date: { lt: startOfDay },
      },
      include: { project: true },
      orderBy: { date: "desc" },
    }),
    prisma.telefonnotiz.findMany({
      where: {
        erledigt: false,
        followUp: { not: null, lte: endOfDay },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { followUp: "asc" },
    }),
    prisma.communication.findMany({
      where: {
        kind: { in: [CommunicationKind.EMAIL, CommunicationKind.NOTE] },
        followUp: { not: null, lte: endOfDay },
        status: { notIn: ["erledigt", "Erledigt", "ERLEDIGT"] },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { followUp: "asc" },
    }),
    prisma.vorOrtRueckmeldung.findMany({
      where: { bearbeitet: false },
      include: {
        planung: {
          select: {
            id: true,
            isoYear: true,
            isoWeek: true,
            projectId: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { gemeldetAm: "desc" },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        code: true,
        contractualBegehungen: true,
        completedBegehungen: true,
        _count: {
          select: {
            tasks: {
              where: {
                isMangel: true,
                priority: TaskPriority.CRITICAL,
                status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
              },
            },
          },
        },
      },
    }),
  ]);

  const rueckHeute: PlanungRueckRow[] = [];
  const rueckUebfaellig: PlanungRueckRow[] = [];
  for (const e of rueckEntries) {
    const row: PlanungRueckRow = {
      id: e.id,
      isoYear: e.isoYear,
      isoWeek: e.isoWeek,
      plannedDate: e.plannedDate,
      projectId: e.projectId,
      project: e.project,
      employee: e.employee,
    };
    const pd = e.plannedDate;
    if (pd && isSameDay(pd, startOfDay)) {
      rueckHeute.push(row);
    } else if (!pd || pd < startOfDay) {
      rueckUebfaellig.push(row);
    }
  }

  const criticalProjects: CriticalProject[] = [];
  for (const p of projectsForCritical) {
    const crit = p._count.tasks;
    if (crit > 3) {
      criticalProjects.push({
        id: p.id,
        name: p.name,
        code: p.code,
        reason: `${crit} offene kritische Mängel-Aufgaben`,
      });
      continue;
    }
    const c = p.contractualBegehungen;
    if (c && c > 0) {
      const ratio = p.completedBegehungen / c;
      if (ratio < 0.7) {
        criticalProjects.push({
          id: p.id,
          name: p.name,
          code: p.code,
          reason: `Erledigungsquote Begehungen ${Math.round(ratio * 100)} % (< 70 %)`,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arbeitskorb</h1>
        <p className="text-muted-foreground">
          Planungs-Rückmeldungen, fehlende Protokolle, Wiedervorlagen, Vor-Ort-Rückmeldungen und kritische Projekte.
        </p>
      </div>

      <Card data-testid="arbeitskorb-rueckmeldungen-heute">
        <CardHeader>
          <CardTitle>Heute fällige Rückmeldungen (Planung)</CardTitle>
          <CardDescription>Status „Rückmeldung offen“ mit geplantem Datum heute.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanungRueckTable rows={rueckHeute} d3={d3} variant="heute" />
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-rueckmeldungen-ueberfaellig">
        <CardHeader>
          <CardTitle>Überfällige Rückmeldungen</CardTitle>
          <CardDescription>
            Rückmeldung offen mit geplantem Datum vor heute; Einträge älter als 3 Tage sind rot markiert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanungRueckTable rows={rueckUebfaellig} d3={d3} variant="ueberfaellig" />
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-fehlende-protokolle">
        <CardHeader>
          <CardTitle>Fehlende Protokolle (Begehungen)</CardTitle>
          <CardDescription>Begehung durchgeführt bzw. nachzuarbeiten, aber noch kein Protokoll (nach Begehungsdatum).</CardDescription>
        </CardHeader>
        <CardContent>
          <BegehungTable begehungen={missingBegehungProtocols} />
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-wiedervorlagen">
        <CardHeader>
          <CardTitle>Wiedervorlagen</CardTitle>
          <CardDescription>Telefon- und E-Mail-/Notiz-Kommunikation mit Follow-up bis heute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 text-sm font-medium">Telefon</div>
            {telefonWv.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Telefon-Wiedervorlagen.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {telefonWv.map((n) => (
                    <TableRow key={n.id} data-testid={`arbeitskorb-wv-telefon-${n.id}`}>
                      <TableCell>{n.project.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm">{n.notiz}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {n.followUp ? n.followUp.toLocaleString("de-DE") : "—"}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <QuelleLink href={`/projects/${n.projectId}?tab=kommunikation`} />
                        <TelefonErledigtButton projectId={n.projectId} noteId={n.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">E-Mail / Notiz</div>
            {commWv.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Einträge.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Betreff / Inhalt</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commWv.map((c) => (
                    <TableRow key={c.id} data-testid={`arbeitskorb-wv-comm-${c.id}`}>
                      <TableCell>{c.project.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm">{c.subject ?? c.body}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {c.followUp ? c.followUp.toLocaleString("de-DE") : "—"}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <QuelleLink href={`/projects/${c.projectId}?tab=kommunikation`} />
                        <CommunicationErledigtButton projectId={c.projectId} communicationId={c.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-vorort">
        <CardHeader>
          <CardTitle>Vor-Ort-Rückmeldungen</CardTitle>
          <CardDescription>Noch nicht als bearbeitet markierte Rückmeldungen aus der Wochenplanung.</CardDescription>
        </CardHeader>
        <CardContent>
          <VorOrtTable rows={vorOrtOpen} d3={d3} />
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-kritische-projekte">
        <CardHeader>
          <CardTitle>Kritische Projekte</CardTitle>
          <CardDescription>
            Ampel rot: mehr als drei offene kritische Mängel-Aufgaben oder Begehungs-Erledigungsquote unter 70 %.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {criticalProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine kritischen Projekte nach aktuellen Regeln.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Grund</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalProjects.map((p) => (
                  <TableRow key={p.id} data-testid={`arbeitskorb-kritisch-${p.id}`}>
                    <TableCell className="font-medium">
                      {p.name}{" "}
                      <Badge variant="destructive" className="ml-2">
                        kritisch
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.reason}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${p.id}`}>Zur Akte</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlanungRueckTable({ rows, d3, variant }: { rows: PlanungRueckRow[]; d3: Date; variant: "heute" | "ueberfaellig" }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {variant === "heute" ? "Heute keine fälligen Rückmeldungen." : "Keine überfälligen Rückmeldungen."}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Projekt</TableHead>
          <TableHead>KW</TableHead>
          <TableHead>Geplant</TableHead>
          <TableHead>SiGeKo</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => {
          const pd = e.plannedDate;
          const isRed = variant === "ueberfaellig" && pd != null && pd < d3;
          return (
            <TableRow key={e.id} className={isRed ? "bg-destructive/10" : undefined} data-testid={`arbeitskorb-rueck-${e.id}`}>
              <TableCell>{e.project.name}</TableCell>
              <TableCell>
                {e.isoWeek}/{e.isoYear}
              </TableCell>
              <TableCell>{pd ? pd.toLocaleString("de-DE") : "—"}</TableCell>
              <TableCell>{e.employee?.shortCode ?? "—"}</TableCell>
              <TableCell className="space-x-2 text-right">
                <QuelleLink href={`/projects/${e.projectId}?tab=termine`} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function VorOrtTable({ rows, d3 }: { rows: VorOrtRow[]; d3: Date }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Keine offenen Vor-Ort-Rückmeldungen.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Projekt</TableHead>
          <TableHead>KW</TableHead>
          <TableHead>Aushang</TableHead>
          <TableHead>Werbung</TableHead>
          <TableHead>Unterbrechung</TableHead>
          <TableHead>Rückmeldung</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const isRed = r.gemeldetAm < d3;
          return (
            <TableRow key={r.id} className={isRed ? "bg-destructive/10" : undefined} data-testid={`arbeitskorb-vorort-${r.id}`}>
              <TableCell>{r.planung.project.name}</TableCell>
              <TableCell>
                {r.planung.isoWeek}/{r.planung.isoYear}
              </TableCell>
              <TableCell>{r.aushangOk == null ? "—" : r.aushangOk ? "ok" : "nein"}</TableCell>
              <TableCell>{r.werbungOk == null ? "—" : r.werbungOk ? "ok" : "nein"}</TableCell>
              <TableCell className="max-w-[140px] truncate text-xs">{r.unterbrechung ?? "—"}</TableCell>
              <TableCell className="max-w-[220px] truncate text-sm">{r.rueckmeldung}</TableCell>
              <TableCell className="space-x-2 text-right">
                <QuelleLink href={`/projects/${r.planung.projectId}?tab=termine`} />
                <VorOrtErledigtButton projectId={r.planung.projectId} rueckmeldungId={r.id} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function BegehungTable({ begehungen }: { begehungen: BegehungRow[] }) {
  if (!begehungen.length) {
    return <p className="text-sm text-muted-foreground">Keine Begehungen mit fehlendem Protokoll in dieser Kategorie.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Titel</TableHead>
          <TableHead>Projekt</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {begehungen.map((i) => (
          <TableRow key={i.id} data-testid={`arbeitskorb-begehung-${i.id}`}>
            <TableCell>{i.date.toLocaleDateString("de-DE")}</TableCell>
            <TableCell className="font-medium">{i.title ?? "—"}</TableCell>
            <TableCell>{i.project.name}</TableCell>
            <TableCell className="text-right">
              <QuelleLink href={`/projects/${i.projectId}/begehungen/${i.id}`} label="Zur Begehung" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
