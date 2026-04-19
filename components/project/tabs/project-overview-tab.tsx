import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OffersSection } from "@/components/project/offers-section";
import { VorankSection } from "@/components/project/vorank-section";

type OfferRow = {
  id: string;
  emailInput: string;
  status: string;
  pdfUrl: string | null;
  freigegebenVon: { displayName: string } | null;
};

type VorankRow = {
  id: string;
  pdfFormular: string;
  status: string;
  generiertesPdf: string | null;
};

export function ProjectOverviewTab({
  projectId,
  description,
  targetHours,
  actualHours,
  code,
  client,
  siteAddress,
  status,
  turnus,
  startDate,
  endDate,
  contractualBegehungen,
  completedBegehungen,
  responsibleShort,
  substituteShort,
  pauseStartsOn,
  pauseEndsOn,
  pauseReason,
  offers,
  vorankuendigungen,
}: {
  projectId: string;
  description: string | null;
  targetHours: number | null;
  actualHours: number | null;
  code: string;
  client: string | null;
  siteAddress: string | null;
  status: string;
  turnus: string | null;
  startDate: string | null;
  endDate: string | null;
  contractualBegehungen: number | null;
  completedBegehungen: number;
  responsibleShort: string | null;
  substituteShort: string | null;
  pauseStartsOn: string | null;
  pauseEndsOn: string | null;
  pauseReason: string | null;
  offers: OfferRow[];
  vorankuendigungen: VorankRow[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Projektüberblick</CardTitle>
          <CardDescription>
            {code} · {client ?? "Ohne Bauherr"} · {siteAddress ?? "Ohne Einsatzort"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{status}</Badge>
            {turnus ? <Badge variant="outline">Turnus {turnus}</Badge> : null}
          </div>
          <p>{description ?? "Keine Beschreibung hinterlegt."}</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Soll-Stunden</div>
              <div className="text-2xl font-semibold">{targetHours ?? "—"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Ist-Stunden</div>
              <div className="text-2xl font-semibold">{actualHours ?? "—"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Begehungen (Soll / erledigt)</div>
              <div className="text-2xl font-semibold">
                {contractualBegehungen ?? "—"} / {completedBegehungen}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">SiGeKo</div>
              <div className="text-lg font-medium">{responsibleShort ?? "—"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Vertretung</div>
              <div className="text-lg font-medium">{substituteShort ?? "—"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Projektzeitraum</div>
              <div className="text-lg font-medium">
                {startDate ? new Date(startDate).toLocaleDateString("de-DE") : "—"} –{" "}
                {endDate ? new Date(endDate).toLocaleDateString("de-DE") : "—"}
              </div>
            </div>
          </div>
          {pauseStartsOn || pauseReason ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-xs font-medium text-amber-800 dark:text-amber-200">Pause</div>
              <div className="mt-1 text-sm">
                {pauseStartsOn ? new Date(pauseStartsOn).toLocaleDateString("de-DE") : "—"} –{" "}
                {pauseEndsOn ? new Date(pauseEndsOn).toLocaleDateString("de-DE") : "—"}
              </div>
              {pauseReason ? <div className="mt-1 text-muted-foreground">{pauseReason}</div> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Angebote</CardTitle>
          <CardDescription>Angebote erfassen, freigeben, PDF und Versand.</CardDescription>
        </CardHeader>
        <CardContent>
          <OffersSection
            projectId={projectId}
            offers={offers.map((o) => ({
              id: o.id,
              emailInput: o.emailInput,
              status: o.status,
              pdfUrl: o.pdfUrl,
              freigegebenVon: o.freigegebenVon,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vorankündigungen</CardTitle>
          <CardDescription>Formular, PDF und Versand.</CardDescription>
        </CardHeader>
        <CardContent>
          <VorankSection
            projectId={projectId}
            rows={vorankuendigungen.map((v) => ({
              id: v.id,
              pdfFormular: v.pdfFormular,
              status: v.status,
              generiertesPdf: v.generiertesPdf,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
