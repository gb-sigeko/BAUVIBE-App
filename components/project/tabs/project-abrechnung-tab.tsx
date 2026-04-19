import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ProjectAbrechnungTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrechnung / LV</CardTitle>
        <CardDescription>Dieser Bereich ist für eine spätere Ausbauphase vorgesehen (Leistungsverzeichnis, Abrechnungsläufe).</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Noch keine Funktionen aktiv – die Leistungsverwaltung wird separat konzipiert.
      </CardContent>
    </Card>
  );
}
