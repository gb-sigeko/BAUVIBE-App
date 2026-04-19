"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  assigneeShort: string | null;
};

export type BegehungRow = {
  id: string;
  date: string;
  title: string | null;
  projectId: string;
  projectName: string;
};

export type DocRow = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
};

export type CommRow = {
  id: string;
  kind: string;
  subject: string | null;
  body: string;
  followUp: string;
  projectId: string;
  projectName: string;
};

export type ProjectAmpelRow = {
  id: string;
  code: string;
  name: string;
  reason: string;
};

export type PlanRueckRow = {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  isoYear: number;
  isoWeek: number;
  employeeShort: string | null;
};

export type VorOrtRow = {
  id: string;
  gemeldetAm: string;
  rueckmeldung: string;
  aushangOk: boolean | null;
  werbungOk: boolean | null;
  unterbrechung: string | null;
  planEntryId: string;
  isoYear: number;
  isoWeek: number;
  projectId: string;
  projectName: string;
  projectCode: string;
};

function SourceButton({ href, label = "Zur Quelle" }: { href: string; label?: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function ArbeitskorbClient({
  dueToday,
  overdue,
  missingTaskProtocols,
  missingBegehungProtocols,
  missingDocuments,
  delayedProtocolBegehungen,
  followUps,
  criticalProjects,
  planRueckmeldungOffen,
  vorOrtRueckmeldungen,
}: {
  dueToday: TaskRow[];
  overdue: TaskRow[];
  missingTaskProtocols: TaskRow[];
  missingBegehungProtocols: BegehungRow[];
  missingDocuments: DocRow[];
  delayedProtocolBegehungen: BegehungRow[];
  followUps: CommRow[];
  criticalProjects: ProjectAmpelRow[];
  planRueckmeldungOffen: PlanRueckRow[];
  vorOrtRueckmeldungen: VorOrtRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function completeTask(id: string) {
    setBusyId(`task-${id}`);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function completeFollowUp(id: string) {
    setBusyId(`comm-${id}`);
    try {
      const res = await fetch(`/api/communication/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erledigt: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arbeitskorb</h1>
        <p className="text-muted-foreground">
          Heute fällig, überfällig, Rückmeldungen in der Planung, fehlende Unterlagen und Protokolle, Wiedervorlagen, kritische
          Projekte.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heute fällig</CardTitle>
          <CardDescription>Aufgaben mit Fälligkeit heute.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskTable
            tasks={dueToday}
            emptyHint="Heute nichts Fälliges – gut so."
            onDone={completeTask}
            busyId={busyId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Überfällig</CardTitle>
          <CardDescription>Aufgaben mit Fälligkeit vor heute.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskTable tasks={overdue} emptyHint="Keine überfälligen Aufgaben." onDone={completeTask} busyId={busyId} />
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-rueckmeldung-planung">
        <CardHeader>
          <CardTitle>Rückmeldung Planung offen</CardTitle>
          <CardDescription>Einträge mit Status „Rückmeldung offen“.</CardDescription>
        </CardHeader>
        <CardContent>
          {planRueckmeldungOffen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Rückmeldungen in der Planung.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>KW</TableHead>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planRueckmeldungOffen.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.projectName}{" "}
                      <span className="text-muted-foreground">({r.projectCode})</span>
                    </TableCell>
                    <TableCell>
                      {r.isoYear} / {String(r.isoWeek).padStart(2, "0")}
                    </TableCell>
                    <TableCell>{r.employeeShort ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <SourceButton href="/planung" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-vorort">
        <CardHeader>
          <CardTitle>Vor-Ort-Rückmeldungen (SiGeKo → Fee)</CardTitle>
          <CardDescription>Zuletzt gemeldete Eindrücke von der Baustelle.</CardDescription>
        </CardHeader>
        <CardContent>
          {vorOrtRueckmeldungen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Vor-Ort-Rückmeldungen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gemeldet</TableHead>
                  <TableHead>Projekt / KW</TableHead>
                  <TableHead>Inhalt</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vorOrtRueckmeldungen.map((v) => (
                  <TableRow key={v.id} data-testid={`arbeitskorb-vorort-${v.id}`}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(v.gemeldetAm).toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{v.projectName}</div>
                      <div className="text-xs text-muted-foreground">
                        {v.projectCode} · KW {v.isoWeek}/{v.isoYear}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[360px] text-xs">
                      <div className="whitespace-pre-wrap">{v.rueckmeldung}</div>
                      {v.unterbrechung ? (
                        <div className="mt-1 text-muted-foreground">Unterbrechung: {v.unterbrechung}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <SourceButton href={`/projects/${v.projectId}?tab=termine`} label="Zur Planungszelle" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-fehlende-unterlagen">
        <CardHeader>
          <CardTitle>Fehlende Unterlagen</CardTitle>
          <CardDescription>
            Dokumente mit Status „fehlt“ sowie erwartete Protokolle (Begehung durchgeführt, seit über drei Tagen kein Upload).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <div className="mb-2 text-sm font-medium">Dokumente</div>
            {missingDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Dokumente mit Status „fehlt“.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dokument</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingDocuments.map((d) => (
                    <TableRow key={d.id} data-testid={`arbeitskorb-doc-${d.id}`}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.projectName}</TableCell>
                      <TableCell className="text-right">
                        <SourceButton href={`/projects/${d.projectId}?tab=docs`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Erwartetes Protokoll (verzögert)</div>
            {delayedProtocolBegehungen.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine überfälligen Protokoll-Erwartungen.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delayedProtocolBegehungen.map((i) => (
                    <TableRow key={i.id} data-testid={`arbeitskorb-delayed-protokoll-${i.id}`}>
                      <TableCell>{new Date(i.date).toLocaleDateString("de-DE")}</TableCell>
                      <TableCell className="font-medium">{i.title ?? "—"}</TableCell>
                      <TableCell>{i.projectName}</TableCell>
                      <TableCell className="text-right">
                        <SourceButton href={`/projects/${i.projectId}?tab=docs`} label="Zu Dokumente" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fehlende Protokolle</CardTitle>
          <CardDescription>Aufgaben und Begehungen ohne vollständiges Protokoll (laufende Kennzeichnung).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <div className="mb-2 text-sm font-medium">Aufgaben</div>
            <TaskTable
              tasks={missingTaskProtocols}
              emptyHint="Keine Aufgaben mit fehlendem Protokoll."
              onDone={completeTask}
              busyId={busyId}
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Begehungen</div>
            {missingBegehungProtocols.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Begehungen mit fehlendem Protokoll.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingBegehungProtocols.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{new Date(i.date).toLocaleDateString("de-DE")}</TableCell>
                      <TableCell className="font-medium">{i.title ?? "—"}</TableCell>
                      <TableCell>{i.projectName}</TableCell>
                      <TableCell className="text-right">
                        <SourceButton href={`/projects/${i.projectId}?tab=begehungen`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-wiedervorlagen">
        <CardHeader>
          <CardTitle>Kommunikations-Wiedervorlagen</CardTitle>
          <CardDescription>Überfällige oder heute fällige Wiedervorlagen (Follow-up-Datum erreicht).</CardDescription>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Wiedervorlagen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Betreff</TableHead>
                  <TableHead>Wiedervorlage</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="secondary">{c.kind}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium">{c.subject ?? c.body.slice(0, 80)}</TableCell>
                    <TableCell>{new Date(c.followUp).toLocaleDateString("de-DE")}</TableCell>
                    <TableCell>{c.projectName}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <SourceButton href={`/projects/${c.projectId}?tab=kommunikation`} />
                      <Button
                        size="sm"
                        type="button"
                        disabled={busyId === `comm-${c.id}`}
                        onClick={() => void completeFollowUp(c.id)}
                      >
                        Erledigt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="arbeitskorb-kritische-projekte">
        <CardHeader>
          <CardTitle>Kritische Projekte</CardTitle>
          <CardDescription>
            Erledigungsquote der Begehungen unter 70&nbsp;% oder mehr als drei offene kritische Mängel-Aufgaben.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {criticalProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Projekte in der Risiko-Ampel.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Grund</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.reason}</TableCell>
                    <TableCell className="text-right">
                      <SourceButton href={`/projects/${p.id}`} label="Zur Akte" />
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

function TaskTable({
  tasks,
  emptyHint,
  onDone,
  busyId,
}: {
  tasks: TaskRow[];
  emptyHint: string;
  onDone?: (id: string) => void;
  busyId?: string | null;
}) {
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aufgabe</TableHead>
          <TableHead>Projekt</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fällig</TableHead>
          <TableHead>Zuständig</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.title}</TableCell>
            <TableCell>{t.projectName}</TableCell>
            <TableCell>
              <Badge variant="secondary">{t.status}</Badge>
            </TableCell>
            <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("de-DE") : "—"}</TableCell>
            <TableCell>{t.assigneeShort ?? "—"}</TableCell>
            <TableCell className="text-right space-x-2">
              <SourceButton href={`/projects/${t.projectId}?tab=tasks`} />
              {onDone ? (
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  disabled={busyId === `task-${t.id}`}
                  onClick={() => void onDone(t.id)}
                >
                  Erledigt
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
